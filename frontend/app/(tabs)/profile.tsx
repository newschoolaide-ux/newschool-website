import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useEventStore } from '../../stores/eventStore';
import { colors, radius, tabBarSpace } from '../../constants/theme';
import { Avatar, Button, IconButton } from '../../components/ui/kit';
import { EventRow } from '../../components/ui/EventCards';

type Tab = 'created' | 'joined';

const INVITE_MESSAGE =
  'Je suis sur New School : des sorties spontanées avec des gens du coin (apéros, foot, concerts…). Gratuit, rejoins-moi !';

export default function ProfileScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  const { userCreatedEvents, userJoinedEvents, fetchUserCreatedEvents, fetchUserJoinedEvents } = useEventStore();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('created');
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
    Alert.alert('Déconnexion', 'Tu veux vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const invite = () => {
    Share.share({ message: INVITE_MESSAGE }).catch(() => {});
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;
  const list = tab === 'created' ? userCreatedEvents : userJoinedEvents;

  const rows: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void }> = [
    { label: 'Inviter des amis', icon: 'gift-outline', color: colors.accent, onPress: invite },
    { label: 'Mes Schools passées', icon: 'time-outline', color: colors.warning, onPress: () => router.push('/history') },
    { label: 'Notifications', icon: 'notifications-outline', color: '#C084FC', onPress: () => router.push('/settings/notifications') },
    { label: 'Confidentialité', icon: 'shield-checkmark-outline', color: colors.live, onPress: () => router.push('/settings/privacy') },
    { label: 'Aide et support', icon: 'help-circle-outline', color: colors.info, onPress: () => router.push('/settings/help') },
  ];
  if (user?.role === 'admin') {
    rows.push({ label: 'Administration', icon: 'key-outline', color: '#94A3B8', onPress: () => router.push('/admin') });
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace(insets.bottom) }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Profil</Text>
        <IconButton icon="settings-outline" label="Modifier le profil" onPress={() => router.push('/profile/edit')} />
      </View>

      <View style={styles.card}>
        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            <Avatar name={user?.first_name} photo={user?.photo} size={76} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.userName} numberOfLines={1}>{user?.first_name || 'Utilisateur'}</Text>
            <Text style={styles.userMeta} numberOfLines={1}>
              {memberSince ? `Membre depuis ${memberSince}` : user?.email}
            </Text>
          </View>
        </View>

        {!!user?.bio && <Text style={styles.userBio}>{user.bio}</Text>}

        {user?.languages && user.languages.length > 0 && (
          <View style={styles.languages}>
            {user.languages.map((lang, index) => (
              <View key={index} style={styles.languageTag}>
                <Text style={styles.languageText}>{lang}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{userCreatedEvents.length}</Text>
            <Text style={styles.statLabel}>Schools créées</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{userJoinedEvents.length}</Text>
            <Text style={styles.statLabel}>Schools rejointes</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Modifier le profil" variant="light" compact style={{ flex: 1 }} onPress={() => router.push('/profile/edit')} />
          <IconButton icon="share-outline" label="Inviter des amis" onPress={invite} style={{ backgroundColor: colors.surface2, borderWidth: 0 }} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.segment}>
          {([
            ['created', 'Créées'],
            ['joined', 'Rejointes'],
          ] as Array<[Tab, string]>).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              style={[styles.segmentItem, tab === id && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, tab === id && styles.segmentTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {tab === 'created' ? 'Aucune School créée' : 'Aucune School rejointe'}
            </Text>
            <Text style={styles.emptyText}>
              {tab === 'created'
                ? 'Lance une sortie en 30 secondes : les gens autour de toi seront prévenus.'
                : 'Les Schools que tu rejoins apparaîtront ici.'}
            </Text>
            <Button
              title={tab === 'created' ? 'Créer une School' : 'Trouver une School'}
              compact
              onPress={() => router.push(tab === 'created' ? '/create-event' : '/(tabs)/home')}
              style={{ marginTop: 6 }}
            />
          </View>
        ) : (
          list.slice(0, 4).map((event) => (
            <EventRow key={event.event_id} event={event} onPress={() => router.push(`/event/${event.event_id}`)} />
          ))
        )}
      </View>

      <View style={styles.menu}>
        {rows.map((row, i) => (
          <Pressable
            key={row.label}
            onPress={row.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.menuItem, i > 0 && styles.menuDivider, pressed && { backgroundColor: colors.surface2 }]}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: `${row.color}22` }]}>
                <Ionicons name={row.icon} size={18} color={row.color} />
              </View>
              <Text style={styles.menuText}>{row.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.logout} onPress={handleLogout} accessibilityRole="button">
        <Ionicons name="log-out-outline" size={19} color={colors.danger} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>

      <Text style={styles.version}>New School · 100 % gratuit</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  card: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    gap: 16,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  userMeta: {
    fontSize: 14,
    color: colors.muted,
  },
  userBio: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  languages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageTag: {
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  languageText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  section: {
    marginTop: 22,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: 14,
  },
  segmentItem: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.surface3,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 280,
  },
  menu: {
    marginTop: 22,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  menuItem: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  logout: {
    marginTop: 18,
    height: 52,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    color: colors.faint,
    fontSize: 12,
    marginTop: 16,
  },
});
