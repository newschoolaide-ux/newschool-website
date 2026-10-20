import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  FlatList,
  Keyboard,
} from 'react-native';
import { Text, TextInput } from '../../components/ui/Text';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useEventStore, Event } from '../../stores/eventStore';
import { colors, radius, themeColor, themeIcon, themeTint, tabBarSpace } from '../../constants/theme';
import { Chip } from '../../components/ui/kit';
import { EventRow, eventTiming, formatDistance } from '../../components/ui/EventCards';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 72, 320);
const CARD_GAP = 12;

// Style de nuit de la carte Google (Android) : fond sombre teinté violet, eau bleu nuit.
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#141722' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8C86A0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F1119' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#C9C2DE' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#132219' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#1A1E2B' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#232838' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0F1119' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2E3448' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3A3352' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#C9C2DE' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1B2D4D' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4E6A99' }] },
];

// La carte n'existe que sur téléphone.
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
let mapsLoadError = false;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (error) {
    console.error('Failed to load react-native-maps:', error);
    mapsLoadError = true;
  }
}

type TimeFilter = 'all' | 'now' | 'later';

function EventPin({ event, selected }: { event: Event; selected: boolean }) {
  const color = themeColor(event.theme);
  const live = eventTiming(event).live;
  const size = selected ? 52 : 40;
  return (
    <View style={styles.pinWrap}>
      <View style={{ width: size + 24, height: size + 24, alignItems: 'center', justifyContent: 'center' }}>
        {live && (
          <View
            style={{
              position: 'absolute',
              width: size + 22,
              height: size + 22,
              borderRadius: (size + 22) / 2,
              backgroundColor: color,
              opacity: 0.22,
            }}
          />
        )}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            borderWidth: 3,
            borderColor: selected ? colors.text : colors.mapBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={themeIcon(event.theme) as any} size={selected ? 24 : 18} color="#120A16" />
        </View>
        <View style={[styles.pinCount, { borderColor: color, left: (size + 24) / 2 + size / 2 - 16, top: 6 }]}>
          <Text style={styles.pinCountText}>{event.current_participants}</Text>
        </View>
      </View>
      <View style={[styles.pinTail, { backgroundColor: color }]} />
    </View>
  );
}

function MapCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const timing = eventTiming(event);
  const distance = formatDistance(event.distance_km);
  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button" accessibilityLabel={event.name}>
      <View style={[styles.cardThumb, { backgroundColor: themeTint(event.theme) }]}>
        <Ionicons name={themeIcon(event.theme) as any} size={32} color={themeColor(event.theme)} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        {!!timing.label && (
          <Text style={[styles.cardStatus, { color: timing.live ? colors.live : '#93C5FD' }]} numberOfLines={1}>
            {timing.label}
          </Text>
        )}
        <Text style={styles.cardTitle} numberOfLines={2}>{event.name}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {[event.location_name, distance, `${event.current_participants}/${event.max_participants}`].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={styles.cardGo}>
        <Ionicons name="arrow-forward" size={20} color={colors.onAccent} />
      </View>
    </Pressable>
  );
}

