import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useEventStore, Event } from '../../stores/eventStore';

const THEMES = ['Gastronomie', 'Sport', 'Musique', 'Art & Culture', 'Plein air', 'Vie nocturne', 'Business', 'Échange linguistique', 'Voyage', 'Jeux', 'Autre'];

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { events, isLoading, fetchEvents, fetchNearbyEvents } = useEventStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (token) {
      loadEvents();
    }
  }, [token, selectedTheme, location]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadEvents = async () => {
    if (!token) return;
    
    const filters: any = {};
    if (location) {
      filters.latitude = location.latitude;
      filters.longitude = location.longitude;
      filters.radius_km = 50;
    }
    if (selectedTheme) {
      filters.theme = selectedTheme;
    }
    if (searchQuery) {
      filters.search = searchQuery;
    }
    
    await fetchEvents(token, filters);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [token, selectedTheme, location, searchQuery]);

  const handleSearch = () => {
    loadEvents();
  };

  const EventCard = ({ event }: { event: Event }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => router.push(`/event/${event.event_id}`)}
      activeOpacity={0.8}
    >
      {event.photo ? (
        <Image source={{ uri: event.photo }} style={styles.eventImage} />
      ) : (
        <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
          <Image 
            source={require('../../assets/images/logo-newschool.png')} 
            style={styles.placeholderLogo}
            resizeMode="cover"
          />
        </View>
      )}
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
          {event.theme && (
            <View style={styles.themeBadge}>
              <Text style={styles.themeBadgeText}>{event.theme}</Text>
            </View>
          )}
        </View>
        <View style={styles.eventInfo}>
          <Ionicons name="location" size={14} color="#888" />
          <Text style={styles.eventLocation} numberOfLines={1}>{event.location_name}</Text>
          {event.distance_km !== undefined && (
            <Text style={styles.eventDistance}>{event.distance_km} km</Text>
          )}
        </View>
        <View style={styles.eventFooter}>
          <View style={styles.eventCreator}>
            {event.creator_photo ? (
              <Image source={{ uri: event.creator_photo }} style={styles.creatorPhoto} />
            ) : (
              <View style={[styles.creatorPhoto, styles.creatorPhotoPlaceholder]}>
                <Text style={styles.creatorInitial}>{event.creator_name[0]}</Text>
              </View>
            )}
            <Text style={styles.creatorName}>{event.creator_name}</Text>
          </View>
          <View style={styles.participantsBadge}>
            <Ionicons name="people" size={14} color="#D946EF" />
            <Text style={styles.participantsText}>
              {event.current_participants}/{event.max_participants}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.first_name || 'Voyageur'}</Text>
          <Text style={styles.subtitle}>Découvrez les événements près de vous</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/create-event')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un événement..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadEvents(); }}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.themesContainer}
        contentContainerStyle={styles.themesContent}
      >
        <TouchableOpacity
          style={[styles.themeChip, !selectedTheme && styles.themeChipActive]}
          onPress={() => setSelectedTheme(null)}
        >
          <Text style={[styles.themeChipText, !selectedTheme && styles.themeChipTextActive]}>
            Tous
          </Text>
        </TouchableOpacity>
        {THEMES.map((theme) => (
          <TouchableOpacity
            key={theme}
            style={[styles.themeChip, selectedTheme === theme && styles.themeChipActive]}
            onPress={() => setSelectedTheme(selectedTheme === theme ? null : theme)}
          >
            <Text style={[styles.themeChipText, selectedTheme === theme && styles.themeChipTextActive]}>
              {theme}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.eventsList}
        contentContainerStyle={styles.eventsListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D946EF"
          />
        }
      >
        {isLoading && events.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D946EF" />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>Aucun événement</Text>
            <Text style={styles.emptySubtitle}>
              Soyez le premier à créer un événement dans votre région !
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/create-event')}
            >
              <Text style={styles.emptyButtonText}>Créer un événement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          events.map((event) => <EventCard key={event.event_id} event={event} />)
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D946EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  themesContainer: {
    maxHeight: 48,
    marginBottom: 12,
  },
  themesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  themeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    marginRight: 8,
  },
  themeChipActive: {
    backgroundColor: '#D946EF',
  },
  themeChipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  themeChipTextActive: {
    color: '#FFF',
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 150,
  },
  eventImagePlaceholder: {
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLogo: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    marginRight: 8,
  },
  themeBadge: {
    backgroundColor: '#D946EF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  themeBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  eventLocation: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  eventDistance: {
    color: '#D946EF',
    fontSize: 14,
    fontWeight: '500',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  creatorPhotoPlaceholder: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInitial: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  creatorName: {
    color: '#AAA',
    fontSize: 14,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  participantsText: {
    color: '#D946EF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
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
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#D946EF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
