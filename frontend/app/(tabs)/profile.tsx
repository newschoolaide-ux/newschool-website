import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useEventStore } from '../../stores/eventStore';

const SUBSCRIPTION_TIERS = {
  free: { name: 'Gratuit', color: '#666' },
  standard: { name: 'Standard', color: '#D946EF' },
  ambassador: { name: 'Ambassadeur', color: '#FFD700' },
};

export default function ProfileScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  const { userCreatedEvents, userJoinedEvents, fetchUserCreatedEvents, fetchUserJoinedEvents } = useEventStore();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (token) {
      fetchUserCreatedEvents(token);
      fetchUserJoinedEvents(token);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (token) {
      await refreshUser();
      await fetchUserCreatedEvents(token);
      await fetchUserJoinedEvents(token);
    }
    setRefreshing(false);
  }, [token]);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const tierInfo = SUBSCRIPTION_TIERS[user?.subscription_tier as keyof typeof SUBSCRIPTION_TIERS] || SUBSCRIPTION_TIERS.free;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#D946EF"
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Profil</Text>
          <TouchableOpacity onPress={() => router.push('/profile/edit')}>
            <Ionicons name="settings-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{user?.first_name?.[0] || 'U'}</Text>
              </View>
            )}
            <View style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}>
              <Text style={styles.tierBadgeText}>{tierInfo.name}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.first_name || 'Utilisateur'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.bio && <Text style={styles.userBio}>{user.bio}</Text>}
          {user?.languages && user.languages.length > 0 && (
            <View style={styles.languagesContainer}>
              {user.languages.map((lang, index) => (
                <View key={index} style={styles.languageTag}>
                  <Text style={styles.languageText}>{lang}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userCreatedEvents.length}</Text>
          <Text style={styles.statLabel}>Événements créés</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userJoinedEvents.length}</Text>
          <Text style={styles.statLabel}>Événements rejoints</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Abonnement</Text>
        <TouchableOpacity
          style={styles.subscriptionCard}
          onPress={() => router.push('/subscription')}
        >
          <View style={styles.subscriptionInfo}>
            <View style={[styles.subscriptionIcon, { backgroundColor: tierInfo.color }]}>
              <Ionicons name="star" size={20} color="#FFF" />
            </View>
            <View>
              <Text style={styles.subscriptionName}>{tierInfo.name}</Text>
              <Text style={styles.subscriptionDesc}>
                {user?.subscription_tier === 'free'
                  ? 'Passez à un abonnement premium'
                  : 'Gérez votre abonnement'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes événements</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/create-event')}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#D946EF' }]}>
              <Ionicons name="add" size={20} color="#FFF" />
            </View>
            <Text style={styles.menuItemText}>Créer un événement</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {userCreatedEvents.slice(0, 3).map((event) => (
          <TouchableOpacity
            key={event.event_id}
            style={styles.menuItem}
            onPress={() => router.push(`/event/${event.event_id}`)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#333' }]}>
                <Ionicons name="calendar" size={18} color="#FFF" />
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.menuItemText} numberOfLines={1}>{event.name}</Text>
                <Text style={styles.eventParticipants}>
                  {event.current_participants}/{event.max_participants} participants
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/edit')}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="person-outline" size={18} color="#FFF" />
            </View>
            <Text style={styles.menuItemText}>Modifier le profil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#9C27B0' }]}>
              <Ionicons name="notifications-outline" size={18} color="#FFF" />
            </View>
            <Text style={styles.menuItemText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#607D8B' }]}>
              <Ionicons name="shield-outline" size={18} color="#FFF" />
            </View>
            <Text style={styles.menuItemText}>Confidentialité</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#00BCD4' }]}>
              <Ionicons name="help-circle-outline" size={18} color="#FFF" />
            </View>
            <Text style={styles.menuItemText}>Aide et support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF4444" />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>

      <Text style={styles.version}>New School v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: '#D946EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFF',
  },
  tierBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  languageTag: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  languageText: {
    color: '#FFF',
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#333',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D946EF',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subscriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  subscriptionDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 15,
    color: '#FFF',
    flex: 1,
  },
  eventInfo: {
    flex: 1,
  },
  eventParticipants: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4444',
  },
  version: {
    textAlign: 'center',
    color: '#444',
    fontSize: 12,
    marginTop: 24,
  },
});
