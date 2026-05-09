// Shared layout constants for tablet landscape split layouts. The diagnostic and
// exam-solve screens share split-ratio behavior (and the same persistence store);
// keeping the geometry constants in one module ensures they evolve together.

// 11" iPad landscape baseline: 1194pt wide. The reference design used a 520pt left
// panel out of the 1186pt non-divider area, giving the default ratio below.
// Stored ratio is device-independent so an 11" → 12.9" iPad transition adapts naturally.
export const SPLIT_DEFAULT_RATIO = 520 / (1194 - 8);
export const SPLIT_DIVIDER_WIDTH = 8;
export const SCRATCHPAD_TOOLBAR_WIDTH = 58;

// Proportional clamps so the same ratio behaves correctly across iPad sizes
// (11" 1194pt ↔ 12.9" 1366pt). Absolute floor/ceiling guards extreme aspect ratios.
export const SPLIT_LEFT_RATIO_MIN = 0.3;
export const SPLIT_LEFT_RATIO_MAX = 0.6;
export const SPLIT_LEFT_PX_FLOOR = 320;
export const SPLIT_LEFT_PX_CEILING = 820;

// Best-effort first-paint height so the canvas isn't a blank frame before onLayout.
// The header is roughly 56pt; onLayout corrects the value on the next frame.
export const HEADER_HEIGHT_ESTIMATE = 56;
