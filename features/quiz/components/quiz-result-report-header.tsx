import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies } from '@/constants/typography';

type QuizResultReportHeaderProps = {
  isCompactLayout: boolean;
  onClose: () => void;
};

export function QuizResultReportHeader({
  isCompactLayout,
  onClose,
}: QuizResultReportHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityHint="퀴즈 홈으로 이동합니다"
          accessibilityLabel="퀴즈 홈으로"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.backButton,
            isCompactLayout && styles.backButtonCompact,
            pressed && styles.backButtonPressed,
          ]}>
          <IconSymbol color="#1E1A17" name="chevron.left" size={isCompactLayout ? 18 : 20} />
        </Pressable>
      </View>

      <View style={[styles.ribbonWrap, isCompactLayout && styles.ribbonWrapCompact]}>
        <View style={[styles.ribbonTail, styles.ribbonTailLeft]} />
        <View style={[styles.ribbonTail, styles.ribbonTailRight]} />

        <View style={[styles.ribbon, isCompactLayout && styles.ribbonCompact]}>
          <View style={[styles.ribbonHighlight, isCompactLayout && styles.ribbonHighlightCompact]} />
          <Text selectable style={[styles.title, isCompactLayout && styles.titleCompact]}>
            나의 약점 분석 리포트
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8F3E8',
  },
  topRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(33, 28, 24, 0.12)',
    boxShadow: '0 8px 20px rgba(38, 34, 28, 0.08)',
  },
  backButtonCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  backButtonPressed: {
    opacity: 0.84,
  },
  ribbonWrap: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonWrapCompact: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  ribbon: {
    minHeight: 84,
    width: '100%',
    maxWidth: 620,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: '#2B2520',
    backgroundColor: '#FFFDF8',
    boxShadow: '0 10px 24px rgba(36, 31, 25, 0.10)',
  },
  ribbonCompact: {
    minHeight: 72,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ribbonTail: {
    position: 'absolute',
    top: 40,
    width: 52,
    height: 22,
    backgroundColor: '#FFFDF8',
    borderWidth: 2,
    borderColor: '#2B2520',
  },
  ribbonTailLeft: {
    left: 8,
    transform: [{ rotate: '-26deg' }],
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 8,
  },
  ribbonTailRight: {
    right: 8,
    transform: [{ rotate: '26deg' }],
    borderTopLeftRadius: 6,
    borderBottomRightRadius: 8,
  },
  ribbonHighlight: {
    position: 'absolute',
    bottom: 20,
    width: 210,
    height: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(183, 218, 150, 0.50)',
  },
  ribbonHighlightCompact: {
    width: 160,
    height: 14,
    bottom: 18,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1.1,
    color: '#1E1A17',
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.8,
  },
});
