import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ScrollView,
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Image,
  Alert
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { connectMessagesSocket, disconnectMessagesSocket } from '../../src/services/socket';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useScreenProtection } from '../../src/hooks/useScreenProtection';
import VoiceRecorder from '../../src/components/VoiceRecorder';
import VoicePlayer from '../../src/components/VoicePlayer';
import { useI18n } from '../../src/i18n';
import type { Socket } from 'socket.io-client';
import type { Message as ChatMessage } from '../../src/types';

export default function ChatScreen() {
  const router = useRouter();
  const { id, name, avatar } = useLocalSearchParams() as unknown as { id: string; name: string, avatar: string };
  const { user } = useAuth();
  const { t } = useI18n();
  const [messages, setMessages] = useState([] as ChatMessage[]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Image Viewing State
  const [viewingImage, setViewingImage] = useState(null as string | null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [hasGrantedPhotoAccess, setHasGrantedPhotoAccess] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerLastSeenAt, setPartnerLastSeenAt] = useState<string | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerGuardianAvailable, setPartnerGuardianAvailable] = useState(false);
  const [partnerGuardianRelation, setPartnerGuardianRelation] = useState<string | null>(null);
  const [compatibleStatus, setCompatibleStatus] = useState<{
    status: 'none' | 'waiting' | 'both_confirmed' | 'contact_request_pending' | 'contact_request_received' | 'contact_request_approved' | 'contact_request_rejected' | 'contact_request_cancelled' | 'contact_request_expired' | 'completed' | 'no_match';
    myConfirmed?: boolean;
    theirConfirmed?: boolean;
    myContactAdded?: boolean;
    myContactRequestSent?: boolean;
    theirContactRequestSent?: boolean;
    canExchangeContacts?: boolean;
    contactRequestRequestedByMe?: boolean;
    contactRequestExpiresAt?: string | null;
  } | null>(null);
  const [contactInfo, setContactInfo] = useState('');
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [compatibleLoading, setCompatibleLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const typingStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enable Screen Protection (Block Screenshots) when viewing an image
  useScreenProtection(!!viewingImage);

  // Safe user ID access
  // @ts-ignore
  const myId = user?.id || user?.sub;
  const isPremiumUser = user?.subscriptionTier === 'PREMIUM';
  const icebreakers = [
    t.chat.icebreakerOne,
    t.chat.icebreakerTwo,
    t.chat.icebreakerThree,
  ];

  useEffect(() => {
    let active = true;

    const setupRealtime = async () => {
      await fetchConversationDetails();
      await fetchMessages();

      const socket = await connectMessagesSocket();
      if (!active || !socket) {
        return;
      }


      socketRef.current = socket;

      const joinRoom = () => {
        socket.emit('conversation:join', { conversationId: id });
      };

      const handleNewMessage = (message: ChatMessage) => {
        if (message.conversationId !== id) {
          return;
        }

        setMessages((current) => mergeMessages(current, [message]));

        if (message.senderId !== myId) {
          api.post(`/messages/${message.id}/view`).catch(() => {});
        }
      };

      const handleReadMessage = (payload: { messageId: string; userId: string; readAt: string }) => {
        if (payload.userId === myId) {
          return;
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === payload.messageId ? { ...message, readAt: payload.readAt } : message,
          ),
        );
      };

      const handleTypingStart = (payload: { conversationId?: string; userId: string }) => {
        if (payload.conversationId !== id || payload.userId === myId) {
          return;
        }

        setIsPartnerTyping(true);
        if (partnerTypingTimeoutRef.current) {
          clearTimeout(partnerTypingTimeoutRef.current);
        }
        partnerTypingTimeoutRef.current = setTimeout(() => {
          setIsPartnerTyping(false);
        }, 3000);
      };

      const handleTypingStop = (payload: { conversationId?: string; userId: string }) => {
        if (payload.conversationId !== id || payload.userId === myId) {
          return;
        }

        setIsPartnerTyping(false);
        if (partnerTypingTimeoutRef.current) {
          clearTimeout(partnerTypingTimeoutRef.current);
          partnerTypingTimeoutRef.current = null;
        }
      };

      const handlePresence = (payload: { userId: string; isOnline: boolean; lastSeenAt?: string }) => {
        if (payload.userId !== partnerId) {
          return;
        }

        setIsPartnerOnline(payload.isOnline);
        if (payload.lastSeenAt) {
          setPartnerLastSeenAt(payload.lastSeenAt);
        }
      };

      const handleDeletedMessage = (data: { messageId: string }) => {
        setMessages((current) => current.filter(m => m.id !== data.messageId));
      };

      const handleCompatibleMatch = () => {
        fetchCompatibleStatus();
      };

      socket.on('connect', joinRoom);
      socket.on('message:new', handleNewMessage);
      socket.on('message:read', handleReadMessage);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);
      socket.on('user:presence', handlePresence);
      socket.on('message:deleted', handleDeletedMessage);
      socket.on('compatible:match', handleCompatibleMatch);

      if (socket.connected) {
        joinRoom();
      }

      socketRef.current = socket;
      socketRef.current.off('message:new', handleNewMessage);
      socketRef.current.off('message:read', handleReadMessage);
      socketRef.current.off('typing:start', handleTypingStart);
      socketRef.current.off('typing:stop', handleTypingStop);
      socketRef.current.off('user:presence', handlePresence);
      socketRef.current.off('message:deleted', handleDeletedMessage);
      socketRef.current.off('compatible:match', handleCompatibleMatch);
      socketRef.current.on('message:new', handleNewMessage);
      socketRef.current.on('message:read', handleReadMessage);
      socketRef.current.on('typing:start', handleTypingStart);
      socketRef.current.on('typing:stop', handleTypingStop);
      socketRef.current.on('user:presence', handlePresence);
      socketRef.current.on('message:deleted', handleDeletedMessage);
      socketRef.current.on('compatible:match', handleCompatibleMatch);
    };

    setupRealtime();

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.emit('typing:stop', { conversationId: id });
        socketRef.current.emit('conversation:leave', { conversationId: id });
        socketRef.current.off('message:new');
        socketRef.current.off('message:read');
        socketRef.current.off('typing:start');
        socketRef.current.off('typing:stop');
        socketRef.current.off('user:presence');
        socketRef.current.off('message:deleted');
        socketRef.current.off('compatible:match');
        socketRef.current.off('connect');
      }
      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
      disconnectMessagesSocket();
    };
  }, [id]);

  // Timer for View Once (5 Seconds)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (viewingImage && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setViewingImage(null); // Close modal automatically
            Alert.alert(t.chat.timedOut, t.chat.imageClosedPrivacy);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [viewingImage, timeLeft]);

  const fetchConversationDetails = async () => {
    try {
      const [conversationRes, compatibleRes] = await Promise.all([
        api.get(`/conversations/${id}`),
        api.get(`/conversations/${id}/compatible/status`).catch(() => ({ data: null })),
      ]);
      const conv = conversationRes.data;
      if (conv.photoAccesses) {
        const access = conv.photoAccesses.find((p: any) => p.granterUserId === myId);
        setHasGrantedPhotoAccess(!!access);
      }
      if (conv.participants) {
        const partner = conv.participants.find((p: any) => p.userId !== myId);
        if (partner) {
          setPartnerId(partner.userId);
          setPartnerLastSeenAt(partner.user?.lastSeenAt || null);
          setPartnerGuardianAvailable(!!partner.user?.profile?.guardianAvailable);
          setPartnerGuardianRelation(partner.user?.profile?.guardianRelation || null);
        }
      }
      if (compatibleRes.data) {
        setCompatibleStatus(compatibleRes.data);
      }
    } catch (err) {
      console.log('Error fetching conversation', err);
    }
  };

  const fetchCompatibleStatus = async () => {
    try {
      const res = await api.get(`/conversations/${id}/compatible/status`);
      setCompatibleStatus(res.data);
    } catch (error) {
      console.log('Error fetching compatible status', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${id}`);
      // Backend returns { items: [], ... }
      const newMessages = (res.data.items || []) as ChatMessage[];
      setMessages((current) => mergeMessages(current, newMessages));
      newMessages
        .filter((message) => message.senderId !== myId && !message.viewedAt)
        .forEach((message) => {
          api.post(`/messages/${message.id}/view`).catch(() => {});
        });
    } catch (err) {
      console.log('Error fetching messages', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    setSending(true);
    const tempText = inputText;
    setInputText(''); 
    emitTypingStop();

    try {
      await api.post('/messages', {
        conversationId: id,
        type: 'TEXT',
        text: tempText
      });
    } catch (err) {
      console.error('Send Error', err);
      setInputText(tempText);
      Alert.alert(t.common.error, t.chat.sendMessageFailed);
    } finally {
      setSending(false);
    }
  };

  const handleCompatibleAction = async () => {
    setCompatibleLoading(true);
    try {
      const res = await api.post(`/conversations/${id}/compatible`);
      setCompatibleStatus((current) => ({
        ...(current || { status: 'none' as const }),
        ...res.data,
        myConfirmed: true,
      }));
      await fetchCompatibleStatus();
    } catch (error: any) {
      Alert.alert(t.common.error, error.response?.data?.message || t.chat.permissionFailed);
    } finally {
      setCompatibleLoading(false);
    }
  };

  const handleSubmitContactInfo = async () => {
    if (!contactInfo.trim()) {
      return;
    }

    setCompatibleLoading(true);
    try {
      await api.post(`/conversations/${id}/compatible/contact`, { contactInfo: contactInfo.trim() });
      setContactModalVisible(false);
      setContactInfo('');
      await fetchCompatibleStatus();
      Alert.alert(t.common.success, t.chat.bothConfirmed);
    } catch (error: any) {
      Alert.alert(t.common.error, error.response?.data?.message || t.common.updateFailed);
    } finally {
      setCompatibleLoading(false);
    }
  };

  const handleContactRequestAction = async () => {
    setCompatibleLoading(true);
    try {
      await api.post(`/conversations/${id}/compatible/contact-request`);
      await fetchCompatibleStatus();
      Alert.alert(
        t.common.success,
        compatibleStatus?.status === 'contact_request_received' ? t.chat.contactRequestApproved : t.chat.contactRequestPending,
      );
    } catch (error: any) {
      Alert.alert(t.common.error, error.response?.data?.message || t.common.updateFailed);
    } finally {
      setCompatibleLoading(false);
    }
  };

  const handleRejectContactRequest = async () => {
    setCompatibleLoading(true);
    try {
      await api.post(`/conversations/${id}/compatible/contact-request/reject`);
      await fetchCompatibleStatus();
      Alert.alert(t.common.success, t.chat.contactRequestRejected);
    } catch (error: any) {
      Alert.alert(t.common.error, error.response?.data?.message || t.common.updateFailed);
    } finally {
      setCompatibleLoading(false);
    }
  };

  const handleCancelContactRequest = async () => {
    setCompatibleLoading(true);
    try {
      await api.post(`/conversations/${id}/compatible/contact-request/cancel`);
      await fetchCompatibleStatus();
      Alert.alert(t.common.success, t.chat.contactRequestCancelled);
    } catch (error: any) {
      Alert.alert(t.common.error, error.response?.data?.message || t.common.updateFailed);
    } finally {
      setCompatibleLoading(false);
    }
  };

  const emitTypingStop = () => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    socketRef.current?.emit('typing:stop', { conversationId: id });
  };

  const handleInputChange = (value: string) => {
    setInputText(value);

    if (!socketRef.current) {
      return;
    }

    if (!value.trim()) {
      emitTypingStop();
      return;
    }

    socketRef.current.emit('typing:start', { conversationId: id });

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { conversationId: id });
      typingStopTimeoutRef.current = null;
    }, 1200);
  };

  const pickAndSendImage = async () => {
    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            if (!asset.base64) {
                Alert.alert(t.common.error, t.chat.imageProcessError);
                return;
            }

            setSending(true);

            // 1. Upload Temp Image
            try {
                const uploadRes = await api.post('/messages/media', {
                    conversationId: id,
                    base64: asset.base64,
                    contentType: 'image/jpeg'
                });

                const tempMediaId = uploadRes.data.tempMediaId;

                // 2. Send Message with tempMediaId
                await api.post('/messages', {
                    conversationId: id,
                    type: 'IMAGE',
                    tempMediaId: tempMediaId,
                    viewOnce: true // Enforce view once logic on backend if supported
                });

            } catch (error: any) {
                const msg = error.response?.data?.message || t.chat.imageSendFailed;
                Alert.alert(t.common.error, typeof msg === 'string' ? msg : JSON.stringify(msg));
            } finally {
                setSending(false);
            }
        }
    } catch (e) {
        console.log(e);
        Alert.alert(t.common.error, t.chat.imageSelectError);
    }
  };

  const openImage = async (messageId: string) => {
    setLoadingImage(true);
    try {
        const res = await api.get(`/messages/${messageId}/media`);
        const base64 = res.data.base64;
        const mime = res.data.contentType || 'image/jpeg';
        setViewingImage(`data:${mime};base64,${base64}`);
        setTimeLeft(5); // Start the 5s timer
    } catch (error: any) {
        const msg = error.response?.data?.message || t.chat.imageLoadFailed;
        Alert.alert(t.common.error, msg === 'Media expired' ? t.chat.imageExpired : msg);
    } finally {
        setLoadingImage(false);
    }
  };

  const togglePhotoAccess = async () => {
    try {
      if (hasGrantedPhotoAccess) {
        await api.post('/conversations/photo-access/revoke', { conversationId: id });
        setHasGrantedPhotoAccess(false);
        Alert.alert(t.chat.cancelled, t.chat.photosHidden);
      } else {
        await api.post('/conversations/photo-access', { conversationId: id });
        setHasGrantedPhotoAccess(true);
        Alert.alert(t.chat.allowed, t.chat.photosRevealed);
      }
    } catch (err) {
      console.log('Error toggling photo access', err);
      Alert.alert(t.common.error, t.chat.permissionFailed);
    }
  };

  const sendVoiceMessage = async (base64: string, contentType: string, _durationMs: number) => {
    setSending(true);
    try {
      const uploadRes = await api.post('/messages/audio', {
        conversationId: id,
        base64,
        contentType,
      });

      await api.post('/messages', {
        conversationId: id,
        type: 'VOICE',
        tempMediaId: uploadRes.data.tempMediaId,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || t.chat.voiceSendFailed;
      Alert.alert(t.common.error, typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    Alert.alert(t.chat.deleteMessage, t.chat.deleteMessageConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete, style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m.id !== messageId));
          } catch (err) {
            Alert.alert(t.common.error, t.chat.deleteMessageFailed);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === myId;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => isMe && deleteMessage(item.id)}
        style={[
          styles.bubble, 
          isMe ? styles.bubbleMe : styles.bubbleThem
        ]}
      >
        {!isMe && (
            <Text style={styles.senderName}>{name}</Text>
        )}
        
        {item.type === 'VOICE' ? (
            <VoicePlayer messageId={item.id} isMe={isMe} />
        ) : item.type === 'IMAGE' ? (
            <TouchableOpacity 
                style={styles.imagePlaceholder} 
                onPress={() => openImage(item.id)}
            >
                <Text style={styles.imageIcon}>📷</Text>
                <Text style={styles.imageText}>{t.chat.tempPhoto}</Text>
            </TouchableOpacity>
        ) : (
            <Text style={[
                styles.messageText, 
                isMe ? styles.textMe : styles.textThem
            ]}>
              {item.text}
            </Text>
        )}

        <View style={styles.messageMetaRow}>
          <Text style={[styles.timeText, isMe ? styles.timeMe : styles.timeThem]}>
              {format(new Date(item.createdAt), 'HH:mm')}
          </Text>
          {isMe ? (
            <Ionicons
              name={item.readAt ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={item.readAt ? '#bfdbfe' : 'rgba(255,255,255,0.75)'}
              style={styles.readReceiptIcon}
            />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const statusLabel = isPartnerTyping
    ? t.chat.typing
    : isPartnerOnline
      ? t.chat.online
      : partnerLastSeenAt
        ? `${t.chat.lastSeen} ${format(new Date(partnerLastSeenAt), 'HH:mm')}`
        : '';

  const compatibleBannerText = compatibleStatus?.status === 'both_confirmed'
    ? t.chat.contactRequestHint
    : compatibleStatus?.status === 'contact_request_pending'
      ? t.chat.contactRequestPending
      : compatibleStatus?.status === 'contact_request_received'
        ? t.chat.contactRequestReceived
        : compatibleStatus?.status === 'contact_request_approved'
          ? compatibleStatus.myContactAdded
            ? t.chat.bothConfirmed
            : t.chat.addContact
    : compatibleStatus?.status === 'contact_request_rejected'
      ? t.chat.contactRequestRejectedHint
    : compatibleStatus?.status === 'contact_request_cancelled'
      ? t.chat.contactRequestCancelledHint
    : compatibleStatus?.status === 'contact_request_expired'
      ? t.chat.contactRequestExpiredHint
    : compatibleStatus?.status === 'waiting'
      ? t.chat.waitingOther
      : compatibleStatus?.status === 'completed'
        ? t.chat.bothConfirmed
        : t.chat.compatibleHint;

  const journeySteps = [
    { key: 'like', label: t.chat.journeyLike, active: true },
    {
      key: 'compatible',
      label: t.chat.journeyCompatible,
      active: !!compatibleStatus && compatibleStatus.status !== 'none' && compatibleStatus.status !== 'no_match',
    },
    {
      key: 'request',
      label: t.chat.journeyRequest,
      active: compatibleStatus?.status === 'contact_request_pending'
        || compatibleStatus?.status === 'contact_request_received'
        || compatibleStatus?.status === 'contact_request_approved'
        || compatibleStatus?.status === 'contact_request_rejected'
        || compatibleStatus?.status === 'contact_request_cancelled'
        || compatibleStatus?.status === 'contact_request_expired'
        || compatibleStatus?.status === 'completed',
    },
    {
      key: 'approved',
      label: t.chat.journeyApproved,
      active: compatibleStatus?.status === 'contact_request_approved' || compatibleStatus?.status === 'completed',
    },
    {
      key: 'contact',
      label: t.chat.journeyContact,
      active: !!compatibleStatus?.myContactAdded || compatibleStatus?.status === 'completed',
    },
    {
      key: 'completed',
      label: t.chat.journeyCompleted,
      active: compatibleStatus?.status === 'completed',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerTitle: () => (
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitleText}>{name || 'Chat'}</Text>
              {statusLabel ? <Text style={styles.headerStatusText}>{statusLabel}</Text> : null}
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              {partnerId && (
                <TouchableOpacity 
                  onPress={() => router.push({ 
                    pathname: `/call/${id}` as any, 
                    params: { id, targetName: name, targetAvatar: avatar, partnerId } 
                  })} 
                  style={styles.headerBtn}
                >
                  <Ionicons name="call" size={24} color="#E91E63" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={togglePhotoAccess} style={styles.headerBtn}>
                <Text style={{ color: hasGrantedPhotoAccess ? '#E91E63' : '#333' }}>
                  {hasGrantedPhotoAccess ? t.chat.hideMyPhotos : t.chat.revealMyPhotos}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      
      {loading ? (
        <View style={styles.loader}>
            <ActivityIndicator size="large" color="#E91E63" />
        </View>
      ) : (
        <FlatList
            data={messages}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            inverted
            contentContainerStyle={styles.listContent}
        />
      )}

      {isPartnerTyping ? (
        <View style={styles.typingContainer}>
          <Ionicons name="ellipsis-horizontal" size={16} color="#E91E63" />
          <Text style={styles.typingText}>{name || t.chat.typing}</Text>
        </View>
      ) : null}

      {partnerGuardianAvailable ? (
        <View style={styles.guardianBanner}>
          <Ionicons name="people-circle-outline" size={18} color="#7c3aed" />
          <Text style={styles.guardianBannerText}>
            {partnerGuardianRelation
              ? `${t.chat.guardianAvailable}: ${partnerGuardianRelation}`
              : t.chat.guardianAvailable}
          </Text>
        </View>
      ) : null}

      <View style={styles.compatibleBanner}>
        <View style={styles.compatibleBannerTextWrap}>
          <Ionicons name="heart-circle" size={18} color="#d84b6b" />
          <Text style={styles.compatibleBannerTitle}>{t.chat.compatible}</Text>
          <Text style={styles.compatibleBannerHint}>{compatibleBannerText}</Text>
          <View style={styles.journeyTimeline}>
            {journeySteps.map((step) => (
              <View key={step.key} style={[styles.journeyStep, step.active && styles.journeyStepActive]}>
                <Text style={[styles.journeyStepText, step.active && styles.journeyStepTextActive]}>{step.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.compatibleActionsColumn}>
          {compatibleStatus?.status === 'contact_request_approved' && !compatibleStatus?.myContactAdded ? (
            <TouchableOpacity style={styles.compatiblePrimaryBtn} onPress={() => setContactModalVisible(true)}>
              <Text style={styles.compatiblePrimaryBtnText}>{t.chat.addContact}</Text>
            </TouchableOpacity>
          ) : compatibleStatus?.status === 'contact_request_received' ? (
            <>
              <TouchableOpacity style={styles.compatiblePrimaryBtn} onPress={handleContactRequestAction} disabled={compatibleLoading}>
                <Text style={styles.compatiblePrimaryBtnText}>{compatibleLoading ? '...' : t.chat.approveContactRequest}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.compatibleSecondaryBtn} onPress={handleRejectContactRequest} disabled={compatibleLoading}>
                <Text style={styles.compatibleSecondaryBtnText}>{t.chat.rejectContactRequest}</Text>
              </TouchableOpacity>
            </>
          ) : compatibleStatus?.status === 'contact_request_pending' ? (
            <>
              <TouchableOpacity style={styles.compatiblePrimaryBtnMuted} disabled>
                <Text style={styles.compatiblePrimaryBtnMutedText}>{t.chat.contactRequestPendingShort}</Text>
              </TouchableOpacity>
              {compatibleStatus.contactRequestRequestedByMe ? (
                <TouchableOpacity style={styles.compatibleSecondaryBtn} onPress={handleCancelContactRequest} disabled={compatibleLoading}>
                  <Text style={styles.compatibleSecondaryBtnText}>{t.chat.cancelContactRequest}</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : compatibleStatus?.status === 'both_confirmed' || compatibleStatus?.status === 'contact_request_rejected' || compatibleStatus?.status === 'contact_request_cancelled' || compatibleStatus?.status === 'contact_request_expired' ? (
            <TouchableOpacity style={styles.compatiblePrimaryBtn} onPress={handleContactRequestAction} disabled={compatibleLoading}>
              <Text style={styles.compatiblePrimaryBtnText}>{compatibleLoading ? '...' : t.chat.requestContactExchange}</Text>
            </TouchableOpacity>
          ) : compatibleStatus?.status === 'completed' ? (
            <TouchableOpacity style={styles.compatiblePrimaryBtn} onPress={() => router.push({ pathname: '/match-success', params: { name: String(name || '') } })}>
              <Text style={styles.compatiblePrimaryBtnText}>{t.common.seeAll}</Text>
            </TouchableOpacity>
          ) : compatibleStatus?.status === 'none' || compatibleStatus?.status === 'no_match' ? (
            <TouchableOpacity style={styles.compatiblePrimaryBtn} onPress={handleCompatibleAction} disabled={compatibleLoading}>
              <Text style={styles.compatiblePrimaryBtnText}>{compatibleLoading ? '...' : t.chat.compatible}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.icebreakerSection}>
        <View style={styles.icebreakerHeader}>
          <Text style={styles.icebreakerTitle}>{t.chat.icebreakersTitle}</Text>
          {!isPremiumUser ? (
            <TouchableOpacity style={styles.icebreakerUpgradeBtn} onPress={() => router.push('/premium')}>
              <Ionicons name="diamond" size={14} color="#fff" />
              <Text style={styles.icebreakerUpgradeText}>{t.discovery.upgrade}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.icebreakerList}>
          {icebreakers.map((template, index) => (
            <TouchableOpacity
              key={`${template}-${index}`}
              style={[styles.icebreakerChip, !isPremiumUser && styles.icebreakerChipLocked]}
              onPress={() => {
                if (!isPremiumUser) {
                  Alert.alert(t.discovery.upgradeRequired, t.chat.icebreakersPremiumHint, [
                    { text: t.common.cancel, style: 'cancel' },
                    { text: t.discovery.upgrade, onPress: () => router.push('/premium') },
                  ]);
                  return;
                }
                setInputText(template);
              }}
            >
              <Ionicons name={isPremiumUser ? 'flash' : 'lock-closed'} size={14} color={isPremiumUser ? '#d84b6b' : '#9ca3af'} />
              <Text style={[styles.icebreakerChipText, !isPremiumUser && styles.icebreakerChipTextLocked]}>{template}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
            <TouchableOpacity onPress={pickAndSendImage} disabled={sending} style={styles.attachButton}>
                <Text style={styles.attachIcon}>📷</Text>
            </TouchableOpacity>

            <VoiceRecorder onSend={sendVoiceMessage} disabled={sending} />

            <TextInput
                style={styles.input}
                value={inputText}
              onChangeText={handleInputChange}
                placeholder={t.chat.writeMessage}
                textAlign={undefined}
                multiline
            />
            <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() && !sending) && styles.disabledSend]}
                onPress={sendMessage}
                disabled={!inputText.trim() || sending}
            >
                <Text style={styles.sendText}>
                    {sending ? '...' : t.common.send}
                </Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!viewingImage || loadingImage} transparent={true} onRequestClose={() => setViewingImage(null)}>
        <View style={styles.modalContainer}>
            {viewingImage && (
                <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>{timeLeft}</Text>
                    <Text style={styles.timerSubText}>{t.common.secondsToClose}</Text>
                </View>
            )}

            <TouchableOpacity style={styles.closeModal} onPress={() => setViewingImage(null)}>
                <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            
            {loadingImage ? (
                <View style={styles.loader}>
                     <ActivityIndicator size="large" color="#fff" />
                     <Text style={{color:'#fff', marginTop:10}}>{t.common.imageLoading}</Text>
                </View>
            ) : (
                viewingImage && <Image source={{ uri: viewingImage }} style={styles.fullImage} resizeMode="contain" />
            )}
        </View>
      </Modal>

      <Modal visible={contactModalVisible} transparent animationType="slide" onRequestClose={() => setContactModalVisible(false)}>
        <View style={styles.modalOverlayCard}>
          <View style={styles.contactModalCard}>
            <Text style={styles.contactModalTitle}>{t.chat.addContact}</Text>
            <TextInput
              style={styles.contactInput}
              value={contactInfo}
              onChangeText={setContactInfo}
              placeholder={t.chat.addContact}
              multiline
            />
            <View style={styles.contactModalActions}>
              <TouchableOpacity style={styles.contactSecondaryBtn} onPress={() => setContactModalVisible(false)}>
                <Text style={styles.contactSecondaryText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactPrimaryBtn} onPress={handleSubmitContactInfo} disabled={compatibleLoading}>
                <Text style={styles.contactPrimaryText}>{compatibleLoading ? '...' : t.common.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const messageMap = new Map<string, ChatMessage>();

  [...current, ...incoming].forEach((message) => {
    messageMap.set(message.id, message);
  });

  return Array.from(messageMap.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBtn: {
    paddingHorizontal: 10,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerStatusText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 10,
    paddingBottom: 20
  },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#E91E63',
    borderBottomRightRadius: 2,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#eee'
  },
  senderName: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
    textAlign: 'left'
  },
  messageText: {
    fontSize: 16,
  },
  textMe: {
    color: '#fff',
  },
  textThem: {
    color: '#333',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
  },
  readReceiptIcon: {
    marginTop: 4,
  },
  timeMe: {
    color: 'rgba(255,255,255,0.7)'
  },
  timeThem: {
    color: '#999'
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center'
  },
  typingContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff4f7',
    borderTopWidth: 1,
    borderTopColor: '#f5d1dc',
  },
  typingText: {
    color: '#a33a5d',
    fontSize: 13,
    fontWeight: '600',
  },
  guardianBanner: {
    backgroundColor: '#faf5ff',
    borderTopWidth: 1,
    borderTopColor: '#efe3ff',
    borderBottomWidth: 1,
    borderBottomColor: '#efe3ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guardianBannerText: {
    flex: 1,
    color: '#6d28d9',
    fontSize: 12,
    fontWeight: '700',
  },
  compatibleBanner: {
    backgroundColor: '#fff9fb',
    borderTopWidth: 1,
    borderTopColor: '#f4d9e1',
    borderBottomWidth: 1,
    borderBottomColor: '#f4d9e1',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compatibleActionsColumn: {
    gap: 8,
    alignItems: 'stretch',
  },
  compatibleBannerTextWrap: {
    flex: 1,
  },
  compatibleBannerTitle: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  compatibleBannerHint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  journeyTimeline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  journeyStep: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#f3f4f6',
  },
  journeyStepActive: {
    backgroundColor: '#fee2e2',
  },
  journeyStepText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
  },
  journeyStepTextActive: {
    color: '#be123c',
  },
  compatiblePrimaryBtn: {
    backgroundColor: '#d84b6b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  compatiblePrimaryBtnMuted: {
    backgroundColor: '#fff1f2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  compatiblePrimaryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  compatiblePrimaryBtnMutedText: {
    color: '#be123c',
    fontSize: 12,
    fontWeight: '700',
  },
  compatibleSecondaryBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  compatibleSecondaryBtnText: {
    color: '#c2410c',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  icebreakerSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f4e2e8',
    paddingTop: 10,
    paddingBottom: 6,
  },
  icebreakerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  icebreakerTitle: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '700',
  },
  icebreakerUpgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7c3aed',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  icebreakerUpgradeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  icebreakerList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  icebreakerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff4f7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#f6d2dd',
  },
  icebreakerChipLocked: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  icebreakerChipText: {
    color: '#d84b6b',
    fontSize: 12,
    fontWeight: '600',
  },
  icebreakerChipTextLocked: {
    color: '#9ca3af',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: 10,
    marginLeft: 10,
  },
  sendButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  disabledSend: {
    backgroundColor: '#ccc',
  },
  sendText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  attachButton: {
    padding: 8,
  },
  attachIcon: {
    fontSize: 22,
  },
  imagePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  imageIcon: {
    fontSize: 20,
    marginRight: 5,
  },
  imageText: {
    color: '#666', 
    textDecorationLine: 'underline'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeModal: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  closeText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  timerContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    alignItems: 'center',
    zIndex: 20
  },
  timerText: {
    color: '#E91E63',
    fontSize: 30,
    fontWeight: 'bold',
  },
  timerSubText: {
     color: '#fff',
     fontSize: 12
  },
  modalOverlayCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  contactModalCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
  },
  contactModalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  contactInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    textAlignVertical: 'top',
  },
  contactModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  contactSecondaryBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    alignItems: 'center',
  },
  contactSecondaryText: {
    color: '#4b5563',
    fontWeight: '700',
  },
  contactPrimaryBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#d84b6b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  contactPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  }
});
