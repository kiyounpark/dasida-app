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

const DEFAULT_RATIO = 520 / (1194 - 8);
const DIVIDER_WIDTH = 8;
const TOOLBAR_WIDTH = 58;
const LEFT_MIN = 360;
const LEFT_MAX = 720;

export function ExamSolveTabletLayout({ examId, problemNumber, header, problemPanel }: Props) {
  const { width } = useWindowDimensions();
  const { profile } = useCurrentLearner();
  const accountKey = profile?.accountKey ?? null;

  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const dragOriginRef = useRef(DEFAULT_RATIO);
  const [bodyHeight, setBodyHeight] = useState(0);
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
  const rawLeft = Math.round(totalForSplit * ratio);
  const leftWidth = Math.max(LEFT_MIN, Math.min(LEFT_MAX, rawLeft));
  const rightWidth = width - leftWidth - DIVIDER_WIDTH;
  const canvasWidth = Math.max(0, rightWidth - TOOLBAR_WIDTH);

  const handleDragStart = () => {
    dragOriginRef.current = ratio;
  };

  const handleDrag = (deltaX: number) => {
    const nextLeft = Math.max(
      LEFT_MIN,
      Math.min(LEFT_MAX, Math.round(totalForSplit * dragOriginRef.current) + deltaX),
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
          onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
          <ScratchpadToolbar
            tool={scratchpad.tool}
            color={scratchpad.color}
            size={scratchpad.size}
            canUndo={scratchpad.canUndo}
            canRedo={scratchpad.canRedo}
            onSetTool={scratchpad.setTool}
            onSetColor={scratchpad.setColor}
            onSetSize={scratchpad.setSize}
            onUndo={scratchpad.undo}
            onRedo={scratchpad.redo}
            onClear={scratchpad.clear}
          />
          <ScratchpadCanvas width={canvasWidth} height={bodyHeight} scratchpad={scratchpad} />
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
