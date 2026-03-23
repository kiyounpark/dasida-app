import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandColors } from '@/constants/brand';

export type QuizSolveLayoutProps = {
  body: ReactNode;
  bodyContentContainerStyle?: StyleProp<ViewStyle>;
  footer: ReactNode;
  header: ReactNode;
  screenBackgroundColor?: string;
};

export function getQuizBottomPanelMaxHeight(height: number, isCompactLayout: boolean) {
  const ratio = isCompactLayout ? 0.44 : 0.38;

  return Math.min(360, Math.max(220, height * ratio));
}

export function QuizSolveLayout({
  body,
  bodyContentContainerStyle,
  footer,
  header,
  screenBackgroundColor = BrandColors.background,
}: QuizSolveLayoutProps) {
  return (
    <View style={[styles.screen, { backgroundColor: screenBackgroundColor }]}>
      {header}

      <ScrollView
        style={styles.bodyScroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.bodyContent, bodyContentContainerStyle]}>
        {body}
      </ScrollView>

      <View style={styles.footerWrap}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
  footerWrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(41, 59, 39, 0.08)',
    boxShadow: '0 -10px 24px rgba(36, 52, 38, 0.08)',
  },
});
