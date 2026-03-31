import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../src/services/api';
import { useI18n } from '../src/i18n';
import type { DailyMatchSuggestion } from '../src/types';
import { getReadableError } from '../src/utils/auth';

function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const baseUrl = api.defaults.baseURL || 'http://10.0.2.2:4000';
  return `${baseUrl}${url}`;
}

export default function DailyMatchesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [items, setItems] = useState<DailyMatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLocked(false);
        const response = await api.get('/discovery/daily-matches');
        setItems(Array.isArray(response.data) ? response.data : []);
      } catch (error: any) {
        if (error.response?.status === 403) {
          setLocked(true);
          setItems([]);
        } else {
          Alert.alert(t.common.error, getReadableError(error, t.discovery.dailyMatchesEmptyHint));
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t.common.error, t.discovery.dailyMatchesEmptyHint]);

  const updateStatus = async (matchId: string, status: string) => {
    setBusyId(matchId);
    try {
      await api.post(`/discovery/daily-matches/${matchId}/${status}`);
      const nextItems = [...items];
      const targetIndex = nextItems.findIndex((item) => item.id === matchId);
      if (targetIndex >= 0) {
        nextItems[targetIndex] = {
          ...nextItems[targetIndex],
          status: status as DailyMatchSuggestion['status'],
        };
      }
      setItems(nextItems);
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.common.error));
    } finally {
      setBusyId(null);
    }
  };

  const handleLike = async (item: DailyMatchSuggestion) => {
    await updateStatus(item.id, 'LIKED');
    try {
      await api.post('/likes', { toUserId: item.matchedUser.userId });
      Alert.alert(t.common.success, t.discovery.likeSent);
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.discovery.likeFailed));
    }
  };

  const renderItem = ({ item }: { item: DailyMatchSuggestion }) => {
    const profile = item.matchedUser.profile;
    const avatar = resolveMediaUrl(profile?.avatarUrl);
    const nickname = profile?.nickname || t.common.user;
    const country = profile?.residenceCountry || '';
    const age = profile?.age ? `${profile.age} ${t.discovery.yearsOld}` : '';
    const disabled = busyId === item.id;

    return (
      <View style={styles.card}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>{nickname[0]}</Text>
          </View>
        )}

        <View style={styles.scoreBadge}>
          <Ionicons name="sparkles" size={14} color="#fff" />
          <Text style={styles.scoreText}>{item.compatibilityScore}%</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{nickname}</Text>
            {item.matchedUser.isVerified ? <Ionicons name="shield-checkmark" size={16} color="#10b981" /> : null}
          </View>
          <Text style={styles.meta}>{[country, age].filter(Boolean).join(' • ')}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => updateStatus(item.id, 'SKIPPED')} disabled={disabled}>
              <Text style={styles.secondaryBtnText}>{t.discovery.dismiss}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                updateStatus(item.id, 'VIEWED');
                router.push(`/user/${item.matchedUser.userId}` as any);
              }}
              disabled={disabled}
            >
              <Text style={styles.secondaryBtnText}>{t.discovery.viewProfile}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleLike(item)} disabled={disabled}>
              {disabled ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>{t.discovery.like}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t.discovery.dailyMatches }} />
      <LinearGradient colors={['#f8f5ff', '#fffaf7']} style={styles.hero}>
        <Text style={styles.heroTitle}>{t.discovery.dailyMatches}</Text>
        <Text style={styles.heroHint}>{t.discovery.dailyMatchesHint}</Text>
      </LinearGradient>

      {locked ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="sparkles-outline" size={36} color="#7c3aed" />
          </View>
          <Text style={styles.emptyTitle}>{t.discovery.dailyMatchesLocked}</Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/premium')}>
            <Text style={styles.upgradeBtnText}>{t.discovery.dailyMatchesCta}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles-outline" size={36} color="#c4b5fd" />
              </View>
              <Text style={styles.emptyTitle}>{t.discovery.dailyMatchesEmpty}</Text>
              <Text style={styles.emptyHint}>{t.discovery.dailyMatchesEmptyHint}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fffaf7' },
  hero: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 18 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#1f2937', textAlign: 'right' },
  heroHint: { fontSize: 14, color: '#7c6f7a', marginTop: 6, textAlign: 'right' },
  list: { padding: 16, paddingBottom: 30 },
  card: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  image: { width: '100%', height: 240, backgroundColor: '#f2e8f4' },
  placeholderImage: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 42, color: '#8b7d78', fontWeight: '800' },
  scoreBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: '#7c3aed', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  body: { padding: 16 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  name: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  meta: { fontSize: 13, color: '#8b7d78', marginTop: 6, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: 10, marginTop: 16 },
  secondaryBtn: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#eadcf0', backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  secondaryBtnText: { color: '#6d28d9', fontWeight: '700', fontSize: 13 },
  primaryBtn: { flex: 1, borderRadius: 14, backgroundColor: '#d84b6b', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 70 },
  emptyIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#4c1d95', textAlign: 'center' },
  emptyHint: { fontSize: 14, color: '#8b7d78', textAlign: 'center', lineHeight: 22, marginTop: 8 },
  upgradeBtn: { marginTop: 18, backgroundColor: '#7c3aed', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  upgradeBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});