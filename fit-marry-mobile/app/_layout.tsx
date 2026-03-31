import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { SocketProvider } from '../src/context/SocketContext';
import { I18nProvider } from '../src/i18n';
import { useEffect } from 'react';
import { View, ActivityIndicator, I18nManager, Platform } from 'react-native';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { GlobalCallListener } from '../src/components/GlobalCallListener';
import * as ScreenCapture from 'expo-screen-capture';

const InitialLayout = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  usePushNotifications(!!user);

  useEffect(() => {
    I18nManager.allowRTL(true);
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
    }
    if (Platform.OS !== 'web') {
      ScreenCapture.preventScreenCaptureAsync();
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const [firstSegment, secondSegment] = segments as string[];
    const inAuthGroup = firstSegment === '(auth)';
    const inProfileComplete = firstSegment === 'profile' && secondSegment === 'complete';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      if (!user.profileCompleted) {
        router.replace('/profile/complete');
      } else {
        router.replace('/(tabs)');
      }
    } else if (user && !user.profileCompleted && !inProfileComplete && !inAuthGroup) {
      router.replace('/profile/complete');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="user/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="stories" options={{ presentation: 'card' }} />
      <Stack.Screen name="call/[id]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="daily-matches" options={{ presentation: 'card' }} />
      <Stack.Screen name="match-success" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="success-stories" options={{ presentation: 'card' }} />
      <Stack.Screen name="premium/index" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="profile/edit" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen name="profile/complete" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <I18nProvider>
      <AuthProvider>
        <SocketProvider>
          <GlobalCallListener />
          <InitialLayout />
        </SocketProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
