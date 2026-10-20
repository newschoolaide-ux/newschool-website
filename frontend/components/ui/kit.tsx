import React from 'react';
import { View, Image, Pressable, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, avatarColor } from '../../constants/theme';

// Photo de profil, ou initiale sur fond coloré.
export function Avatar({
  name,
  photo,
  size = 32,
  ring,
  style,
}: {
  name?: string | null;
  photo?: string | null;
  size?: number;
  ring?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const base = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ring ? 2 : 0,
    borderColor: ring,
  };
  if (photo) {
    return <Image source={{ uri: photo }} style={[base, style as any]} />;
  }
  return (
    <View style={[base, { backgroundColor: avatarColor(name), alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: '#FFFFFF', fontSize: Math.round(size * 0.42), fontWeight: '700' }}>
        {(name || '?').trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// Visages des participants qui se chevauchent, avec « +N » pour le reste.
export function AvatarStack({
  people,
  total,
  size = 28,
  max = 3,
  borderColor = colors.surface,
}: {
  people: Array<{ first_name?: string; photo?: string | null }>;
  total?: number;
  size?: number;
  max?: number;
  borderColor?: string;
}) {
  const shown = people.slice(0, max);
  const rest = Math.max((total ?? people.length) - shown.length, 0);
  if (shown.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((p, i) => (
        <Avatar
          key={i}
          name={p.first_name}
          photo={p.photo}
          size={size}
          ring={borderColor}
          style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}
        />
      ))}
      {rest > 0 && (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: -size * 0.3,
            backgroundColor: colors.surface3,
            borderWidth: 2,
            borderColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>+{rest}</Text>
        </View>
      )}
    </View>
  );
}

// Bouton principal (rose), secondaire (clair) ou discret (contour).
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  compact,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'light' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    light: { bg: colors.text, fg: colors.bg, border: colors.text },
    ghost: { bg: 'transparent', fg: colors.text, border: 'rgba(255,255,255,0.22)' },
    danger: { bg: 'rgba(248,113,113,0.12)', fg: colors.danger, border: 'rgba(248,113,113,0.35)' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={compact ? 17 : 19} color={palette.fg} />}
          <Text style={[styles.buttonText, compact && { fontSize: 15 }, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

// Pastille de filtre.
export function Chip({
  label,
  active,
  onPress,
  icon,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon && <Ionicons name={icon} size={15} color={active ? colors.bg : color || colors.muted} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

// Bouton rond avec une icône (retour, réglages, partager…).
export function IconButton({
  icon,
  onPress,
  label,
  size = 44,
  style,
  color = colors.text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.45)} color={color} />
    </Pressable>
  );
}

// En-tête des écrans secondaires : bouton retour + titre.
export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? <IconButton icon="chevron-back" label="Retour" onPress={onBack} /> : <View style={{ width: 44 }} />}
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonCompact: {
    height: 44,
    paddingHorizontal: 18,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  chip: {
    height: 40,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.bg,
    fontWeight: '700',
  },
  iconButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
});
