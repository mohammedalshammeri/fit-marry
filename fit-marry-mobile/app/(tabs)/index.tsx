import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView, TextInput, Dimensions, Animated, PanResponder, RefreshControl } from 'react-native';
import api from '../../src/services/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useScreenProtection } from '../../src/hooks/useScreenProtection';
import { useI18n } from '../../src/i18n';
import type { DiscoveryItem } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REVEAL_DURATION_MS = 5000;
const SWIPE_THRESHOLD = 90;
const SWIPE_OUT_DISTANCE = SCREEN_WIDTH * 1.1;
const SWIPE_UP_THRESHOLD = 110;

const COUNTRIES_DATA = [
  // ── الخليج العربي ──
  { value: 'Saudi Arabia', ar: 'السعودية' },
  { value: 'UAE', ar: 'الإمارات' },
  { value: 'Kuwait', ar: 'الكويت' },
  { value: 'Bahrain', ar: 'البحرين' },
  { value: 'Qatar', ar: 'قطر' },
  { value: 'Oman', ar: 'عُمان' },
  { value: 'Yemen', ar: 'اليمن' },
  // ── شمال أفريقيا ──
  { value: 'Egypt', ar: 'مصر' },
  { value: 'Libya', ar: 'ليبيا' },
  { value: 'Tunisia', ar: 'تونس' },
  { value: 'Algeria', ar: 'الجزائر' },
  { value: 'Morocco', ar: 'المغرب' },
  { value: 'Sudan', ar: 'السودان' },
  { value: 'Mauritania', ar: 'موريتانيا' },
  // ── الشام ──
  { value: 'Jordan', ar: 'الأردن' },
  { value: 'Iraq', ar: 'العراق' },
  { value: 'Lebanon', ar: 'لبنان' },
  { value: 'Syria', ar: 'سوريا' },
  { value: 'Palestine', ar: 'فلسطين' },
  // ── أفريقيا ──
  { value: 'Somalia', ar: 'الصومال' },
  { value: 'Djibouti', ar: 'جيبوتي' },
  { value: 'Comoros', ar: 'جزر القمر' },
  { value: 'South Africa', ar: 'جنوب أفريقيا' },
  { value: 'Nigeria', ar: 'نيجيريا' },
  { value: 'Ethiopia', ar: 'إثيوبيا' },
  { value: 'Kenya', ar: 'كينيا' },
  { value: 'Tanzania', ar: 'تنزانيا' },
  { value: 'Senegal', ar: 'السنغال' },
  { value: 'Ghana', ar: 'غانا' },
  { value: 'Cameroon', ar: 'الكاميرون' },
  { value: 'Mali', ar: 'مالي' },
  { value: 'Niger', ar: 'النيجر' },
  { value: 'Chad', ar: 'تشاد' },
  { value: 'Eritrea', ar: 'إريتريا' },
  { value: 'Uganda', ar: 'أوغندا' },
  { value: 'Mozambique', ar: 'موزمبيق' },
  { value: 'Ivory Coast', ar: 'ساحل العاج' },
  // ── آسيا ──
  { value: 'Turkey', ar: 'تركيا' },
  { value: 'Iran', ar: 'إيران' },
  { value: 'Pakistan', ar: 'باكستان' },
  { value: 'Afghanistan', ar: 'أفغانستان' },
  { value: 'India', ar: 'الهند' },
  { value: 'Bangladesh', ar: 'بنغلاديش' },
  { value: 'Indonesia', ar: 'إندونيسيا' },
  { value: 'Malaysia', ar: 'ماليزيا' },
  { value: 'Uzbekistan', ar: 'أوزبكستان' },
  { value: 'Kazakhstan', ar: 'كازاخستان' },
  { value: 'Azerbaijan', ar: 'أذربيجان' },
  { value: 'Turkmenistan', ar: 'تركمانستان' },
  { value: 'Tajikistan', ar: 'طاجيكستان' },
  { value: 'Kyrgyzstan', ar: 'قيرغيزستان' },
  { value: 'Philippines', ar: 'الفلبين' },
  { value: 'Sri Lanka', ar: 'سريلانكا' },
  { value: 'China', ar: 'الصين' },
  { value: 'Japan', ar: 'اليابان' },
  { value: 'South Korea', ar: 'كوريا الجنوبية' },
  { value: 'Thailand', ar: 'تايلاند' },
  { value: 'Vietnam', ar: 'فيتنام' },
  { value: 'Singapore', ar: 'سنغافورة' },
  { value: 'Brunei', ar: 'بروناي' },
  { value: 'Maldives', ar: 'المالديف' },
  { value: 'Nepal', ar: 'نيبال' },
  // ── أوروبا ──
  { value: 'United Kingdom', ar: 'بريطانيا' },
  { value: 'Germany', ar: 'ألمانيا' },
  { value: 'France', ar: 'فرنسا' },
  { value: 'Netherlands', ar: 'هولندا' },
  { value: 'Belgium', ar: 'بلجيكا' },
  { value: 'Sweden', ar: 'السويد' },
  { value: 'Norway', ar: 'النرويج' },
  { value: 'Denmark', ar: 'الدنمارك' },
  { value: 'Finland', ar: 'فنلندا' },
  { value: 'Austria', ar: 'النمسا' },
  { value: 'Switzerland', ar: 'سويسرا' },
  { value: 'Italy', ar: 'إيطاليا' },
  { value: 'Spain', ar: 'إسبانيا' },
  { value: 'Portugal', ar: 'البرتغال' },
  { value: 'Greece', ar: 'اليونان' },
  { value: 'Poland', ar: 'بولندا' },
  { value: 'Romania', ar: 'رومانيا' },
  { value: 'Bosnia', ar: 'البوسنة' },
  { value: 'Albania', ar: 'ألبانيا' },
  { value: 'Kosovo', ar: 'كوسوفو' },
  { value: 'Russia', ar: 'روسيا' },
  { value: 'Ukraine', ar: 'أوكرانيا' },
  // ── أمريكا الشمالية ──
  { value: 'United States', ar: 'أمريكا' },
  { value: 'Canada', ar: 'كندا' },
  { value: 'Mexico', ar: 'المكسيك' },
  // ── أمريكا الجنوبية ──
  { value: 'Brazil', ar: 'البرازيل' },
  { value: 'Argentina', ar: 'الأرجنتين' },
  { value: 'Colombia', ar: 'كولومبيا' },
  { value: 'Venezuela', ar: 'فنزويلا' },
  { value: 'Chile', ar: 'تشيلي' },
  { value: 'Peru', ar: 'بيرو' },
  // ── أوقيانوسيا ──
  { value: 'Australia', ar: 'أستراليا' },
  { value: 'New Zealand', ar: 'نيوزيلندا' },
];

