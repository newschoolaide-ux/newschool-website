import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput } from '../../components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { useEventStore } from '../../stores/eventStore';
import { colors, radius, themeColor, themeIcon, tabBarSpace } from '../../constants/theme';
import { Avatar, Button, Chip } from '../../components/ui/kit';
import { EventCard, EventRow, eventTiming } from '../../components/ui/EventCards';

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

  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    Location.reverseGeocodeAsync(location)
      .then((res) => setCity(res?.[0]?.city || res?.[0]?.subregion || null))
      .catch(() => {});
  }, [location]);

  const liveEvents = events.filter((e) => eventTiming(e).live);
  const laterEvents = events.filter((e) => !eventTiming(e).live);
  const hourNow = new Date().getHours();
  const headline = hourNow < 12 ? 'On fait quoi\naujourd\'hui ?' : hourNow < 17 ? 'On sort quoi\ncet aprem ?' : 'On sort quoi\nce soir ?';
  const openEvent = (id: string) => router.push(`/event/${id}`);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.eventsList}
        contentContainerStyle={[styles.eventsListContent, { paddingBottom: tabBarSpace(insets.bottom) }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.topRow}>
          <Pressable style={styles.locationPill} onPress={() => router.push('/(tabs)/map')} accessibilityRole="button">
            <Ionicons name="location" size={17} color={colors.accent} />
            <Text style={styles.locationText} numberOfLines={1}>{city ? `${city} · 50 km` : 'Autour de moi'}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.muted} />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button" accessibilityLabel="Mon profil">
            <Avatar name={user?.first_name} photo={user?.photo} size={44} />
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={styles.greeting}>Salut {user?.first_name || 'toi'}</Text>
          <Text style={styles.headline}>{headline}</Text>
        </View>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Un apéro, un foot, un concert…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); loadEvents(); }} accessibilityLabel="Effacer la recherche" hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.themesContainer}
          contentContainerStyle={styles.themesContent}
        >
          <Chip label="Tous" active={!selectedTheme} onPress={() => setSelectedTheme(null)} />
          {THEMES.map((theme) => (
            <Chip
              key={theme}
              label={theme}
              icon={themeIcon(theme) as any}
              color={themeColor(theme)}
              active={selectedTheme === theme}
              onPress={() => setSelectedTheme(selectedTheme === theme ? null : theme)}
            />
          ))}
        </ScrollView>

        {isLoading && events.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles" size={30} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Rien pour l'instant par ici</Text>
            <Text style={styles.emptySubtitle}>
              Lance la première School du coin : un café, un foot, une balade. Les gens autour de toi seront prévenus.
            </Text>
            <Button title="Créer une School" icon="add" onPress={() => router.push('/create-event')} style={{ marginTop: 22, alignSelf: 'stretch' }} />
          </View>
        ) : (
          <>
            {liveEvents.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.sectionTitle}>En ce moment</Text>
                  </View>
                  <Pressable onPress={() => router.push('/(tabs)/map')} hitSlop={8}>
                    <Text style={styles.sectionLink}>Voir sur la carte</Text>
                  </Pressable>
                </View>
                {liveEvents.map((event) => (
                  <EventCard key={event.event_id} event={event} onPress={() => openEvent(event.event_id)} />
                ))}
              </View>
            )}
            {laterEvents.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>À venir</Text>
                </View>
                {liveEvents.length === 0
                  ? laterEvents.map((event) => (
                      <EventCard key={event.event_id} event={event} onPress={() => openEvent(event.event_id)} />
                    ))
                  : laterEvents.map((event) => (
                      <EventRow key={event.event_id} event={event} onPress={() => openEvent(event.event_id)} />
                    ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 44,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    maxWidth: 240,
  },
  locationText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  header: {
    marginTop: 22,
    gap: 6,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.muted,
  },
  headline: {
    fontSize: 34,
    lineHeight: 37,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
  },
  searchInputContainer: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  themesContainer: {
    marginTop: 14,
    marginHorizontal: -20,
    flexGrow: 0,
  },
  themesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 26,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.liveDot,
    shadowColor: colors.liveDot,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E9A6F5',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyContainer: {
    marginTop: 30,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
});
