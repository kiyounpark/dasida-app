import {
  Canvas,
  Group,
  Line,
  Path,
  Skia,
  Text as SkiaText,
  matchFont,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { useRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { Stroke, StrokePoint } from '@/features/quiz/exam/storage/scratchpad-strokes-store';

// Minimal scratchpad interface — only what Canvas needs
type CanvasScratchpadProps = {
  strokes: Stroke[];
  liveStroke: Stroke | null;
  beginStroke: (p: StrokePoint) => void;
  appendPoint: (p: StrokePoint) => void;
  endStroke: () => void;
};

type ScratchpadCanvasProps = {
  width: number;
  height: number;
  scratchpad: CanvasScratchpadProps;
};

const LINE_GAP = 32;
const MARGIN_X = 52;
const WORDMARK = 'DASIDA';

function buildPath(points: StrokePoint[]) {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;
  path.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    path.lineTo(points[0].x + 0.01, points[0].y + 0.01);
    return path;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path.cubicTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
  }
  return path;
}

function strokeOpacity(s: Stroke): number {
  return s.tool === 'highlighter' ? 0.35 : 1;
}

function strokeWidthFor(s: Stroke): number {
  if (s.tool === 'highlighter') return s.size;
  if (s.points.length === 0) return s.size;
  const avgP = s.points.reduce((a, p) => a + p.p, 0) / s.points.length;
  return s.size * (0.4 + 0.6 * avgP);
}

type CachedPath = { path: SkPath; color: string; width: number; opacity: number };

export function ScratchpadCanvas({ width, height, scratchpad }: ScratchpadCanvasProps) {
  const { strokes, liveStroke, beginStroke, appendPoint, endStroke } = scratchpad;

  // Cache built Skia paths by stroke id — only rebuild new strokes, not the whole array
  const pathCacheRef = useRef<Map<string, CachedPath>>(new Map());
  const committedPaths = useMemo(() => {
    const cache = pathCacheRef.current;
    const currentIds = new Set(strokes.map((s) => s.id));
    for (const id of cache.keys()) {
      if (!currentIds.has(id)) cache.delete(id);
    }
    return strokes.map((s) => {
      if (!cache.has(s.id)) {
        cache.set(s.id, {
          path: buildPath(s.points),
          color: s.color,
          width: strokeWidthFor(s),
          opacity: strokeOpacity(s),
        });
      }
      return { id: s.id, ...cache.get(s.id)! };
    });
  }, [strokes]);

  const livePath = useMemo(
    () => (liveStroke ? buildPath(liveStroke.points) : null),
    [liveStroke],
  );

  const lineCount = Math.floor((height - 24) / LINE_GAP);

  const wordmarkFont = useMemo(
    () => matchFont({ fontFamily: 'Courier New', fontSize: 13 }),
    [],
  );

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onBegin((e) => {
      beginStroke({ x: e.x, y: e.y, p: 0.5 });
    })
    .onUpdate((e) => {
      appendPoint({ x: e.x, y: e.y, p: 0.5 });
    })
    .onFinalize(() => {
      endStroke();
    });

  if (width <= 0 || height <= 0) return null;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <GestureDetector gesture={pan}>
        <Canvas style={{ width, height }}>
          {/* 줄노트 가로선 */}
          <Group opacity={0.15}>
            {Array.from({ length: lineCount }).map((_, i) => {
              const y = 24 + i * LINE_GAP;
              return (
                <Line
                  key={i}
                  p1={vec(0, y)}
                  p2={vec(width, y)}
                  color="#6FA8C9"
                  strokeWidth={1}
                />
              );
            })}
          </Group>

          {/* 마진선 */}
          <Line
            p1={vec(MARGIN_X, 0)}
            p2={vec(MARGIN_X, height)}
            color="#E85A4F"
            strokeWidth={1}
            opacity={0.18}
          />

          {/* committed strokes */}
          {committedPaths.map((s) => (
            <Path
              key={s.id}
              path={s.path}
              style="stroke"
              strokeWidth={s.width}
              strokeCap="round"
              strokeJoin="round"
              color={s.color}
              opacity={s.opacity}
            />
          ))}

          {/* live stroke */}
          {livePath && liveStroke && (
            <Path
              path={livePath}
              style="stroke"
              strokeWidth={strokeWidthFor(liveStroke)}
              strokeCap="round"
              strokeJoin="round"
              color={liveStroke.color}
              opacity={strokeOpacity(liveStroke)}
            />
          )}

          {/* DASIDA 워드마크 */}
          <SkiaText
            x={12}
            y={height - 14}
            text={WORDMARK}
            font={wordmarkFont}
            color="#5C8C5A"
            opacity={0.5}
          />
        </Canvas>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFCF4',
  },
});
