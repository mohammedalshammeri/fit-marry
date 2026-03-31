import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { useI18n } from '../../src/i18n';

interface Like {
  id: string;
  type?: string;
  fromUser: {
    id: string;
    profile?: {
      nickname?: string;
      avatarUrl?: string;
    } | null;
  };
  createdAt: string;
}

export default function LikesScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchLikes = async () => {
    try {
      const response = await api.get('/likes/inbox');
      setLikes(response.data);
    } catch (error) {
      console.log('Likes Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
        fetchLikes();
    }, [])
  );

  const handleAccept = async (id: string, nickname: string) => {
    setProcessing(id);
    try {
      await api.post(`/likes/${id}/accept`);
      Alert.alert(t.likes.matchCreated, '', [
        { text: t.chat.title, onPress: () => router.push('/(tabs)/matches') },
        { text: t.common.ok }
      ]);
      setLikes(prev => prev.filter(l => l.id !== id));
    } catch (error: any) {
        if (error.response?.data?.message?.includes('maximum')) {
            Alert.alert(t.common.error, t.likes.maxConversations);
        } else {
            Alert.alert(t.common.error, t.likes.acceptError);
        }
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await api.post(`/likes/${id}/reject`);
      setLikes(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      Alert.alert(t.common.error, t.likes.rejectError);
    } finally {
      setProcessing(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return t.notifications.now;
    if (hours < 24) return t.notifications.hoursAgo.replace('{count}', String(hours));
    return t.notifications.daysAgo.replace('{count}', String(days));
  };

  const superLikesCount = likes.filter((item) => item.type === 'SUPER_LIKE').length;

  const renderItem = ({ item }: { item: Like }) => {
    const { fromUser } = item;
    const nickname = fromUser.profile?.nickname || t.common.user;
    const avatar = fromUser.profile?.avatarUrl;
    const isSuperLike = item.type === 'SUPER_LIKE';

    return (
      <View style={[styles.card, isSuperLike && styles.superLikeCard]}>
        {isSuperLike && (
          <View style={styles.superBadge}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={styles.superBadgeText}>{t.likes.superLikedYou}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
            {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
                <LinearGradient colors={['#f0e4e0', '#d9d3cf']} style={[styles.avatar, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderText}>{nickname[0]}</Text>
                </LinearGradient>
            )}
            <View style={styles.textContainer}>
                <Text style={styles.name}>{nickname}</Text>
                <Text style={styles.subText}>{t.likes.wantsToConnect}</Text>
                <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
            </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.previewBtn}
            onPress={() => router.push(`/user/${fromUser.id}` as any)}
          >
            <Ionicons name="person-outline" size={18} color="#6366f1" />
            <Text style={styles.previewText}>{t.likes.viewProfile}</Text>
          </TouchableOpacity>

            <TouchableOpacity 
                style={styles.rejectBtn} 
                onPress={() => handleReject(item.id)}
                disabled={processing === item.id}
            >
                <Ionicons name="close" size={20} color="#ef4444" />
                <Text style={styles.rejectText}>{t.likes.reject}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.acceptBtn} 
                onPress={() => handleAccept(item.id, nickname)}
                disabled={processing === item.id}
            >
                {processing === item.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.acceptText}>{t.likes.accept}</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d84b6b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#ffffff', '#fffaf7']} style={styles.header}>
        <Text style={styles.headerTitle}>{t.likes.title}</Text>
        {likes.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{likes.length}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.summaryWrap}>
        <LinearGradient colors={['#17313e', '#244653']} style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryTitle}>{t.likes.likedYou}</Text>
            <Text style={styles.summarySubtitle}>{t.likes.summaryHint}</Text>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatPill}>
              <Text style={styles.summaryStatValue}>{likes.length}</Text>
              <Text style={styles.summaryStatLabel}>{t.likes.title}</Text>
            </View>
            <View style={[styles.summaryStatPill, styles.summaryStatPillGold]}>
              <Text style={[styles.summaryStatValue, styles.summaryStatGoldValue]}>{superLikesCount}</Text>
              <Text style={[styles.summaryStatLabel, styles.summaryStatGoldLabel]}>{t.likes.superLikedYou}</Text>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity style={styles.promoCard} onPress={() => router.push('/premium')}>
          <View style={styles.promoIconWrap}>
            <Ionicons name="diamond" size={18} color="#7c3aed" />
          </View>
          <View style={styles.promoTextWrap}>
            <Text style={styles.promoTitle}>{t.likes.promoTitle}</Text>
            <Text style={styles.promoText}>{t.likes.promoHint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#b197fc" />
        </TouchableOpacity>
      </View>

      <FlatList 
          data={likes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
              <View style={styles.emptyContainer}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="heart-outline" size={40} color="#d1d5db" />
                  </View>
                  <Text style={styles.emptyTitle}>{t.likes.noLikes}</Text>
                  <Text style={styles.emptyHint}>{t.likes.noLikesHint}</Text>
              </View>
          }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fffaf7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e4e0',
    gap: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1f2937' },
  countBadge: {
    backgroundColor: '#d84b6b',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
  summaryStats: { gap: 10 },
  summaryStatPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 92,
  },
  summaryStatPillGold: {
    backgroundColor: 'rgba(251,191,36,0.16)',
  },
  summaryStatValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  summaryStatLabel: { color: '#d0dce1', fontSize: 11, marginTop: 4 },
  summaryStatGoldValue: { color: '#fcd34d' },
  summaryStatGoldLabel: { color: '#fde68a' },
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
  list: { padding: 16, paddingBottom: 30, paddingTop: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  superLikeCard: {
    borderWidth: 1.5,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  superBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  superBadgeText: { color: '#b45309', fontSize: 12, fontWeight: '600' },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  placeholderAvatar: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 22, color: '#9ca3af', fontWeight: '700' },
  textContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  subText: { fontSize: 13, color: '#9ca3af' },
  timeText: { fontSize: 11, color: '#d1d5db', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  previewText: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  rejectText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#d84b6b',
    shadowColor: '#d84b6b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  acceptText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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
  emptyHint: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 40 },
});