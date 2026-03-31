import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Vibration, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useSocket } from '../context/SocketContext';

// Ringtone loop pattern (ms): vibrate 1s, pause 2s — repeated
const VIBRATION_PATTERN = Platform.OS === 'android' ? [0, 1000, 2000] : [1000, 2000];

export function GlobalCallListener() {
  const router = useRouter();
  const { socket } = useSocket();
  const ringtoneRef = useRef<Audio.Sound | null>(null);

  const startRingtone = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/ringtone.mp3'),
        { isLooping: true, volume: 1.0 },
      );
      ringtoneRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.warn('Ringtone playback failed, vibration only', e);
    }
    Vibration.vibrate(VIBRATION_PATTERN, true);
  };

  const stopRingtone = async () => {
    Vibration.cancel();
    if (ringtoneRef.current) {
      try {
        await ringtoneRef.current.stopAsync();
        await ringtoneRef.current.unloadAsync();
      } catch (_) {}
      ringtoneRef.current = null;
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = async (data: any) => {
      console.log('Incoming call received in GlobalCallListener', data);

      await startRingtone();

      router.push({
        pathname: `/call/${data.conversationId}` as any,
        params: {
          incomingOffer: JSON.stringify(data.offer),
          callerId: data.from,
          targetName: data.callerName,
          targetAvatar: data.callerAvatar,
        },
      });
    };

    // Stop ringtone when call is answered or ended
    const handleCallAnswered = () => stopRingtone();
    const handleCallEnded = () => stopRingtone();

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_answered', handleCallAnswered);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_answered', handleCallAnswered);
      socket.off('call_ended', handleCallEnded);
      stopRingtone();
    };
  }, [socket, router]);

  return null;
}