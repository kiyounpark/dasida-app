# 10문제 약점진단 — 스크래치패드 + 분석 단계 원본 풀이 보기

- **작성일**: 2026-05-09
- **상태**: 기획중
- **범위**: `app/quiz/diagnostic.tsx` 진입의 두 단계
  - 풀이 단계: `features/quiz/components/diagnostic-quiz-stage.tsx`
  - 분석 단계: `features/quiz/components/diagnostic-screen-view.tsx` (`isDiagnosing`)
- **선행**:
  - `2026-05-07-ipad-landscape-exam-solve-design.md` (모의고사 좌우 분할 + 스크래치패드)
  - `2026-05-08-diagnosis-original-strokes-design.md` (모의고사 후속 진단의 원본 풀이 시트)

---

## 1. 배경 / 문제

여정보드에서 시작하는 **10문제 약점 진단**은 두 단계로 진행된다.

1. **풀이 단계** ([DiagnosticQuizStage](features/quiz/components/diagnostic-quiz-stage.tsx)) — 텍스트 + 수식 기반 10문제를 차례로 풀이
2. **분석 단계** ([DiagnosticScreenView](features/quiz/components/diagnostic-screen-view.tsx)의 `isDiagnosing` 분기) — 틀린 답을 가지고 AI와 대화하며 약점 진단

현재 두 단계 모두 손으로 계산하거나 메모할 공간이 없다. 학습자는 별도 종이를 꺼내야 하고, 분석 단계에서는 그 종이마저 사라져 있다.

모의고사 라인은 이미 동일한 문제를 다음과 같이 풀고 있다.

- 풀이 화면([ExamSolveScreen](features/quiz/exam/screens/exam-solve-screen.tsx)): 태블릿 가로에서 좌우 분할 + 스크래치패드 ([ExamSolveTabletLayout](features/quiz/exam/components/exam-solve-tablet-layout.tsx))
- 분석 화면([ExamDiagnosisSessionScreen](features/quiz/exam/screens/exam-diagnosis-session-screen.tsx)): 헤더 "원본 풀이" 버튼 → [OriginalStrokesSheet](features/quiz/exam/components/original-strokes-sheet.tsx) 모달

10문제 약점진단에도 동일한 경험을 옮긴다. 단, **약점진단은 1회성 세션**이라는 정책이 있어 (인트로 카드: "나가면 처음부터 다시 시작해야 해요") 디스크 영속화 대신 **메모리 보관**으로 단순화한다.

---

## 2. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| **풀이 단계 캔버스** | 태블릿 + 가로모드일 때만 좌우 분할 + 편집 가능 캔버스 |
| **분석 단계 캔버스** | 헤더 "원본 풀이" 버튼 → 읽기 전용 모달 (`OriginalStrokesSheet` 재사용) |
| **저장 정책** | In-memory only (`Map<answerIndex, Stroke[]>`). 디스크 저장 X. 화면 unmount 시 자연 소멸 |
| **저장 키** | `answerIndex` 단일 — 1회성 세션이라 sessionId 불필요 |
| **분할 비율** | 모의고사 store([scratchpad-split-ratio-store](features/quiz/exam/storage/scratchpad-split-ratio-store.ts)) 재사용 — 사용자 환경설정 일관 |
| **기기/모드** | 태블릿(`useIsTablet`) + 가로(`!isPortrait`)에서만 캔버스 노출. 그 외 단일 컬럼 + 권유 배너 |
| **회전 처리** | 4방향 unlock(태블릿). 진행 중 stroke은 회전 시 끊고 폐기. 완성 stroke은 좌표 그대로 보존 |
| **분석 단계 버튼 노출 조건** | 해당 문제 stroke 1개 이상일 때만 노출 (`hasStrokes`) |
| **공통 컴포넌트** | `ScratchpadCanvas`, `ScratchpadToolbar`, `OriginalStrokesSheet`, `LandscapeHintBanner` 그대로 재사용 |

---

## 3. 아키텍처

### 데이터 흐름

```
useDiagnosticScreen (화면 단위 단일 인스턴스)
  └─ useDiagnosticScratchpadStore (in-memory Map<answerIndex, Stroke[]>)
       │
       ├─ [풀이 단계] DiagnosticQuizStage
       │     ├─ (태블릿 가로) DiagnosticSolveTabletLayout
       │     │     └─ ScratchpadCanvas (편집 가능, 현재 answerIndex API 바인딩)
       │     └─ (그 외) QuizSolveLayout 그대로 + LandscapeHintBanner
       │
       └─ [분석 단계] DiagnosticScreenView (isDiagnosing)
             └─ DiagnosisDarkHeader "원본 풀이" 버튼 (현재 페이지 hasStrokes일 때만)
                  └─ OriginalStrokesSheet (현재 페이지 strokes 읽기 전용)
```

