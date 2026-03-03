import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Stats {
  total_users: number;
  total_events: number;
  active_events: number;
  total_messages: number;
  subscriptions: {
    free: number;
    standard: number;
    ambassador: number;
  };
  monthly_revenue: number;
  reports_pending: number;
}

interface User {
  user_id: string;
  email: string;
  first_name: string;
  photo?: string;
  subscription_tier: string;
  created_at: string;
  is_banned?: boolean;
  report_count?: number;
}

interface Report {
  report_id: string;
  reporter_id: string;
  reported_id: string;
  report_type: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  reported_user?: User;
}

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'reports'>('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      Alert.alert('Accès refusé', 'Vous n\'avez pas les permissions nécessaires.');
      router.back();
      return;
    }
    if (token) {
      loadData();
    }
  }, [token, user]);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchReports()]);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/reports`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Bannir l\'utilisateur',
      `Êtes-vous sûr de vouloir bannir ${userName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bannir',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/users/${userId}/ban`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (response.ok) {
                Alert.alert('Succès', 'Utilisateur banni');
                fetchUsers();
                fetchReports();
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de bannir l\'utilisateur');
            }
          },
        },
      ]
    );
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        Alert.alert('Succès', 'Utilisateur débanni');
        fetchUsers();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de débannir l\'utilisateur');
    }
  };

  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'ban') => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        Alert.alert('Succès', action === 'ban' ? 'Utilisateur banni' : 'Signalement ignoré');
        fetchReports();
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de traiter le signalement');
    }
  };

  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading Screen
  if (isLoading && !stats) {
    return (
      <View style={[styles.container, styles.loginContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#D946EF" />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  // Stats Tab
  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#1E3A5F' }]}>
          <Ionicons name="people" size={28} color="#4DA6FF" />
          <Text style={styles.statNumber}>{stats?.total_users || 0}</Text>
          <Text style={styles.statLabel}>Utilisateurs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3D1F5C' }]}>
          <Ionicons name="calendar" size={28} color="#D946EF" />
          <Text style={styles.statNumber}>{stats?.total_events || 0}</Text>
          <Text style={styles.statLabel}>New Schools</Text>
        </View>
      </View>
      
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#1F4D3A' }]}>
          <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
          <Text style={styles.statNumber}>{stats?.active_events || 0}</Text>
          <Text style={styles.statLabel}>Actives</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#5C3D1F' }]}>
          <Ionicons name="chatbubbles" size={28} color="#FFA726" />
          <Text style={styles.statNumber}>{stats?.total_messages || 0}</Text>
          <Text style={styles.statLabel}>Messages</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Abonnements</Text>
      <View style={styles.subscriptionsCard}>
        <View style={styles.subscriptionRow}>
          <View style={styles.subscriptionInfo}>
            <View style={[styles.subscriptionDot, { backgroundColor: '#666' }]} />
            <Text style={styles.subscriptionLabel}>Gratuit</Text>
          </View>
          <Text style={styles.subscriptionCount}>{stats?.subscriptions?.free || 0}</Text>
        </View>
        <View style={styles.subscriptionRow}>
          <View style={styles.subscriptionInfo}>
            <View style={[styles.subscriptionDot, { backgroundColor: '#D946EF' }]} />
            <Text style={styles.subscriptionLabel}>Standard (4,99€)</Text>
          </View>
          <Text style={styles.subscriptionCount}>{stats?.subscriptions?.standard || 0}</Text>
        </View>
        <View style={styles.subscriptionRow}>
          <View style={styles.subscriptionInfo}>
            <View style={[styles.subscriptionDot, { backgroundColor: '#FFD700' }]} />
            <Text style={styles.subscriptionLabel}>Ambassadeur (10,99€)</Text>
          </View>
          <Text style={styles.subscriptionCount}>{stats?.subscriptions?.ambassador || 0}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Revenus estimés (mensuel)</Text>
      <View style={styles.revenueCard}>
        <Ionicons name="cash" size={32} color="#4CAF50" />
        <Text style={styles.revenueAmount}>{stats?.monthly_revenue?.toFixed(2) || '0.00'} €</Text>
        <Text style={styles.revenueNote}>Avant commission Apple/Google (~30%)</Text>
      </View>

      {(stats?.reports_pending || 0) > 0 && (
        <TouchableOpacity 
          style={styles.alertCard}
          onPress={() => setActiveTab('reports')}
        >
          <Ionicons name="warning" size={24} color="#FF6B6B" />
          <Text style={styles.alertText}>
            {stats?.reports_pending} signalement(s) en attente
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      )}
    </View>
  );

  // Users Tab
  const renderUsers = () => (
    <View style={styles.usersContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un utilisateur..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filteredUsers.map((user) => (
        <TouchableOpacity
          key={user.user_id}
          style={[styles.userCard, user.is_banned && styles.userCardBanned]}
          onPress={() => setSelectedUser(user)}
        >
          <View style={styles.userAvatar}>
            {user.photo ? (
              <Image source={{ uri: user.photo }} style={styles.userAvatarImage} />
            ) : (
              <Text style={styles.userAvatarText}>{user.first_name[0]}</Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{user.first_name}</Text>
              {user.is_banned && (
                <View style={styles.bannedBadge}>
                  <Text style={styles.bannedBadgeText}>BANNI</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.userMeta}>
              <Text style={[styles.userTier, { color: user.subscription_tier === 'ambassador' ? '#FFD700' : user.subscription_tier === 'standard' ? '#D946EF' : '#666' }]}>
                {user.subscription_tier === 'ambassador' ? 'Ambassadeur' : user.subscription_tier === 'standard' ? 'Standard' : 'Gratuit'}
              </Text>
              {(user.report_count || 0) > 0 && (
                <View style={styles.reportBadge}>
                  <Ionicons name="flag" size={12} color="#FF6B6B" />
                  <Text style={styles.reportBadgeText}>{user.report_count}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.banButton, user.is_banned && styles.unbanButton]}
            onPress={() => user.is_banned ? handleUnbanUser(user.user_id) : handleBanUser(user.user_id, user.first_name)}
          >
            <Ionicons name={user.is_banned ? 'checkmark' : 'ban'} size={18} color="#FFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Reports Tab
  const renderReports = () => (
    <View style={styles.reportsContainer}>
      {reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
          <Text style={styles.emptyTitle}>Aucun signalement</Text>
          <Text style={styles.emptySubtitle}>Tout va bien !</Text>
        </View>
      ) : (
        reports.map((report) => (
          <View key={report.report_id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={styles.reportTypeBadge}>
                <Text style={styles.reportTypeText}>
                  {report.report_type === 'user' ? 'Utilisateur' : report.report_type === 'message' ? 'Message' : 'Événement'}
                </Text>
              </View>
              <Text style={styles.reportDate}>
                {new Date(report.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            
            <Text style={styles.reportReason}>{report.reason}</Text>
            {report.description && (
              <Text style={styles.reportDescription}>{report.description}</Text>
            )}

            <View style={styles.reportActions}>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => handleResolveReport(report.report_id, 'dismiss')}
              >
                <Text style={styles.dismissButtonText}>Ignorer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.banReportButton}
                onPress={() => handleResolveReport(report.report_id, 'ban')}
              >
                <Text style={styles.banReportButtonText}>Bannir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard Admin</Text>
        <TouchableOpacity onPress={() => loadData()}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons name="stats-chart" size={20} color={activeTab === 'stats' ? '#D946EF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons name="people" size={20} color={activeTab === 'users' ? '#D946EF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Utilisateurs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Ionicons name="flag" size={20} color={activeTab === 'reports' ? '#D946EF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>Signalements</Text>
          {(stats?.reports_pending || 0) > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{stats?.reports_pending}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D946EF" />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#D946EF" style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeTab === 'stats' && renderStats()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'reports' && renderReports()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loginContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  backButtonLogin: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 20,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
  loginForm: {
    width: '100%',
    marginTop: 40,
  },
  passwordInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#D946EF',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
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
    color: '#FFF',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#D946EF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#D946EF',
    fontWeight: '500',
  },
  tabBadge: {
    backgroundColor: '#FF6B6B',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  statsContainer: {},
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#AAA',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 24,
    marginBottom: 12,
  },
  subscriptionsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subscriptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  subscriptionLabel: {
    fontSize: 15,
    color: '#FFF',
  },
  subscriptionCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  revenueCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  revenueNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  usersContainer: {},
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  userCardBanned: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D946EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  bannedBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bannedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  userEmail: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  userTier: {
    fontSize: 12,
    fontWeight: '500',
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reportBadgeText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  banButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unbanButton: {
    backgroundColor: '#4CAF50',
  },
  reportsContainer: {},
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  reportCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportTypeBadge: {
    backgroundColor: '#D946EF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reportTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  reportDate: {
    fontSize: 12,
    color: '#888',
  },
  reportReason: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 12,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  banReportButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  banReportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
