export const BrandColors = {
  primary: '#293B27',
  primarySoft: '#4A7C59',
  primaryDark: '#1E2F20',
  background: '#F6F2EA',
  card: '#FFFFFF',
  text: '#293B27',
  mutedText: '#5B6A5D',
  border: '#D6E2D4',
  success: '#2F9E44',
  danger: '#D64545',
  warning: '#D98E04',
  disabled: '#BFCABC',

  // Exam analysis green theme (diagnosis flow)
  examSoftGreen: '#C8EAC8',
  examSoftGreenBorder: '#6BAA7244',
  examPaleGreen: '#EDF7ED',
  examForest: '#2A5C38',
  examForestBorder: '#2A5C3833',
  examForestSubtleBorder: '#2E7A2E1F',
  examWarmCream: '#FFF8EF',
  examWarmBorder: '#A89F8C66',
  examDeepGreen: '#1C2C19',
  examWarmDark: '#4A4540',
  examLightText: '#F8F3E8',
} as const;

export const BrandRadius = {
  sm: 10,
  md: 14,
  lg: 20,
} as const;

export const BrandSpacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const BrandLayout = {
  tablet: {
    reading: { contentMaxWidth: 720 },
    hub: { contentMaxWidth: 1040 },
    split: {},
  },
} as const;

export type PageContainerVariant = keyof typeof BrandLayout.tablet;
