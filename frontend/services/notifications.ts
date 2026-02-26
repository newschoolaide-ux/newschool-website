import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(token: string | null): Promise<string | null> {
  let pushToken: string | null = null;

  // Check if it's a physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'newschool', // Your Expo project ID
    });
    pushToken = tokenData.data;
    console.log('Push token:', pushToken);
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D946EF',
    });
  }

  // Send token to backend if we have an auth token
  if (token && pushToken) {
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/users/push-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ push_token: pushToken }),
      });
      console.log('Push token registered on server');
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  return pushToken;
}

export async function unregisterPushNotifications(token: string | null): Promise<void> {
  if (!token) return;

  try {
    await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/users/push-token`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log('Push token removed from server');
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

export function addNotificationListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function schedulePushNotification(title: string, body: string, data?: object) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: null, // Immediate
  });
}
