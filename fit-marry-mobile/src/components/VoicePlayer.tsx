import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useI18n } from '../i18n';

interface VoicePlayerProps {
  messageId: string;
  isMe: boolean;
}

export default function VoicePlayer({ messageId, isMe }: VoicePlayerProps) {
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const loadAndPlay = async () => {
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await api.get(`/messages/${messageId}/media`);
      const { base64, contentType } = res.data;
      const uri = `data:${contentType || 'audio/mp4'};base64,${base64}`;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.durationMillis && status.positionMillis) {
              setProgress(status.positionMillis / status.durationMillis);
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setProgress(0);
              soundRef.current?.unloadAsync();
              soundRef.current = null;
            }
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err: any) {
      console.error('Failed to play voice', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={loadAndPlay} style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="small" color={isMe ? '#fff' : '#E91E63'} />
      ) : (
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={22}
          color={isMe ? '#fff' : '#E91E63'}
        />
      )}
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            { width: `${Math.max(progress * 100, 5)}%` },
            isMe ? styles.barMe : styles.barThem,
          ]}
        />
      </View>
      <Text style={[styles.label, isMe ? styles.labelMe : styles.labelThem]}>
        🎤 {t.chat.voiceMessageLabel}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 4,
    minWidth: 160,
  },
  barContainer: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  barMe: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  barThem: {
    backgroundColor: '#E91E63',
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  labelMe: {
    color: 'rgba(255,255,255,0.8)',
  },
  labelThem: {
    color: '#666',
  },
});
