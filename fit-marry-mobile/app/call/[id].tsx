import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import api from '../../src/services/api';
import { useI18n } from '../../src/i18n';

// Safe import for Expo Go (prevent crashes)
let RTCPeerConnection: any, RTCIceCandidate: any, RTCSessionDescription: any, mediaDevices: any, MediaStream: any, RTCView: any;
try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  mediaDevices = webrtc.mediaDevices;
  MediaStream = webrtc.MediaStream;
  RTCView = webrtc.RTCView;
} catch (e) {
  RTCView = () => <View style={{flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center'}}><Text style={{color: 'white'}}>WebRTC requires a Development Build</Text></View>;
  mediaDevices = { getUserMedia: async () => null };
}

// Fallback STUN servers
const DEFAULT_ICE_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function CallScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { id: conversationId, targetName, targetAvatar, incomingOffer, callerId, partnerId: paramPartnerId } = useLocalSearchParams() as any;
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState(incomingOffer ? 'INCOMING' : t.calls.connecting);
  const pc = useRef<RTCPeerConnection | null>(null);
  const [iceConfig, setIceConfig] = useState(DEFAULT_ICE_CONFIG);

  // My ID
  // @ts-ignore
  const myId = user?.id || user?.sub;
  const partnerId = paramPartnerId || callerId; 

  useEffect(() => {
    // Fetch ICE servers from backend (includes TURN if configured)
    api.get('/calls/ice-servers').then(({ data }) => {
      if (data?.iceServers?.length) {
        setIceConfig(data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Setup RTCPeerConnection
    pc.current = new RTCPeerConnection(iceConfig);

    (pc.current as any).addEventListener('track', (event: any) => {
      console.log('Received remote stream');
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    });

    (pc.current as any).addEventListener('icecandidate', (event: any) => {
      if (event.candidate && socket && partnerId) {
        socket.emit('ice_candidate', {
          toUserId: partnerId,
          candidate: event.candidate,
        });
      }
    });

    // Socket Event Listeners
    if (socket) {
      socket.on('call_answered', async (data: { answer: RTCSessionDescription }) => {
        setCallStatus('CONNECTED');
        if (pc.current) {
           await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      socket.on('receive_ice_candidate', (data: { candidate: RTCIceCandidate }) => {
        if (pc.current) {
          pc.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      socket.on('call_ended', () => {
        endCall(false);
      });
    }

    startLocalStream();

    return () => {
      // Cleanup
      if (socket) {
        socket.off('call_answered');
        socket.off('receive_ice_candidate');
        socket.off('call_ended');
      }
      if (pc.current) {
        pc.current.close();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket]);

  const startLocalStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 640,
          height: 480,
          frameRate: 30,
          facingMode: 'user',
        },
      });

      setLocalStream(stream as any);
      if (pc.current && stream) {
        stream.getTracks().forEach((track: any) => {
          pc.current?.addTrack(track, stream);
        });
      }

      if (!incomingOffer) {
        // We are the caller
        initiateCall();
      }
    } catch (err) {
      console.error('Error accessing media devices', err);
      setCallStatus(`ERROR: ${t.calls.cameraError}`);
    }
  };

  const initiateCall = async () => {
    try {
      if (!pc.current || !socket) return;
      const offer = await pc.current.createOffer({});
      await pc.current.setLocalDescription(offer);

      socket.emit('call_user', {
        targetUserId: partnerId, // Need partnerId passed from ChatScreen
        conversationId,
        offer,
        callerName: user?.email || 'Someone',
        callerAvatar: '',
      });
      setCallStatus('CALLING...');
    } catch (err) {
      console.log('Error creating offer', err);
    }
  };

  const answerCall = async () => {
    try {
      if (!pc.current || !socket || !incomingOffer) return;
      
      // Stop ringtone/vibration when answering
      Vibration.cancel();

      const remoteOffer = typeof incomingOffer === 'string' ? JSON.parse(incomingOffer) : incomingOffer;
      await pc.current.setRemoteDescription(new RTCSessionDescription(remoteOffer));

      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.emit('answer_call', {
        toUserId: callerId, // Wait, if incoming, the other person is callerId
        answer,
      });

      setCallStatus('CONNECTED');
    } catch (err) {
      console.log('Error answering call', err);
    }
  };

  const endCall = (emitEvent = true) => {
    // Stop ringtone/vibration
    Vibration.cancel();

    if (emitEvent && socket) {
      socket.emit('end_call', { toUserId: incomingOffer ? callerId : partnerId });
    }
    
    if (pc.current) {
      pc.current.close();
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    
    router.back();
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      
      <View style={styles.videoContainer}>
        {remoteStream && (
          <RTCView
            streamURL={(remoteStream as any).toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        )}
        
        {localStream && (
          <RTCView
            streamURL={(localStream as any).toURL()}
            style={styles.localVideo}
            objectFit="cover"
            zOrder={1} // Put local video on top
          />
        )}

        {(!remoteStream && callStatus !== 'CONNECTED') && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{callStatus}</Text>
            <Text style={styles.targetName}>{targetName || t.common.user}</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleMic}>
          <Ionicons name="mic" size={28} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlBtn} onPress={toggleCamera}>
          <Ionicons name="videocam" size={28} color="white" />
        </TouchableOpacity>

        {callStatus === 'INCOMING' && (
          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#4CAF50' }]} onPress={answerCall}>
            <Ionicons name="call" size={28} color="white" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#F44336' }]} onPress={() => endCall(true)}>
          <Ionicons name="call" size={28} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  localVideo: {
    position: 'absolute',
    right: 20,
    bottom: 150,
    width: 100,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    color: '#E91E63',
    fontSize: 18,
    marginBottom: 10,
  },
  targetName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  }
});