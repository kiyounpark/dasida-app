import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Paper } from './paper-tokens';

interface ProgressDotsProps {
  totalSteps: number;
  currentStepIndex: number;
  containerStyle?: StyleProp<ViewStyle>;
}

export function ProgressDots({
  totalSteps,
  currentStepIndex,
  containerStyle,
}: ProgressDotsProps) {
  return (
    <View style={[styles.bar, containerStyle]}>
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isCurrent = i === currentStepIndex;
        const isDone = i < currentStepIndex;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isDone && styles.dotDone,
              isCurrent && styles.dotCurrent,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Paper.creamDeep,
    borderWidth: 1,
    borderColor: Paper.edge,
  },
  dotDone: {
    backgroundColor: Paper.forest500,
    borderColor: Paper.forest500,
  },
  dotCurrent: {
    width: 28,
    backgroundColor: Paper.forest800,
    borderColor: Paper.forest800,
  },
});