const SECTS_DATA = [
  { value: 'Sunni', ar: 'سني', en: 'Sunni' },
  { value: 'Shia', ar: 'شيعي', en: 'Shia' },
  { value: 'Ibadi', ar: 'إباضي', en: 'Ibadi' },
];

const EDUCATION_DATA = [
  { value: 'HighSchool', ar: 'ثانوي', en: 'High School' },
  { value: 'Bachelors', ar: 'بكالوريوس', en: "Bachelor's" },
  { value: 'Masters', ar: 'ماجستير', en: "Master's" },
  { value: 'PhD', ar: 'دكتوراه', en: 'PhD' },
];

const MARITAL_DATA = [
  { value: 'Single', ar: 'أعزب/عزباء', en: 'Single' },
  { value: 'Divorced', ar: 'مطلق/ة', en: 'Divorced' },
  { value: 'Widowed', ar: 'أرمل/ة', en: 'Widowed' },
];

const SMOKING_DATA = [
  { value: 'NonSmoker', ar: 'غير مدخن', en: 'Non-Smoker' },
  { value: 'Smoker', ar: 'مدخن', en: 'Smoker' },
  { value: 'Occasional', ar: 'أحياناً', en: 'Occasional' },
];

const TEMP_SUBTYPES = ['MISYAR', 'MUTAA', 'URFI', 'TRAVEL_MARRIAGE'] as const;

const AGE_MIN_DEFAULT = 18;
const AGE_MAX_DEFAULT = 65;

const resolveAvatarUrl = (avatar?: string) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;

  const baseUrl = api.defaults.baseURL || 'http://10.0.2.2:4000';
  return `${baseUrl}${avatar}`;
};

