export const colors = {
  primary: '#1A76E3',
  primaryDark: '#1356A5',
  primaryLight: '#4892EA',
  primaryTint: '#F6FAFE',
  accent: '#FF6B35',
  bg: '#FFFFFF',
  bgPage: '#f8fafc',
  bgHeader: '#F9FBFE',
  bgSubtle: '#F6FAFE',
  bgChip: '#F7F7F7',
  surface: '#FFFFFF',
  border: '#E7E7E7',
  borderLight: '#F1F1F4',
  borderStrong: '#D0D0D0',
  text: '#2A2A2A',
  textBody: '#414141',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  overlay: 'rgba(15,23,42,0.55)',
  // meal-type badges (match web)
  mealBreakfast: '#F59E0B',
  mealLunch: '#22C55E',
  mealDinner: '#1A76E3',
  mealSnack: '#A855F7',
  macroBg: '#FEF5EF',
  macroBorder: '#FDE8DC',
};

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 15,
  xl: 20,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  h4: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.textBody },
  bodyStrong: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  muted: { fontSize: 13, fontWeight: '400' as const, color: colors.textMuted },
  small: { fontSize: 12, fontWeight: '400' as const, color: colors.textMuted },
  tiny: { fontSize: 11, fontWeight: '400' as const, color: colors.textMuted },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButton: {
    shadowColor: '#4892EA',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
};
