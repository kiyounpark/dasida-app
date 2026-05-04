# iPad 수학 풀이 화면 — 좌우 분할 + 필기 캔버스

> 작성일: 2026-05-05
> 대상 화면: `features/quiz/exam/screens/exam-solve-screen.tsx` 및 신규 iPad 전용 컴포넌트

---

## 배경 및 목적

iPad 가로 모드에서 시험 풀이 화면을 좌(문제) / 우(필기 캔버스) 분할 레이아웃으로 제공한다. 학생이 종이 노트 없이 Apple Pencil로 풀이 과정을 기기 안에서 작성하고, 같은 문제로 돌아왔을 때 풀이가 그대로 복원되도록 한다.

폰과 세로 iPad는 기존 단일 패널 레이아웃을 유지한다. 가로 iPad에서만 새 레이아웃이 활성화된다.

원본 디자인 프로토타입(standalone HTML)에 정의된 디자인 토큰·툴바·줄노트 배경을 그대로 따른다.

---

## 범위

**포함**
- iPad 가로 모드 좌우 분할 레이아웃
- Skia 기반 필기 캔버스 (Apple Pencil 압력·기울기 반영)
- 도구: 펜(굵기 3·색상 5), 형광펜(굵기 3·색상 5·반투명), 지우개(굵기 3·stroke 단위 삭제)
- Undo / Redo / Clear
- 분할선 드래그 리사이즈 (좌측 폭 360~720pt)
- 문제별 stroke 영속화 (AsyncStorage, 계정 스코프)
- 분할 비율 영속화 (계정 스코프, 문제 무관)

**제외 (v1 비포함, 추후 검토)**
- 페이지 추가 (한 문제 다중 페이지)
- 다기기 동기화 (Firebase)
- 펜 전용 모드 / 팜 리젝션 커스텀 (iPadOS 기본 동작에 위임)

---

## 통합 지점 및 파일 구조

기존 `useIsTablet()` 분기 패턴을 따른다. `exam-solve-screen.tsx` 내부에서 `isTablet && isLandscape`일 때만 새 레이아웃을 렌더하고, 그 외엔 기존 폰 코드 경로를 그대로 사용한다.

```
features/quiz/exam/
├── screens/
│   └── exam-solve-screen.tsx              # 분기 추가
├── components/
│   ├── exam-solve-tablet-layout.tsx       # 신규 — 좌우 분할 컨테이너
│   ├── scratchpad-canvas.tsx              # 신규 — Skia 캔버스
│   ├── scratchpad-toolbar.tsx             # 신규 — 우측 세로 툴바
│   └── split-divider.tsx                  # 신규 — 드래그 가능 분할선
├── hooks/
│   └── use-scratchpad.ts                  # 신규 — 도구·획·Undo/Redo 상태 + 영속화
└── storage/
    ├── scratchpad-strokes-store.ts        # 신규 — 문제별 stroke I/O
    └── scratchpad-split-ratio-store.ts    # 신규 — 분할 비율 I/O
```

**`isLandscape` 판정:** `useWindowDimensions()`의 `width > height`. orientation lock 안 함. 회전하면 자연스럽게 폰 레이아웃으로 fallback.

**의존성 추가:** `@shopify/react-native-skia` 1개. 추가 후 `npx expo prebuild --clean` → `npx expo run:ios` 실행 (CLAUDE.md 네이티브 빌드 규칙 준수).

---

## 데이터 모델

```ts
type StrokePoint = {
  x: number;          // 캔버스 논리 좌표 (px)
  y: number;
  p: number;          // 압력 0..1, 손가락이면 0.5 fallback
};

type ActiveTool = 'pen' | 'highlighter' | 'eraser';   // UI 도구 상태
type StrokeTool = 'pen' | 'highlighter';              // 저장되는 stroke (지우개는 즉시 삭제만)

type Stroke = {
  id: string;                              // nanoid
  tool: StrokeTool;
  color: string;                           // hex
  size: number;                            // base width (px)
  points: StrokePoint[];
};

type ProblemScratchpad = {
  examId: string;
  problemNumber: number;                   // ExamProblem.number 사용 (별도 problemId 없음)
  strokes: Stroke[];                       // 화면에 표시되는 최종 stroke 배열
  updatedAt: number;                       // epoch ms
};
```

**점 기록 정책 (sampling):** 직전 점에서 1.5px 미만 이동은 무시. 한 stroke 평균 ~30점 ≈ 1KB. 한 문제당 50 stroke = 50KB. 모의고사 30문제 ≈ 1.5MB (AsyncStorage iOS 한도 6MB 내).

---

## 영속화

### Stroke 저장