export default function DiscoveryScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<DiscoveryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [revealedUsers, setRevealedUsers] = useState<Record<string, boolean>>({});
  const [lastDismissed, setLastDismissed] = useState<{ user: DiscoveryItem; index: number } | null>(null);
  
  // Modals
  const [travelModeVisible, setTravelModeVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filter states
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [ageMin, setAgeMin] = useState(AGE_MIN_DEFAULT);
  const [ageMax, setAgeMax] = useState(AGE_MAX_DEFAULT);
  const [marriageCategory, setMarriageCategory] = useState<'ALL' | 'PERMANENT' | 'TEMPORARY'>('ALL');
  const [marriageSubType, setMarriageSubType] = useState<string | null>(null);
  // Premium filter states
  const [filterSect, setFilterSect] = useState<string | null>(null);
  const [filterNationality, setFilterNationality] = useState<string | null>(null);
  const [filterEducation, setFilterEducation] = useState<string | null>(null);
  const [filterMarital, setFilterMarital] = useState<string | null>(null);
  const [filterSmoking, setFilterSmoking] = useState<string | null>(null);

  // Active filters applied to API
  const [activeFilters, setActiveFilters] = useState({
    country: null as string | null,
    ageMin: AGE_MIN_DEFAULT,
    ageMax: AGE_MAX_DEFAULT,
    marriageType: '' as string,
    sect: null as string | null,
    nationality: null as string | null,
    educationLevel: null as string | null,
    maritalStatus: null as string | null,
    smoking: null as string | null,
  });

  useScreenProtection(Object.values(revealedUsers).some(Boolean));

  useEffect(() => {
    return () => {
      setRevealedUsers({});
    };
  }, []);

  const fetchDiscovery = async () => {
    if (!refreshing) setLoading(true); 
    
    try {
      const params: any = {};
      if (activeFilters.country) params.country = activeFilters.country;
      if (activeFilters.ageMin > AGE_MIN_DEFAULT) params.ageMin = activeFilters.ageMin;
      if (activeFilters.ageMax < AGE_MAX_DEFAULT) params.ageMax = activeFilters.ageMax;
      if (activeFilters.marriageType) params.marriageType = activeFilters.marriageType;
      if (activeFilters.sect) params.sect = activeFilters.sect;
      if (activeFilters.nationality) params.nationality = activeFilters.nationality;
      if (activeFilters.educationLevel) params.educationLevel = activeFilters.educationLevel;
      if (activeFilters.maritalStatus) params.maritalStatus = activeFilters.maritalStatus;
      if (activeFilters.smoking) params.smoking = activeFilters.smoking;

      const response = await api.get('/discovery', { params });
      
      if (response.data && Array.isArray(response.data.items)) {
        setUsers(response.data.items);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.log('Discovery Error:', error.response?.status, error.response?.data);
      if (error.response?.status === 403) {
         const msg = error.response?.data?.message || t.discovery.premiumRequired;
         Alert.alert(t.common.warning, msg, [
            { text: t.common.cancel, style: 'cancel' },
            { text: t.discovery.upgradeAccount, onPress: () => router.push('/premium') }
         ]);
         
         if (activeFilters.country) {
            setFilterCountry(null);
            setActiveFilters(prev => ({ ...prev, country: null }));
         }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiscovery();
  }, [activeFilters]);

  const getMarriageTypeParam = (): string => {
    if (marriageCategory === 'ALL') return '';
    if (marriageCategory === 'PERMANENT') return 'PERMANENT';
    if (marriageSubType) return marriageSubType;
    return TEMP_SUBTYPES.join(',');
  };

  const applyFilters = () => {
    setActiveFilters({
      country: filterCountry,
      ageMin,
      ageMax,
      marriageType: getMarriageTypeParam(),
      sect: filterSect,
      nationality: filterNationality,
      educationLevel: filterEducation,
      maritalStatus: filterMarital,
      smoking: filterSmoking,
    });
    setFilterModalVisible(false);
  };

  const applyTravel = async (c: string | null) => {
    try {
      await api.put('/profiles/travel-mode', { travelCountry: c });
      setFilterCountry(c);
      setActiveFilters(prev => ({ ...prev, country: c }));
      setTravelModeVisible(false);
      Alert.alert(t.common.success, c ? `${t.discovery.travelActivated} ${c}` : t.discovery.travelDeactivated);
    } catch (error: any) {
      const msg = error.response?.data?.message || t.discovery.travelFailed;
      Alert.alert(t.common.error, msg);
    }
  };

  const resetFilters = () => {
    setFilterCountry(null);
    setAgeMin(AGE_MIN_DEFAULT);
    setAgeMax(AGE_MAX_DEFAULT);
    setMarriageCategory('ALL');
    setMarriageSubType(null);
    setFilterSect(null);
    setFilterNationality(null);
    setFilterEducation(null);
    setFilterMarital(null);
    setFilterSmoking(null);
    setActiveFilters({ country: null, ageMin: AGE_MIN_DEFAULT, ageMax: AGE_MAX_DEFAULT, marriageType: '', sect: null, nationality: null, educationLevel: null, maritalStatus: null, smoking: null });
    setFilterModalVisible(false);
  };

  const handleBoost = async () => {
    try {
      await api.post('/profiles/boost');
      Alert.alert(`\uD83D\uDE80 ${t.common.success}`, t.discovery.boostSuccess);
      fetchDiscovery();
    } catch (error: any) {
      const msg = error.response?.data?.message || t.discovery.boostFailed;
      if (error.response?.status === 403) {
         Alert.alert(t.discovery.upgradeRequired, msg, [
            { text: t.common.cancel, style: 'cancel' },
            { text: t.discovery.upgrade, onPress: () => router.push('/premium') }
         ]);
      } else {
         Alert.alert(t.common.error, msg);
      }
    }
  };

  const handleLike = async (userId: string) => {
    try {
      await api.post('/likes', { toUserId: userId });
      Alert.alert(t.common.success, t.discovery.likeSent);
      setUsers(prev => prev.filter(u => u.userId !== userId));
    } catch (error: any) {
      const msg = error.response?.data?.message || t.discovery.likeFailed;
      Alert.alert(t.common.error, msg);
    }
  };

  const handleSuperLike = async (userId: string) => {
    try {
      await api.post('/likes', { toUserId: userId, isSuperLike: true });
      Alert.alert(t.common.success, t.discovery.superLike);
      setUsers(prev => prev.filter(u => u.userId !== userId));
    } catch (error: any) {
      const msg = error.response?.data?.message || t.discovery.premiumRequired;
      if (error.response?.status === 400 || error.response?.status === 403) {
        Alert.alert(t.discovery.upgradeRequired, msg, [
          { text: t.common.cancel, style: 'cancel' },
          { text: t.discovery.upgrade, onPress: () => router.push('/premium') },
        ]);
        return;
      }

      Alert.alert(t.common.error, msg);
    }
  };

  const handleDismiss = (userId: string) => {
    setUsers(prev => {
      const removedIndex = prev.findIndex((user) => user.userId === userId);
      if (removedIndex === -1) {
        return prev;
      }

      setLastDismissed({ user: prev[removedIndex], index: removedIndex });
      return prev.filter((user) => user.userId !== userId);
    });
  };

  const handleUndoDismiss = () => {
    if (!lastDismissed) {
      return;
    }

    setUsers((prev) => {
      if (prev.some((user) => user.userId === lastDismissed.user.userId)) {
        return prev;
      }

      const next = [...prev];
      next.splice(Math.min(lastDismissed.index, next.length), 0, lastDismissed.user);
      return next;
    });
    setLastDismissed(null);
  };

  const handleReveal = (userId: string) => {
    setRevealedUsers((prev) => ({ ...prev, [userId]: true }));
    setTimeout(() => {
      setRevealedUsers((prev) => ({ ...prev, [userId]: false }));
    }, REVEAL_DURATION_MS);
  };

  const renderItem = ({ item, isTopCard = true, depth = 0 }: { item: DiscoveryItem; isTopCard?: boolean; depth?: number }) => {
    const nickname = item.nickname || item.profile?.nickname || t.common.noResults;
    const avatar = resolveAvatarUrl(item.avatarUrl || item.profile?.avatarUrl);
    const itemCountry = item.residenceCountry || item.profile?.residenceCountry || '';
    const itemCity = item.profile?.residenceCountry || '';
    const age = item.profile?.age ? `${item.profile.age} ${t.discovery.yearsOld}` : '';
    const isRevealed = !!revealedUsers[item.userId];
    const isMisyar = item.marriageType === 'MISYAR';
    const isTemporary = ['MISYAR', 'MUTAA', 'URFI', 'TRAVEL_MARRIAGE'].includes(item.marriageType || '');
    const marriageLabel = (() => {
      switch (item.marriageType) {
        case 'PERMANENT': return t.discovery.permanent;
        case 'MISYAR': return t.profile.misyar;
        case 'MUTAA': return t.discovery.mutaa;
        case 'URFI': return t.discovery.urfi;
        case 'TRAVEL_MARRIAGE': return t.discovery.travelMarriage;
        default: return t.discovery.permanent;
      }
    })();
    const compatibility = (item as any).compatibilityScore;
    const isVerified = (item as any).isVerified;
    const isOnline = (item as any).isOnline;

    const cardContent = ({ swipeLikeOpacity, swipeDismissOpacity, swipeSuperLikeOpacity }: { swipeLikeOpacity: any; swipeDismissOpacity: any; swipeSuperLikeOpacity: any }) => (
      <View style={[styles.card, !isTopCard && styles.cardStacked, !isTopCard && { transform: [{ scale: 1 - depth * 0.04 }] }]}> 
        <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.swipeBadgeLike, { opacity: swipeLikeOpacity }]}> 
          <Ionicons name="heart" size={18} color="#065f46" />
          <Text style={[styles.swipeBadgeText, styles.swipeBadgeTextLike]}>{t.discovery.like}</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.swipeBadgeDismiss, { opacity: swipeDismissOpacity }]}> 
          <Ionicons name="close" size={18} color="#991b1b" />
          <Text style={[styles.swipeBadgeText, styles.swipeBadgeTextDismiss]}>{t.discovery.dismiss}</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.swipeBadgeSuperLike, { opacity: swipeSuperLikeOpacity }]}> 
          <Ionicons name="star" size={18} color="#92400e" />
          <Text style={[styles.swipeBadgeText, styles.swipeBadgeTextSuperLike]}>{t.discovery.superLike}</Text>
        </Animated.View>
        <View style={styles.imageContainer}>
             {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} resizeMode="cover" />
             ) : (
                <LinearGradient colors={['#f0e4e0', '#d9d3cf']} style={[styles.avatar, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderText}>{nickname[0]}</Text>
                </LinearGradient>
             )}

             {avatar && !isRevealed && (
              <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFillObject} />
             )}

             <View style={styles.imageOverlay}>
              <View style={styles.topBadges}>
                {isTemporary && (
                  <View style={styles.overlayBadge}>
                    <Ionicons name="lock-closed" size={10} color="#fff" />
                    <Text style={styles.overlayBadgeText}>{t.discovery.highPrivacy}</Text>
                  </View>
                )}
                {isVerified && (
                  <View style={[styles.overlayBadge, { backgroundColor: 'rgba(16,185,129,0.9)' }]}>
                    <Ionicons name="shield-checkmark" size={10} color="#fff" />
                    <Text style={styles.overlayBadgeText}>{t.discovery.verified}</Text>
                  </View>
                )}
                {isOnline && (
                  <View style={[styles.overlayBadge, { backgroundColor: 'rgba(16,185,129,0.9)' }]}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.overlayBadgeText}>{t.discovery.online}</Text>
                  </View>
                )}
              </View>

              <View style={styles.bottomRow}>
                {avatar && (
                  <TouchableOpacity style={styles.revealButton} onPress={() => handleReveal(item.userId)}>
                    <Ionicons name={isRevealed ? 'eye-off' : 'eye'} size={16} color="#fff" />
                  </TouchableOpacity>
                )}
                {compatibility != null && (
                  <View style={styles.compatBadge}>
                    <Ionicons name="heart-circle" size={14} color="#fff" />
                    <Text style={styles.compatText}>{compatibility}%</Text>
                  </View>
                )}
              </View>
             </View>
        </View>
        
        <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{nickname}</Text>
              {age ? <Text style={styles.ageText}>{age}</Text> : null}
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#9ca3af" />
              <Text style={styles.details}>{itemCountry} {itemCity ? `• ${itemCity}` : ''}</Text>
            </View>
            <View style={[styles.marriageTag, isTemporary ? styles.misyarTag : styles.permanentTag]}>
              <Text style={[styles.marriageTagText, isTemporary ? styles.misyarTagText : styles.permanentTagText]}>
                {marriageLabel}
              </Text>
            </View>
        </View>

        <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => {
            handleDismiss(item.userId);
            }}>
                <View style={styles.actionCircle}>
                  <Ionicons name="close" size={24} color="#ef4444" />
                </View>
                <Text style={styles.actionLabel}>{t.discovery.dismiss}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/user/${item.userId}`)}>
                <View style={[styles.actionCircle, styles.actionCircleAlt]}>
                  <Ionicons name="person" size={22} color="#6366f1" />
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => handleSuperLike(item.userId)}>
                <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.actionCircleSuperLike}>
                  <Ionicons name="star" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionLabel}>{t.discovery.superLike}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.userId)}>
                <LinearGradient colors={['#d84b6b', '#e8637f']} style={styles.actionCirclePrimary}>
                  <Ionicons name="heart" size={26} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionLabel}>{t.discovery.like}</Text>
            </TouchableOpacity>
        </View>
      </View>
    );

    if (!isTopCard) {
      return (
        <View style={[styles.stackCardLayer, { top: depth * 12 }]} pointerEvents="none">
          {cardContent({ swipeLikeOpacity: 0, swipeDismissOpacity: 0, swipeSuperLikeOpacity: 0 })}
        </View>
      );
    }

    return (
      <View style={styles.stackCardLayer}>
        <SwipeableDiscoveryCard
          item={item}
          onDismiss={handleDismiss}
          onLike={handleLike}
          onSuperLike={handleSuperLike}
          onOpenProfile={(userId) => router.push(`/user/${userId}`)}
          renderContent={cardContent}
        />
      </View>
    );
  };

  const hasActiveFilters = activeFilters.ageMin > AGE_MIN_DEFAULT || activeFilters.ageMax < AGE_MAX_DEFAULT || !!activeFilters.marriageType || !!activeFilters.sect || !!activeFilters.nationality || !!activeFilters.educationLevel || !!activeFilters.maritalStatus || !!activeFilters.smoking;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#ffffff', '#fffaf7']} style={styles.header}>
        <Text style={styles.headerTitle}>{t.discovery.title}</Text>
        <View style={styles.headerControls}>
          <TouchableOpacity onPress={() => router.push('/stories')} style={styles.headerBtn}>
            <View style={[styles.iconBubble, { backgroundColor: '#17313e' }]}>
              <Ionicons name="albums" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/success-stories')} style={styles.headerBtn}>
            <LinearGradient colors={['#fff7ed', '#fde68a']} style={styles.iconBubble}>
              <Ionicons name="heart-half" size={20} color="#b45309" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/daily-matches')} style={styles.headerBtn}>
            <View style={styles.iconBubbleDaily}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBoost} style={styles.headerBtn}>
            <LinearGradient colors={['#fff7ed', '#fef3c7']} style={styles.iconBubble}>
              <Ionicons name="rocket" size={20} color="#f59e0b" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTravelModeVisible(true)} style={styles.headerBtn}>
            <View style={[styles.iconBubble, activeFilters.country ? styles.iconBubbleActive : { backgroundColor: '#f3f4f6' }]}>
              <Ionicons name={activeFilters.country ? "airplane" : "globe-outline"} size={20} color={activeFilters.country ? "#fff" : "#6b7280"} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={styles.headerBtn}>
            <View style={[styles.iconBubble, hasActiveFilters ? styles.iconBubbleActive : { backgroundColor: '#f3f4f6' }]}>
              <Ionicons name="options-outline" size={20} color={hasActiveFilters ? "#fff" : "#6b7280"} />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Active Filters Banner */}
      {(hasActiveFilters || activeFilters.country) && (
        <View style={styles.filterBanner}>
            <Ionicons name="funnel" size={14} color="#d84b6b" />
            <Text style={styles.filterText}>{t.discovery.activeFilters}</Text>
            <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.resetText}>{t.discovery.resetFilters}</Text>
            </TouchableOpacity>
        </View>
      )}

      {lastDismissed && (
        <View style={styles.undoBanner}>
          <View style={styles.undoTextWrap}>
            <Ionicons name="arrow-undo" size={16} color="#17313e" />
            <Text style={styles.undoText}>{lastDismissed.user.nickname || lastDismissed.user.profile?.nickname || t.discovery.dismiss}</Text>
          </View>
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndoDismiss}>
            <Text style={styles.undoBtnText}>{t.common.back}</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#d84b6b" />
          </View>
      ) : users.length ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDiscovery();
              }}
              tintColor="#d84b6b"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stackWrap}>
            <View style={styles.stackViewport}>
              {[...users.slice(0, 3)].reverse().map((item, index, array) => {
                const depth = array.length - index - 1;
                return <View key={item.userId}>{renderItem({ item, isTopCard: depth === 0, depth })}</View>;
              })}
            </View>
            {users.length > 1 ? <Text style={styles.stackCounter}>{users.length} {t.common.noResults}</Text> : null}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={40} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>{t.discovery.noMore}</Text>
          <Text style={styles.emptyHint}>{t.discovery.noMoreHint}</Text>
        </View>
      )}

      {/* Travel Mode Modal */}
      <Modal visible={travelModeVisible} transparent animationType="slide" onRequestClose={() => setTravelModeVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t.discovery.travelModeTitle} ✈️</Text>
                    <TouchableOpacity onPress={() => setTravelModeVisible(false)} style={styles.modalClose}>
                        <Ionicons name="close" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>{t.discovery.travelModeSubtitle}</Text>
                
                <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={[styles.countryOption, !filterCountry && styles.selectedOption]} onPress={() => applyTravel(null)}>
                        <Text style={[styles.countryText, !filterCountry && styles.selectedOptionText]}>{t.common.all}</Text>
                        {!filterCountry && <Ionicons name="checkmark-circle" size={20} color="white" />}
                    </TouchableOpacity>
                    {COUNTRIES_DATA.map(c => (
                        <TouchableOpacity 
                            key={c.value} 
                            style={[styles.countryOption, filterCountry === c.value && styles.selectedOption]} 
                            onPress={() => applyTravel(c.value)}
                        >
                            <Text style={[styles.countryText, filterCountry === c.value && styles.selectedOptionText]}>
                              {lang === 'ar' ? c.ar : c.value}
                            </Text>
                            {filterCountry === c.value && <Ionicons name="checkmark-circle" size={20} color="white" />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
      </Modal>

      {/* Advanced Filters Modal */}
      <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t.discovery.filters}</Text>
                    <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.modalClose}>
                        <Ionicons name="close" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={{ marginTop: 10 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                    {/* ── Age Range ── */}
                    <Text style={styles.fLabel}>{t.discovery.ageRange}</Text>
                    <View style={styles.ageRow}>
                      <View style={styles.ageStepper}>
                        <Text style={styles.ageStepLabel}>{t.discovery.minPlaceholder}</Text>
                        <View style={styles.stepperRow}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => setAgeMin(Math.max(AGE_MIN_DEFAULT, ageMin - 1))}><Text style={styles.stepBtnText}>−</Text></TouchableOpacity>
                          <Text style={styles.ageValue}>{ageMin}</Text>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => setAgeMin(Math.min(ageMax, ageMin + 1))}><Text style={styles.stepBtnText}>+</Text></TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.ageDash}><Text style={styles.ageDashText}>—</Text></View>
                      <View style={styles.ageStepper}>
                        <Text style={styles.ageStepLabel}>{t.discovery.maxPlaceholder}</Text>
                        <View style={styles.stepperRow}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => setAgeMax(Math.max(ageMin, ageMax - 1))}><Text style={styles.stepBtnText}>−</Text></TouchableOpacity>
                          <Text style={styles.ageValue}>{ageMax}</Text>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => setAgeMax(Math.min(AGE_MAX_DEFAULT, ageMax + 1))}><Text style={styles.stepBtnText}>+</Text></TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* ── Country ── */}
                    <Text style={styles.fLabel}>{t.discovery.country}</Text>
                    <View style={styles.chipsWrap}>
                      <TouchableOpacity
                        style={[styles.chip, !filterCountry && styles.chipActive]}
                        onPress={() => setFilterCountry(null)}
                      >
                        <Text style={[styles.chipText, !filterCountry && styles.chipTextActive]}>{t.common.all}</Text>
                      </TouchableOpacity>
                      {COUNTRIES_DATA.map(c => (
                        <TouchableOpacity
                          key={c.value}
                          style={[styles.chip, filterCountry === c.value && styles.chipActive]}
                          onPress={() => setFilterCountry(filterCountry === c.value ? null : c.value)}
                        >
                          <Text style={[styles.chipText, filterCountry === c.value && styles.chipTextActive]}>
                            {lang === 'ar' ? c.ar : c.value}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* ── Marriage Type ── */}
                    <Text style={styles.fLabel}>{t.discovery.marriageType}</Text>
                    <View style={styles.marriageTypeGroup}>
                      {(['ALL', 'PERMANENT', 'TEMPORARY'] as const).map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.typeBtn, marriageCategory === cat && styles.typeBtnActive]}
                          onPress={() => { setMarriageCategory(cat); if (cat !== 'TEMPORARY') setMarriageSubType(null); }}
                        >
                          <Text style={[styles.typeBtnText, marriageCategory === cat && styles.typeBtnTextActive]}>
                            {cat === 'ALL' ? t.common.all : cat === 'PERMANENT' ? t.discovery.permanent : t.discovery.temporary}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {marriageCategory === 'TEMPORARY' && (
                      <View style={styles.subTypeWrap}>
                        <TouchableOpacity
                          style={[styles.subTypeChip, !marriageSubType && styles.subTypeChipActive]}
                          onPress={() => setMarriageSubType(null)}
                        >
                          <Text style={[styles.subTypeText, !marriageSubType && styles.subTypeTextActive]}>{t.common.all}</Text>
                        </TouchableOpacity>
                        {TEMP_SUBTYPES.map((st) => {
                          const labelMap: Record<string, string> = { MISYAR: t.profile.misyar, MUTAA: t.discovery.mutaa, URFI: t.discovery.urfi, TRAVEL_MARRIAGE: t.discovery.travelMarriage };
                          return (
                            <TouchableOpacity
                              key={st}
                              style={[styles.subTypeChip, marriageSubType === st && styles.subTypeChipActive]}
                              onPress={() => setMarriageSubType(marriageSubType === st ? null : st)}
                            >
                              <Text style={[styles.subTypeText, marriageSubType === st && styles.subTypeTextActive]}>{labelMap[st]}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* ── Premium Filters ── */}
                    <View style={styles.premiumDivider}>
                      <View style={styles.premiumLine} />
                      <View style={styles.premiumBadge}>
                        <Ionicons name="diamond" size={14} color="#d84b6b" />
                        <Text style={styles.premiumBadgeText}>{t.discovery.premiumFilters}</Text>
                      </View>
                      <View style={styles.premiumLine} />
                    </View>

                    {/* Sect */}
                    <Text style={styles.fLabel}>{t.discovery.sect}</Text>
                    <View style={styles.chipsWrap}>
                      <TouchableOpacity style={[styles.chip, !filterSect && styles.chipActive]} onPress={() => setFilterSect(null)}>
                        <Text style={[styles.chipText, !filterSect && styles.chipTextActive]}>{t.common.all}</Text>
                      </TouchableOpacity>
                      {SECTS_DATA.map(s => (
                        <TouchableOpacity key={s.value} style={[styles.chip, filterSect === s.value && styles.chipActive]} onPress={() => setFilterSect(filterSect === s.value ? null : s.value)}>
                          <Text style={[styles.chipText, filterSect === s.value && styles.chipTextActive]}>{lang === 'ar' ? s.ar : s.en}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Nationality */}
                    <Text style={styles.fLabel}>{t.discovery.nationality}</Text>
                    <View style={styles.chipsWrap}>
                      <TouchableOpacity style={[styles.chip, !filterNationality && styles.chipActive]} onPress={() => setFilterNationality(null)}>
                        <Text style={[styles.chipText, !filterNationality && styles.chipTextActive]}>{t.common.all}</Text>
                      </TouchableOpacity>
                      {COUNTRIES_DATA.map(c => (
                        <TouchableOpacity key={c.value} style={[styles.chip, filterNationality === c.value && styles.chipActive]} onPress={() => setFilterNationality(filterNationality === c.value ? null : c.value)}>
                          <Text style={[styles.chipText, filterNationality === c.value && styles.chipTextActive]}>{lang === 'ar' ? c.ar : c.value}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Education */}
                    <Text style={styles.fLabel}>{t.discovery.education}</Text>
                    <View style={styles.chipsWrap}>
                      <TouchableOpacity style={[styles.chip, !filterEducation && styles.chipActive]} onPress={() => setFilterEducation(null)}>
                        <Text style={[styles.chipText, !filterEducation && styles.chipTextActive]}>{t.common.all}</Text>
                      </TouchableOpacity>
                      {EDUCATION_DATA.map(e => (
                        <TouchableOpacity key={e.value} style={[styles.chip, filterEducation === e.value && styles.chipActive]} onPress={() => setFilterEducation(filterEducation === e.value ? null : e.value)}>
                          <Text style={[styles.chipText, filterEducation === e.value && styles.chipTextActive]}>{lang === 'ar' ? e.ar : e.en}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Marital Status */}
                    <Text style={styles.fLabel}>{t.discovery.maritalStatus}</Text>
                    <View style={styles.chipsWrap}>
                      <TouchableOpacity style={[styles.chip, !filterMarital && styles.chipActive]} onPress={() => setFilterMarital(null)}>
                        <Text style={[styles.chipText, !filterMarital && styles.chipTextActive]}>{t.common.all}</Text>
                      </TouchableOpacity>
                      {MARITAL_DATA.map(m => (
                        <TouchableOpacity key={m.value} style={[styles.chip, filterMarital === m.value && styles.chipActive]} onPress={() => setFilterMarital(filterMarital === m.value ? null : m.value)}>
                          <Text style={[styles.chipText, filterMarital === m.value && styles.chipTextActive]}>{lang === 'ar' ? m.ar : m.en}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Smoking */}
                    <Text style={styles.fLabel}>{t.discovery.smoking}</Text>
                    <View style={styles.chipsWrap}>
                      <TouchableOpacity style={[styles.chip, !filterSmoking && styles.chipActive]} onPress={() => setFilterSmoking(null)}>
                        <Text style={[styles.chipText, !filterSmoking && styles.chipTextActive]}>{t.common.all}</Text>
                      </TouchableOpacity>
                      {SMOKING_DATA.map(s => (
                        <TouchableOpacity key={s.value} style={[styles.chip, filterSmoking === s.value && styles.chipActive]} onPress={() => setFilterSmoking(filterSmoking === s.value ? null : s.value)}>
                          <Text style={[styles.chipText, filterSmoking === s.value && styles.chipTextActive]}>{lang === 'ar' ? s.ar : s.en}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Action buttons */}
                    <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                        <Text style={styles.applyBtnText}>{t.discovery.applyFilters}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                        <Text style={styles.resetBtnText}>{t.discovery.resetFilters}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const CARD_RADIUS = 20;

function SwipeableDiscoveryCard({
  item,
  onDismiss,
  onLike,
  onSuperLike,
  onOpenProfile,
  renderContent,
}: {
  item: DiscoveryItem;
  onDismiss: (userId: string) => void;
  onLike: (userId: string) => void;
  onSuperLike: (userId: string) => void;
  onOpenProfile: (userId: string) => void;
  renderContent: (state: { swipeLikeOpacity: Animated.AnimatedInterpolation<number>; swipeDismissOpacity: Animated.AnimatedInterpolation<number>; swipeSuperLikeOpacity: Animated.AnimatedInterpolation<number> }) => React.ReactNode;
}) {
  const translate = useRef(new Animated.ValueXY()).current;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: Animated.event([null, { dx: translate.x, dy: translate.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -SWIPE_UP_THRESHOLD && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
            Animated.timing(translate, {
              toValue: { x: gesture.dx * 0.2, y: -SWIPE_OUT_DISTANCE },
              duration: 180,
              useNativeDriver: true,
            }).start(() => onSuperLike(item.userId));
            return;
          }

          if (gesture.dx > SWIPE_THRESHOLD) {
            Animated.timing(translate, {
              toValue: { x: SWIPE_OUT_DISTANCE, y: gesture.dy },
              duration: 180,
              useNativeDriver: true,
            }).start(() => onLike(item.userId));
            return;
          }

          if (gesture.dx < -SWIPE_THRESHOLD) {
            Animated.timing(translate, {
              toValue: { x: -SWIPE_OUT_DISTANCE, y: gesture.dy },
              duration: 180,
              useNativeDriver: true,
            }).start(() => onDismiss(item.userId));
            return;
          }

          Animated.spring(translate, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 5,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translate, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 5,
          }).start();
        },
      }),
    [item.userId, onDismiss, onLike, onSuperLike, translate],
  );

  const rotate = translate.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-10deg', '0deg', '10deg'],
  });
  const swipeLikeOpacity = translate.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, SWIPE_OUT_DISTANCE],
    outputRange: [0, 0.75, 1],
    extrapolate: 'clamp',
  });
  const swipeDismissOpacity = translate.x.interpolate({
    inputRange: [-SWIPE_OUT_DISTANCE, -SWIPE_THRESHOLD, 0],
    outputRange: [1, 0.75, 0],
    extrapolate: 'clamp',
  });
  const swipeSuperLikeOpacity = translate.y.interpolate({
    inputRange: [-SWIPE_OUT_DISTANCE, -SWIPE_UP_THRESHOLD, 0],
    outputRange: [1, 0.75, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        transform: [
          { translateX: translate.x },
          { translateY: translate.y },
          { rotate },
        ],
      }}
      {...panResponder.panHandlers}
    >
      {renderContent({ swipeLikeOpacity, swipeDismissOpacity, swipeSuperLikeOpacity })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf7' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e4e0',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1f2937' },
  headerControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {},
  iconBubbleDaily: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBubbleActive: { backgroundColor: '#d84b6b' },
  filterBanner: {
    backgroundColor: '#fff1f3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  filterText: { color: '#d84b6b', fontWeight: '600', flex: 1 },
  resetText: { color: '#9ca3af', fontSize: 13 },
  undoBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#eef7f8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  undoTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  undoText: {
    color: '#17313e',
    fontWeight: '700',
    flex: 1,
  },
  undoBtn: {
    backgroundColor: '#17313e',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  undoBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  list: { padding: 16, paddingBottom: 30 },
  stackWrap: {
    alignItems: 'center',
    paddingTop: 6,
    minHeight: 640,
  },
  stackViewport: {
    width: '100%',
    minHeight: 610,
    position: 'relative',
  },
  stackCardLayer: {
    position: 'absolute',
    width: '100%',
    left: 0,
    right: 0,
  },
  stackCounter: {
    marginTop: 18,
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardStacked: {
    opacity: 0.92,
  },
  swipeBadge: {
    position: 'absolute',
    top: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  swipeBadgeLike: {
    right: 18,
    borderColor: '#10b981',
  },
  swipeBadgeDismiss: {
    left: 18,
    borderColor: '#ef4444',
  },
  swipeBadgeSuperLike: {
    alignSelf: 'center',
    top: 18,
    borderColor: '#f59e0b',
  },
  swipeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  swipeBadgeTextLike: {
    color: '#065f46',
  },
  swipeBadgeTextDismiss: {
    color: '#991b1b',
  },
  swipeBadgeTextSuperLike: {
    color: '#92400e',
  },
  imageContainer: { height: 340, backgroundColor: '#f0e4e0', position: 'relative' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, padding: 14, justifyContent: 'space-between' },
  topBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  overlayBadge: {
    backgroundColor: 'rgba(31,41,55,0.78)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overlayBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  revealButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(216,75,107,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revealButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  compatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(216,75,107,0.9)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compatText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  avatar: { width: '100%', height: '100%' },
  placeholderAvatar: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 48, color: '#9ca3af', fontWeight: '700' },
  infoContainer: { paddingHorizontal: 16, paddingVertical: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  ageText: { fontSize: 15, color: '#6b7280' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  details: { fontSize: 13, color: '#9ca3af' },
  marriageTag: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  permanentTag: { backgroundColor: '#ecfdf5' },
  misyarTag: { backgroundColor: '#fdf2f8' },
  marriageTagText: { fontSize: 12, fontWeight: '600' },
  permanentTagText: { color: '#059669' },
  misyarTagText: { color: '#d84b6b' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f5f0ee',
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCircleAlt: { backgroundColor: '#eef2ff' },
  actionCirclePrimary: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#d84b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCircleSuperLike: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  actionLabel: { fontSize: 11, color: '#9ca3af' },
  emptyWrap: { alignItems: 'center', paddingTop: 80 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  modalSubtitle: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  countryList: { marginBottom: 20 },
  countryOption: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedOption: { backgroundColor: '#d84b6b' },
  countryText: { fontSize: 15, color: '#374151' },
  selectedOptionText: { color: '#fff', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  fLabel: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginTop: 18, marginBottom: 10 },
  row: { flexDirection: 'row' },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  // Age stepper
  ageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  ageStepper: { alignItems: 'center', flex: 1 },
  ageStepLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 6, fontWeight: '600' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f9fafb', borderRadius: 14, padding: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  stepBtnText: { fontSize: 20, fontWeight: '700', color: '#d84b6b' },
  ageValue: { fontSize: 22, fontWeight: '800', color: '#1f2937', minWidth: 36, textAlign: 'center' },
  ageDash: { paddingHorizontal: 4, paddingTop: 18 },
  ageDashText: { fontSize: 18, color: '#9ca3af' },
  // Chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#d84b6b', borderColor: '#d84b6b' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#fff' },
  // Marriage type
  marriageTypeGroup: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeBtnActive: { backgroundColor: '#d84b6b', borderColor: '#d84b6b' },
  typeBtnText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  // Sub-type chips (temporary marriage)
  subTypeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingLeft: 4 },
  subTypeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fdf2f8', borderWidth: 1, borderColor: '#f9a8d4' },
  subTypeChipActive: { backgroundColor: '#e8637f', borderColor: '#e8637f' },
  subTypeText: { fontSize: 13, fontWeight: '600', color: '#d84b6b' },
  subTypeTextActive: { color: '#fff' },
  // Premium divider
  premiumDivider: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 4 },
  premiumLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, backgroundColor: '#fff1f3', marginHorizontal: 8 },
  premiumBadgeText: { fontSize: 12, fontWeight: '700', color: '#d84b6b' },
  applyBtn: {
    backgroundColor: '#d84b6b',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetBtn: {
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resetBtnText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
});
