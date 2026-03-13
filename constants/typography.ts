export const FontFamilies = {
  regular: 'SUIT-Regular',
  medium: 'SUIT-Medium',
  semibold: 'SUIT-SemiBold',
  bold: 'SUIT-Bold',
  extrabold: 'SUIT-ExtraBold',
} as const;

export const BrandTypography = {
  display: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  heroTitle: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  screenTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 22,
    lineHeight: 30,
  },
  cardTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: FontFamilies.medium,
    fontSize: 15,
    lineHeight: 24,
  },
  meta: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  chip: {
    fontFamily: FontFamilies.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  tiny: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    lineHeight: 15,
  },
} as const;
