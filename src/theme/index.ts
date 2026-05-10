import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    background: '#F4F2EE',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    border: '#E8E6E0',
    borderStrong: '#D0CEC7',
    text: '#1A1917',
    textSecondary: '#6B6860',
    textTertiary: '#9B9890',
    accent: '#5B4FD4',
    accentLight: '#ECEAFE',
    accentText: '#3D34B0',
    success: '#2D7D46',
    successLight: '#E8F5ED',
    danger: '#C0392B',
    dangerLight: '#FDECEA',
    cardShadow: 'rgba(0,0,0,0.06)',
  },
  dark: {
    background: '#0D0D0C',
    surface: '#1A1A18',
    surfaceRaised: '#232320',
    border: '#333330',
    borderStrong: '#444440',
    text: '#F0EEE8',
    textSecondary: '#9B9890',
    textTertiary: '#6B6860',
    accent: '#7B6FE8',
    accentLight: '#1E1B3A',
    accentText: '#A99FF0',
    success: '#3DAB5E',
    successLight: '#0F2318',
    danger: '#E05445',
    dangerLight: '#2A0F0D',
    cardShadow: 'rgba(0,0,0,0.3)',
  },
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
  mono: { fontSize: 14, fontWeight: '400' as const },
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 999,
};

export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
