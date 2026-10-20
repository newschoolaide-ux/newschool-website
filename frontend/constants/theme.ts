// Design New School — palette, typographie et formes communes à toute l'app.

export const colors = {
  bg: '#0C0A12',
  surface: '#16131F',
  surface2: '#221E2D',
  surface3: '#2A2535',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.14)',
  text: '#F5F3FA',
  textSecondary: '#D6D2E0',
  muted: '#A39DB3',
  faint: '#8E889E',
  accent: '#D946EF',
  onAccent: '#1A0820',
  accentSoft: 'rgba(217,70,239,0.14)',
  violet: '#7C3AED',
  live: '#4ADE80',
  liveDot: '#22C55E',
  danger: '#F87171',
  info: '#60A5FA',
  warning: '#F59E0B',
  mapBg: '#0F1119',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

// Couleur de chaque thème de School (carte, badges, vignettes).
export const THEME_COLORS: Record<string, string> = {
  'Gastronomie': '#F59E0B',
  'Sport': '#F87171',
  'Musique': '#60A5FA',
  'Art & Culture': '#C084FC',
  'Plein air': '#4ADE80',
  'Vie nocturne': '#D946EF',
  'Business': '#94A3B8',
  'Échange linguistique': '#22D3EE',
  'Voyage': '#2DD4BF',
  'Jeux': '#FB923C',
  'Autre': '#A39DB3',
};

// Icône Ionicons de chaque thème.
export const THEME_ICONS: Record<string, string> = {
  'Gastronomie': 'wine',
  'Sport': 'football',
  'Musique': 'musical-notes',
  'Art & Culture': 'color-palette',
  'Plein air': 'leaf',
  'Vie nocturne': 'moon',
  'Business': 'briefcase',
  'Échange linguistique': 'chatbubbles',
  'Voyage': 'airplane',
  'Jeux': 'game-controller',
  'Autre': 'sparkles',
};

export const themeColor = (theme?: string | null) => (theme && THEME_COLORS[theme]) || colors.accent;
export const themeIcon = (theme?: string | null) => (theme && THEME_ICONS[theme]) || 'sparkles';

// Couleur de fond sombre d'une vignette, dérivée de la couleur du thème.
export const themeTint = (theme?: string | null) => {
  const hex = themeColor(theme).replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * 0.28 + 12 * 0.72);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

// Couleurs des avatars sans photo, choisies à partir du prénom.
const AVATAR_COLORS = ['#7C3AED', '#0EA5E9', '#F97316', '#10B981', '#E11D48', '#6366F1'];
export const avatarColor = (seed?: string | null) => {
  const s = seed || '?';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

export const fonts = {
  display: {
    600: 'BricolageGrotesque_600SemiBold',
    700: 'BricolageGrotesque_700Bold',
    800: 'BricolageGrotesque_800ExtraBold',
  },
  body: {
    400: 'PlusJakartaSans_400Regular',
    500: 'PlusJakartaSans_500Medium',
    600: 'PlusJakartaSans_600SemiBold',
    700: 'PlusJakartaSans_700Bold',
    800: 'PlusJakartaSans_800ExtraBold',
  },
};

const weightNumber = (w: unknown): number => {
  if (w === 'bold') return 700;
  if (w === 'normal' || w === undefined || w === null) return 400;
  const n = parseInt(String(w), 10);
  return isNaN(n) ? 400 : n;
};

// Choisit la bonne police selon la taille et la graisse demandées :
// les gros titres en Bricolage Grotesque, le reste en Plus Jakarta Sans.
export const fontFor = (style: { fontWeight?: unknown; fontSize?: number; fontFamily?: string } | undefined) => {
  if (style?.fontFamily) return null;
  const w = weightNumber(style?.fontWeight);
  const size = style?.fontSize ?? 14;
  if (size >= 19 && w >= 600) {
    const dw = w >= 800 ? 800 : w >= 700 ? 700 : 600;
    return { fontFamily: fonts.display[dw as 600 | 700 | 800], fontWeight: 'normal' as const };
  }
  const bw = w >= 800 ? 800 : w >= 700 ? 700 : w >= 600 ? 600 : w >= 500 ? 500 : 400;
  return { fontFamily: fonts.body[bw as 400 | 500 | 600 | 700 | 800], fontWeight: 'normal' as const };
};

// Barre d'onglets flottante : hauteur, et place à laisser en bas des écrans pour ne rien cacher derrière.
export const TAB_BAR_HEIGHT = 68;
export const tabBarSpace = (bottomInset: number) => TAB_BAR_HEIGHT + Math.max(bottomInset, 14) + 24;
