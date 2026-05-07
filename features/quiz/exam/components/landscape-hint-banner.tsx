import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onDismiss: () => void;
};

export function LandscapeHintBanner({ onDismiss }: Props) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.message}>
        💡 iPad를 옆으로 돌리면 필기 공간이 더 넓어져요
      </Text>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="안내 닫기"
        hitSlop={12}
        style={styles.close}
      >
        <Text style={styles.closeIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF7E6',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5A8',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#7A4F00',
  },
  close: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeIcon: {
    fontSize: 16,
    color: '#7A4F00',
    fontWeight: '600',
  },
});
