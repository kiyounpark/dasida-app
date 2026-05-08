import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Stroke } from '@/features/quiz/exam/storage/scratchpad-strokes-store';

import { ScratchpadCanvas } from './scratchpad-canvas';

const SHEET_HEIGHT_RATIO = 0.6;
const PADDING = 40;
// Fallback canvas size when strokes have no measurable extent (defensive only).
const FALLBACK_CANVAS = { width: 800, height: 600 };

type Props = {
  visible: boolean;
  strokes: Stroke[];
  loaded: boolean;
  onClose: () => void;
};

// Assumes strokes use (0,0)-origin coordinates, as written by ScratchpadCanvas in exam-solve.
// If negative coordinates are ever introduced, add minX/minY tracking + translate offset.
function computeBounds(strokes: Stroke[]): { width: number; height: number } {
  let maxX = 0;
  let maxY = 0;
  for (const s of strokes) {
    for (const p of s.points) {
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (maxX <= 0 || maxY <= 0) return FALLBACK_CANVAS;
  return { width: Math.ceil(maxX + PADDING), height: Math.ceil(maxY + PADDING) };
}

export function OriginalStrokesSheet({ visible, strokes, loaded, onClose }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const sheetHeight = Math.round(screenHeight * SHEET_HEIGHT_RATIO);
  const bounds = computeBounds(strokes);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        accessibilityLabel="원본 풀이 닫기"
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          { height: sheetHeight, paddingBottom: insets.bottom },
        ]}
        accessibilityViewIsModal>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>당시 풀이</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            hitSlop={12}>
            <Text style={styles.close}>닫기</Text>
          </Pressable>
        </View>

        {loaded && strokes.length > 0 ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { minWidth: screenWidth },
            ]}
            maximumZoomScale={3}
            minimumZoomScale={1}
            bouncesZoom>
            <ScratchpadCanvas
              width={bounds.width}
              height={bounds.height}
              scratchpad={{ strokes }}
              readOnly
            />
          </ScrollView>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {loaded ? '이 문제에서 손으로 적은 풀이가 없어요.' : '불러오는 중…'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFCF4',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: '#D6CFB8',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE9D5',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#1A1916' },
  close: { fontSize: 14, color: '#5C8C5A', fontWeight: '500' },
  scroll: { flex: 1, backgroundColor: '#FAF6EC' },
  scrollContent: { padding: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#7A7666', fontSize: 14 },
});
