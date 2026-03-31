import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Hook to prevent screen capture/recording on the current screen.
 * Useful for sensitive content like "View Once" images.
 */
export const useScreenProtection = (active: boolean = true) => {
  useEffect(() => {
    if (!active || Platform.OS === 'web') return;

    let isMounted = true;

    const protect = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        console.warn('Screen protection failed:', e);
      }
    };

    const unprotect = async () => {
      try {
        await ScreenCapture.allowScreenCaptureAsync();
      } catch (e) {
        // ignore
      }
    };

    protect();

    return () => {
      isMounted = false;
      unprotect();
    };
  }, [active]);
};
