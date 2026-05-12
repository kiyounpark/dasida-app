import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Paper } from './paper-tokens';

const AVATAR_SIZE = 28;

export function AiTypingBubble() {
  return (
    <View style={styles.row}>
      <Image
        source={require('@/assets/review/ai-coach-avatar.png')}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.bubble}>
        <View style={styles.dots}>
          <View style={[styles.dot, { opacity: 0.3 }]} />
          <View style={[styles.dot, { opacity: 0.6 }]} />
          <View style={[styles.dot, { opacity: 1 }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, flexShrink: 0,
  },
  bubble: {
    backgroundColor: Paper.paper,
    borderWidth: 1, borderColor: Paper.edge,
    borderRadius: 16, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Paper.forest500 },
});
