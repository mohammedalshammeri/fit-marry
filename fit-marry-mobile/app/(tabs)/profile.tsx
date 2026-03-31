import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Share, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useI18n } from '../../src/i18n';
import type { ProfileVisitor, UserPhoto, UserProfile } from '../../src/types';
import { getReadableError } from '../../src/utils/auth';

const resolveMediaUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;

  const baseUrl = api.defaults.baseURL || 'http://10.0.2.2:4000';
  return `${baseUrl}${url}`;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { t, lang, setLanguage } = useI18n();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [galleryBusyId, setGalleryBusyId] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<ProfileVisitor[]>([]);
  const [visitorsLocked, setVisitorsLocked] = useState(false);
  const [visitorsLockedCount, setVisitorsLockedCount] = useState(0);
  const [visitorsTotal, setVisitorsTotal] = useState(0);

  const fetchData = async () => {
    try {
      const [resProfile, resWallet, resReferral, resPhotos, resVisitors] = await Promise.all([
        api.get('/profiles/me').catch(() => ({ data: null })),
        api.get('/wallet').catch(() => ({ data: { balance: 0 } })),
        api.get('/referrals/code').catch(() => ({ data: null })),
        api.get('/profiles/me/photos').catch(() => ({ data: [] })),
        api.get('/profiles/me/visitors').catch(() => ({ data: { items: [], premiumRequired: false, lockedCount: 0, total: 0 } })),
      ]);
      
      setProfile(resProfile.data);
      setWallet(resWallet.data);
      setPhotos(Array.isArray(resPhotos.data) ? resPhotos.data : []);
      setVisitors(Array.isArray(resVisitors.data?.items) ? resVisitors.data.items : []);
      setVisitorsLocked(!!resVisitors.data?.premiumRequired);
      setVisitorsLockedCount(Number(resVisitors.data?.lockedCount || 0));
      setVisitorsTotal(Number(resVisitors.data?.total || 0));
      if (resReferral.data?.code) {
        setReferralCode(resReferral.data.code);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
        fetchData();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(t.common.logout, t.profile.logoutConfirm, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.yes, onPress: logout, style: 'destructive' }
    ]);
  };

  const handleAvatarPress = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(t.common.permissionRequired, t.profile.photoPermissionMsg);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setUploading(true);
        const base64 = result.assets[0].base64;
        const mimeType = result.assets[0].mimeType || 'image/jpeg';
        
        // Optimistic update
        try {
          const res = await api.post('/profiles/avatar', {
            base64,
            mimeType,
          });
          
          if (res.data.avatarUrl) {
            setProfile((prev: any) => ({ ...prev, avatarUrl: res.data.avatarUrl }));
            Alert.alert(t.common.success, t.profile.avatarUpdated);
          }
        } catch (error) {
          console.error(error);
          Alert.alert(t.common.error, t.profile.avatarUpdateFailed);
        } finally {
            setUploading(false);
        }
      }
    } catch (error) {
       console.log(error);
    }
  };

  const getAvatarSource = () => {
    const uri = resolveMediaUrl(profile?.avatarUrl);
    return uri ? { uri } : undefined;
  };

  const hasGalleryEntitlement = !!(
    profile?.subscriptionTier === 'PREMIUM' ||
    (profile?.adRewardExpiresAt && new Date(profile.adRewardExpiresAt) > new Date())
  );

  const canUploadExtraGalleryPhoto = photos.length === 0 || hasGalleryEntitlement;

  const rewardExpiryText = profile?.adRewardExpiresAt
    ? new Date(profile.adRewardExpiresAt).toLocaleString('ar-EG')
    : null;

  const handleWatchAd = async () => {
    setRewardLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const response = await api.post('/profiles/ads/reward');
      setProfile((prev) => (prev ? { ...prev, adRewardExpiresAt: response.data.expiresAt } : prev));
      Alert.alert(t.common.success, t.profile.rewardSuccess);
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.profile.rewardFailed));
    } finally {
      setRewardLoading(false);
    }
  };

  const handleShareReferral = async () => {
    if (!referralCode) return;
    try {
      await Share.share({
        message: `${t.profile.shareMsg} ${referralCode}`,
      });
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  const handleSubmitInviteCode = async () => {
    if (!inviteCodeInput.trim()) return;
    setSubmittingInvite(true);
    try {
      await api.post('/referrals/invite', { code: inviteCodeInput.trim() });
      Alert.alert(t.common.success, t.profile.inviteCodeSuccess);
      setInviteCodeInput('');
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || t.profile.inviteCodeInvalid;
      Alert.alert(t.common.error, typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleAddGalleryPhoto = async () => {
    if (!canUploadExtraGalleryPhoto) {
      Alert.alert(t.common.warning, t.profile.galleryPremiumLocked, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.profile.galleryPremiumCta, onPress: () => router.push('/premium') },
      ]);
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t.common.permissionRequired, t.profile.photoPermissionMsg);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]?.base64) {
        return;
      }

      setGalleryBusyId('upload');
      const asset = result.assets[0];
      const response = await api.post('/profiles/me/photos', {
        base64: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
      });

      const createdPhoto = response.data as UserPhoto;
      setPhotos((prev) => [...prev, createdPhoto].sort((a, b) => a.order - b.order));
      if (createdPhoto.isAvatar) {
        setProfile((prev) => (prev ? { ...prev, avatarUrl: createdPhoto.url } : prev));
      }
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.profile.galleryUploadFailed));
    } finally {
      setGalleryBusyId(null);
    }
  };

  const handleDeleteGalleryPhoto = (photoId: string) => {
    Alert.alert(t.common.delete, t.profile.galleryDeleteConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          setGalleryBusyId(photoId);
          try {
            await api.delete(`/profiles/me/photos/${photoId}`);
            setPhotos((prev) => {
              const nextPhotos = prev.filter((photo) => photo.id !== photoId);
              const nextAvatar = nextPhotos.find((photo) => photo.isAvatar) || nextPhotos[0];
              setProfile((current) => (current ? { ...current, avatarUrl: nextAvatar?.url } : current));
              return nextPhotos;
            });
          } catch (error) {
            Alert.alert(t.common.error, getReadableError(error, t.profile.galleryDeleteFailed));
          } finally {
            setGalleryBusyId(null);
          }
        },
      },
    ]);
  };

  const handleSetGalleryAvatar = async (photoId: string) => {
    setGalleryBusyId(photoId);
    try {
      const response = await api.post(`/profiles/me/photos/${photoId}/avatar`);
      setPhotos((prev) => prev.map((photo) => ({ ...photo, isAvatar: photo.id === photoId })));
      setProfile((prev) => (prev ? { ...prev, avatarUrl: response.data.avatarUrl } : prev));
      Alert.alert(t.common.success, t.profile.galleryAvatarUpdated);
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.profile.galleryAvatarFailed));
    } finally {
      setGalleryBusyId(null);
    }
  };

  if (loading) {
     return <View style={styles.centered}><ActivityIndicator color="#d84b6b" /></View>;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#fffaf7', '#fff5f7', '#fffaf7']} style={styles.header}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress}>
            {uploading ? (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                    <ActivityIndicator color="#d84b6b" />
                </View>
            ) : profile?.avatarUrl ? (
                <Image source={getAvatarSource()} style={styles.avatar} />
            ) : (
                <LinearGradient colors={['#f0e4e0', '#d9d3cf']} style={[styles.avatar, styles.placeholderAvatar]}>
                    <Text style={styles.placeholderText}>{profile?.nickname?.[0] || '?'}</Text>
                </LinearGradient>
            )}
            <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
            </View>
        </TouchableOpacity>
        <View style={styles.nameRow}>
            <Text style={styles.name}>{profile?.nickname || t.common.user}</Text>
            {profile?.subscriptionTier === 'PREMIUM' && (
                <LinearGradient colors={['#fbbf24', '#f59e0b']} style={styles.premiumBadge}>
                    <Ionicons name="diamond" size={10} color="#fff" />
                    <Text style={styles.premiumText}>VIP</Text>
                </LinearGradient>
            )}
        </View>
        <Text style={styles.bio}>{profile?.aboutMe || t.profile.bio}</Text>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{wallet?.balance || 0}</Text>
          <Text style={styles.statLabel}>{t.profile.balance}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile?.marriageType === 'PERMANENT' ? t.profile.permanent : t.profile.misyar}</Text>
          <Text style={styles.statLabel}>{t.discovery.marriageType}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{visitorsTotal}</Text>
          <Text style={styles.statLabel}>{t.profile.profileViews}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.successStoriesCard} onPress={() => router.push('/success-stories')} activeOpacity={0.85}>
        <LinearGradient colors={['#17313e', '#2b5664']} style={styles.successStoriesCardInner}>
          <View style={styles.successStoriesTextWrap}>
            <Text style={styles.successStoriesTitle}>{t.successStories.title}</Text>
            <Text style={styles.successStoriesHint}>{t.successStories.subtitle}</Text>
          </View>
          <View style={styles.successStoriesArrowWrap}>
            <Ionicons name="sparkles" size={18} color="#fde68a" />
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.guardianCard}>
        <View style={styles.guardianHeader}>
          <View style={styles.guardianTitleWrap}>
            <Text style={styles.galleryTitle}>{t.profile.guardianSection}</Text>
            <Text style={styles.galleryHint}>{t.profile.guardianHint}</Text>
          </View>
          <TouchableOpacity style={styles.guardianEditBtn} onPress={() => router.push('/profile/edit')}>
            <Text style={styles.guardianEditText}>{profile?.guardianName ? t.profile.editProfile : t.profile.completeProfile}</Text>
          </TouchableOpacity>
        </View>

        {profile?.guardianName || profile?.guardianRelation || profile?.guardianContact ? (
          <View style={styles.guardianBody}>
            {profile?.guardianName ? (
              <View style={styles.guardianRow}>
                <Text style={styles.guardianValue}>{profile.guardianName}</Text>
                <Text style={styles.guardianLabel}>{t.profile.guardianName}</Text>
              </View>
            ) : null}
            {profile?.guardianRelation ? (
              <View style={styles.guardianRow}>
                <Text style={styles.guardianValue}>{profile.guardianRelation}</Text>
                <Text style={styles.guardianLabel}>{t.profile.guardianRelation}</Text>
              </View>
            ) : null}
            {profile?.guardianContact ? (
              <View style={styles.guardianRow}>
                <Text style={styles.guardianValue}>{profile.guardianContact}</Text>
                <Text style={styles.guardianLabel}>{t.profile.guardianContact}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity style={styles.guardianEmptyState} onPress={() => router.push('/profile/edit')}>
            <Ionicons name="people-circle-outline" size={26} color="#c084fc" />
            <Text style={styles.guardianEmptyText}>{t.profile.completeProfileHint}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.visitorsCard}>
        <View style={styles.galleryHeader}>
          <View style={styles.galleryTitleWrap}>
            <Text style={styles.galleryTitle}>{t.profile.profileViews}</Text>
            <Text style={styles.galleryHint}>
              {visitorsLocked
                ? `${t.profile.visitorsPremiumHint} ${visitorsLockedCount}`
                : t.profile.visitorsHint}
            </Text>
          </View>
          {visitorsLocked ? (
            <TouchableOpacity style={styles.visitorsUpgradeBtn} onPress={() => router.push('/premium')}>
              <Text style={styles.visitorsUpgradeText}>{t.discovery.upgrade}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {visitors.length ? (
          visitors.map((visitor) => {
            const visitorAvatar = resolveMediaUrl(visitor.viewer.profile?.avatarUrl);
            return (
              <TouchableOpacity
                key={visitor.id}
                style={styles.visitorRow}
                onPress={() => router.push(`/user/${visitor.viewer.userId}` as any)}
              >
                {visitorAvatar ? (
                  <Image source={{ uri: visitorAvatar }} style={styles.visitorAvatar} />
                ) : (
                  <View style={[styles.visitorAvatar, styles.visitorAvatarPlaceholder]}>
                    <Text style={styles.visitorAvatarText}>{visitor.viewer.profile?.nickname?.[0] || '?'}</Text>
                  </View>
                )}
                <View style={styles.visitorInfo}>
                  <Text style={styles.visitorName}>{visitor.viewer.profile?.nickname || t.common.user}</Text>
                  <Text style={styles.visitorMeta}>
                    {visitor.viewer.profile?.residenceCountry || t.profile.visitorUnknownLocation}
                    {visitor.viewer.profile?.age ? ` • ${visitor.viewer.profile.age}` : ''}
                  </Text>
                </View>
                <Text style={styles.visitorTime}>{new Date(visitor.visitedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.galleryHint}>{t.profile.visitorsEmpty}</Text>
        )}
      </View>

      <View style={styles.galleryCard}>
        <View style={styles.galleryHeader}>
          <View style={styles.galleryTitleWrap}>
            <Text style={styles.galleryTitle}>{t.profile.galleryTitle}</Text>
            <Text style={styles.galleryHint}>{t.profile.galleryHint}</Text>
          </View>
          <TouchableOpacity
            style={[styles.galleryAddBtn, photos.length >= 6 && styles.galleryAddBtnDisabled]}
            onPress={handleAddGalleryPhoto}
            disabled={galleryBusyId === 'upload' || photos.length >= 6}
          >
            {galleryBusyId === 'upload' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.galleryAddText}>{t.profile.galleryAdd}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryList}>
          {photos.length === 0 ? (
            <View style={styles.galleryEmptyState}>
              <Ionicons name="images-outline" size={28} color="#c5b7b0" />
              <Text style={styles.galleryEmptyText}>{t.profile.galleryEmpty}</Text>
            </View>
          ) : (
            photos.map((photo) => {
              const isBusy = galleryBusyId === photo.id;
              const uri = resolveMediaUrl(photo.url);
              return (
                <View key={photo.id} style={styles.galleryItem}>
                  {uri ? <Image source={{ uri }} style={styles.galleryImage} /> : <View style={styles.galleryImagePlaceholder} />}
                  {photo.isAvatar && (
                    <View style={styles.galleryBadge}>
                      <Text style={styles.galleryBadgeText}>{t.profile.galleryPrimaryBadge}</Text>
                    </View>
                  )}
                  <View style={styles.galleryActions}>
                    <TouchableOpacity
                      style={[styles.galleryActionBtn, photo.isAvatar && styles.galleryActionBtnDisabled]}
                      onPress={() => handleSetGalleryAvatar(photo.id)}
                      disabled={photo.isAvatar || isBusy}
                    >
                      {isBusy ? <ActivityIndicator size="small" color="#d84b6b" /> : <Ionicons name="star" size={16} color="#d84b6b" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.galleryDeleteBtn}
                      onPress={() => handleDeleteGalleryPhoto(photo.id)}
                      disabled={isBusy}
                    >
                      <Ionicons name="trash" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {!canUploadExtraGalleryPhoto && photos.length >= 1 && (
          <TouchableOpacity style={styles.galleryUpsell} onPress={() => router.push('/premium')}>
            <Ionicons name="diamond" size={18} color="#7c3aed" />
            <Text style={styles.galleryUpsellText}>{t.profile.galleryPremiumLocked}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {/* Watch Ad Reward */}
        <View style={styles.rewardCard}>
          <View style={styles.rewardHeader}>
            <Ionicons name="play-circle" size={24} color="#c8881e" />
            <Text style={styles.rewardTitle}>{t.premium.watchAd}</Text>
          </View>
          {rewardExpiryText && (
            <Text style={styles.rewardExpiry}>{t.profile.activeUntil}: {rewardExpiryText}</Text>
          )}
          <TouchableOpacity style={styles.rewardButton} onPress={handleWatchAd} disabled={rewardLoading}>
            <Text style={styles.rewardButtonText}>{rewardLoading ? t.common.loading : t.profile.watchAdNow}</Text>
          </TouchableOpacity>
        </View>

        {/* Referral */}
        {referralCode && (
          <View style={[styles.rewardCard, { backgroundColor: '#f5f3ff' }]}>
            <View style={styles.rewardHeader}>
              <Ionicons name="gift" size={24} color="#7c3aed" />
              <Text style={[styles.rewardTitle, { color: '#7c3aed' }]}>{t.profile.inviteEarn}</Text>
            </View>
            <TouchableOpacity style={[styles.rewardButton, { backgroundColor: '#7c3aed' }]} onPress={handleShareReferral}>
              <Text style={styles.rewardButtonText}>{t.profile.shareCode}: {referralCode}</Text>
            </TouchableOpacity>

            <View style={styles.inviteRow}>
               <TextInput 
                 style={styles.inviteInput}
                 placeholder={t.profile.enterInviteCode}
                 value={inviteCodeInput}
                 onChangeText={setInviteCodeInput}
                 autoCapitalize="characters"
               />
               <TouchableOpacity 
                 style={styles.inviteBtn}
                 onPress={handleSubmitInviteCode}
                 disabled={submittingInvite}
               >
                 {submittingInvite ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={20} color="#fff" />}
               </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Premium upgrade */}
        {profile?.subscriptionTier !== 'PREMIUM' && (
            <TouchableOpacity onPress={() => router.push('/premium')}>
              <LinearGradient colors={['#d84b6b', '#e8637f']} style={styles.premiumCard}>
                <Ionicons name="diamond" size={22} color="#fff" />
                <Text style={styles.premiumCardText}>{t.profile.upgradePremium}</Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
        )}

        {/* Language Switcher */}
        <View style={styles.langRow}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="language" size={20} color="#6366f1" />
            <Text style={styles.menuText}>{t.profile.language}</Text>
          </View>
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'ar' && styles.langBtnActive]}
              onPress={() => setLanguage('ar')}
            >
              <Text style={[styles.langBtnText, lang === 'ar' && styles.langBtnTextActive]}>{t.profile.arabicLang}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>{t.profile.englishLang}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <MenuItem icon="people" color="#06b6d4" label={t.profile.inviteFriendsRewards} onPress={() => router.push('/referrals')} />
        <MenuItem icon="create" color="#f59e0b" label={t.profile.editProfile} onPress={() => router.push('/profile/edit')} />
        <MenuItem icon="shield-checkmark" color="#10b981" label={t.profile.verifyNow} onPress={() => router.push('/profile/verify' as any)} />
        <MenuItem icon="lock-closed" color="#8b5cf6" label={t.profile.privacy} onPress={() => {}} />
        <MenuItem icon="wallet" color="#3b82f6" label={t.profile.topUpBalance} onPress={() => {}} />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>{t.common.logout}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

function MenuItem({ icon, color, label, onPress }: { icon: string; color: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={styles.menuText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fffaf7' },
  header: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 14,
    shadowColor: '#d84b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d84b6b',
    borderWidth: 2.5,
    borderColor: '#fffaf7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 36, color: '#9ca3af', fontWeight: '700' },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  premiumText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  bio: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#9ca3af' },
  successStoriesCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  successStoriesCardInner: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  successStoriesTextWrap: {
    flex: 1,
  },
  successStoriesTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  successStoriesHint: {
    color: '#d7e5ea',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  successStoriesArrowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guardianCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  guardianHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  guardianTitleWrap: {
    flex: 1,
  },
  guardianEditBtn: {
    backgroundColor: '#17313e',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  guardianEditText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  guardianBody: {
    marginTop: 14,
    gap: 10,
  },
  guardianRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f0ee',
    paddingBottom: 10,
  },
  guardianLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  guardianValue: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  guardianEmptyState: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#efe3ff',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#faf5ff',
  },
  guardianEmptyText: {
    flex: 1,
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    lineHeight: 18,
  },
  visitorsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  galleryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  galleryTitleWrap: { flex: 1 },
  galleryTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937', textAlign: 'right' },
  galleryHint: { fontSize: 12, color: '#9ca3af', marginTop: 4, lineHeight: 18, textAlign: 'right' },
  galleryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d84b6b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  galleryAddBtnDisabled: { opacity: 0.5 },
  galleryAddText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  visitorsUpgradeBtn: {
    backgroundColor: '#17313e',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  visitorsUpgradeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  visitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 4,
    gap: 12,
  },
  visitorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  visitorAvatarPlaceholder: {
    backgroundColor: '#f0e4e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitorAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8b7d78',
  },
  visitorInfo: { flex: 1 },
  visitorName: { fontSize: 14, fontWeight: '700', color: '#1f2937', textAlign: 'right' },
  visitorMeta: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  visitorTime: { fontSize: 11, color: '#9ca3af' },
  galleryList: { paddingTop: 14, gap: 12 },
  galleryEmptyState: {
    width: 180,
    height: 148,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#e7d8dc',
    backgroundColor: '#faf6f2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  galleryEmptyText: { color: '#8b7d78', fontSize: 13, fontWeight: '600' },
  galleryItem: { width: 120 },
  galleryImage: { width: 120, height: 148, borderRadius: 16, backgroundColor: '#f3ebe7' },
  galleryImagePlaceholder: { width: 120, height: 148, borderRadius: 16, backgroundColor: '#f3ebe7' },
  galleryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(23,49,62,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  galleryBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  galleryActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  galleryActionBtn: {
    flex: 1,
    backgroundColor: '#fff5f7',
    borderWidth: 1,
    borderColor: '#f4d6df',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  galleryActionBtnDisabled: { opacity: 0.45 },
  galleryDeleteBtn: {
    width: 42,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryUpsell: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  galleryUpsellText: { flex: 1, color: '#6d28d9', fontSize: 12, fontWeight: '700', textAlign: 'right' },
  menu: { paddingHorizontal: 20 },
  rewardCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  rewardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rewardTitle: { fontSize: 16, fontWeight: '700', color: '#92400e' },
  rewardExpiry: { fontSize: 12, color: '#b45309', marginBottom: 8 },
  rewardButton: {
    backgroundColor: '#c8881e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rewardButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  inviteRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  inviteInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: '#1f2937',
  },
  inviteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#d84b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumCardText: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f0ee',
  },
  langToggle: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 2 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  langBtnActive: { backgroundColor: '#d84b6b' },
  langBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  langBtnTextActive: { color: '#fff' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f0ee',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
