import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { useEventStore } from '../../stores/eventStore';

// Image par défaut - Logo New School
const DEFAULT_EVENT_IMAGE = require('../../assets/images/default-event.png');

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const { currentEvent, isLoading, fetchEvent, joinEvent, leaveEvent, deleteEvent } = useEventStore();
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (token && id) {
      fetchEvent(token, id);
    }
  }, [token, id]);

  const isCreator = currentEvent?.creator_id === user?.user_id;
  const isParticipant = currentEvent?.participants?.some(p => p.user_id === user?.user_id);

  const handleJoin = async () => {
    if (!token || !id) return;
    
    setIsJoining(true);
    try {
      await joinEvent(token, id);
      Alert.alert('Succès', 'Vous avez rejoint l\'événement !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!token || !id) return;
    
    Alert.alert(
      'Quitter l\'événement',
      'Êtes-vous sûr de vouloir quitter cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveEvent(token, id);
              Alert.alert('Succès', 'Vous avez quitté l\'événement');
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!token || !id) return;
    
    Alert.alert(
      'Supprimer l\'événement',
      'Cette action est irréversible. Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(token, id);
              router.back();
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Rejoignez-moi à "${currentEvent?.name}" sur New School ! ${currentEvent?.location_name}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleChat = () => {
    if (isParticipant && id) {
      router.push(`/chat/${id}`);
    } else {
      Alert.alert('Info', 'Rejoignez l\'événement pour accéder au chat');
    }
  };

  if (isLoading || !currentEvent) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#D946EF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {currentEvent.photo ? (
          <Image source={{ uri: currentEvent.photo }} style={styles.coverImage} />
        ) : (
          <View style={styles.defaultCoverContainer}>
            <Image source={DEFAULT_EVENT_IMAGE} style={styles.defaultCoverImage} resizeMode="contain" />
          </View>
        )}

        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#F5F3FA" />
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="#F5F3FA" />
          </TouchableOpacity>
          {isCreator && (
            <>
              <TouchableOpacity 
                style={[styles.iconButton, styles.editButton]} 
                onPress={() => router.push(`/event/edit/${id}`)}
              >
                <Ionicons name="pencil" size={22} color="#D946EF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, styles.deleteButton]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color="#FF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.eventName}>{currentEvent.name}</Text>
            {currentEvent.theme && (
              <View style={styles.themeBadge}>
                <Text style={styles.themeBadgeText}>{currentEvent.theme}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#D946EF" />
              <Text style={styles.infoText}>{currentEvent.location_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#D946EF" />
              <Text style={styles.infoText}>
                {currentEvent.start_time
                  ? format(new Date(currentEvent.start_time), "EEEE d MMMM 'à' HH:mm", { locale: fr })
                  : 'Date à définir'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#D946EF" />
              <Text style={styles.infoText}>Durée: {currentEvent.duration_hours}h</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people" size={20} color="#D946EF" />
              <Text style={styles.infoText}>
                {currentEvent.current_participants}/{currentEvent.max_participants} participants
              </Text>
              {currentEvent.is_full && (
                <View style={styles.fullBadge}>
                  <Text style={styles.fullBadgeText}>Complet</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{currentEvent.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organisateur</Text>
            <View style={styles.creatorCard}>
              {currentEvent.creator_photo ? (
                <Image source={{ uri: currentEvent.creator_photo }} style={styles.creatorAvatar} />
              ) : (
                <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
                  <Text style={styles.creatorInitial}>{currentEvent.creator_name[0]}</Text>
                </View>
              )}
              <View>
                <Text style={styles.creatorName}>{currentEvent.creator_name}</Text>
                {isCreator && <Text style={styles.creatorLabel}>C'est vous !</Text>}
              </View>
            </View>
          </View>

          {currentEvent.desired_nationalities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Langues/Nationalités souhaitées</Text>
              <View style={styles.tagsContainer}>
                {currentEvent.desired_nationalities.map((nat, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{nat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Participants ({currentEvent.current_participants})</Text>
              {isParticipant && (
                <TouchableOpacity onPress={handleChat}>
                  <Text style={styles.chatLink}>Ouvrir le chat</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.participantsList}>
              {currentEvent.participants.map((participant) => (
                <TouchableOpacity 
                  key={participant.user_id} 
                  style={styles.participantItem}
                  onPress={() => router.push(`/user/${participant.user_id}`)}
                >
                  {participant.photo ? (
                    <Image source={{ uri: participant.photo }} style={styles.participantAvatar} />
                  ) : (
                    <View style={[styles.participantAvatar, styles.participantAvatarPlaceholder]}>
                      <Text style={styles.participantInitial}>{participant.first_name[0]}</Text>
                    </View>
                  )}
                  <Text style={styles.participantName}>{participant.first_name}</Text>
                  {participant.user_id === currentEvent.creator_id && (
                    <View style={styles.organizerBadge}>
                      <Ionicons name="star" size={12} color="#D946EF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {isParticipant ? (
          <>
            <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
              <Ionicons name="chatbubbles" size={20} color="#F5F3FA" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
            {!isCreator && (
              <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
                <Text style={styles.leaveButtonText}>Quitter</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={[styles.joinButton, currentEvent.is_full && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={currentEvent.is_full || isJoining}
          >
            {isJoining ? (
              <ActivityIndicator color="#F5F3FA" />
            ) : (
              <Text style={styles.joinButtonText}>
                {currentEvent.is_full ? 'Événement complet' : 'Rejoindre'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A12',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  coverImage: {
    width: '100%',
    height: 280,
  },
  defaultCoverContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#E8EBF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultCoverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    backgroundColor: '#16131F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    position: 'absolute',
    right: 16,
    top: 50,
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(255,68,68,0.2)',
  },
  editButton: {
    backgroundColor: 'rgba(217,70,239,0.2)',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  eventName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F5F3FA',
    flex: 1,
    marginRight: 12,
  },
  themeBadge: {
    backgroundColor: '#D946EF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  themeBadgeText: {
    color: '#F5F3FA',
    fontSize: 13,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#16131F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    color: '#F5F3FA',
    fontSize: 15,
    flex: 1,
  },
  fullBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fullBadgeText: {
    color: '#F5F3FA',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5F3FA',
    marginBottom: 12,
  },
  chatLink: {
    color: '#D946EF',
    fontSize: 14,
    fontWeight: '500',
  },
  description: {
    color: '#C4BFD1',
    fontSize: 15,
    lineHeight: 24,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16131F',
    borderRadius: 12,
    padding: 14,
    gap: 14,
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  creatorAvatarPlaceholder: {
    backgroundColor: '#D946EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInitial: {
    color: '#F5F3FA',
    fontSize: 20,
    fontWeight: '600',
  },
  creatorName: {
    color: '#F5F3FA',
    fontSize: 16,
    fontWeight: '500',
  },
  creatorLabel: {
    color: '#D946EF',
    fontSize: 12,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#16131F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    color: '#F5F3FA',
    fontSize: 14,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  participantItem: {
    alignItems: 'center',
    width: 70,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
  },
  participantAvatarPlaceholder: {
    backgroundColor: '#2A2535',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: {
    color: '#F5F3FA',
    fontSize: 18,
    fontWeight: '600',
  },
  participantName: {
    color: '#C4BFD1',
    fontSize: 12,
    textAlign: 'center',
  },
  organizerBadge: {
    position: 'absolute',
    top: 0,
    right: 10,
    backgroundColor: '#16131F',
    borderRadius: 10,
    padding: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#0C0A12',
    borderTopWidth: 1,
    borderTopColor: '#16131F',
    gap: 12,
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#D946EF',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#3A3448',
  },
  joinButtonText: {
    color: '#F5F3FA',
    fontSize: 17,
    fontWeight: '600',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#D946EF',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatButtonText: {
    color: '#F5F3FA',
    fontSize: 17,
    fontWeight: '600',
  },
  leaveButton: {
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,68,68,0.15)',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButtonText: {
    color: '#FF4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
