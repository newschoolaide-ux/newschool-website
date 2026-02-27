import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  addNotificationListener,
  addNotificationResponseListener,
} from '../services/notifications';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function NotificationHandler() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (isAuthenticated && token) {
      // Register for push notifications
      registerForPushNotificationsAsync(token);

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