export default function MapScreen() {
  const { token } = useAuth();
  const { nearbyEvents, isLoading, fetchNearbyEvents } = useEventStore();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [cityQuery, setCityQuery] = useState('');
  const [trackPins, setTrackPins] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const lastRefresh = useRef<number>(0);
  const mapRef = useRef<any>(null);
  const listRef = useRef<FlatList<Event>>(null);

  const events = useMemo(() => {
    if (timeFilter === 'all') return nearbyEvents;
    return nearbyEvents.filter((e) => (timeFilter === 'now' ? eventTiming(e).live : !eventTiming(e).live));
  }, [nearbyEvents, timeFilter]);
  const liveCount = useMemo(() => nearbyEvents.filter((e) => eventTiming(e).live).length, [nearbyEvents]);

  useEffect(() => {
    getLocation();
  }, []);

  // Les repères personnalisés doivent être redessinés quand la sélection change.
  useEffect(() => {
    setTrackPins(true);
    const t = setTimeout(() => setTrackPins(false), 700);
    return () => clearTimeout(t);
  }, [selectedId, events]);

  useEffect(() => {
    if (pathname === '/map' && token && location) {
      const now = Date.now();
      if (now - lastRefresh.current > 2000) {
        lastRefresh.current = now;
        fetchNearbyEvents(token, location.latitude, location.longitude, 200);
      }
    }
  }, [pathname, token, location]);

  useEffect(() => {
    if (token && location) {
      fetchNearbyEvents(token, location.latitude, location.longitude, 200);
    }
  }, [token, location]);

  const refreshEvents = async () => {
    if (!token || !location) return;
    setIsRefreshing(true);
    await fetchNearbyEvents(token, location.latitude, location.longitude, 200);
    lastRefresh.current = Date.now();
    setIsRefreshing(false);
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } else {
        setLocation({ latitude: 48.8566, longitude: 2.3522 });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocation({ latitude: 48.8566, longitude: 2.3522 });
    }
  };

  const recenter = () => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion({ ...location, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 500);
  };

  const searchCity = async () => {
    const q = cityQuery.trim();
    Keyboard.dismiss();
    if (!q || !mapRef.current) return;
    try {
      const res = await Location.geocodeAsync(q);
      if (res?.[0]) {
        mapRef.current.animateToRegion(
          { latitude: res[0].latitude, longitude: res[0].longitude, latitudeDelta: 0.12, longitudeDelta: 0.12 },
          600
        );
      }
    } catch (e) {
      console.log('City search failed', e);
    }
  };

  const focusEvent = (event: Event, scrollList = true) => {
    setSelectedId(event.event_id);
    mapRef.current?.animateToRegion(
      { latitude: event.latitude, longitude: event.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      450
    );
    if (scrollList) {
      const index = events.findIndex((e) => e.event_id === event.event_id);
      if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  };

  const bottom = tabBarSpace(insets.bottom);

  const listFallback = (title: string, subtitle: string) => (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.listSubtitle}>{subtitle}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottom }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : nearbyEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={44} color={colors.faint} />
            <Text style={styles.emptyText}>Aucune School à proximité</Text>
          </View>
        ) : (
          nearbyEvents.map((event) => (
            <EventRow key={event.event_id} event={event} onPress={() => router.push(`/event/${event.event_id}`)} />
          ))
        )}
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return listFallback('Autour de toi', 'La carte est disponible sur l’app mobile. Voici les Schools à proximité :');
  }

  if (mapsLoadError || !MapView) {
    return listFallback('Autour de toi', 'Les Schools à proximité :');
  }

  if (!location) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Chargement de la carte…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={MAP_STYLE}
        userInterfaceStyle="dark"
        initialRegion={{ ...location, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        onPress={() => setSelectedId(null)}
      >
        {events.map((event) => (
          <Marker
            key={event.event_id}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={trackPins}
            onPress={(e: any) => {
              e?.stopPropagation?.();
              focusEvent(event);
            }}
            zIndex={selectedId === event.event_id ? 10 : 1}
          >
            <EventPin event={event} selected={selectedId === event.event_id} />
          </Marker>
        ))}
      </MapView>

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une ville"
              value={cityQuery}
              onChangeText={setCityQuery}
              onSubmitEditing={searchCity}
              returnKeyType="search"
            />
          </View>
          <Pressable style={styles.squareButton} onPress={refreshEvents} disabled={isRefreshing} accessibilityLabel="Actualiser les Schools">
            {isRefreshing ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="refresh" size={20} color={colors.text} />}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={{ flexGrow: 0 }}>
          <Chip label={`Tout · ${nearbyEvents.length}`} active={timeFilter === 'all'} onPress={() => setTimeFilter('all')} />
          <Chip label={`En ce moment · ${liveCount}`} active={timeFilter === 'now'} onPress={() => setTimeFilter('now')} />
          <Chip label="À venir" active={timeFilter === 'later'} onPress={() => setTimeFilter('later')} />
        </ScrollView>
      </View>

      <Pressable
        style={[styles.locateButton, { bottom: bottom + (events.length ? 128 : 16) }]}
        onPress={recenter}
        accessibilityLabel="Recentrer sur ma position"
      >
        <Ionicons name="navigate" size={20} color={colors.info} />
      </Pressable>

      {events.length > 0 ? (
        <FlatList
          ref={listRef}
          data={events}
          horizontal
          keyExtractor={(e) => e.event_id}
          showsHorizontalScrollIndicator={false}
          style={[styles.carousel, { bottom: bottom - 6 }]}
          contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}
          snapToInterval={CARD_WIDTH + CARD_GAP}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: CARD_WIDTH + CARD_GAP, offset: (CARD_WIDTH + CARD_GAP) * index, index })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
            const ev = events[index];
            if (ev && ev.event_id !== selectedId) focusEvent(ev, false);
          }}
          renderItem={({ item }) => (
            <MapCard event={item} onPress={() => router.push(`/event/${item.event_id}`)} />
          )}
        />
      ) : (
        !isLoading && (
          <View style={[styles.emptyBanner, { bottom: bottom }]}>
            <Text style={styles.emptyBannerText}>Aucune School ici pour l'instant.</Text>
            <Pressable onPress={() => router.push('/create-event')} hitSlop={8}>
              <Text style={styles.emptyBannerLink}>En créer une</Text>
            </Pressable>
          </View>
        )
      )}
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.45,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 10,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mapBg,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    marginTop: 12,
    fontSize: 15,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  searchBox: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(12,10,18,0.94)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    ...shadow,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  squareButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(12,10,18,0.94)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  filters: {
    paddingHorizontal: 16,
    gap: 8,
  },
  locateButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(12,10,18,0.94)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  pinWrap: {
    alignItems: 'center',
  },
  pinCount: {
    position: 'absolute',
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCountText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  pinTail: {
    width: 10,
    height: 10,
    transform: [{ rotate: '45deg' }],
    marginTop: -17,
  },
  carousel: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexGrow: 0,
  },
  card: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    ...shadow,
  },
  cardThumb: {
    width: 76,
    height: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  cardGo: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    ...shadow,
  },
  emptyBannerText: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  emptyBannerLink: {
    color: '#E9A6F5',
    fontSize: 14,
    fontWeight: '700',
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 6,
  },
  listTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  listSubtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
  },
});
