import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import type { DiscoveryItem, UserPhoto, UserProfile } from '../../src/types';
import { getReadableError } from '../../src/utils/auth';
import { ProtectedImage } from '../../src/components/ProtectedImage';
import { useI18n } from '../../src/i18n';

type PublicProfileResponse = DiscoveryItem | {
  userId: string;
  marriageType: 'PERMANENT' | 'MISYAR';
  profile: UserProfile;
  guardianAvailable?: boolean;
  guardianRelation?: string;
};

const isExpandedProfile = (
  value: PublicProfileResponse,
): value is { userId: string; marriageType: 'PERMANENT' | 'MISYAR'; profile: UserProfile } =>
  typeof value === 'object' && value !== null && 'profile' in value && !!value.profile;

const resolveAvatarUrl = (avatar?: string) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;

  const baseUrl = api.defaults.baseURL || 'http://10.0.2.2:4000';
  return `${baseUrl}${avatar}`;
};

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get(`/profiles/${id}`);
        setProfile(response.data);
        await api.post(`/profiles/${id}/view`).catch(() => null);
      } catch (error) {
        Alert.alert(t.userProfile.loadFailed, getReadableError(error, t.userProfile.loadFailedMsg));
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id, router]);

  const normalized = useMemo(() => {
    if (!profile) {
      return null;
    }

    if (isExpandedProfile(profile)) {
      return {
        userId: profile.userId,
        marriageType: profile.marriageType,
        nickname: profile.profile.nickname,
        avatarUrl: profile.profile.avatarUrl,
        age: profile.profile.age,
        residenceCountry: profile.profile.residenceCountry,
        nationalityPrimary: profile.profile.nationalityPrimary,
        aboutMe: profile.profile.aboutMe,
        partnerPrefs: profile.profile.partnerPrefs,
        religion: profile.profile.religion,
        sect: profile.profile.sect,
        photos: profile.profile.photos,
        guardianAvailable: profile.guardianAvailable,
        guardianRelation: profile.guardianRelation,
      };
    }

    const compactProfile = profile as DiscoveryItem;

    return {
      userId: compactProfile.userId,
      marriageType: compactProfile.marriageType,
      nickname: compactProfile.nickname,
      avatarUrl: compactProfile.avatarUrl,
      age: undefined,
      residenceCountry: compactProfile.residenceCountry,
      nationalityPrimary: compactProfile.nationality,
      aboutMe: undefined,
      partnerPrefs: undefined,
      religion: undefined,
      sect: undefined,
      photos: undefined,
      guardianAvailable: 'guardianAvailable' in compactProfile ? (compactProfile as DiscoveryItem & { guardianAvailable?: boolean }).guardianAvailable : undefined,
      guardianRelation: 'guardianRelation' in compactProfile ? (compactProfile as DiscoveryItem & { guardianRelation?: string }).guardianRelation : undefined,
    };
  }, [profile]);

  const handleLike = async () => {
    if (!normalized) {
      return;
    }

    setLiking(true);
    try {
      await api.post('/likes', { toUserId: normalized.userId });
      Alert.alert(t.userProfile.likeSent, t.userProfile.likeSentMsg);
    } catch (error) {
      Alert.alert(t.userProfile.likeFailed, getReadableError(error, t.userProfile.likeFailedMsg));
    } finally {
      setLiking(false);
    }
  };

  if (loading || !normalized) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d84b6b" />
      </View>
    );
  }

  const avatar = resolveAvatarUrl(normalized.avatarUrl);

  return (
    <>
      <Stack.Screen options={{ title: t.userProfile.title, headerBackTitle: t.userProfile.goBack }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {avatar ? (
            <ProtectedImage uri={avatar} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>{normalized.nickname?.[0] || '?'}</Text>
            </View>
          )}

          <Text style={styles.name}>{normalized.nickname || t.common.user}</Text>
          <Text style={styles.meta}>
            {normalized.residenceCountry || t.userProfile.unknownCountry}
            {normalized.age ? ` • ${normalized.age} ${t.userProfile.year}` : ''}
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{normalized.marriageType === 'MISYAR' ? t.userProfile.misyarMarriage : t.userProfile.permanentMarriage}</Text>
          </View>

          {normalized.guardianAvailable ? (
            <View style={styles.guardianBadge}>
              <Ionicons name="people-circle" size={15} color="#fff" />
              <Text style={styles.guardianBadgeText}>{t.userProfile.guardianAvailable}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.userProfile.basicInfo}</Text>
          <ProfileRow label={t.userProfile.nationality} value={normalized.nationalityPrimary || t.userProfile.notSpecified} />
          <ProfileRow label={t.userProfile.religion} value={normalized.religion || t.userProfile.notMentioned} />
          <ProfileRow label={t.userProfile.sect} value={normalized.sect || t.userProfile.notMentioned} />
          <ProfileRow label={t.userProfile.guardianStatus} value={normalized.guardianAvailable ? (normalized.guardianRelation || t.userProfile.guardianAvailable) : t.userProfile.guardianUnavailable} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.userProfile.photoGallery}</Text>
          {normalized.photos?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryList}>
              {normalized.photos.map((photo: UserPhoto) => {
                const uri = resolveAvatarUrl(photo.url);
                if (!uri) return null;

                return (
                  <View key={photo.id} style={styles.galleryItem}>
                    <ProtectedImage uri={uri} style={styles.galleryImage} />
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.paragraph}>{t.userProfile.noGalleryPhotos}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.userProfile.aboutHim}</Text>
          <Text style={styles.paragraph}>{normalized.aboutMe || t.userProfile.noBio}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.userProfile.partnerPrefs}</Text>
          <Text style={styles.paragraph}>{normalized.partnerPrefs || t.userProfile.noPreferences}</Text>
        </View>

        <TouchableOpacity style={styles.likeButton} onPress={handleLike} disabled={liking}>
          <Ionicons name="heart" size={20} color="#fff" />
          <Text style={styles.likeButtonText}>{liking ? t.likes.sendingLike : t.likes.sendLike}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowValue}>{value}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf7',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffaf7',
  },
  hero: {
    alignItems: 'center',
    backgroundColor: '#17313e',
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
  },
  avatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    marginBottom: 14,
  },
  avatarPlaceholder: {
    backgroundColor: '#dbe2e7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#48606d',
  },
  name: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  meta: {
    color: '#d2e2e8',
    fontSize: 15,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#efc88b',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#3b2a12',
    fontWeight: '800',
    fontSize: 12,
  },
  guardianBadge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d84b6b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  guardianBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '800',
    color: '#1f1917',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f4ece8',
  },
  rowLabel: {
    color: '#745f58',
    fontSize: 14,
    fontWeight: '700',
  },
  rowValue: {
    color: '#1f1917',
    fontSize: 14,
    maxWidth: '68%',
    textAlign: 'left',
  },
  paragraph: {
    textAlign: 'right',
    fontSize: 15,
    lineHeight: 24,
    color: '#5f4f4f',
  },
  galleryList: {
    gap: 12,
  },
  galleryItem: {
    marginLeft: 12,
  },
  galleryImage: {
    width: 160,
    height: 210,
    borderRadius: 18,
  },
  likeButton: {
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d84b6b',
    borderRadius: 18,
    paddingVertical: 16,
  },
  likeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});