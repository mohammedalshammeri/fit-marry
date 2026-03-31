import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useI18n } from '../i18n';

interface VoiceRecorderProps {
  onSend: (base64: string, contentType: string, durationMs: number) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onSend, disabled }: VoiceRecorderProps) {
  const { t } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(t.common.permissionRequired, t.chat.micPermission);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert(t.common.error, t.chat.recordFailed);
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
  };

  const stopAndSend = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (!uri) {
        Alert.alert(t.common.error, t.chat.recordEmpty);
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const durationMs = duration * 1000;
      setDuration(0);

      onSend(base64, 'audio/mp4', durationMs);
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert(t.common.error, t.chat.recordSendFailed);
      setIsRecording(false);
      setDuration(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isRecording) {
    return (
      <View style={styles.recordingBar}>
        <TouchableOpacity onPress={cancelRecording} style={styles.cancelBtn}>
          <Ionicons name="close-circle" size={28} color="#999" />
        </TouchableOpacity>

        <View style={styles.recordingInfo}>
          <Animated.View style={[styles.recordDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>

        <TouchableOpacity onPress={stopAndSend} style={styles.sendVoiceBtn}>
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={startRecording} disabled={disabled} style={styles.micBtn}>
      <Ionicons name="mic" size={24} color={disabled ? '#ccc' : '#E91E63'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    padding: 8,
  },
  recordingBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  cancelBtn: {
    padding: 6,
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E91E63',
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  sendVoiceBtn: {
    backgroundColor: '#E91E63',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
