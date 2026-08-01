import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';

type PhotoUploadViewProps = {
  error: string | null;
  onPick: () => void;
};

export function PhotoUploadView({ error, onPick }: PhotoUploadViewProps) {
  return (
    <View style={styles.wrap}>
      <Text selectable style={styles.title}>
        틀린 문제, 풀이까지 나오게 한 장 찍어줘
      </Text>
      <Text selectable style={styles.sub}>
        손글씨 읽고 어떤 방법으로 풀었는지까지 알아내서, 어디서 갈라졌는지 짚어줄게.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onPick}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonLabel}>사진 고르기</Text>
      </Pressable>

      {error && (
        <View style={styles.errorCard}>
          <Text selectable style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: BrandSpacing.sm,
    padding: BrandSpacing.lg,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: DiagnosisTheme.ink,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: DiagnosisTheme.inkMuted,
    marginBottom: BrandSpacing.xs,
  },
  button: {
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingVertical: 17,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8F3E8',
  },
  errorCard: {
    backgroundColor: DiagnosisTheme.warningBg,
    borderWidth: 1,
    borderColor: DiagnosisTheme.warningBorder,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    padding: BrandSpacing.md,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#775520',
  },
});