### 신규 / 수정 파일

**신규**

| 파일 | 역할 |
|---|---|
| `features/quiz/hooks/use-diagnostic-scratchpad-store.ts` | `Map<answerIndex, Stroke[]>` 메모리 보관 + `useScratchpad`-호환 인터페이스 (디스크 I/O 제거) |
| `features/quiz/components/diagnostic-solve-tablet-layout.tsx` | [ExamSolveTabletLayout](features/quiz/exam/components/exam-solve-tablet-layout.tsx)과 동일 구조 (header / 좌 problemPanel / divider / 우 ScratchpadCanvas + ScratchpadToolbar) |
| `features/quiz/hooks/use-diagnostic-screen-orientation.ts` | [useExamScreenOrientation](features/quiz/exam/hooks/use-exam-screen-orientation.ts) 동일 패턴 (focus 시 unlock, blur 시 portrait lock, 회전 시 stroke 끊기 콜백) |

**수정**

| 파일 | 변경 |
|---|---|
| `features/quiz/components/diagnostic-quiz-stage.tsx` | `useIsTablet` + portrait 분기 추가. 태블릿 가로면 `DiagnosticSolveTabletLayout` 사용, 아니면 기존 `QuizSolveLayout` + `LandscapeHintBanner` |
| `features/quiz/hooks/use-diagnostic-screen.ts` | `useDiagnosticScratchpadStore` 인스턴스 화면 단위 보유. 풀이/분석 단계에 각각 적합한 형태로 노출. orientation hook 호출 |
| `features/quiz/components/diagnostic-screen-view.tsx` | `isDiagnosing` 분기 [DiagnosisDarkHeader](features/quiz/components/diagnosis-dark-header.tsx)에 `showOriginalStrokesButton`/`onPressOriginalStrokes` 연결. `OriginalStrokesSheet` 마운트 |

**재사용 (변경 없음)**

- [ScratchpadCanvas](features/quiz/exam/components/scratchpad-canvas.tsx)
- [ScratchpadToolbar](features/quiz/exam/components/scratchpad-toolbar.tsx)
- [OriginalStrokesSheet](features/quiz/exam/components/original-strokes-sheet.tsx)
- [LandscapeHintBanner](features/quiz/exam/components/landscape-hint-banner.tsx)
- [scratchpad-split-ratio-store](features/quiz/exam/storage/scratchpad-split-ratio-store.ts)
- `Stroke`, `StrokePoint` 타입 ([scratchpad-strokes-store](features/quiz/exam/storage/scratchpad-strokes-store.ts))

---

## 4. `useDiagnosticScratchpadStore` 인터페이스

기존 [useScratchpad](features/quiz/exam/hooks/use-scratchpad.ts)의 reducer 로직(begin/append/end/erase/undo/redo/clear)은 **순수 함수** 부분이므로 그대로 가져온다. 디스크 의존 부분(`loadScratchpad`/`saveScratchpad`/flush effect)만 빼고, key를 `answerIndex`로 바꾼다.

```ts
type DiagnosticScratchpadStore = {
  // 현재 활성 answerIndex의 편집 API (풀이 단계용)
  forIndex(answerIndex: number): UseScratchpadResult;

  // 모든 answerIndex의 strokes 읽기 (분석 단계용)
  getStrokes(answerIndex: number): Stroke[];
  hasStrokes(answerIndex: number): boolean;
};
```

`forIndex(idx)`는 호출될 때마다 새 객체를 만들지 않고 안정적인 참조를 반환해야 한다 (리렌더 폭주 방지). 내부 구현은 `useReducer` + `Map` 형태로 단일 상태 트리를 유지하고, `forIndex`는 해당 index에 바인딩된 callback set을 메모이즈해서 반환한다.

---

## 5. UX 세부사항

### 5.1 풀이 단계

**태블릿 + 가로:**
- 좌우 분할 (모의고사와 동일 기본 비율, 드래그로 조정, 동일 store에 저장)
- 왼쪽: `QuizQuestionCard` (텍스트 문제 + 5지선다)
- 오른쪽: 빈 캔버스 + 도구 툴바 (펜/형광펜/지우개)
- 하단: `DiagnosticSolveBottomPanel` (선택지/이전/다음)는 **왼쪽 컬럼 하단**에 배치. [ExamSolveTabletLayout](features/quiz/exam/components/exam-solve-tablet-layout.tsx)이 `problemPanel`에 footer를 포함시키는 패턴 그대로 따른다 — 분할 비율 변경 시 footer도 같은 컬럼에서 좁아지거나 넓어짐

