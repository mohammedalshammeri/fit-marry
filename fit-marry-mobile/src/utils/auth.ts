import { Platform } from 'react-native';
import { getItem, setItem } from './storage';
import type { OtpChannel } from '../types';

const DEVICE_ID_KEY = 'device-id';

export const isEmailIdentifier = (value: string) => /@/.test(value.trim());

export const getOtpChannel = (identifier: string): OtpChannel =>
  isEmailIdentifier(identifier) ? 'EMAIL' : 'SMS';

export const buildIdentifierPayload = (identifier: string) => {
  const trimmed = identifier.trim();
  return isEmailIdentifier(trimmed) ? { email: trimmed } : { phone: trimmed };
};

export const getReadableError = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const maybeError = error as {
    response?: {
      data?: {
        message?: string | string[];
      };
    };
  };

  const message = maybeError.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join('\n');
  }

  return message || fallback;
};

const createDeviceId = () => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `fitmarry-${Date.now()}-${randomPart}`;
};

export const getDeviceId = async () => {
  if (Platform.OS === 'web') {
    const existing = typeof localStorage !== 'undefined' ? localStorage.getItem(DEVICE_ID_KEY) : null;
    if (existing) return existing;
    const nextId = createDeviceId();
    if (typeof localStorage !== 'undefined') localStorage.setItem(DEVICE_ID_KEY, nextId);
    return nextId;
  }

  const existing = await getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const nextId = createDeviceId();
  await setItem(DEVICE_ID_KEY, nextId);
  return nextId;
};
