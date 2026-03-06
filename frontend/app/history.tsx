import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Participant {
  user_id: string;
  first_name: string;
  last_name?: string;
  photo?: string;
}

interface PastEvent {
  event_id: string;
  name: string;
  description: string;
  location_name: string;
  theme?: string;
  photo?: string;
  start_time?: string;
  created_at: string;
  status: string;
  creator: Participant;
  participants: Participant[];
  participant_count: number;
}

export default function HistoryScreen() {
  const [events, setEvents] = useState<PastEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/users/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const navigateToUser = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const navigateToChat = (eventId: string) => {
    router.push(`/chat/${eventId}`);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#D946EF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Schools passées</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#D946EF"
          />
        }
      >
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>Aucune School passée</Text>
            <Text style={styles.emptySubtext}>
              Rejoignez des Schools pour les voir apparaître ici
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.event_id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventDate}>
                    {event.start_time ? formatDate(event.start_time) : formatDate(event.created_at)}
                  </Text>
                  {event.theme && (
                    <View style={styles.themeTag}>
                      <Text style={styles.themeText}>{event.theme}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => navigateToChat(event.event_id)}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#D946EF" />
                  <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.participantsLabel}>
                {event.participant_count} participant{event.participant_count > 1 ? 's' : ''}
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.participantsScroll}
              >
                {event.participants.map((participant) => (
                  <TouchableOpacity
                    key={participant.user_id}
                    style={styles.participantItem}
                    onPress={() => navigateToUser(participant.user_id)}
                  >
                    {participant.photo ? (
                      <Image
                        source={{ uri: participant.photo }}
                        style={styles.participantPhoto}
                      />
                    ) : (
                      <View style={[styles.participantPhoto, styles.placeholderPhoto]}>
                        <Text style={styles.placeholderText}>
                          {participant.first_name[0]}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.participantName} numberOfLines={1}>
                      {participant.first_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
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
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  themeTag: {
    backgroundColor: '#D946EF20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  themeText: {
    color: '#D946EF',
    fontSize: 12,
    fontWeight: '500',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D946EF20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chatButtonText: {
    color: '#D946EF',
    fontSize: 14,
    fontWeight: '500',
  },
  participantsLabel: {
    color: '#888',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 12,
  },
  participantsScroll: {
    marginHorizontal: -4,
  },
  participantItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 64,
  },
  participantPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 6,
  },
  placeholderPhoto: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  participantName: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
  },
});
