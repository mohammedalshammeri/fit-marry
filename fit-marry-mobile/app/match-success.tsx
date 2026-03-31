import React from 'react';
import { SafeAreaView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useI18n } from '../src/i18n';

export default function MatchSuccessScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { name } = useLocalSearchParams<{ name?: string }>();

  const handleShare = async () => {
    try {
      await Share.share({
        message: t.successStories.shareCelebration.replace('{name}', name || t.common.user),
      });
    } catch (error) {
      console.log('Share celebration error', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient colors={['#17313e', '#244653', '#fffaf7']} style={styles.gradient}>
        <View style={styles.heroIcon}>
          <Ionicons name="heart-circle" size={74} color="#facc15" />
        </View>

        <Text style={styles.title}>{t.successStories.celebrationTitle}</Text>
        <Text style={styles.subtitle}>
          {t.successStories.celebrationSubtitle.replace('{name}', name || t.common.user)}
        </Text>

        <View style={styles.noteCard}>
          <Ionicons name="sparkles" size={18} color="#d84b6b" />
          <Text style={styles.noteText}>{t.successStories.celebrationNote}</Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/success-stories')}>
          <Text style={styles.primaryBtnText}>{t.successStories.openStories}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={18} color="#d84b6b" />
          <Text style={styles.shareBtnText}>{t.successStories.shareMoment}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)/matches' as any)}>
          <Text style={styles.secondaryBtnText}>{t.successStories.backToMatches}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffaf7',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#d7e5ea',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },
  noteCard: {
    marginTop: 28,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  primaryBtn: {
    marginTop: 28,
    width: '100%',
    backgroundColor: '#d84b6b',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  shareBtn: {
    marginTop: 12,
    width: '100%',
    backgroundColor: '#fff4f7',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  shareBtnText: {
    color: '#d84b6b',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    marginTop: 12,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#17313e',
    fontSize: 15,
    fontWeight: '800',
  },
});