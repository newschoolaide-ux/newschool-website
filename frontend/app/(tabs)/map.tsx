import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useEventStore, Event } from '../../stores/eventStore';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const { token } = useAuth();
  const { nearbyEvents, isLoading, fetchNearbyEvents } = useEventStore();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (token && location) {
      fetchNearbyEvents(token, location.latitude, location.longitude, 50);
    }
  }, [token, location]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } else {
        // Default to Paris if permission denied
        setLocation({ latitude: 48.8566, longitude: 2.3522 });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocation({ latitude: 48.8566, longitude: 2.3522 });
    }
  };

  if (!location) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {nearbyEvents.map((event) => (
          <Marker
            key={event.event_id}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            onPress={() => setSelectedEvent(event)}
          >
            <View style={[styles.marker, selectedEvent?.event_id === event.event_id && styles.markerSelected]}>
              <Ionicons name="calendar" size={16} color="#FFF" />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Carte des événements</Text>
          <Text style={styles.headerSubtitle}>{nearbyEvents.length} événements à proximité</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.createButton, { bottom: insets.bottom + 100 }]}
        onPress={() => router.push('/create-event')}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {selectedEvent && (
        <TouchableOpacity
          style={[styles.eventCard, { bottom: insets.bottom + 100 }]}
          onPress={() => router.push(`/event/${selectedEvent.event_id}`)}
          activeOpacity={0.95}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedEvent(null)}
          >
            <Ionicons name="close" size={20} color="#888" />
          </TouchableOpacity>
          <View style={styles.eventCardContent}>
            <Text style={styles.eventName}>{selectedEvent.name}</Text>
            <View style={styles.eventInfo}>
              <Ionicons name="location" size={14} color="#888" />
              <Text style={styles.eventLocation}>{selectedEvent.location_name}</Text>
            </View>
            <View style={styles.eventInfo}>
              <Ionicons name="people" size={14} color="#FF6B35" />
              <Text style={styles.participantsText}>
                {selectedEvent.current_participants}/{selectedEvent.max_participants} participants
              </Text>
            </View>
            {selectedEvent.theme && (
              <View style={styles.themeBadge}>
                <Text style={styles.themeBadgeText}>{selectedEvent.theme}</Text>
              </View>
            )}
          </View>
          <View style={styles.eventCardArrow}>
            <Ionicons name="chevron-forward" size={24} color="#FF6B35" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 16,
  },
  map: {
    width: width,
    height: height,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerContent: {
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    borderRadius: 12,
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  markerSelected: {
    backgroundColor: '#FF4500',
    transform: [{ scale: 1.2 }],
  },
  createButton: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  eventCard: {
    position: 'absolute',
    left: 20,
    right: 90,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  eventCardContent: {
    flex: 1,
    paddingRight: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventLocation: {
    color: '#888',
    fontSize: 13,
  },
  participantsText: {
    color: '#FF6B35',
    fontSize: 13,
  },
  themeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  themeBadgeText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '500',
  },
  eventCardArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