| 항목 | 값 |
|---|---|
| 저장소 | AsyncStorage |
| 키 prefix | `dasida/scratchpad/` (`constants/storage-keys.ts`에 추가) |
| 전체 키 | `dasida/scratchpad/<accountKey>/<examId>/<problemNumber>` |
| 값 | `JSON.stringify(ProblemScratchpad)` |
| 쓰기 시점 | stroke 완료 후 메모리 변경 → 500ms debounce → write |
| 즉시 flush | 화면 unmount, 문제 이동, 회전, 앱 백그라운드 |
| 읽기 시점 | 문제 진입 시 비동기 로드 (보통 <50ms) |

기존 `latest-exam-attempt-store.ts`의 계정 스코프 패턴(`makeKey(accountKey)`)을 그대로 답습한다. legacy 키 마이그레이션은 신규 기능이므로 불필요.

### 분할 비율 저장

| 항목 | 값 |
|---|---|
| 키 prefix | `dasida/scratchpad-split-ratio/` (`constants/storage-keys.ts`에 추가) |
| 전체 키 | `dasida/scratchpad-split-ratio/<accountKey>` |
| 값 | 좌측 폭 비율 (0..1, 클램프는 런타임에서 처리) |
| 쓰기 시점 | 분할선 드래그 종료 |
| 기본값 | `520 / (1194 - 8) ≈ 0.438` (프로토타입 비율) |

저장은 디바이스 독립 비율로만 한다. 런타임에서 현재 화면 폭으로 ratio × width 계산 후 좌측 폭 360~720pt로 clamp한다. 이렇게 하면 11" iPad에서 저장한 비율을 12.9" iPad에서 열어도 자연스럽게 적응한다.

### Undo/Redo

영속화하지 않는다. 메모리(useReducer) 안에서만 보존하며 앱 백그라운드/문제 이동/회전 시 소실 OK. 영속되는 건 "최종 stroke 배열"뿐.

---

## 필기 엔진 (Skia)

### 캔버스 구조 (이중 레이어)

```tsx
<Canvas>
  <Group>committedStrokes</Group>     // 완료된 stroke (메모이즈, stroke 추가 시만 갱신)
  <Path path={livePath} ... />        // 그리는 중인 stroke (매 프레임 갱신)
</Canvas>
```

완료된 stroke를 메모이즈해서 매 프레임 다시 그리지 않는 게 60fps의 핵심.

### 입력 처리

- `react-native-gesture-handler`의 `Gesture.Pan()` + Skia 통합
- `onBegin`: 새 stroke 시작, 첫 점 push
- `onUpdate`: 1.5px 이상 이동 시에만 점 추가
- `onEnd`: live → committed 이전, debounced write 트리거
- 압력: `event.force`(iOS Apple Pencil/3D Touch). 없으면 `0.5` fallback
- 멀티터치: `maxPointers(1)`로 핀치 줌 의도 무시. 손바닥은 iPadOS가 자동 reject

### 스무딩

점 사이를 Catmull-Rom 보간 → 베지어로 변환. 처음·마지막 점은 직접 연결. Skia `Path.cubicTo` 사용.

---

## 도구 사양

| 도구 | 색상 | 굵기 base (px) | 압력 반영 | 알파 |
|---|---|---|---|---|
| 펜 | 5색 | 1·2·4 | width × (0.4 + 0.6 × p) | 1.0 |
| 형광펜 | 5색 | 6·10·16 | 무시 (균일) | 0.35 |
| 지우개 | — | 8·16·24 | 무시 | — |

