import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies } from '@/constants/typography';

import { PhotoTheme } from '../theme';

/**
 * 사진 화면·지난 오답노트 맨 위 줄. iOS 기본 헤더 대신 직접 그린다 (1.0.12 ⓪, 10.05).
 *
 * iOS 26 + react-native-screens 4.16에서 기본 뒤로 버튼이 시트·사진첩을 띄웠다 닫은 뒤 죽었다 —
 * 탭하면 라이브러리가 버튼을 끄고(RNSScreenStack.mm shouldPopItem) 팝이 안 일어나 다시 안 켜진다.
 * 같은 상태에서도 JS로 부르는 router.back()은 살았다(10.05 시뮬레이터·lldb). 그래서 버튼을 JS로 둔다.
 * 복습 화면 맨 위 줄(review-session-screen-view.tsx appBar)과 같은 방식이다. 가장자리 스와이프는 그대로 된다.
 */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/quiz');
}

export function PhotoBackBar({
  label,
  title,
  onBack = goBackOrHome,
}: {
  /** 뒤로 버튼 옆 글자 — 옛 iOS 헤더의 headerBackTitle 자리(「홈」·「뒤로」) */
  label: string;
  title: string;
  onBack?: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.bar}>
      <View style={styles.inner}>
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
          <IconSymbol color={PhotoTheme.ink} name="chevron.left" size={22} />
          <Text style={styles.backLabel}>{label}</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.spacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PhotoTheme.line,
  },
  inner: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  back: {
    width: 80,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  backPressed: {
    backgroundColor: PhotoTheme.cream2,
  },
  backLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 16,
    color: PhotoTheme.ink,
  },
  title: {
    flex: 1,
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: PhotoTheme.ink,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  spacer: { width: 80 },
});
