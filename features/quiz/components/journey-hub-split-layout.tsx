import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';

// poster-title-banner.tsx heroFrameWrapRaisedTablet translateY(-40) 보정
const TABLET_BANNER_RAISE = 40;

export function JourneyHubSplitLayout({
  authNotice,
  leftBoard,
  posterBanner,
  rightPanel,
}: {
  authNotice: ReactNode | null;
  /** (containerWidth: number) => ReactNode — 좌측 컬럼 폭이 측정된 후 보드를 렌더 */
  leftBoard: (containerWidth: number) => ReactNode;
  posterBanner: ReactNode;
  rightPanel: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [leftColumnWidth, setLeftColumnWidth] = useState(0);

  const handleLeftColumnLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width <= 0) return;
    setLeftColumnWidth((prev) => (prev === width ? prev : width));
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.row}>
        <View
          style={styles.leftColumn}
          onLayout={handleLeftColumnLayout}
          testID="journey-split-left-column"
        >
          <View style={styles.posterWrap}>{posterBanner}</View>
          {authNotice ? (
            <View style={styles.authNoticeWrap} testID="journey-split-auth-notice">
              {authNotice}
            </View>
          ) : null}
          <View style={styles.boardWrap}>
            {leftColumnWidth > 0 ? leftBoard(leftColumnWidth) : null}
          </View>
        </View>
        <View style={styles.rightColumn}>{rightPanel}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
    paddingHorizontal: 24,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 24,
  },
  leftColumn: {
    flex: 1.3,
    alignItems: 'center',
  },
  posterWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: TABLET_BANNER_RAISE,
  },
  authNoticeWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  boardWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  rightColumn: {
    flex: 1,
    paddingTop: 6,
  },
});