**색상 팔레트** (디자인 토큰 그대로):
- `--c-ink` (#1A1916)
- `--c-coral` (#E85A4F)
- `--c-sky` (#6FA8C9)
- `--c-honey` (#F4B942)
- `--c-forest-500` (#5C8C5A)

**지우개 정책:** Stroke eraser. 지우개 touch point와 거리 ≤ size/2 이내인 점을 가진 committed stroke를 통째로 제거. 픽셀 단위 ❌. Apple Notes·iPad 표준 UX, Undo로 stroke 1개 단위 복구 가능.

**Undo/Redo:**
- Undo 스택: stroke 추가/삭제 이벤트의 inverse 저장 (max 50)
- Redo 스택: 새 stroke 그리면 클리어
- 메모리만, 영속화 안 함

**Clear:** `Alert.alert('이 문제의 필기를 모두 지울까요?', ...)` 한 번 확인. Undo로 복구 불가(스택 비움).

---

## 레이아웃

### 좌우 분할

| 영역 | 폭 | 비율 |
|---|---|---|
| 좌(문제 패널) | 기본 520pt, min 360 / max 720 | 기본 ≈ 44% |
| 분할선 | 8pt | 고정 |
| 우(필기 영역) | 나머지 | — |

### 좌측 문제 패널

기존 폰 화면의 문제 컴포넌트(문제 텍스트 + 객관식 선택지 + "다음" 버튼)를 **그대로 재사용**한다. iPad 가로에선 `maxWidth: 480` 제약을 풀고 패널 폭에 맞게 늘림. 새 컴포넌트는 만들지 않는다.

### 우측 필기 영역

- **좌측 58pt**: `<ScratchpadToolbar />` (세로 배치 — 도구 → 굵기 → 색상 → Undo/Redo/Clear)
- **나머지**: `<ScratchpadCanvas />`
  - 줄노트 배경: `--c-sky` 0.15 alpha, 32px 간격 가로선
  - 마진선: `--c-coral` 0.18 alpha, 캔버스 좌측 x = 52pt에서 세로선
  - 우측 하단 모서리: 'DASIDA' 워드마크 (forest-500, 0.5 alpha, monospace)

### 분할선 리사이즈

- 분할선: `--c-paper-edge` 배경, hover/press 시 `--c-forest-200`
- 제스처: `Gesture.Pan()` 가로 드래그
- 제약: 좌측 폭 360~720pt
- 종료 시 비율을 AsyncStorage에 저장
- 캔버스 폭 변경에 stroke 좌표는 그대로 유지(절대 좌표) — 캔버스 작아지면 일부 가려지나 다시 늘리면 보임

### 회전 처리

- `useWindowDimensions()` 변경 감지
- `width > height && isTablet` → tablet layout
- 그 외 → 폰 layout (세로 iPad 포함)
- 회전이 unmount를 유발해도 cleanup에서 즉시 flush

### Safe area

`useSafeAreaInsets()` 사용. iPad 11"엔 home indicator 외엔 거의 없음. 우측 캔버스가 화면 끝까지 가도록 right inset만 적용. 좌측은 패널 padding으로 흡수.

### 상단 헤더

기존 시험 풀이 화면 헤더(타이머·문제 번호·종료 버튼) 그대로 사용. 분할 영역은 헤더 아래에서 시작.

---

## 타입 시그니처 요약

```ts
// hooks/use-scratchpad.ts — accountKey는 useCurrentLearner()로 내부에서 조회
export function useScratchpad(examId: string, problemNumber: number): {
  strokes: Stroke[];
  livePath: SkPath | null;
  tool: ActiveTool;
  color: string;
  size: number;
  setTool: (t: ActiveTool) => void;
  setColor: (c: string) => void;
  setSize: (s: number) => void;
  beginStroke: (p: StrokePoint) => void;
  appendPoint: (p: StrokePoint) => void;
  endStroke: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
};

// storage/scratchpad-strokes-store.ts
export async function loadScratchpad(
  accountKey: string, examId: string, problemNumber: number,
): Promise<ProblemScratchpad | null>;
export async function saveScratchpad(
  accountKey: string, scratchpad: ProblemScratchpad,
): Promise<void>;

// storage/scratchpad-split-ratio-store.ts
export async function loadSplitRatio(accountKey: string): Promise<number | null>;
export async function saveSplitRatio(accountKey: string, ratio: number): Promise<void>;
```

---

## 테스트 계획

**유닛 테스트** (Jest)
- `scratchpad-strokes-store.test.ts` — 저장/로드/계정별 격리 (`latest-exam-attempt-store.test.ts` 패턴 답습)
- `scratchpad-split-ratio-store.test.ts` — 범위 clamp, 기본값
- `use-scratchpad.test.ts` — Undo/Redo 스택, debounce flush 시나리오, 지우개 stroke 삭제 로직

**수동 검증** (iPad 시뮬레이터 + 실기기)
- 가로/세로 회전 시 레이아웃 전환 + stroke 보존
- 문제 이동 후 돌아왔을 때 stroke 복원
- 앱 강제 종료 후 재진입 시 stroke 복원 (debounce 미flush 케이스 포함)
- Apple Pencil 압력 변화에 펜 굵기 반응
- 분할선 드래그 후 재진입 시 비율 복원
- 폰/세로 iPad에서 기존 화면 회귀 없음

---

## 미해결 / 추후 검토

- **페이지 추가** (한 문제 다중 페이지): v1 운영 후 사용자 피드백으로 결정
- **다기기 동기화**: Firebase로 stroke 동기화 (현재는 다른 시험 데이터도 안 함)
- **PDF 내보내기**: 학생이 풀이를 캡처하여 공유
- **선생님 뷰**: 학생 풀이 모니터링 (다기기 동기화 선결)
