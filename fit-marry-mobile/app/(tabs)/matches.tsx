import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, ListRenderItem, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { connectMessagesSocket, disconnectMessagesSocket } from '../../src/services/socket';
import { useI18n } from '../../src/i18n';
import type { Conversation, Message, Like } from '../../src/types';

const resolveAvatarUrl = (avatar?: string) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;

  const baseUrl = api.defaults.baseURL || 'http://10.0.2.2:4000';
  return `${baseUrl}${avatar}`;
};

type CompatibleStatus = 'none' | 'waiting' | 'both_confirmed' | 'contact_request_pending' | 'contact_request_received' | 'contact_request_approved' | 'contact_request_rejected' | 'contact_request_cancelled' | 'contact_request_expired' | 'completed' | 'no_match';
type MatchesTab = 'new' | 'active' | 'waiting';

export default function MatchesScreen() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { t, lang } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingLikes, setPendingLikes] = useState<Like[]>([]);
  const [compatibleStatuses, setCompatibleStatuses] = useState<Record<string, CompatibleStatus>>({});
  const [selectedTab, setSelectedTab] = useState<MatchesTab>('active');
  const [updatingConversationId, setUpdatingConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // @ts-ignore
  const myId = currentUser?.id || currentUser?.sub;
  const superLikesCount = pendingLikes.filter((item) => item.type === 'SUPER_LIKE').length;
  const incomingContactRequests = conversations.filter(
    (conversation) => compatibleStatuses[conversation.id] === 'contact_request_received',
  );

  const fetchData = async () => {
    try {
      const [convResponse, likesResponse] = await Promise.all([
        api.get('/conversations/me'),
        api.get('/likes/inbox')
      ]);
      
      const rawConversations = convResponse.data.conversations || [];
      const compatibleEntries = await Promise.all(
        rawConversations.map(async (conversation) => {
          try {
            const statusResponse = await api.get(`/conversations/${conversation.id}/compatible/status`);
            return [conversation.id, statusResponse.data?.status || 'none'] as const;
          } catch {
            return [conversation.id, 'none'] as const;
          }
        })
      );

      const nextStatuses = Object.fromEntries(compatibleEntries) as Record<string, CompatibleStatus>;
      const nextConversations = sortConversations(rawConversations, nextStatuses);

      setConversations(nextConversations);
      setPendingLikes(likesResponse.data || []);
      setCompatibleStatuses(nextStatuses);
      
      return nextConversations;
    } catch (error) {
      console.log('Matches Error:', error);
      return [] as Conversation[];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const setupRealtime = async () => {
        const nextConversations = await fetchData();
        const socket = await connectMessagesSocket();

        if (!active || !socket) {
          return;
        }

        nextConversations.forEach((conversation) => {
          socket.emit('conversation:join', { conversationId: conversation.id });
        });

        const handleNewMessage = (message: Message & { conversationId?: string }) => {
          if (!message.conversationId) {
            return;
          }

          setConversations((current) => {
            const existing = current.find((conversation) => conversation.id === message.conversationId);
            if (!existing) {
              fetchData();
              return current;
            }

            const updated = current.map((conversation) => {
              if (conversation.id !== message.conversationId) {
                return conversation;
              }

              return {
                ...conversation,
                messages: [message, ...conversation.messages.filter((item) => item.id !== message.id)].slice(0, 1),
              };
            });

            return sortConversations(updated, compatibleStatuses);
          });
        };

        const handleCompatibleUpdate = () => {
          fetchData();
        };

        socket.off('message:new', handleNewMessage);
        socket.off('compatible:match', handleCompatibleUpdate);
        socket.on('message:new', handleNewMessage);
        socket.on('compatible:match', handleCompatibleUpdate);
      };

      setupRealtime();

      return () => {
        active = false;
        disconnectMessagesSocket();
      };
    }, [myId])
  );

  const getPartner = (conversation: Conversation) => {
    if (!conversation.participants) return null;

    if (myId) {
        return conversation.participants.find(p => p.user.id !== myId)?.user;
    }
    
    // Fallback: Just return the first one if we can't distiguish (Risky, might show myself)
    return conversation.participants[0]?.user;
  };

  const openConversation = (conversation: Conversation, nickname: string, avatar: string | null) => {
    router.push({
      pathname: `/chat/${conversation.id}`,
      params: {
        name: nickname,
        avatar: avatar || '',
      },
    });
  };

  const handleCompatibleAction = async (conversation: Conversation) => {
    const currentStatus = compatibleStatuses[conversation.id] || 'none';
    const partner = getPartner(conversation);
    const nickname = partner?.profile?.nickname || t.common.user;
    const avatar = resolveAvatarUrl(partner?.profile?.avatarUrl);

    if (currentStatus === 'contact_request_approved' || currentStatus === 'completed') {
      openConversation(conversation, nickname, avatar);
      return;
    }

    setUpdatingConversationId(conversation.id);
    try {
      if (currentStatus === 'both_confirmed' || currentStatus === 'contact_request_received' || currentStatus === 'contact_request_pending') {
        await api.post(`/conversations/${conversation.id}/compatible/contact-request`);
      } else {
        await api.post(`/conversations/${conversation.id}/compatible`);
      }
      const statusResponse = await api.get(`/conversations/${conversation.id}/compatible/status`);
      setCompatibleStatuses((current) => ({
        ...current,
        [conversation.id]: statusResponse.data?.status || 'waiting',
      }));
      Alert.alert(
        t.common.success,
        currentStatus === 'both_confirmed' || currentStatus === 'contact_request_received' || currentStatus === 'contact_request_pending'
          ? currentStatus === 'contact_request_received'
            ? t.chat.contactRequestApproved
            : t.chat.contactRequestPending
          : t.matches.compatibleMarked,
      );
    } catch (error: any) {
      Alert.alert(t.common.error, error.response?.data?.message || t.common.updateFailed);
    } finally {
      setUpdatingConversationId(null);
    }
  };

  const renderNewMatchItem = ({ item }: { item: Like }) => {
    const fromUser = item.fromUser;
    const nickname = fromUser?.profile?.nickname || t.common.user;
    const avatar = resolveAvatarUrl(fromUser?.profile?.avatarUrl);

    return (
      <TouchableOpacity 
        style={styles.newMatchItem}
        onPress={() => router.push(`/user/${fromUser.id}` as any)}
      >
        <View style={styles.newMatchAvatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.newMatchAvatar} />
          ) : (
            <LinearGradient colors={['#f9a8d4', '#f0abfc']} style={[styles.newMatchAvatar, styles.placeholderAvatar]}>
              <Text style={styles.newMatchPlaceholder}>{nickname[0]}</Text>
            </LinearGradient>
          )}
          <View style={styles.onlineBadge} />
        </View>
        <Text style={styles.newMatchName} numberOfLines={1}>{nickname}</Text>
      </TouchableOpacity>
    );
  };

  const renderConversationItem: ListRenderItem<Conversation> = ({ item }) => {
    const partner = getPartner(item);
    const lastMsg = item.messages?.[0];
    const compatibleStatus = compatibleStatuses[item.id] || 'none';
    
    const nickname = partner?.profile?.nickname || t.common.user;
    const avatar = resolveAvatarUrl(partner?.profile?.avatarUrl);
    
    const timeString = lastMsg 
        ? formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true, locale: lang === 'ar' ? ar : undefined }) 
        : '';

    return (
      <TouchableOpacity 
        style={styles.itemContainer} 
        style={[
          styles.itemContainer,
          compatibleStatus === 'contact_request_received' && styles.itemContainerUrgent,
        ]}
        activeOpacity={0.7}
        onPress={() => openConversation(item, nickname, avatar)}
      >
        <View style={styles.avatarContainer}>
            {avatar ? (
                <Image 
                    source={{ uri: avatar }} 
                    style={styles.avatar} 
                    blurRadius={item.photoAccessGrantedToMe === true ? 0 : 20} 
                />
            ) : (
                <LinearGradient colors={['#f0e4e0', '#d9d3cf']} style={[styles.avatar, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderText}>{nickname[0]}</Text>
                </LinearGradient>
            )}
        </View>
        <View style={styles.textContainer}>
            <View style={styles.rowHeader}>
                <Text style={styles.name} numberOfLines={1}>{nickname}</Text>
                <Text style={styles.time}>{timeString}</Text>
            </View>
            <Text style={styles.message} numberOfLines={1}>
                {lastMsg ? (lastMsg.text || t.chat.photoEmoji) : t.chat.startChatting}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.statusBadge, getStatusBadgeStyle(compatibleStatus)]}>
                <Text style={[styles.statusBadgeText, getStatusBadgeTextStyle(compatibleStatus)]}>
                  {getStatusLabel(compatibleStatus, t)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.compatibleCta, getCompatibleCtaStyle(compatibleStatus)]}
                onPress={() => handleCompatibleAction(item)}
                disabled={updatingConversationId === item.id}
              >
                <Text style={[styles.compatibleCtaText, getCompatibleCtaTextStyle(compatibleStatus)]}>
                  {updatingConversationId === item.id ? '...' : getCompatibleCtaLabel(compatibleStatus, t)}
                </Text>
              </TouchableOpacity>
            </View>
            {compatibleStatus === 'contact_request_received' ? (
              <View style={styles.urgentRow}>
                <Ionicons name="alert-circle" size={14} color="#c2410c" />
                <Text style={styles.urgentRowText}>{t.matches.needsApprovalNow}</Text>
              </View>
            ) : null}
            {partner?.id ? (
              <TouchableOpacity style={styles.profileShortcut} onPress={() => router.push(`/user/${partner.id}` as any)}>
                <Ionicons name="person-outline" size={14} color="#4f46e5" />
                <Text style={styles.profileShortcutText}>{t.likes.viewProfile}</Text>
              </TouchableOpacity>
            ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      <LinearGradient colors={['#ffffff', '#fffaf7']} style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{t.chat.title}</Text>
      </LinearGradient>

      {incomingContactRequests.length > 0 ? (
        <View style={styles.prioritySection}>
          <TouchableOpacity
            style={styles.priorityBanner}
            onPress={() => {
              const firstConversation = incomingContactRequests[0];
              const partner = getPartner(firstConversation);
              openConversation(
                firstConversation,
                partner?.profile?.nickname || t.common.user,
                resolveAvatarUrl(partner?.profile?.avatarUrl),
              );
            }}
          >
            <View style={styles.priorityBannerIcon}>
              <Ionicons name="mail-open-outline" size={18} color="#b45309" />
            </View>
            <View style={styles.priorityBannerTextWrap}>
              <Text style={styles.priorityBannerTitle}>{t.matches.incomingRequestTitle}</Text>
              <Text style={styles.priorityBannerText}>
                {t.matches.incomingRequestHint.replace('{count}', String(incomingContactRequests.length))}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#b45309" />
          </TouchableOpacity>

          <View style={styles.priorityListHeader}>
            <Text style={styles.priorityListTitle}>{t.matches.needsApprovalNow}</Text>
          </View>
          {incomingContactRequests.slice(0, 3).map((conversation) => {
            const partner = getPartner(conversation);
            const nickname = partner?.profile?.nickname || t.common.user;
            return (
              <TouchableOpacity
                key={conversation.id}
                style={styles.priorityRow}
                onPress={() => openConversation(conversation, nickname, resolveAvatarUrl(partner?.profile?.avatarUrl))}
              >
                <Text style={styles.priorityRowName} numberOfLines={1}>{nickname}</Text>
                <Text style={styles.priorityRowAction}>{t.chat.approveContactRequest}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={styles.summaryWrap}>
        <LinearGradient colors={['#17313e', '#244653']} style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryTitle}>{t.profile.matchesCount}</Text>
            <Text style={styles.summarySubtitle}>{t.likes.summaryHint}</Text>
            <TouchableOpacity style={styles.successStoriesShortcut} onPress={() => router.push('/success-stories')}>
              <Ionicons name="sparkles-outline" size={14} color="#fde68a" />
              <Text style={styles.successStoriesShortcutText}>{t.successStories.title}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryValue}>{conversations.length}</Text>
              <Text style={styles.summaryLabel}>{t.chat.title}</Text>
            </View>
            <View style={[styles.summaryPill, styles.summaryPillGold]}>
              <Text style={[styles.summaryValue, styles.summaryValueGold]}>{superLikesCount}</Text>
              <Text style={[styles.summaryLabel, styles.summaryLabelGold]}>{t.likes.superLikedYou}</Text>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity style={styles.promoCard} onPress={() => router.push('/premium')}>
          <View style={styles.promoIconWrap}>
            <Ionicons name="sparkles" size={18} color="#7c3aed" />
          </View>
          <View style={styles.promoTextWrap}>
            <Text style={styles.promoTitle}>{t.likes.promoTitle}</Text>
            <Text style={styles.promoText}>{t.likes.promoHint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#b197fc" />
        </TouchableOpacity>
      </View>

      {pendingLikes.length > 0 && (
        <View style={styles.newMatchesSection}>
          <Text style={styles.sectionTitle}>{t.chat.newMatches}</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={pendingLikes}
            keyExtractor={(item) => item.id}
            renderItem={renderNewMatchItem}
            contentContainerStyle={styles.newMatchesList}
          />
        </View>
      )}

      {conversations.length > 0 && (
        <>
          <View style={styles.tabsRow}>
            {([
              { key: 'new', label: t.matches.tabNew, count: getConversationCountByTab(conversations, compatibleStatuses, 'new') },
              { key: 'active', label: t.matches.tabActive, count: getConversationCountByTab(conversations, compatibleStatuses, 'active') },
              { key: 'waiting', label: t.matches.tabWaiting, count: getConversationCountByTab(conversations, compatibleStatuses, 'waiting') },
            ] as Array<{ key: MatchesTab; label: string; count: number }>).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabChip, selectedTab === tab.key && styles.tabChipActive]}
                onPress={() => setSelectedTab(tab.key)}
              >
                <Text style={[styles.tabChipText, selectedTab === tab.key && styles.tabChipTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabCount, selectedTab === tab.key && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, selectedTab === tab.key && styles.tabCountTextActive]}>{tab.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.conversationsTitle}>{getTabHeadline(selectedTab, t)}</Text>
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d84b6b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList 
        data={conversations.filter((conversation) => getConversationTab(conversation, compatibleStatuses[conversation.id] || 'none') === selectedTab)}
        renderItem={renderConversationItem}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={() => {
            setRefreshing(true);
            fetchData();
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubbles-outline" size={40} color="#d1d5db" />
                </View>
                <Text style={styles.emptyTitle}>{getEmptyTitle(selectedTab, t)}</Text>
                <Text style={styles.emptyHint}>{getEmptyHint(selectedTab, t)}</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fffaf7' },
  screenHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e4e0',
  },
  screenTitle: { fontSize: 26, fontWeight: '800', color: '#1f2937' },
  priorityBanner: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prioritySection: {
    marginTop: 14,
    gap: 10,
  },
  priorityBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBannerTextWrap: {
    flex: 1,
  },
  priorityBannerTitle: {
    color: '#9a3412',
    fontSize: 13,
    fontWeight: '800',
  },
  priorityBannerText: {
    color: '#c2410c',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  priorityListHeader: {
    paddingHorizontal: 18,
  },
  priorityListTitle: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priorityRow: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priorityRowName: {
    flex: 1,
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '700',
  },
  priorityRowAction: {
    color: '#c2410c',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryWrap: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  summaryCard: {
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  summaryTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
  summarySubtitle: { color: '#d0dce1', fontSize: 12, marginTop: 6, maxWidth: 190 },
  successStoriesShortcut: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,191,36,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  successStoriesShortcutText: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '800',
  },
  summaryStats: { gap: 10 },
  summaryPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 92,
  },
  summaryPillGold: {
    backgroundColor: 'rgba(251,191,36,0.16)',
  },
  summaryValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  summaryLabel: { color: '#d0dce1', fontSize: 11, marginTop: 4 },
  summaryValueGold: { color: '#fcd34d' },
  summaryLabelGold: { color: '#fde68a' },
  promoCard: {
    backgroundColor: '#f7f2ff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promoIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#efe7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTextWrap: { flex: 1 },
  promoTitle: { color: '#5b21b6', fontSize: 14, fontWeight: '800' },
  promoText: { color: '#7c3aed', fontSize: 12, marginTop: 4 },
  newMatchesSection: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f0ee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d84b6b',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  newMatchesList: { paddingHorizontal: 12 },
  newMatchItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    width: 68,
  },
  newMatchAvatarContainer: { position: 'relative', marginBottom: 4 },
  newMatchAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: '#d84b6b',
  },
  newMatchPlaceholder: { fontSize: 22, color: '#fff', fontWeight: '700' },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: '#34d399',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fffaf7',
  },
  newMatchName: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#efe3df',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabChipActive: {
    backgroundColor: '#17313e',
    borderColor: '#17313e',
  },
  tabChipText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  tabChipTextActive: {
    color: '#fff',
  },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  tabCountText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '800',
  },
  tabCountTextActive: {
    color: '#fff',
  },
  conversationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9ca3af',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f0ee',
    alignItems: 'center',
    gap: 14,
  },
  itemContainerUrgent: {
    backgroundColor: '#fffaf1',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  avatarContainer: {},
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  placeholderAvatar: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 20, color: '#9ca3af', fontWeight: '700' },
  textContainer: { flex: 1 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: { fontSize: 15, fontWeight: '600', color: '#1f2937', flex: 1, marginEnd: 8 },
  time: { fontSize: 11, color: '#d1d5db' },
  message: { fontSize: 13, color: '#9ca3af', lineHeight: 18 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  compatibleCta: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginStart: 8,
  },
  compatibleCtaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  profileShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileShortcutText: {
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '700',
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  urgentRowText: {
    color: '#c2410c',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  emptyHint: { fontSize: 14, color: '#9ca3af' },
});

function sortConversations(items: Conversation[], compatibleStatuses: Record<string, CompatibleStatus> = {}) {
  return [...items].sort((left, right) => {
    const leftPriority = getConversationPriority(compatibleStatuses[left.id] || 'none');
    const rightPriority = getConversationPriority(compatibleStatuses[right.id] || 'none');

    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    const leftTime = left.messages?.[0]?.createdAt ? new Date(left.messages[0].createdAt).getTime() : 0;
    const rightTime = right.messages?.[0]?.createdAt ? new Date(right.messages[0].createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

function getConversationPriority(status: CompatibleStatus) {
  if (status === 'contact_request_received') return 6;
  if (status === 'contact_request_approved') return 5;
  if (status === 'both_confirmed') return 4;
  if (status === 'contact_request_pending') return 3;
  if (status === 'contact_request_rejected' || status === 'contact_request_cancelled' || status === 'contact_request_expired') return 2;
  if (status === 'waiting') return 1;
  return 0;
}

function getConversationTab(conversation: Conversation, compatibleStatus: CompatibleStatus): MatchesTab {
  if (
    compatibleStatus === 'waiting' ||
    compatibleStatus === 'both_confirmed' ||
    compatibleStatus === 'contact_request_pending' ||
    compatibleStatus === 'contact_request_received' ||
    compatibleStatus === 'contact_request_approved' ||
    compatibleStatus === 'contact_request_rejected' ||
    compatibleStatus === 'contact_request_cancelled' ||
    compatibleStatus === 'contact_request_expired'
  ) {
    return 'waiting';
  }

  if (!conversation.messages?.length) {
    return 'new';
  }

  return 'active';
}

function getConversationCountByTab(
  conversations: Conversation[],
  compatibleStatuses: Record<string, CompatibleStatus>,
  tab: MatchesTab,
) {
  return conversations.filter((conversation) => getConversationTab(conversation, compatibleStatuses[conversation.id] || 'none') === tab).length;
}

function getStatusLabel(status: CompatibleStatus, t: any) {
  if (status === 'waiting') return t.chat.waitingOther;
  if (status === 'contact_request_pending') return t.chat.contactRequestPendingShort;
  if (status === 'contact_request_received') return t.chat.contactRequestReceivedShort;
  if (status === 'contact_request_approved') return t.matches.readyToExchange;
  if (status === 'contact_request_rejected') return t.chat.contactRequestRejectedShort;
  if (status === 'contact_request_cancelled') return t.chat.contactRequestCancelledShort;
  if (status === 'contact_request_expired') return t.chat.contactRequestExpiredShort;
  if (status === 'both_confirmed') return t.matches.readyToExchange;
  if (status === 'completed') return t.chat.bothConfirmed;
  return t.matches.activeNow;
}

function getStatusBadgeStyle(status: CompatibleStatus) {
  if (status === 'waiting') {
    return { backgroundColor: '#fff1f2' };
  }
  if (status === 'contact_request_pending' || status === 'contact_request_received') {
    return { backgroundColor: '#fff7ed' };
  }
  if (status === 'contact_request_rejected' || status === 'contact_request_cancelled' || status === 'contact_request_expired') {
    return { backgroundColor: '#fef2f2' };
  }
  if (status === 'both_confirmed') {
    return { backgroundColor: '#ecfdf3' };
  }
  if (status === 'contact_request_approved') {
    return { backgroundColor: '#ecfdf3' };
  }
  if (status === 'completed') {
    return { backgroundColor: '#eef2ff' };
  }
  return { backgroundColor: '#f3f4f6' };
}

function getStatusBadgeTextStyle(status: CompatibleStatus) {
  if (status === 'waiting') {
    return { color: '#be123c' };
  }
  if (status === 'contact_request_pending' || status === 'contact_request_received') {
    return { color: '#c2410c' };
  }
  if (status === 'contact_request_rejected' || status === 'contact_request_cancelled' || status === 'contact_request_expired') {
    return { color: '#b91c1c' };
  }
  if (status === 'both_confirmed') {
    return { color: '#047857' };
  }
  if (status === 'contact_request_approved') {
    return { color: '#047857' };
  }
  if (status === 'completed') {
    return { color: '#4338ca' };
  }
  return { color: '#4b5563' };
}

function getTabHeadline(tab: MatchesTab, t: any) {
  if (tab === 'new') return t.matches.tabNew;
  if (tab === 'waiting') return t.matches.tabWaiting;
  return t.matches.tabActive;
}

function getEmptyTitle(tab: MatchesTab, t: any) {
  if (tab === 'new') return t.matches.emptyNewTitle;
  if (tab === 'waiting') return t.matches.emptyWaitingTitle;
  return t.chat.noChats;
}

function getEmptyHint(tab: MatchesTab, t: any) {
  if (tab === 'new') return t.matches.emptyNewHint;
  if (tab === 'waiting') return t.matches.emptyWaitingHint;
  return t.chat.noChatsHint;
}

function getCompatibleCtaLabel(status: CompatibleStatus, t: any) {
  if (status === 'both_confirmed' || status === 'completed' || status === 'contact_request_pending') return t.matches.openMatch;
  if (status === 'contact_request_approved') return t.chat.addContact;
  if (status === 'contact_request_received') return t.chat.approveContactRequest;
  if (status === 'contact_request_rejected' || status === 'contact_request_cancelled' || status === 'contact_request_expired') return t.chat.requestContactExchange;
  if (status === 'waiting') return t.matches.compatiblePending;
  return t.chat.compatible;
}

function getCompatibleCtaStyle(status: CompatibleStatus) {
  if (status === 'both_confirmed' || status === 'completed' || status === 'contact_request_pending') {
    return { backgroundColor: '#eef2ff' };
  }
  if (status === 'contact_request_approved') {
    return { backgroundColor: '#ecfdf3' };
  }
  if (status === 'contact_request_received' || status === 'contact_request_pending') {
    return { backgroundColor: '#fff7ed' };
  }
  if (status === 'contact_request_rejected' || status === 'contact_request_cancelled' || status === 'contact_request_expired') {
    return { backgroundColor: '#fef2f2' };
  }
  if (status === 'waiting') {
    return { backgroundColor: '#fff1f2' };
  }
  return { backgroundColor: '#17313e' };
}

function getCompatibleCtaTextStyle(status: CompatibleStatus) {
  if (status === 'both_confirmed' || status === 'completed' || status === 'contact_request_pending') {
    return { color: '#4338ca' };
  }
  if (status === 'contact_request_approved') {
    return { color: '#047857' };
  }
  if (status === 'contact_request_received' || status === 'contact_request_pending') {
    return { color: '#c2410c' };
  }
  if (status === 'contact_request_rejected' || status === 'contact_request_cancelled' || status === 'contact_request_expired') {
    return { color: '#b91c1c' };
  }
  if (status === 'waiting') {
    return { color: '#be123c' };
  }
  return { color: '#fff' };
}