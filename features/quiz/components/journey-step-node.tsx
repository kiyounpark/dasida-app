import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { HomeJourneyStep } from '@/features/learning/home-journey-state';

type JourneyStepNodeProps = {
  imageSource: number;
  onPress?: () => void;
  step: HomeJourneyStep;
  style?: StyleProp<ViewStyle>;
};

function getImageOpacity(status: HomeJourneyStep['status']) {
  switch (status) {
    case 'completed':
      return 0.94;
    case 'pending':
      return 0.86;
    case 'locked':
      return 0.72;
    default:
      return 1;
  }
}

function getHaloStyle(status: HomeJourneyStep['status']) {
  if (status === 'active') {
    return {
      backgroundColor: 'rgba(83, 160, 95, 0.22)',
      borderColor: 'rgba(45, 123, 72, 0.88)',
      borderWidth: 3,
      opacity: 1,
    };
  }

  if (status === 'completed') {
    return {
      backgroundColor: 'rgba(83, 160, 95, 0.10)',
      borderColor: 'rgba(91, 129, 101, 0.44)',
      borderWidth: 2,
      opacity: 0.88,
    };
  }

  if (status === 'pending') {
    return {
      backgroundColor: 'rgba(143, 128, 99, 0.08)',
      borderColor: 'rgba(122, 106, 85, 0.34)',
      borderWidth: 2,
      opacity: 0.86,
    };
  }

  return {
    backgroundColor: 'transparent',
    borderColor: 'rgba(126, 118, 104, 0.18)',
    borderWidth: 1.5,
    opacity: 0.52,
  };
}

export function JourneyStepNode({
  imageSource,
  onPress,
  step,
  style,
}: JourneyStepNodeProps) {
  const pulseScale = useSharedValue(1);
  const isActive = step.status === 'active';
  const haloTone = getHaloStyle(step.status);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
        true,
      );
      return;
    }

    pulseScale.value = withTiming(1, { duration: 180 });
  }, [isActive, pulseScale]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: pulseScale.value * 1.18 }, { scaleY: pulseScale.value * 1.1 }],
  }));

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.nodeWrap, style, pressed && onPress ? styles.nodePressed : null]}>
      <View style={styles.imageWrap}>
        <Animated.View style={[styles.halo, haloTone, haloStyle]} />
        <Image
          source={imageSource}
          contentFit="contain"
          style={[styles.image, { opacity: getImageOpacity(step.status) }]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nodeWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePressed: {
    opacity: 0.88,
  },
  imageWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
