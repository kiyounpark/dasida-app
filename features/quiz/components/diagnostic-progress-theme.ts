import { DiagnosticSketchColors } from '@/features/quiz/components/diagnostic-sketch-assets';

export const DIAGNOSTIC_PROGRESS_TRACK_COLOR = '#EEE7D5';
export const DIAGNOSTIC_PROGRESS_OUTLINE_COLOR = DiagnosticSketchColors.inkSoft;
export const DIAGNOSTIC_PROGRESS_FILL_COLOR = DiagnosticSketchColors.green;
export const DIAGNOSTIC_PROGRESS_FILL_HIGHLIGHT = DiagnosticSketchColors.greenSoft;
export const DIAGNOSTIC_PROGRESS_SURFACE_HIGHLIGHT = 'rgba(255, 255, 255, 0.6)';
export const DIAGNOSTIC_PROGRESS_RING_INNER_GLOW = 'rgba(255, 255, 255, 0.55)';
export const DIAGNOSTIC_PROGRESS_BAR_HEIGHT = {
  regular: 18,
  compact: 16,
} as const;
export const DIAGNOSTIC_PROGRESS_BAR_STROKE = {
  regular: 6,
  compact: 5,
} as const;
export const DIAGNOSTIC_PROGRESS_HIGHLIGHT_OPACITY = 0.92;
