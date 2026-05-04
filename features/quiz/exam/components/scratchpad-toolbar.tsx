import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

type ActiveTool = 'pen' | 'highlighter' | 'eraser';

const COLORS = ['#1A1916', '#E85A4F', '#6FA8C9', '#F4B942', '#5C8C5A'] as const;

const SIZES_BY_TOOL: Record<ActiveTool, number[]> = {
  pen: [1, 2, 4],
  highlighter: [6, 10, 16],
  eraser: [8, 16, 24],
};

type ToolbarProps = {
  tool: ActiveTool;
  color: string;
  size: number;
  canUndo: boolean;
  canRedo: boolean;
  onSetTool: (t: ActiveTool) => void;
  onSetColor: (c: string) => void;
  onSetSize: (s: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

export function ScratchpadToolbar({
  tool,
  color,
  size,
  canUndo,
  canRedo,
  onSetTool,
  onSetColor,
  onSetSize,
  onUndo,
  onRedo,
  onClear,
}: ToolbarProps) {
  const sizes = SIZES_BY_TOOL[tool];
  const colorDisabled = tool === 'eraser';

  const handleSetTool = (next: ActiveTool) => {
    if (next === tool) return;
    onSetTool(next);
    onSetSize(SIZES_BY_TOOL[next][1]);
  };

  const handleClear = () => {
    Alert.alert(
      '필기 삭제',
      '이 문제의 필기를 모두 지울까요?',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: onClear },
      ],
    );
  };

  return (
    <View style={styles.bar}>
      <View style={styles.group}>
        <ToolButton label="펜" active={tool === 'pen'} onPress={() => handleSetTool('pen')} />
        <ToolButton label="형광" active={tool === 'highlighter'} onPress={() => handleSetTool('highlighter')} />
        <ToolButton label="지움" active={tool === 'eraser'} onPress={() => handleSetTool('eraser')} />
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        {sizes.map((s) => (
          <Pressable
            key={s}
            onPress={() => onSetSize(s)}
            style={[styles.sizeDot, size === s && styles.sizeDotActive]}>
            <View style={[styles.sizeInner, { width: Math.min(s + 2, 18), height: Math.min(s + 2, 18) }]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            disabled={colorDisabled}
            onPress={() => onSetColor(c)}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              color === c && !colorDisabled && styles.colorDotActive,
              colorDisabled && styles.colorDotDisabled,
            ]}
          />
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        <Pressable disabled={!canUndo} onPress={onUndo} style={styles.actionBtn}>
          <Text style={[styles.actionLabel, !canUndo && styles.actionDisabled]}>↶</Text>
        </Pressable>
        <Pressable disabled={!canRedo} onPress={onRedo} style={styles.actionBtn}>
          <Text style={[styles.actionLabel, !canRedo && styles.actionDisabled]}>↷</Text>
        </Pressable>
        <Pressable onPress={handleClear} style={styles.actionBtn}>
          <Text style={styles.actionLabel}>🗑</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ToolButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toolBtn, active && styles.toolBtnActive]}>
      <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: 58,
    height: '100%',
    backgroundColor: '#FFFCF4',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#ECE4CD',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 12,
  },
  group: { alignItems: 'center', gap: 8 },
  divider: {
    width: 28,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ECE4CD',
  },
  toolBtn: {
    width: 38,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toolBtnActive: { backgroundColor: '#E5EFE0' },
  toolLabel: { fontSize: 11, color: '#3A3833', fontWeight: '500' },
  toolLabelActive: { color: '#293B27', fontWeight: '700' },
  sizeDot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  sizeDotActive: { backgroundColor: '#E5EFE0' },
  sizeInner: { backgroundColor: '#1A1916', borderRadius: 999 },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#1A1916',
  },
  colorDotDisabled: { opacity: 0.3 },
  actionBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 18, color: '#1A1916' },
  actionDisabled: { color: '#A8A296' },
});
