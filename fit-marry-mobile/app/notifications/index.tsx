import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/services/api';
import { useI18n } from '../../src/i18n';

interface Notification {
  id: string;
  type: string;
  payload: any;
  status: string;
  createdAt: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'NEW_MESSAGE': return { name: 'chatbubble', color: '#3b82f6', bg: '#eff6ff' };
    case 'NEW_LIKE': return { name: 'heart', color: '#ef4444', bg: '#fef2f2' };
    case 'SUPER_LIKE': return { name: 'star', color: '#f59e0b', bg: '#fffbeb' };
    case 'MATCH': return { name: 'heart-circle', color: '#d84b6b', bg: '#fdf2f8' };
    case 'SUBSCRIPTION_ACTIVATED': return { name: 'diamond', color: '#8b5cf6', bg: '#f5f3ff' };
    case 'SUBSCRIPTION_EXPIRING': return { name: 'time', color: '#f97316', bg: '#fff7ed' };
    case 'MISSED_CALL': return { name: 'call', color: '#ef4444', bg: '#fef2f2' };
    case 'VERIFICATION_APPROVED': return { name: 'shield-checkmark', color: '#10b981', bg: '#ecfdf5' };
    case 'VERIFICATION_REJECTED': return { name: 'shield', color: '#ef4444', bg: '#fef2f2' };
    case 'COMPATIBLE_MATCH': return { name: 'people', color: '#06b6d4', bg: '#ecfeff' };
    case 'CONTACT_EXCHANGE_REQUEST': return { name: 'mail-open', color: '#c2410c', bg: '#fff7ed' };
    case 'CONTACT_EXCHANGE_APPROVED': return { name: 'checkmark-circle', color: '#059669', bg: '#ecfdf5' };
    case 'CONTACT_EXCHANGE_REJECTED': return { name: 'close-circle', color: '#dc2626', bg: '#fef2f2' };
    case 'CONTACT_EXCHANGE_CANCELLED': return { name: 'remove-circle', color: '#b45309', bg: '#fff7ed' };
    case 'DAILY_MATCHES': return { name: 'sparkles', color: '#d84b6b', bg: '#fdf2f8' };
    case 'STORY_CONTACT': return { name: 'eye', color: '#8b5cf6', bg: '#f5f3ff' };
    case 'ADMIN_BROADCAST': return { name: 'megaphone', color: '#6366f1', bg: '#eef2ff' };
    default: return { name: 'notifications', color: '#6b7280', bg: '#f9fafb' };
  }
};

export default function NotificationsScreen() {
  const { t, lang } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'NEW_MESSAGE': return t.notifications.newMessage;
      case 'NEW_LIKE': return t.notifications.newLike;
      case 'SUPER_LIKE': return t.notifications.superLike;
      case 'MATCH': return t.notifications.match;
      case 'SUBSCRIPTION_ACTIVATED': return t.notifications.subscriptionActivated;
      case 'SUBSCRIPTION_EXPIRING': return t.notifications.subscriptionExpiring;
      case 'MISSED_CALL': return t.notifications.missedCall;
      case 'VERIFICATION_APPROVED': return t.notifications.verificationApproved;
      case 'VERIFICATION_REJECTED': return t.notifications.verificationRejected;
      case 'COMPATIBLE_MATCH': return t.notifications.compatibleMatch;
      case 'CONTACT_EXCHANGE_REQUEST': return t.notifications.contactExchangeRequest;
      case 'CONTACT_EXCHANGE_APPROVED': return t.notifications.contactExchangeApproved;
      case 'CONTACT_EXCHANGE_REJECTED': return t.notifications.contactExchangeRejected;
      case 'CONTACT_EXCHANGE_CANCELLED': return t.notifications.contactExchangeCancelled;
      case 'DAILY_MATCHES': return t.notifications.dailyMatches;
      case 'STORY_CONTACT': return t.notifications.storyContact;
      case 'ADMIN_BROADCAST': {
        const p = notification.payload;
        const title = lang === 'en' && p?.titleEn ? p.titleEn : p?.title;
        const body = lang === 'en' && p?.bodyEn ? p.bodyEn : p?.body;
        return title ? `${title}\n${body || ''}` : t.notifications.broadcast;
      }
      default: return t.notifications.broadcast;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t.notifications.now;
    if (minutes < 60) return t.notifications.minutesAgo.replace('{count}', String(minutes));
    if (hours < 24) return t.notifications.hoursAgo.replace('{count}', String(hours));
    if (days < 7) return t.notifications.daysAgo.replace('{count}', String(days));
    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US');
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.items || data);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ' }))
      );
    } catch (e) {}
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const handlePress = async (notification: Notification) => {
    if (notification.status !== 'READ') {
      try {
        await api.patch(`/notifications/${notification.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, status: 'READ' } : n))
        );
      } catch (e) {}
    }

    if (notification.type === 'NEW_MESSAGE' && notification.payload?.conversationId) {
      router.push(`/chat/${notification.payload.conversationId}`);
    } else if ((notification.type === 'CONTACT_EXCHANGE_REQUEST' || notification.type === 'CONTACT_EXCHANGE_APPROVED' || notification.type === 'CONTACT_EXCHANGE_REJECTED' || notification.type === 'CONTACT_EXCHANGE_CANCELLED') && notification.payload?.conversationId) {
      router.push(`/chat/${notification.payload.conversationId}`);
    } else if (notification.type === 'NEW_LIKE' || notification.type === 'MATCH' || notification.type === 'SUPER_LIKE') {
      router.push('/(tabs)/likes');
    } else if (notification.type === 'SUBSCRIPTION_EXPIRING' || notification.type === 'SUBSCRIPTION_ACTIVATED') {
      router.push('/premium');
    } else if (notification.type === 'ADMIN_BROADCAST' && notification.payload?.actionUrl) {
      router.push(notification.payload.actionUrl);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {}
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d84b6b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#ffffff', '#fffaf7']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={lang === 'ar' ? 'arrow-forward' : 'arrow-back'} size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.notifications.title}</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markAll}>{t.notifications.markAllRead}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>{t.notifications.noNotifications}</Text>
          <Text style={styles.emptyHint}>{t.notifications.noNotificationsHint}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
              colors={['#d84b6b']}
            />
          }
          renderItem={({ item }) => {
            const icon = getNotificationIcon(item.type);
            const isUnread = item.status !== 'READ';
            return (
              <TouchableOpacity
                style={[styles.item, isUnread && styles.unread]}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
                  <Ionicons name={icon.name as any} size={22} color={icon.color} />
                </View>
                <View style={styles.content}>
                  <Text
                    style={[styles.text, isUnread && styles.boldText]}
                    numberOfLines={2}
                  >
                    {getNotificationText(item)}
                  </Text>
                  <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
                </View>
                <View style={styles.rightCol}>
                  {isUnread && <View style={styles.dot} />}
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={16} color="#ccc" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fffaf7' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e4e0',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  markAll: { fontSize: 13, color: '#d84b6b', fontWeight: '600' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f0ee',
    gap: 12,
  },
  unread: { backgroundColor: '#fff5f7' },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  text: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  boldText: { fontWeight: '700', color: '#1f2937' },
  time: { fontSize: 12, color: '#9ca3af', marginTop: 3 },
  rightCol: { alignItems: 'center', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d84b6b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  emptyHint: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
