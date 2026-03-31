import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import api from '../src/services/api';
import { useI18n } from '../src/i18n';

type SuccessStoryItem = {
  id: string;
  city?: string | null;
  marriageType?: string | null;
  createdAt: string;
};

type MarriageFilter = 'ALL' | 'PERMANENT' | 'MISYAR' | 'MUTAA' | 'URFI' | 'TRAVEL_MARRIAGE';

const formatMarriageType = (marriageType: string | null | undefined, t: any) => {
  if (marriageType === 'PERMANENT') return t.auth.permanentMarriage;
  if (marriageType === 'MISYAR') return t.auth.misyar;
  if (marriageType === 'MUTAA') return t.auth.mutaa;
  if (marriageType === 'URFI') return t.auth.urfi;
  if (marriageType === 'TRAVEL_MARRIAGE') return t.auth.travelMarriage;
  return marriageType || t.common.noResults;
};

export default function SuccessStoriesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [stories, setStories] = useState<SuccessStoryItem[]>([]);
  const [count, setCount] = useState(0);
  const [selectedType, setSelectedType] = useState<MarriageFilter>('ALL');
  const [cityQuery, setCityQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStories = useCallback(async () => {
    try {
      const response = await api.get('/success-stories', { params: { page: 1, limit: 20 } });
      setStories(response.data.items || []);
      setCount(response.data.total || 0);
    } catch (error) {
      console.log('Success stories error', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const marriageFilters: Array<{ key: MarriageFilter; label: string }> = [
    { key: 'ALL', label: t.common.all },
    { key: 'PERMANENT', label: t.auth.permanentMarriage },
    { key: 'MISYAR', label: t.auth.misyar },
    { key: 'MUTAA', label: t.auth.mutaa },
    { key: 'URFI', label: t.auth.urfi },
    { key: 'TRAVEL_MARRIAGE', label: t.auth.travelMarriage },
  ];

  const filteredStories = stories.filter((story) => {
    const matchesType = selectedType === 'ALL' || story.marriageType === selectedType;
    const normalizedCity = (story.city || '').toLowerCase();
    const normalizedQuery = cityQuery.trim().toLowerCase();
    const matchesCity = !normalizedQuery || normalizedCity.includes(normalizedQuery);
    return matchesType && matchesCity;
  });

  const handleShareStory = async (story: SuccessStoryItem) => {
    try {
      const summary = `${t.successStories.title}\n${t.successStories.city}: ${story.city || t.common.noResults}\n${t.successStories.marriageType}: ${formatMarriageType(story.marriageType, t)}`;
      await Share.share({ message: summary });
    } catch (error) {
      console.log('Share story error', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient colors={['#17313e', '#2b5664']} style={styles.hero}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>{t.successStories.title}</Text>
        <Text style={styles.heroSubtitle}>{t.successStories.subtitle}</Text>
        <View style={styles.countPill}>
          <Ionicons name="heart" size={14} color="#facc15" />
          <Text style={styles.countText}>{t.successStories.count.replace('{count}', String(count))}</Text>
        </View>
      </LinearGradient>

      <View style={styles.filtersWrap}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            value={cityQuery}
            onChangeText={setCityQuery}
            placeholder={t.successStories.searchCity}
          />
          {cityQuery ? (
            <TouchableOpacity onPress={() => setCityQuery('')}>
              <Ionicons name="close-circle" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          horizontal
          data={marriageFilters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, selectedType === item.key && styles.filterChipActive]}
              onPress={() => setSelectedType(item.key)}
            >
              <Text style={[styles.filterChipText, selectedType === item.key && styles.filterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#d84b6b" />
        </View>
      ) : (
        <FlatList
          data={filteredStories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredStories.length ? styles.listContent : styles.emptyContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchStories();
          }}
          renderItem={({ item, index }) => (
            <View style={styles.storyCard}>
              <View style={styles.storyIndexWrap}>
                <Text style={styles.storyIndex}>{index + 1}</Text>
              </View>
              <View style={styles.storyTextWrap}>
                <Text style={styles.storyTitle}>{formatMarriageType(item.marriageType, t)}</Text>
                <Text style={styles.storyMeta}>{t.successStories.city}: {item.city || t.common.noResults}</Text>
              </View>
              <TouchableOpacity style={styles.shareStoryBtn} onPress={() => handleShareStory(item)}>
                <Ionicons name="share-social-outline" size={17} color="#d84b6b" />
              </TouchableOpacity>
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>{t.successStories.filteredCount.replace('{count}', String(filteredStories.length))}</Text>
              {(selectedType !== 'ALL' || cityQuery.trim()) ? (
                <TouchableOpacity onPress={() => {
                  setSelectedType('ALL');
                  setCityQuery('');
                }}>
                  <Text style={styles.resetFiltersText}>{t.successStories.resetFilters}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="heart-outline" size={34} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>{t.successStories.noStoriesTitle}</Text>
              <Text style={styles.emptyHint}>{t.successStories.noStoriesHint}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf7',
  },
  hero: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#d7e5ea',
    fontSize: 14,
    marginTop: 8,
  },
  countPill: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  countText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  filtersWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0e4e0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  filtersList: {
    gap: 10,
    paddingRight: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0e4e0',
  },
  filterChipActive: {
    backgroundColor: '#17313e',
    borderColor: '#17313e',
  },
  filterChipText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultsTitle: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
  },
  resetFiltersText: {
    color: '#d84b6b',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  storyCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#f0e4e0',
  },
  storyIndexWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyIndex: {
    color: '#d84b6b',
    fontWeight: '800',
    fontSize: 16,
  },
  storyTextWrap: {
    flex: 1,
  },
  storyTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  storyMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 6,
  },
  shareStoryBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0e4e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyHint: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});