import { getItem } from '../utils/storage';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';
const SOCKET_NAMESPACE = '/messages';

let socket: Socket | null = null;

export async function connectMessagesSocket() {
  const token = await getItem('token');
  if (!token) {
    return null;
  }

  if (socket) {
    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }
    return socket;
  }

  socket = io(`${API_URL}${SOCKET_NAMESPACE}`, {
    transports: ['websocket'],
    autoConnect: true,
    auth: { token },
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect_error', (err) => {
    console.log('Messages socket error:', err.message);
  });

  return socket;
}

export function getMessagesSocket() {
  return socket;
}

export function disconnectMessagesSocket() {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
}
