import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { FontFamilies } from '@/constants/typography';

const BUTTON_ASPECT_RATIO = 1497 / 373;
const journeyCtaButtonImage = require('./dasida_button_dev_transparent.png');

export function JourneyCtaButton({
  accessibilityLabel,
  compact = false,
  disabled = false,
  label,
  onPress,
  style,
}: {
  accessibilityLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        style,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}>
      <View pointerEvents="none" style={styles.background}>
        <Image
          contentFit="contain"
          source={journeyCtaButtonImage}
          style={styles.backgroundImage}
          transition={0}
        />
      </View>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        numberOfLines={1}
        selectable
        style={[styles.label, compact && styles.labelCompact]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    aspectRatio: BUTTON_ASPECT_RATIO,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  buttonCompact: {
    paddingHorizontal: 26,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.56,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  label: {
    width: '78%',
    fontFamily: FontFamilies.bold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  labelCompact: {
    width: '82%',
    fontSize: 18,
    lineHeight: 23,
  },
});
