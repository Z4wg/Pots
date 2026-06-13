// Pots design system. Dark, expensive, one lime accent.
// All spacing on an 8pt grid. Money rendered with big bold numerals.

export const colors = {
  // Backgrounds
  bg: '#0B0B0F',
  surface: '#15151C',
  surfaceHi: '#1D1D27',
  surfaceLo: '#101017',
  border: '#26262F',

  // Text
  text: '#F4F4F6',
  textDim: '#9A9AA8',
  textMute: '#5E5E6B',

  // Accents
  lime: '#C8FF00',
  limeDim: '#9FCB00',
  limeGlow: 'rgba(200,255,0,0.16)',
  red: '#FF4D4D',
  redDim: '#C93B3B',
  redGlow: 'rgba(255,77,77,0.16)',

  // Misc
  gold: '#FFD24A',
  violet: '#9E7BFF',
  black: '#000000',
  white: '#FFFFFF',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  // System for portability in Expo Go. Weights carry the "expensive" feel.
  black: '900' as const,
  bold: '800' as const,
  semi: '700' as const,
  medium: '600' as const,
  regular: '500' as const,
};

export const type = {
  hero: { fontSize: 56, fontWeight: font.black, letterSpacing: -2 },
  title: { fontSize: 30, fontWeight: font.black, letterSpacing: -1 },
  h2: { fontSize: 22, fontWeight: font.bold, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: font.bold },
  body: { fontSize: 15, fontWeight: font.regular },
  label: { fontSize: 13, fontWeight: font.semi, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: font.medium },
  micro: { fontSize: 11, fontWeight: font.semi, letterSpacing: 0.4 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  lime: {
    shadowColor: colors.lime,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
};
