export const palette = {
  canvas: '#F7F8F3',
  parchment: '#F7F8F3',
  parchmentSoft: '#FCFCF8',
  dune: '#EEF3E8',
  soil: '#E7DDC8',
  leaf: '#2F7D4E',
  leafDark: '#1E5E3B',
  leafMist: '#E3F0E3',
  mustard: '#D9B15D',
  mustardSoft: '#FBF3E0',
  sunrise: '#EAD8B7',
  terracotta: '#D57B63',
  terracottaSoft: '#FAE9E3',
  sky: '#80ACC7',
  skySoft: '#ECF4FA',
  storm: '#63718A',
  midnight: '#243540',
  lilac: '#AEA2D6',
  lilacSoft: '#F2EEF8',
  mint: '#EEF5E9',
  mintStrong: '#D5E6CC',
  ink: '#1E2A22',
  inkSoft: '#5E685F',
  inkMuted: '#89938A',
  white: '#FFFFFF',
  outline: 'rgba(30, 42, 34, 0.10)',
  outlineStrong: 'rgba(30, 42, 34, 0.18)',
  glass: 'rgba(255,255,255,0.72)',
};

export const semanticColors = {
  success: palette.leaf,
  successSoft: palette.leafMist,
  warning: palette.mustard,
  warningSoft: palette.mustardSoft,
  danger: palette.terracotta,
  dangerSoft: palette.terracottaSoft,
  info: palette.sky,
  infoSoft: palette.skySoft,
  scheme: palette.lilac,
  schemeSoft: palette.lilacSoft,
};

export const gradients = {
  sunriseField: ['#F9FAF6', '#EEF5E9'] as const,
  weatherClear: ['#465371', '#657594', '#9FB3CE'] as const,
  weatherRain: ['#4A556F', '#657493', '#9AAFD0'] as const,
  weatherStorm: ['#384559', '#52647E', '#7589A8'] as const,
  weatherHeat: ['#FBF7EF', '#F2E8D4', '#E9DBBF'] as const,
  marketGold: ['#FFFFFF', '#F8FAF3', '#EEF4E7'] as const,
  schemeBloom: ['#FFFFFF', '#F5F2FB', '#ECE7F7'] as const,
  cropHealth: ['#FFFFFF', '#FBEEEB', '#F5DCD3'] as const,
  assistantGlow: ['#FFFFFF', '#F3F7EE', '#E4EDD8'] as const,
  neutralGlass: ['rgba(255,255,255,0.94)', 'rgba(255,255,255,0.94)'] as const,
};

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  pill: 999,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const shadow = {
  soft: '0 8px 18px rgba(31, 46, 36, 0.06)',
  medium: '0 14px 28px rgba(31, 46, 36, 0.08)',
  glow: '0 14px 28px rgba(47, 125, 78, 0.12)',
  weather: '0 16px 34px rgba(70, 83, 113, 0.18)',
};

export const typography = {
  display: 'NotoSans_700Bold',
  displayBold: 'NotoSans_700Bold',
  body: 'NotoSans_500Medium',
  bodyStrong: 'NotoSans_700Bold',
  bodyRegular: 'NotoSans_400Regular',
  devanagari: 'NotoSansDevanagari_500Medium',
  devanagariRegular: 'NotoSansDevanagari_400Regular',
};

export const surfaces = {
  neutral: {
    backgroundColor: palette.white,
    borderColor: palette.outline,
  },
  soft: {
    backgroundColor: palette.parchmentSoft,
    borderColor: palette.outline,
  },
  glass: {
    backgroundColor: palette.glass,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  feature: {
    backgroundColor: palette.mint,
    borderColor: palette.outline,
  },
  alert: {
    backgroundColor: palette.terracottaSoft,
    borderColor: palette.outline,
  },
  hero: {
    backgroundColor: palette.parchmentSoft,
    borderColor: palette.outline,
  },
};
