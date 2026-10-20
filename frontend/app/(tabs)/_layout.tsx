import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from '../../components/ui/Text';
import { colors, TAB_BAR_HEIGHT } from '../../constants/theme';


const TABS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }> = {
  home: { label: 'Explorer', icon: 'compass-outline', iconActive: 'compass' },
  map: { label: 'Carte', icon: 'map-outline', iconActive: 'map' },
  chats: { label: 'Messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  profile: { label: 'Profil', icon: 'person-outline', iconActive: 'person' },
};

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const renderTab = (routeName: string) => {
    const index = state.routes.findIndex((r) => r.name === routeName);
    if (index < 0) return null;
    const route = state.routes[index];
    const focused = state.index === index;
    const tab = TABS[routeName];
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        style={styles.tab}
        hitSlop={6}
      >
        <Ionicons name={focused ? tab.iconActive : tab.icon} size={23} color={focused ? colors.accent : colors.muted} />
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{tab.label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.bar}>
        {renderTab('home')}
        {renderTab('map')}
        <Pressable
          onPress={() => router.push('/create-event')}
          accessibilityRole="button"
          accessibilityLabel="Créer une School"
          style={({ pressed }) => [styles.createButton, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <Ionicons name="add" size={30} color={colors.onAccent} />
        </Pressable>
        {renderTab('chats')}
        {renderTab('profile')}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Explorer' }} />
      <Tabs.Screen name="map" options={{ title: 'Carte' }} />
      <Tabs.Screen name="chats" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 26,
    backgroundColor: 'rgba(28,24,38,0.97)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  tab: {
    minWidth: 60,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  tabLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  createButton: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: Platform.OS === 'ios' ? 0.45 : 0,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
});
