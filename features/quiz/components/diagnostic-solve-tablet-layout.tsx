import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useCurrentLearner } from '@/features/learner/provider';
import { ScratchpadCanvas } from '@/features/quiz/exam/components/scratchpad-canvas';
import { ScratchpadToolbar } from '@/features/quiz/exam/components/scratchpad-toolbar';
import { SplitDivider } from '@/features/quiz/exam/components/split-divider';
import {
  loadSplitRatio,
  saveSplitRatio,
} from '@/features/quiz/exam/storage/scratchpad-split-ratio-store';
import type { IndexedScratchpadApi } from '@/features/quiz/hooks/use-diagnostic-scratchpad-store';

type Props = {
  header: ReactNode;
  problemPanel: ReactNode;
  scratchpad: IndexedScratchpadApi;
};

// ExamSolveTabletLayout과 동일 baseline (11" iPad landscape 1194pt → 좌측 520pt 기본).
// 분할 비율 store를 공유하므로 모의고사에서 조정한 비율이 약점진단에도 그대로 적용된다.
const DEFAULT_RATIO = 520 / (1194 - 8);
const DIVIDER_WIDTH = 8;
const TOOLBAR_WIDTH = 58;
const LEFT_RATIO_MIN = 0.3;
const LEFT_RATIO_MAX = 0.6;
const LEFT_PX_FLOOR = 320;
const LEFT_PX_CEILING = 820;
const HEADER_HEIGHT_ESTIMATE = 56;

export function DiagnosticSolveTabletLayout({ header, problemPanel, scratchpad }: Props) {
  const { width, height } = useWindowDimensions();
  const { profile } = useCurrentLearner();
  const accountKey = profile?.accountKey ?? null;

  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const dragOriginRef = useRef(DEFAULT_RATIO);
  const [bodyHeight, setBodyHeight] = useState(() =>
    Math.max(0, height - HEADER_HEIGHT_ESTIMATE),
  );
  const [pencilOnly, setPencilOnly] = useState(false);

  useEffect(() => {
    if (!accountKey) return;
    let cancelled = false;
    loadSplitRatio(accountKey).then((saved) => {
      if (!cancelled && saved !== null) setRatio(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [accountKey]);

  const totalForSplit = width - DIVIDER_WIDTH;
  const leftMin = Math.max(LEFT_PX_FLOOR, Math.round(totalForSplit * LEFT_RATIO_MIN));
  const leftMax = Math.min(LEFT_PX_CEILING, Math.round(totalForSplit * LEFT_RATIO_MAX));
  const rawLeft = Math.round(totalForSplit * ratio);
  const leftWidth = Math.max(leftMin, Math.min(leftMax, rawLeft));
  const rightWidth = width - leftWidth - DIVIDER_WIDTH;
  const canvasWidth = Math.max(0, rightWidth - TOOLBAR_WIDTH);

  const handleDragStart = () => {
    dragOriginRef.current = ratio;
  };
  const handleDrag = (deltaX: number) => {
    const nextLeft = Math.max(
      leftMin,
      Math.min(leftMax, Math.round(totalForSplit * dragOriginRef.current) + deltaX),
    );
    setRatio(nextLeft / totalForSplit);
  };
  const handleDragEnd = () => {
    if (!accountKey) return;
    void saveSplitRatio(accountKey, ratio);
  };

  return (
    <View style={styles.root}>
      {header}
      <View style={styles.split}>
        <View style={[styles.leftPanel, { width: leftWidth }]}>{problemPanel}</View>

        <View style={styles.dividerWrap}>
          <SplitDivider
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          />
        </View>

        <View
          style={[styles.rightPanel, { width: rightWidth }]}
          onLayout={(e) => {
            const next = e.nativeEvent.layout.height;
            if (next !== bodyHeight) setBodyHeight(next);
          }}>
          <ScratchpadToolbar
            tool={scratchpad.tool}
            color={scratchpad.color}
            size={scratchpad.size}
            canUndo={scratchpad.canUndo}
            canRedo={scratchpad.canRedo}
            pencilOnly={pencilOnly}
            onSetTool={scratchpad.setTool}
            onSetColor={scratchpad.setColor}
            onSetSize={scratchpad.setSize}
            onUndo={scratchpad.undo}
            onRedo={scratchpad.redo}
            onClear={scratchpad.clear}
            onTogglePencilOnly={() => setPencilOnly((v) => !v)}
          />
          <ScratchpadCanvas
            width={canvasWidth}
            height={bodyHeight}
            scratchpad={{
              strokes: scratchpad.strokes,
              liveStroke: scratchpad.liveStroke,
              beginStroke: scratchpad.beginStroke,
              appendPoint: scratchpad.appendPoint,
              endStroke: scratchpad.endStroke,
            }}
            pencilOnly={pencilOnly}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF6EC' },
  split: { flex: 1, flexDirection: 'row' },
  leftPanel: { backgroundColor: '#FAF6EC' },
  dividerWrap: { width: DIVIDER_WIDTH },
  rightPanel: { flexDirection: 'row', backgroundColor: '#FFFCF4' },
});
