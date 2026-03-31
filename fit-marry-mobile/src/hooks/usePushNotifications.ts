import { useEffect } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import api from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const usePushNotifications = (enabled: boolean) => {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let mounted = true;

    const registerForPush = async () => {
      if (!Device.isDevice) {
        return;
      }

      const currentPermissions = await Notifications.getPermissionsAsync();
      let finalStatus = currentPermissions.status;

      if (finalStatus !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const tokenResponse = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();

      if (!mounted) {
        return;
      }

      await api.post('/notifications/register-push', {
        token: tokenResponse.data,
      });
    };

    registerForPush().catch((error) => {
      console.warn('Push registration failed', error);
    });

    // Handle notification tap → navigate to appropriate screen
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        if (!data) return;

        if (data.conversationId) {
          router.push(`/chat/${data.conversationId}` as any);
        } else if (data.userId) {
          router.push(`/user/${data.userId}` as any);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [enabled, router]);
};