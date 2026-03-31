import React, { useEffect, useState, useCallback } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import api from '../services/api';

export default function NotificationBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [hasPriorityRequest, setHasPriorityRequest] = useState(false);

  const fetchCount = async () => {
    try {
      const [{ data }, notificationsResponse] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/notifications').catch(() => ({ data: [] })),
      ]);
      const items = notificationsResponse.data?.items || notificationsResponse.data || [];
      setCount(data.unreadCount ?? 0);
      setHasPriorityRequest(
        items.some((item: any) => item.status !== 'READ' && item.type === 'CONTACT_EXCHANGE_REQUEST'),
      );
    } catch (e) {}
  };

  useFocusEffect(
    useCallback(() => {
      fetchCount();
      const interval = setInterval(fetchCount, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  return (
    <TouchableOpacity style={styles.wrap} onPress={() => router.push('/notifications')}>
      <Ionicons name="notifications-outline" size={24} color="#333" />
      {count > 0 && (
        <View style={[styles.badge, hasPriorityRequest && styles.badgePriority]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
      {hasPriorityRequest ? <View style={styles.priorityDot} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 6, position: 'relative' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#d84b6b',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgePriority: {
    backgroundColor: '#ea580c',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  priorityDot: {
    position: 'absolute',
    bottom: 3,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea580c',
    borderWidth: 1,
    borderColor: '#fffaf7',
  },
});
