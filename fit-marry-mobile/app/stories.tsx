import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/services/api';
import { useI18n } from '../src/i18n';
import { getReadableError } from '../src/utils/auth';

type StoryItem = {
  id: string;
  mediaUrl?: string | null;
  mediaType: 'IMAGE' | 'VIDEO' | 'TEXT';
  caption?: string | null;
  viewCount: number;
  hasViewed: boolean;
  createdAt: string;
  expiresAt: string;
};

type StoryGroup = {
  userId: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  isOwn: boolean;
  stories: StoryItem[];
};

type StoryViewer = {
  userId: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  viewedAt: string;
};

const resolveMediaUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;

  const baseUrl = api.defaults.baseURL || 'http://10.0.2.2:4000';
  return `${baseUrl}${url}`;
};

const STORY_DURATION_MS = 4500;

export default function StoriesScreen() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [composerVisible, setComposerVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyMedia, setStoryMedia] = useState<{ base64: string; mimeType: string; previewUri?: string | null; mediaType: 'IMAGE' | 'VIDEO' } | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [viewersVisible, setViewersVisible] = useState(false);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const progressValue = useRef(new Animated.Value(0)).current;

  const selectedGroup = groups[selectedGroupIndex] || null;
  const selectedStory = selectedGroup?.stories?.[selectedStoryIndex] || null;

  const fetchFeed = async () => {
    try {
      const response = await api.get('/stories/feed');
      setGroups(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.stories.feedFailed));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const myStoryGroup = useMemo(() => groups.find((group) => group.isOwn) || null, [groups]);

  const markViewed = async (groupIndex: number, storyIndex: number) => {
    const group = groups[groupIndex];
    const story = group?.stories?.[storyIndex];
    if (!story || group?.isOwn) {
      return;
    }

    await api.post(`/stories/${story.id}/view`).catch(() => null);
    setGroups((current) =>
      current.map((currentGroup, currentGroupIndex) =>
        currentGroupIndex === groupIndex
          ? {
              ...currentGroup,
              stories: currentGroup.stories.map((currentStory, currentStoryIndex) =>
                currentStoryIndex === storyIndex ? { ...currentStory, hasViewed: true } : currentStory,
              ),
            }
          : currentGroup,
      ),
    );
  };

  const openGroup = async (groupIndex: number) => {
    setSelectedGroupIndex(groupIndex);
    setSelectedStoryIndex(0);
    setViewerVisible(true);
    await markViewed(groupIndex, 0);
  };

  const showStoryAt = async (nextIndex: number) => {
    if (!selectedGroup) {
      return;
    }

    if (nextIndex < 0 || nextIndex >= selectedGroup.stories.length) {
      setViewerVisible(false);
      return;
    }

    setSelectedStoryIndex(nextIndex);
    await markViewed(selectedGroupIndex, nextIndex);
  };

  const handleCreateStory = async () => {
    if (!storyText.trim() && !storyMedia) {
      return;
    }

    setPublishing(true);
    try {
      if (storyMedia) {
        const uploadResponse = await api.post('/stories/media', {
          base64: storyMedia.base64,
          mimeType: storyMedia.mimeType,
        });

        await api.post('/stories', {
          mediaType: storyMedia.mediaType,
          mediaUrl: uploadResponse.data.mediaUrl,
          caption: storyText.trim() || undefined,
        });
      } else {
        await api.post('/stories', {
          mediaType: 'TEXT',
          caption: storyText.trim(),
        });
      }

      setStoryText('');
  setStoryMedia(null);
      setComposerVisible(false);
      setLoading(true);
      await fetchFeed();
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.stories.createFailed));
    } finally {
      setPublishing(false);
    }
  };

  const handlePickStoryMedia = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t.common.permissionRequired, t.stories.imagePermission);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]?.base64) {
        return;
      }

      const asset = result.assets[0];
      setStoryMedia({
        base64: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
        previewUri: asset.uri,
        mediaType: asset.type === 'video' ? 'VIDEO' : 'IMAGE',
      });
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.stories.imagePickFailed));
    }
  };

  const handleContactStory = async () => {
    if (!selectedStory) {
      return;
    }

    try {
      await api.post(`/stories/${selectedStory.id}/contact`);
      Alert.alert(t.common.success, t.stories.contactSent);
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.stories.contactRequiresPremium));
    }
  };

  const handleDeleteStory = async () => {
    if (!selectedStory) {
      return;
    }

    try {
      await api.delete(`/stories/${selectedStory.id}`);
      setViewerVisible(false);
      setLoading(true);
      await fetchFeed();
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.stories.deleteFailed));
    }
  };

  const handleOpenViewers = async () => {
    if (!selectedStory) {
      return;
    }

    setViewersLoading(true);
    try {
      const response = await api.get(`/stories/${selectedStory.id}/viewers`);
      setViewers(Array.isArray(response.data) ? response.data : []);
      setViewersVisible(true);
    } catch (error) {
      Alert.alert(t.common.error, getReadableError(error, t.common.loadFailed));
    } finally {
      setViewersLoading(false);
    }
  };

  const renderStoryPreview = () => {
    if (!selectedStory) {
      return null;
    }

    if ((selectedStory.mediaType === 'IMAGE' || selectedStory.mediaType === 'VIDEO') && selectedStory.mediaUrl) {
      const uri = resolveMediaUrl(selectedStory.mediaUrl);
      if (!uri) {
        return null;
      }

      if (selectedStory.mediaType === 'VIDEO') {
        return (
          <Video
            source={{ uri }}
            style={styles.storyMedia}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            useNativeControls={false}
          />
        );
      }

      return <Image source={{ uri }} style={styles.storyMedia} resizeMode="cover" />;
    }

    return (
      <View style={styles.storyTextCard}>
        <Text style={styles.storyTextContent}>{selectedStory.caption || t.stories.emptyStory}</Text>
      </View>
    );
  };

  useEffect(() => {
    if (!viewerVisible || !selectedGroup || !selectedStory) {
      progressValue.stopAnimation();
      progressValue.setValue(0);
      return;
    }

    progressValue.setValue(0);
    const animation = Animated.timing(progressValue, {
      toValue: 1,
      duration: STORY_DURATION_MS,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        showStoryAt(selectedStoryIndex + 1);
      }
    });

    return () => {
      progressValue.stopAnimation();
    };
  }, [viewerVisible, selectedGroupIndex, selectedStoryIndex, selectedGroup, selectedStory, progressValue]);

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <>
      <Stack.Screen options={{ title: t.stories.title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroTitle}>{t.stories.title}</Text>
            <Text style={styles.heroSubtitle}>{t.stories.subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setComposerVisible(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addButtonText}>{myStoryGroup ? t.stories.addStory : t.stories.myStory}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color="#d84b6b" size="large" />
          </View>
        ) : groups.length ? (
          <View style={styles.grid}>
            {groups.map((group, index) => {
              const avatar = resolveMediaUrl(group.avatarUrl);
              const hasUnseen = group.isOwn || group.stories.some((story) => !story.hasViewed);
              return (
                <TouchableOpacity key={group.userId} style={styles.storyChip} onPress={() => openGroup(index)}>
                  <View style={[styles.storyRing, hasUnseen ? styles.storyRingActive : styles.storyRingMuted]}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.storyAvatar} />
                    ) : (
                      <View style={[styles.storyAvatar, styles.storyAvatarFallback]}>
                        <Text style={styles.storyAvatarText}>{group.nickname?.[0] || '?'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.storyName} numberOfLines={1}>{group.isOwn ? t.stories.myStory : group.nickname || t.common.user}</Text>
                  <Text style={styles.storyMeta}>{group.stories.length} {t.stories.storyCount}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={28} color="#d84b6b" />
            <Text style={styles.emptyTitle}>{t.stories.empty}</Text>
            <Text style={styles.emptyText}>{t.stories.emptyHint}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={composerVisible} animationType="slide" transparent onRequestClose={() => setComposerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.stories.addStory}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t.stories.textPlaceholder}
              value={storyText}
              onChangeText={setStoryText}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.composerModeHint}>
              {storyMedia ? (storyMedia.mediaType === 'VIDEO' ? t.stories.videoStoryHint : t.stories.imageStoryHint) : t.stories.textStoryHint}
            </Text>
            {storyMedia?.previewUri ? (
              <View style={styles.composerPreviewWrap}>
                {storyMedia.mediaType === 'VIDEO' ? (
                  <Video
                    source={{ uri: storyMedia.previewUri }}
                    style={styles.composerPreview}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                    useNativeControls={false}
                  />
                ) : (
                  <Image source={{ uri: storyMedia.previewUri }} style={styles.composerPreview} resizeMode="cover" />
                )}
                <TouchableOpacity style={styles.removePreviewBtn} onPress={() => setStoryMedia(null)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity style={styles.storyImageBtn} onPress={handlePickStoryMedia}>
              <Ionicons name={storyMedia?.mediaType === 'VIDEO' ? 'videocam' : 'image'} size={18} color="#17313e" />
              <Text style={styles.storyImageBtnText}>{t.stories.addMedia}</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setComposerVisible(false)}>
                <Text style={styles.secondaryBtnText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateStory} disabled={publishing}>
                <Text style={styles.primaryBtnText}>{publishing ? t.common.loading : t.stories.publish}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={viewerVisible} animationType="fade" transparent onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerCard}>
            <View style={styles.storyProgressRow}>
              {(selectedGroup?.stories || []).map((story, index) => (
                <View key={story.id} style={styles.storyProgressTrack}>
                  {index < selectedStoryIndex ? <View style={styles.storyProgressDone} /> : null}
                  {index === selectedStoryIndex ? <Animated.View style={[styles.storyProgressActive, { width: progressWidth }]} /> : null}
                </View>
              ))}
            </View>
            <View style={styles.viewerHeader}>
              <View>
                <Text style={styles.viewerName}>{selectedGroup?.isOwn ? t.stories.myStory : selectedGroup?.nickname || t.common.user}</Text>
                <Text style={styles.viewerMeta}>{selectedStory ? `${selectedStoryIndex + 1}/${selectedGroup?.stories.length || 1}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setViewerVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.storyTapAreaWrap}>
              <TouchableOpacity style={[styles.storyTapZone, styles.storyTapZoneLeft]} onPress={() => showStoryAt(selectedStoryIndex - 1)} />
              {renderStoryPreview()}
              <TouchableOpacity style={[styles.storyTapZone, styles.storyTapZoneRight]} onPress={() => showStoryAt(selectedStoryIndex + 1)} />
            </View>

            <View style={styles.viewerFooter}>
              <TouchableOpacity style={styles.navBtn} onPress={() => showStoryAt(selectedStoryIndex - 1)}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              {selectedGroup?.isOwn ? (
                <View style={styles.ownerActionsWrap}>
                  <TouchableOpacity style={styles.ownerGhostBtn} onPress={handleOpenViewers} disabled={viewersLoading}>
                    <Ionicons name="eye" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>{viewersLoading ? t.common.loading : t.stories.viewers}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleDeleteStory}>
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>{t.stories.deleteStory}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.actionBtn} onPress={handleContactStory}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>{t.stories.contact}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.navBtn} onPress={() => showStoryAt(selectedStoryIndex + 1)}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={viewersVisible} animationType="slide" transparent onRequestClose={() => setViewersVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.stories.viewers}</Text>
            <ScrollView style={styles.viewersList}>
              {viewers.length ? (
                viewers.map((viewer) => {
                  const avatar = resolveMediaUrl(viewer.avatarUrl);
                  return (
                    <View key={`${viewer.userId}-${viewer.viewedAt}`} style={styles.viewerRow}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.viewerAvatar} />
                      ) : (
                        <View style={[styles.viewerAvatar, styles.storyAvatarFallback]}>
                          <Text style={styles.storyAvatarText}>{viewer.nickname?.[0] || '?'}</Text>
                        </View>
                      )}
                      <View style={styles.viewerInfo}>
                        <Text style={styles.viewerRowName}>{viewer.nickname || t.common.user}</Text>
                        <Text style={styles.viewerRowTime}>{new Date(viewer.viewedAt).toLocaleString()}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>{t.common.noResults}</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setViewersVisible(false)}>
              <Text style={styles.primaryBtnText}>{t.common.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf7' },
  content: { padding: 18, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#17313e',
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroSubtitle: { color: '#d3dde2', fontSize: 13, marginTop: 6, maxWidth: 200 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d84b6b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  addButtonText: { color: '#fff', fontWeight: '700' },
  loaderWrap: { paddingVertical: 50, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  storyChip: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  storyRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    padding: 4,
    marginBottom: 10,
  },
  storyRingActive: { backgroundColor: '#d84b6b' },
  storyRingMuted: { backgroundColor: '#e5e7eb' },
  storyAvatar: { width: '100%', height: '100%', borderRadius: 35, backgroundColor: '#f3ebe7' },
  storyAvatarFallback: { justifyContent: 'center', alignItems: 'center' },
  storyAvatarText: { fontSize: 24, fontWeight: '800', color: '#8b7d78' },
  storyName: { color: '#1f2937', fontWeight: '700', fontSize: 15 },
  storyMeta: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: { color: '#1f2937', fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptyText: { color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20 },
  modalTitle: { color: '#1f2937', fontSize: 20, fontWeight: '800', marginBottom: 14, textAlign: 'right' },
  textInput: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#f0d8df',
    borderRadius: 18,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fffafc',
    textAlign: 'right',
  },
  composerPreview: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    marginTop: 14,
    backgroundColor: '#f3ebe7',
  },
  composerPreviewWrap: {
    position: 'relative',
  },
  removePreviewBtn: {
    position: 'absolute',
    top: 24,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(23,49,62,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerModeHint: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'right',
  },
  storyImageBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#d5dde3',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fbfc',
  },
  storyImageBtnText: {
    color: '#17313e',
    fontWeight: '700',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#4b5563', fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#d84b6b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(12,18,24,0.96)', justifyContent: 'center', padding: 18 },
  viewerCard: { borderRadius: 28, backgroundColor: '#101b23', padding: 18 },
  storyProgressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  storyProgressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  storyProgressDone: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  storyProgressActive: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewerName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  viewerMeta: { color: '#9db0bb', fontSize: 12, marginTop: 4 },
  storyMedia: { width: '100%', height: 360, borderRadius: 22, backgroundColor: '#1f2937' },
  storyTextCard: {
    minHeight: 360,
    borderRadius: 22,
    backgroundColor: '#f8d4dc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  storyTextContent: { color: '#4a1f2b', fontSize: 24, fontWeight: '800', lineHeight: 34, textAlign: 'center' },
  storyTapAreaWrap: {
    position: 'relative',
  },
  storyTapZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '28%',
    zIndex: 5,
  },
  storyTapZoneLeft: {
    left: 0,
  },
  storyTapZoneRight: {
    right: 0,
  },
  viewerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#d84b6b',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  ownerActionsWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  ownerGhostBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '800' },
  viewersList: { maxHeight: 320, marginBottom: 16 },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3e5ea',
  },
  viewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3ebe7',
  },
  viewerInfo: { flex: 1 },
  viewerRowName: { color: '#1f2937', fontWeight: '700', fontSize: 14, textAlign: 'right' },
  viewerRowTime: { color: '#9ca3af', fontSize: 12, marginTop: 4, textAlign: 'right' },
});