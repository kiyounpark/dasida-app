import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, BrandRadius } from '@/constants/brand';

type Props = {
  onDismiss: () => void;
};

export function LandscapeHintBanner({ onDismiss }: Props) {
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.container} accessibilityRole="alert">
        <Ionicons name="phone-landscape-outline" size={18} color={BrandColors.border} />
        <Text style={styles.message}>옆으로 돌리면 필기 공간이 넓어져요</Text>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="안내 닫기"
          hitSlop={16}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
        >
          <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 18,
    paddingRight: 12,
    paddingVertical: 14,
    backgroundColor: BrandColors.primaryDark,
    borderRadius: BrandRadius.lg,
    shadowColor: BrandColors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    maxWidth: 400,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#F0EDE6',
    letterSpacing: -0.2,
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
