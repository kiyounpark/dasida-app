import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useCurrentLearner } from '@/features/learner/provider';
import { ScratchpadCanvas } from '@/features/quiz/exam/components/scratchpad-canvas';
import { ScratchpadToolbar } from '@/features/quiz/exam/components/scratchpad-toolbar';
import { SplitDivider } from '@/features/quiz/exam/components/split-divider';
import {
  HEADER_HEIGHT_ESTIMATE,
  SCRATCHPAD_TOOLBAR_WIDTH as TOOLBAR_WIDTH,
  SPLIT_DEFAULT_RATIO as DEFAULT_RATIO,
  SPLIT_DIVIDER_WIDTH as DIVIDER_WIDTH,
  SPLIT_LEFT_PX_CEILING as LEFT_PX_CEILING,
  SPLIT_LEFT_PX_FLOOR as LEFT_PX_FLOOR,
  SPLIT_LEFT_RATIO_MAX as LEFT_RATIO_MAX,
  SPLIT_LEFT_RATIO_MIN as LEFT_RATIO_MIN,
} from '@/features/quiz/exam/components/tablet-layout-constants';
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

  // Stable wrapper passed to memo'd ScratchpadCanvas. Without this, every
  // parent re-render creates a new object literal and defeats React.memo.
  const canvasScratchpad = useMemo(
    () => ({
      strokes: scratchpad.strokes,
      liveStroke: scratchpad.liveStroke,
      beginStroke: scratchpad.beginStroke,
      appendPoint: scratchpad.appendPoint,
      endStroke: scratchpad.endStroke,
    }),
    [
      scratchpad.strokes,
      scratchpad.liveStroke,
      scratchpad.beginStroke,
      scratchpad.appendPoint,
      scratchpad.endStroke,
    ],
  );

  const togglePencilOnly = useCallback(() => setPencilOnly((v) => !v), []);

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
            onTogglePencilOnly={togglePencilOnly}
          />
          <ScratchpadCanvas
            width={canvasWidth}
            height={bodyHeight}
            scratchpad={canvasScratchpad}
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
