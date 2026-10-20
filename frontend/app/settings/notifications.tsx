import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

interface NotificationSettings {
  pushEnabled: boolean;
  newParticipants: boolean;
  newMessages: boolean;
  eventReminders: boolean;
  promotions: boolean;
}

const defaultSettings: NotificationSettings = {
  pushEnabled: true,
  newParticipants: true,
  newMessages: true,
  eventReminders: true,
  promotions: false,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === 'granted');
  };

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionGranted(status === 'granted');
    if (status !== 'granted') {
      Alert.alert(
        'Permissions requises',
        'Veuillez activer les notifications dans les paramètres de votre téléphone pour recevoir des alertes.',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const SettingRow = ({ 
    title, 
    subtitle, 
    value, 
    onToggle, 
    disabled = false 
  }: { 
    title: string; 
    subtitle: string; 
    value: boolean; 
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, disabled && styles.textDisabled]}>{title}</Text>
        <Text style={[styles.settingSubtitle, disabled && styles.textDisabled]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#2A2535', true: '#D946EF' }}
        thumbColor={value ? '#F5F3FA' : '#A39DB3'}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F5F3FA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!permissionGranted && (
          <TouchableOpacity style={styles.permissionBanner} onPress={requestPermissions}>
            <Ionicons name="notifications-off" size={24} color="#F5F3FA" />
            <View style={styles.permissionText}>
              <Text style={styles.permissionTitle}>Notifications désactivées</Text>
              <Text style={styles.permissionSubtitle}>Appuyez pour activer</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#F5F3FA" />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Général</Text>
          <View style={styles.card}>
            <SettingRow
              title="Notifications push"
              subtitle="Recevoir des notifications sur votre appareil"
              value={settings.pushEnabled}
              onToggle={() => toggleSetting('pushEnabled')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activité</Text>
          <View style={styles.card}>
            <SettingRow
              title="Nouveaux participants"
              subtitle="Quand quelqu'un rejoint votre school"
              value={settings.newParticipants}
              onToggle={() => toggleSetting('newParticipants')}
              disabled={!settings.pushEnabled}
            />
            <View style={styles.separator} />
            <SettingRow
              title="Nouveaux messages"
              subtitle="Messages dans vos conversations"
              value={settings.newMessages}
              onToggle={() => toggleSetting('newMessages')}
              disabled={!settings.pushEnabled}
            />
            <View style={styles.separator} />
            <SettingRow
              title="Rappels d'événements"
              subtitle="Rappels avant le début de vos schools"
              value={settings.eventReminders}
              onToggle={() => toggleSetting('eventReminders')}
              disabled={!settings.pushEnabled}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marketing</Text>
          <View style={styles.card}>
            <SettingRow
              title="Offres et promotions"
              subtitle="Nouveautés et offres spéciales"
              value={settings.promotions}
              onToggle={() => toggleSetting('promotions')}
              disabled={!settings.pushEnabled}
            />
          </View>
        </View>

        <Text style={styles.footerText}>
          Vous pouvez modifier ces paramètres à tout moment. Les notifications importantes concernant votre compte seront toujours envoyées.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#16131F',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F3FA',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D946EF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F3FA',
  },
  permissionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A39DB3',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#16131F',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F5F3FA',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#A39DB3',
    marginTop: 2,
  },
  textDisabled: {
    color: '#6F6984',
  },
  separator: {
    height: 1,
    backgroundColor: '#221E2D',
    marginLeft: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#8E889E',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});