**태블릿 + 세로:**
- 단일 컬럼 그대로 + `LandscapeHintBanner`
- 캔버스 미노출

**폰:**
- 단일 컬럼 그대로, 배너 없음, 캔버스 없음 (현재 동작 유지)

### 5.2 문제 이동

- 풀이 단계는 [DiagnosticSolveBottomPanel](features/quiz/components/diagnostic-solve-footer.tsx)의 이전/다음 버튼으로 이동 (페이지 스와이프 X — 풀이 단계는 단일 활성 문제 렌더 방식)
- 분석 단계는 페이지 스와이프(FlatList horizontal pagingEnabled) — `DiagnosticScreenView`의 기존 동작 유지
- 두 단계 모두 문제 이동 시 stroke은 메모리에 유지
- 새 문제 첫 진입 시 캔버스는 빈 상태
- 이전 문제로 복귀 시 stroke 그대로 복원

### 5.3 회전 처리

- `useDiagnosticScreenOrientation`이 focus 시 4방향 unlock, blur 시 portrait lock
- 회전 이벤트 콜백 → 현재 진행 중인 stroke (`liveStroke`) 폐기
- 완성된 stroke은 좌표 보존 (가로↔세로 좌표 변환 X — 모의고사도 변환 안 함)

### 5.4 분석 단계

- [DiagnosisDarkHeader](features/quiz/components/diagnosis-dark-header.tsx)에 "원본 풀이" 버튼 (현재 활성 페이지의 `hasStrokes`일 때만)
- 버튼 누르면 `OriginalStrokesSheet` 슬라이드 업 (높이 60%)
- 페이지 스와이프로 다른 문제 이동 시 시트 자동 닫힘 ([exam-diagnosis-session-screen.tsx:64-66](features/quiz/exam/screens/exam-diagnosis-session-screen.tsx:64) 패턴)
- stroke이 없는 문제는 버튼 미노출

---

## 6. 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 학생이 풀이 중 한 문제도 안 그림 | 분석 단계 버튼 모두 미노출 |
| 분석 단계에서 풀이 단계로 복귀 가능? | 현재 `DiagnosticScreen` 흐름상 분석 시작 후 풀이 복귀 경로 없음. stroke은 read-only |
| 진단 중 백그라운드 → 강제종료 | 답안과 함께 stroke도 휘발 (정책 일관) |
| 폰에서 강제 가로 회전 | 폰은 portrait lock — 캔버스 노출 X (태블릿 조건 필수) |
| 풀이 단계에서 "처음부터 다시" | 메모리 store도 함께 초기화 (`useDiagnosticScreen` reset 흐름에 hook) |
| 분석 단계에서 페이지 스와이프 후 시트가 열려있던 경우 | 자동 닫힘 (`useEffect` on `activeIndex`) |

---

## 7. 비목표 (Non-goals)

- 분석 단계에서 stroke **편집** (현 spec 읽기 전용. 모의고사 후속 진단도 동일)
- 디스크 영속화 / 강제종료 후 복구
- 폰에서의 캔버스 노출
- 가로↔세로 회전 시 stroke 좌표 변환
- 다른 학습자와의 공유 / 내보내기
- 진단 종료 후 자동 백업 (학습 기록에 stroke 저장 등)

---

## 8. 검증 항목

- [ ] iPad 가로에서 풀이 단계 → 좌우 분할 표시, 캔버스에 그릴 수 있음
- [ ] 분할 바 드래그 → 비율 변경되고 모의고사와 동일 store에 저장됨
- [ ] 다음/이전 문제 이동 → 현재 stroke 보존, 새 문제는 빈 캔버스
- [ ] 이전 문제 복귀 → stroke 복원
- [ ] 가로↔세로 회전 → 진행 중 stroke 끊김, 완성 stroke 보존
- [ ] iPad 세로 → 캔버스 미노출 + 가로 권유 배너
- [ ] iPhone → 캔버스 미노출, 배너 없음
- [ ] 분석 단계 진입 → stroke 있는 문제만 "원본 풀이" 버튼 노출
- [ ] 시트 모달 → 60% 높이, 슬라이드 업, 백드롭 탭으로 닫힘
- [ ] 페이지 스와이프 시 시트 자동 닫힘
- [ ] 한 문제도 안 그린 채 분석 단계 진입 → 버튼 노출 없음
- [ ] 백그라운드 → 강제 종료 후 재진입 → stroke 휘발 (정책 일관)
- [ ] `npx expo run:ios` 빌드 성공 (네이티브 의존성 변경 없음 — 검정화면 위험 없음)
