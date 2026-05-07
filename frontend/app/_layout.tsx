import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import {
  registerForPushNotificationsAsync,
  addNotificationListener,
  addNotificationResponseListener,
} from '../services/notifications';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Update user location for nearby notifications
async function updateUserLocation(token: string) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission denied');
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/users/location`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }),
    });
    console.log('User location updated for nearby notifications');
  } catch (error) {
    console.log('Error updating user location:', error);
  }
}

function NotificationHandler() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (isAuthenticated && token) {
      // Register for push notifications
      registerForPushNotificationsAsync(token);

      // Update user location for nearby event notifications
      updateUserLocation(token);

      // Listen for incoming notifications while app is foregrounded
      notificationListener.current = addNotificationListener((notification) => {
        console.log('Notification received:', notification);
      });

      // Listen for user interaction with notifications
      responseListener.current = addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type
        if (data?.type === 'join' && data?.event_id) {
          router.push(`/event/${data.event_id}`);
        } else if (data?.type === 'message' && data?.event_id) {
          router.push(`/chat/${data.event_id}`);
        } else if (data?.type === 'nearby' && data?.event_id) {
          router.push(`/event/${data.event_id}`);
        }
      });
    }

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated, token]);

  return null;
}

function RootLayoutContent() {
  return (
    <>
      <NotificationHandler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="event/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="user/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="create-event" options={{ presentation: 'modal' }} />
        <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings/notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings/privacy" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings/help" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
