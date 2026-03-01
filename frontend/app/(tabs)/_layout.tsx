import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom icon component for the "Explorer" tab using the logo
const LogoIcon = ({ color, size, focused }: { color: string; size: number; focused?: boolean }) => (
  <View style={{ opacity: focused ? 1 : 0.5 }}>
    <Image
      source={require('../../assets/images/logo-newschool.png')}
      style={{
        width: size + 4,
        height: size + 4,
      }}
      resizeMode="contain"
    />
  </View>
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  // Calculate proper bottom padding for tab bar
  const tabBarPaddingBottom = Platform.OS === 'ios' 
    ? Math.max(insets.bottom, 8) 
    : 10;
  
  const tabBarHeight = 60 + tabBarPaddingBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { 
            height: tabBarHeight,
            paddingBottom: tabBarPaddingBottom,
          }
        ],
        tabBarActiveTintColor: '#D946EF',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color, size, focused }) => <LogoIcon color={color} size={size} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0A0A0A',
    borderTopColor: '#1A1A1A',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
});
