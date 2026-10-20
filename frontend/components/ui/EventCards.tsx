import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { AvatarStack } from './kit';
import { colors, radius, themeColor, themeIcon, themeTint } from '../../constants/theme';
import type { Event } from '../../stores/eventStore';

const hour = (d: Date) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

// Où en est la School : en cours, bientôt, plus tard.
export function eventTiming(event: Pick<Event, 'start_time' | 'created_at' | 'duration_hours'>, now = new Date()) {
  const start = new Date(event.start_time || event.created_at);
  const valid = !isNaN(start.getTime());
  const end = valid ? new Date(start.getTime() + (event.duration_hours || 2) * 3600 * 1000) : null;
  if (!valid || !end) return { live: false, upcoming: false, label: '', short: '' };
  if (start <= now) {
    return { live: true, upcoming: false, label: `En cours · jusqu'à ${hour(end)}`, short: 'En cours' };
  }
  const minutes = Math.round((start.getTime() - now.getTime()) / 60000);
  const sameDay = start.toDateString() === now.toDateString();
  const label = minutes < 60 ? `Dans ${minutes} min` : sameDay ? `Aujourd'hui à ${hour(start)}` : `${start.toLocaleDateString('fr-FR', { weekday: 'long' })} à ${hour(start)}`;
  return { live: false, upcoming: true, label, short: sameDay ? hour(start) : start.toLocaleDateString('fr-FR', { weekday: 'short' }) };
}

export const formatDistance = (km?: number) => {
  if (km === undefined || km === null) return null;
  return km < 1 ? `à ${Math.round(km * 1000)} m` : `à ${String(Math.round(km * 10) / 10).replace('.', ',')} km`;
};

// Grande carte d'une School, pour la liste Explorer.
export function EventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const timing = eventTiming(event);
  const tint = themeColor(event.theme);
  const distance = formatDistance(event.distance_km);
  const places = Math.max(event.max_participants - event.current_participants, 0);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.name}, ${event.location_name}`}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.985 }] }]}
    >
      <View style={[styles.cover, { backgroundColor: themeTint(event.theme) }]}>
        {event.photo ? (
          <Image source={{ uri: event.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Ionicons name={themeIcon(event.theme) as any} size={72} color={tint} style={{ opacity: 0.35 }} />
        )}
        <View style={styles.coverTop}>
          {!!timing.label && (
            <View style={styles.statusPill}>
              {timing.live && <View style={styles.liveDot} />}
              <Text style={styles.statusText}>{timing.label}</Text>
            </View>
          )}
          {!!event.theme && (
            <View style={[styles.themePill, { backgroundColor: tint }]}>
              <Text style={styles.themePillText}>{event.theme}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{event.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color={colors.muted} />
          <Text style={styles.meta} numberOfLines={1}>
            {event.location_name}{distance ? ` · ${distance}` : ''}
          </Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.people}>
            <AvatarStack people={event.participants || []} total={event.current_participants} />
            <Text style={styles.count}>
              <Text style={styles.countStrong}>{event.current_participants}</Text>/{event.max_participants}
            </Text>
          </View>
          <View style={[styles.cta, event.is_full && styles.ctaFull]}>
            <Text style={[styles.ctaText, event.is_full && { color: colors.muted }]}>
              {event.is_full ? 'Complet' : places <= 2 ? `Plus que ${places}` : 'Voir'}
            </Text>
            {!event.is_full && <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// Ligne compacte d'une School (sections secondaires, historique).
export function EventRow({ event, onPress, right }: { event: Event; onPress: () => void; right?: React.ReactNode }) {
  const timing = eventTiming(event);
  const tint = themeColor(event.theme);
  const distance = formatDistance(event.distance_km);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={event.name}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.thumb, { backgroundColor: themeTint(event.theme) }]}>
        {event.photo ? (
          <Image source={{ uri: event.photo }} style={StyleSheet.absoluteFill} />
        ) : (
          <Ionicons name={themeIcon(event.theme) as any} size={26} color={tint} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{event.name}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {[timing.label, distance].filter(Boolean).join(' · ') || event.location_name}
        </Text>
      </View>
      {right ?? (
        <Text style={styles.rowCount}>
          {event.current_participants}/{event.max_participants}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cover: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(12,10,18,0.8)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.liveDot,
  },
  statusText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  themePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  themePillText: {
    color: '#120A16',
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    padding: 16,
    paddingBottom: 18,
    gap: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 25,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  meta: {
    flex: 1,
    color: colors.muted,
    fontSize: 14,
  },
  footer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  people: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  count: {
    color: colors.muted,
    fontSize: 14,
  },
  countStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  ctaFull: {
    backgroundColor: colors.surface3,
  },
  ctaText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  rowMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  rowCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E9A6F5',
    paddingRight: 6,
  },
});
