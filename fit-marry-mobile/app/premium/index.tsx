import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { useI18n } from '../../src/i18n';

type PackageData = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  badgeText: string | null;
  badgeTextAr: string | null;
  color: string;
  sortOrder: number;
  price: number;
  durationDays: number;
  isActive: boolean;
  features: Record<string, any>;
};

type FeatureMeta = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: 'boolean' | 'number';
};

const FEATURE_LIST: FeatureMeta[] = [
  { key: 'unlimitedLikes', icon: 'heart', type: 'boolean' },
  { key: 'seeWhoLikesYou', icon: 'eye', type: 'boolean' },
  { key: 'superLikesPerDay', icon: 'star', type: 'number' },
  { key: 'boostsPerMonth', icon: 'flash', type: 'number' },
  { key: 'travelMode', icon: 'airplane', type: 'boolean' },
  { key: 'advancedFilters', icon: 'filter', type: 'boolean' },
  { key: 'noAds', icon: 'close-circle', type: 'boolean' },
  { key: 'priorityLikes', icon: 'ribbon', type: 'boolean' },
  { key: 'messageBeforeMatch', icon: 'chatbubble', type: 'boolean' },
  { key: 'profileBoost', icon: 'sparkles', type: 'boolean' },
  { key: 'undoLike', icon: 'arrow-undo', type: 'boolean' },
  { key: 'dailyMatchesLimit', icon: 'people', type: 'number' },
  { key: 'chatLimit', icon: 'chatbubbles', type: 'number' },
  { key: 'readReceipts', icon: 'checkmark-done', type: 'boolean' },
  { key: 'aiMatchmaker', icon: 'sparkles', type: 'boolean' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [watchingAd, setWatchingAd] = useState(false);

  const handleWatchAd = async () => {
    setWatchingAd(true);
    try {
      await new Promise(res => setTimeout(res, 2000));
      await api.post('/ads/reward', { rewardType: 'TEMP_VIP' });
      Alert.alert(t.premium.rewardGift, t.premium.rewardSuccess);
      router.back();
    } catch (error) {
      Alert.alert(t.common.error, t.premium.rewardFailed);
    } finally {
      setWatchingAd(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/subscriptions/packages');
      const sorted = (res.data as PackageData[]).sort((a, b) => a.sortOrder - b.sortOrder);
      setPackages(sorted);
      if (sorted.length > 0) {
        const mid = sorted.length > 1 ? sorted[1] : sorted[0];
        setSelectedPkg(mid.id);
      }
    } catch (error) {
      console.log(error);
      Alert.alert(t.common.error, t.premium.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (pkg: PackageData) => {
    setSubscribing(pkg.id);
    try {
      await api.post('/subscriptions/subscribe', { packageId: pkg.id });
      Alert.alert(`🎉 ${t.common.congratulations}`, t.premium.subscribeSuccess, [
        { text: t.common.done, onPress: () => router.back() }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.message || t.premium.subscribeFailed;
      Alert.alert(t.common.error, msg);
    } finally {
      setSubscribing(null);
    }
  };

  const getFeatureLabel = (key: string): string => {
    const labels: Record<string, string> = {
      unlimitedLikes: t.premium.unlimitedLikes,
      seeWhoLikesYou: t.premium.seeWhoLiked,
      superLikesPerDay: t.premium.superLikes,
      boostsPerMonth: t.premium.boostsPerMonth,
      travelMode: t.premium.travelMode,
      advancedFilters: t.premium.advancedFilters,
      noAds: t.premium.noAds,
      priorityLikes: t.premium.priorityLikes,
      messageBeforeMatch: t.premium.messageBeforeMatch,
      profileBoost: t.premium.profileBoost,
      undoLike: t.premium.undoLike,
      dailyMatchesLimit: t.premium.dailyMatchesLimit,
      chatLimit: t.premium.chatLimitLabel,
      readReceipts: t.premium.readReceipts,
      aiMatchmaker: t.premium.aiMatchmaker,
    };
    return labels[key] || key;
  };

  const formatFeatureValue = (feat: FeatureMeta, value: any): string => {
    if (feat.type === 'boolean') return value ? '✓' : '—';
    const num = Number(value);
    if (num === -1) return '∞';
    return String(num);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>FitMarry Premium</Text>
          <Text style={styles.subtitle}>{t.premium.headerSubtitle}</Text>
        </View>

        {/* Package Selector Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.packageSelector}>
          {packages.map((pkg) => {
            const isSelected = selectedPkg === pkg.id;
            return (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.selectorCard, isSelected && { borderColor: pkg.color, borderWidth: 3 }]}
                onPress={() => setSelectedPkg(pkg.id)}
              >
                {pkg.badgeTextAr && (
                  <View style={[styles.badgeView, { backgroundColor: pkg.color }]}>
                    <Text style={styles.badgeText}>{pkg.badgeTextAr}</Text>
                  </View>
                )}
                <Text style={[styles.selectorName, { color: pkg.color }]}>{pkg.nameAr || pkg.name}</Text>
                <Text style={[styles.selectorPrice, { color: pkg.color }]}>${pkg.price}</Text>
                <Text style={styles.selectorDuration}>{pkg.durationDays} {t.premium.day}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Feature Comparison for Selected Package */}
        {selectedPkg && packages.find(p => p.id === selectedPkg) && (
          <View style={styles.featuresSection}>
            {(() => {
              const pkg = packages.find(p => p.id === selectedPkg)!;
              return (
                <>
                  {pkg.descriptionAr && (
                    <Text style={styles.pkgDescription}>{pkg.descriptionAr}</Text>
                  )}
                  <View style={styles.featureGrid}>
                    {FEATURE_LIST.map((feat) => {
                      const val = pkg.features[feat.key];
                      const isEnabled = feat.type === 'boolean' ? !!val : Number(val) !== 0;
                      return (
                        <View key={feat.key} style={styles.featureRow}>
                          <View style={styles.featureRowRight}>
                            <Ionicons
                              name={feat.icon}
                              size={20}
                              color={isEnabled ? pkg.color : '#ccc'}
                              style={{ marginLeft: 10 }}
                            />
                            <Text style={[styles.featureLabel, !isEnabled && { color: '#bbb' }]}>
                              {getFeatureLabel(feat.key)}
                            </Text>
                          </View>
                          <Text style={[styles.featureValue, isEnabled ? { color: pkg.color } : { color: '#ccc' }]}>
                            {formatFeatureValue(feat, val)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              );
            })()}
          </View>
        )}

        {/* Subscribe Button */}
        {selectedPkg && (
          <TouchableOpacity
            style={[styles.subscribeButton, { backgroundColor: packages.find(p => p.id === selectedPkg)?.color || '#E91E63' }]}
            onPress={() => {
              const pkg = packages.find(p => p.id === selectedPkg);
              if (pkg) handleSubscribe(pkg);
            }}
            disabled={!!subscribing}
          >
            {subscribing === selectedPkg ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeButtonText}>{t.premium.subscribe}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Watch Ad Card */}
        <TouchableOpacity
          style={[styles.watchAdCard, { borderColor: '#8A2BE2' }]}
          onPress={handleWatchAd}
          disabled={watchingAd}
        >
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <Ionicons name="play-circle-outline" size={32} color="#8A2BE2" style={{ marginLeft: 15 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#8A2BE2', textAlign: 'right' }}>{t.premium.watchAdTitle}</Text>
              <Text style={{ fontSize: 14, color: '#666', marginTop: 5, textAlign: 'right' }}>{t.premium.watchAdSubtitle}</Text>
            </View>
          </View>
          {watchingAd ? (
            <ActivityIndicator color="#8A2BE2" style={{ marginTop: 10 }} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#8A2BE2', marginTop: 10 }}>{t.premium.free}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>{t.premium.disclaimer}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 10,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E91E63',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  packageSelector: {
    paddingBottom: 10,
    gap: 12,
  },
  selectorCard: {
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    width: Dimensions.get('window').width * 0.38,
    minHeight: 120,
  },
  badgeView: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  selectorName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  selectorPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 6,
  },
  selectorDuration: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  featuresSection: {
    marginTop: 24,
    paddingHorizontal: 4,
  },
  pkgDescription: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  featureGrid: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  featureRowRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },
  featureLabel: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  featureValue: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
  },
  subscribeButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  watchAdCard: {
    borderWidth: 2,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    marginTop: 20,
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: 30,
    color: '#999',
    fontSize: 12,
  },
});
