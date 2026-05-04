import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useCurrentLearner } from '@/features/learner/provider';
import { ScratchpadCanvas } from '@/features/quiz/exam/components/scratchpad-canvas';
import { ScratchpadToolbar } from '@/features/quiz/exam/components/scratchpad-toolbar';
import { SplitDivider } from '@/features/quiz/exam/components/split-divider';
import { useScratchpad } from '@/features/quiz/exam/hooks/use-scratchpad';
import {
  loadSplitRatio,
  saveSplitRatio,
} from '@/features/quiz/exam/storage/scratchpad-split-ratio-store';

type Props = {
  examId: string;
  problemNumber: number;
  header: ReactNode;
  problemPanel: ReactNode;
};

// 11" iPad landscape baseline: 1194pt wide. The reference design used a 520pt left
// panel out of the 1186pt non-divider area, giving the default ratio below.
// Stored ratio is device-independent so an 11" → 12.9" iPad transition adapts naturally.
const DEFAULT_RATIO = 520 / (1194 - 8);
const DIVIDER_WIDTH = 8;
const TOOLBAR_WIDTH = 58;
// Proportional clamps so the same ratio behaves correctly across iPad sizes
// (11" 1194pt ↔ 12.9" 1366pt). Absolute floor/ceiling guards extreme aspect ratios.
const LEFT_RATIO_MIN = 0.3;
const LEFT_RATIO_MAX = 0.6;
const LEFT_PX_FLOOR = 320;
const LEFT_PX_CEILING = 820;
// Best-effort first-paint height so the canvas isn't a blank frame before onLayout.
// The exam header is roughly 56pt; onLayout corrects the value on the next frame.
const HEADER_HEIGHT_ESTIMATE = 56;

export function ExamSolveTabletLayout({ examId, problemNumber, header, problemPanel }: Props) {
  const { width, height } = useWindowDimensions();
  const { profile } = useCurrentLearner();
  const accountKey = profile?.accountKey ?? null;

  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const dragOriginRef = useRef(DEFAULT_RATIO);
  const [bodyHeight, setBodyHeight] = useState(() =>
    Math.max(0, height - HEADER_HEIGHT_ESTIMATE),
  );
  const [pencilOnly, setPencilOnly] = useState(false);
  const scratchpad = useScratchpad(examId, problemNumber);

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
            scratchpad={scratchpad}
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
