import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type SplitDividerProps = {
  onDragStart: () => void;
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
};

export function SplitDivider({ onDragStart, onDrag, onDragEnd }: SplitDividerProps) {
  const active = useSharedValue(0);

  const pan = Gesture.Pan()
    .hitSlop({ left: 8, right: 8 })
    .onBegin(() => {
      active.value = withTiming(1, { duration: 120 });
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      runOnJS(onDrag)(e.translationX);
    })
    .onFinalize(() => {
      active.value = withTiming(0, { duration: 120 });
      runOnJS(onDragEnd)();
    });

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: active.value === 0 ? '#ECE4CD' : '#C9DEC5',
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.bar, bgStyle]} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: 8,
    height: '100%',
  },
});
