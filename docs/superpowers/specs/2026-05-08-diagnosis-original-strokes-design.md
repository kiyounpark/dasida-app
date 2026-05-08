# 약점 진단 화면 — 원본 풀이 읽기 전용 표시

- **작성일**: 2026-05-08
- **상태**: 기획중
- **범위**: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` 한 화면
- **선행**: `2026-05-07-ipad-landscape-exam-solve-design.md` (F1 후속)

---

## 1. 배경 / 문제

`exam-solve-screen`의 scratchpad는 사용자가 시험을 풀면서 손으로 적은 풀이를 storage에 저장한다 (`scratchpad-strokes-store`, 키: `accountKey/examId/problemNumber`). 그러나 약점 진단 화면(`exam-diagnosis-session-screen`)에서 동일 문제를 다시 마주칠 때, 그때 적었던 풀이는 보이지 않는다.

약점 진단의 본질은 **"내가 왜 이걸 틀렸는지 돌아보고 다시 풀기"**이며, 이때 가장 강력한 단서는 AI의 일반 설명이 아니라 사용자가 실제로 한 풀이다. 자기 손글씨를 보면 "여기서 분배 잘못했네", "부호 실수했네" 같은 깨달음이 즉각 일어난다.

기술적으로는 데이터가 같은 키로 이미 저장되어 있어 추가 저장소나 마이그레이션이 필요 없다. 진단 화면에서 같은 키로 **읽기만** 하면 된다.

---

## 2. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| **범위** | `exam-diagnosis-session-screen` 한 화면만 |
| **기능 모드** | 읽기 전용 (수정 불가) |
| **UI 형태** | Toggle 버튼 → Half-sheet (아래에서 슬라이드 업, 화면 50%) |
| **회전 정책** | 세로 고정 (가로 unlock 안 함, exam-solve와 다름) |
| **빈 상태** | strokes 없는 문제는 토글 버튼 자체를 숨김 |
| **디바이스** | iPad/iPhone 동일 규칙 (strokes 유무로 판단) |
| **공통 컴포넌트 추출** | 이번 spec에서 안 함 — `ScratchpadCanvas` 재사용으로 충분 |
| **수정 기능** | 이번 spec 비목표 — 사용자 피드백 후 별도 spec |

---

## 3. 아키텍처 (개요)

```
exam-diagnosis-session-screen (세로 고정, 변경 없음)
├── DiagnosisDarkHeader
│   └── [신규] 우측 아이콘 버튼: 원본 풀이 보기
│        ├── strokes 있음 → 표시
│        └── strokes 없음 → 숨김
└── ExamDiagnosisPage (변경 없음)
     └── 문제 이미지 + AI 채팅 transcript

[신규] OriginalStrokesSheet (half-sheet 모달)
└── ScratchpadCanvas (read-only 모드)
     └── strokes 비율 유지 + pinch-zoom
```

**핵심 원리:**
- 같은 storage 키로 strokes를 읽기만 함 → 데이터 모델 변경 없음
- `ScratchpadCanvas`에 `readOnly` prop을 추가해 입력 차단 → 컴포넌트 재사용
- 진단 세션 자체는 회전 정책 변경 없음 → 기존 흐름 영향 최소화

---

## 4. 컴포넌트 / 파일 변경 목록

### 신규 파일

```
features/quiz/exam/components/original-strokes-sheet.tsx
  └─ Half-sheet UI (드래그 핸들, 닫기 버튼, ScratchpadCanvas 래핑)
     - props: { visible, examId, problemNumber, accountKey, onClose }
     - strokes는 마운트 시 storage에서 로드
     - 빈 상태(로드 결과 strokes 없음)는 부모가 토글 버튼을 안 띄우므로 발생 X
       (방어용으로 fallback 메시지는 둠)

features/quiz/exam/hooks/use-problem-strokes.ts
  └─ examId/problemNumber/accountKey로 strokes 존재 여부와 데이터를 조회
     - return: { hasStrokes, strokes, loading }
     - 헤더 토글 버튼 표시 여부 판단에 사용
     - 시트가 열릴 때 동일 훅으로 데이터 사용
```

### 수정 파일

```
features/quiz/exam/components/scratchpad-canvas.tsx
  └─ readOnly prop 추가
     - true일 때: gesture handler 비활성, 새 stroke 시작 차단
     - 기존 그려진 strokes는 그대로 렌더
     - pinch-zoom은 readOnly에서도 허용 (별도 prop allowZoom 또는 readOnly가 함께 켜면 자동 활성)

features/quiz/components/diagnosis-dark-header.tsx
  └─ 우측에 원본 풀이 토글 버튼 슬롯 추가
     - props에 optional `onPressOriginalStrokes?: () => void` 와
       `showOriginalStrokesButton?: boolean` 추가
     - 둘 중 하나라도 falsy면 버튼 미표시 → 기존 사용처 호환 유지

features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
  └─ 현재 활성 problemNumber 기준으로 use-problem-strokes 훅 호출
  └─ 헤더에 buttons/콜백 props 전달
  └─ Half-sheet visible 상태 관리 (단일 boolean)
  └─ 활성 문제가 바뀌면 시트 자동 닫기 (state reset)
```

### 변경 없음 (재사용)

```
features/quiz/exam/storage/scratchpad-strokes-store.ts
  └─ 기존 loadScratchpad / Stroke 타입 그대로 사용

features/quiz/exam/hooks/use-scratchpad.ts
  └─ 진단 화면에서는 사용 X — 읽기 전용은 store 직접 호출이 단순함
     (use-scratchpad는 reducer/undo 등 편집 상태 포함이라 over-spec)
```

---

## 5. 데이터 / 좌표 처리

### Storage 키 동일성

`scratchpad-strokes-store.makeKey(accountKey, examId, problemNumber)` 그대로.
exam-solve에서 저장된 strokes를 진단 화면에서 동일 키로 읽기만 하면 된다.
**마이그레이션 불필요. 기존 사용자도 즉시 활용 가능.**

### 좌표 정규화 미적용 (= F1 spec과 동일 정책)

strokes는 exam-solve가 그려졌던 시점의 절대 픽셀 좌표 (예: iPad Pro 11" 가로 ≈ 1100×600 캔버스 기준).

진단 시트(세로 ≈ 700×400)에서는 **viewport scale**을 적용해 비율 유지하며 fit-to-width로 축소 표시한다. 사용자가 자세히 보고 싶을 때는 pinch-zoom으로 확대.

이 정책의 장점:
- exam-solve에서 본 그대로의 형태 (찌그러짐/뒤틀림 없음)
- 좌표 변환 로직이 단순 (transform: scale)
- 추후 strokes 정규화 spec이 따로 들어오면 이 화면도 자동 혜택

단점:
- 너무 작아서 한눈에 안 들어올 수 있음 → pinch-zoom으로 보완
- "원본 그대로"라는 사용자 기대와 일치하므로 부정적 단점은 적음

---

## 6. UX 시나리오

| # | 상황 | 동작 |
|---|---|---|
| 1 | 진단 진입, 활성 문제에 strokes 있음 | 헤더 우측에 토글 버튼 표시 |
| 2 | 진단 진입, 활성 문제에 strokes 없음 | 토글 버튼 숨김 |
| 3 | 토글 버튼 탭 | 시트가 아래에서 슬라이드 업 (50% 높이) |
| 4 | 시트에서 strokes 보기 | fit-to-width 표시, pinch-zoom 가능 |
| 5 | 시트 핸들을 위로 드래그 | 시트 더 펼침 (최대 ~85%) |
| 6 | 시트 핸들을 아래로 드래그 / 외부 탭 / X 버튼 | 시트 닫힘 |
| 7 | 시트 열린 상태에서 다음 문제로 swipe (iPhone) / dot 탭 | 시트 자동 닫힘, 새 문제 strokes 유무로 토글 갱신 |
| 8 | 시트에서 strokes 영역 외부 탭 | 닫기 (iOS half-sheet 표준) |
| 9 | 캔버스 위에서 그리기 시도 (실수) | 입력 차단 (readOnly), 아무 일 안 일어남 |
| 10 | 진단 완료 후 결과 화면으로 돌아감 | 시트 상태 사라짐 (스크린 unmount) |

---

## 7. 검증

### 단위 테스트 (신규)

```
__tests__/use-problem-strokes.test.ts
  - strokes 있는 문제 → hasStrokes: true
  - strokes 없는 문제 → hasStrokes: false
  - accountKey null → hasStrokes: false (안전 fallback)
  - examId/problemNumber 변경 시 재조회

__tests__/original-strokes-sheet.test.tsx (선택)
  - readOnly 캔버스에 gesture가 들어가지 않음
  - close 콜백이 핸들/X 버튼/외부 탭에서 호출됨
  - props.visible toggle 시 mount/unmount 적절
```

### 수동 시뮬레이터 점검 (iPad mini 6 / iPhone 15 Pro)

| # | 시나리오 | 기대 결과 |
|---|---|---|
| 1 | iPad 가로에서 1번 문제 풀이를 그림 → 시험 제출 → 약점 진단 진입 → 1번 활성 | 토글 버튼 보임, 시트 펼치면 strokes 표시 |
| 2 | 같은 흐름에서 strokes 없던 2번 문제로 dot 이동 | 토글 버튼 사라짐 |
| 3 | iPhone에서 진단 → 다른 기기에서 그렸던 strokes 확인 | 토글 보이고 시트 펼침, 축소 표시 |
| 4 | 시트 펼친 상태에서 swipe로 다음 문제 이동 | 시트 자동 닫힘 |
| 5 | 시트에서 pinch-zoom | 확대됨, 복귀 |
| 6 | 시트 안 캔버스 위에서 그리기 시도 | 아무 변화 없음 |

### 회귀 테스트

- `exam-solve-screen` scratchpad 동작 변경 없음 (`ScratchpadCanvas`에 readOnly prop만 추가)
- `DiagnosisDarkHeader`를 사용하는 다른 화면(`exam-result-screen-view` 등)에 토글 버튼이 노출되지 않는지 확인 (props 미전달 시 미표시)

### 빌드 검증

새 네이티브 모듈은 추가하지 않으므로 prebuild 불필요.
```bash
npm run typecheck
npm run lint
npm test -- use-problem-strokes
```

---

## 8. 위험 요약

| 위험 | 가능성 | 영향 | 대응 |
|---|---|---|---|
| **R1**: 가로에서 그린 strokes를 세로 시트에 띄울 때 너무 작아 식별 불가 | 중 | 중 | pinch-zoom으로 보완. 초기 사용자 반응 보고 fit-to-height 옵션 추가 검토 |
| **R2**: `DiagnosisDarkHeader` props 추가가 다른 사용처를 깨뜨림 | 낮음 | 중 | 모든 신규 props를 optional로 두고 default = 미표시. 기존 호출부 영향 없음 |
| **R3**: 시트 열린 상태에서 문제 swipe 시 시트가 멈춤 / 어색한 전환 | 낮음 | 낮음 | activeProblemIndex 변경을 감지해 visible=false로 강제 reset |
| **R4**: `ScratchpadCanvas`의 readOnly 모드에서 미처 막지 못한 gesture로 부작용 | 낮음 | 중 | gesture handler 자체를 disabled로, 추가로 "live stroke 시작 시 readOnly이면 early return" 두 겹 가드 |
| **R5**: pinch-zoom 도입으로 시트 자체의 드래그 제스처와 충돌 | 중 | 중 | 캔버스 영역 안에서는 zoom, 핸들 영역에서는 sheet drag로 영역 분리 |

---

## 9. 향후 작업 (이번 spec에서 제외)

### F1. 진단 화면에서 strokes 편집 (옵션 C 승격)

사용자 피드백에서 "여기서 다시 풀어보고 싶어요"가 명확히 나오면:
- 시트 안에 "다시 풀기" 모드 토글 추가
- 새 strokes는 별도 키 (`scratchpad-prefix-diagnosis/...`)로 저장 → 원본 보존
- 원본 strokes는 dimmed 배경으로 깔리고 새 strokes는 위에 그려지는 layered 표시 검토

### F2. 복습 화면 scratchpad

별도 spec에서 "복습 화면의 학습 의도 = 능동 재풀이 vs 흐름 안내"부터 brainstorm 후 결정.

### F3. 공통 split layout 컴포넌트 추출

진단/exam-solve 두 화면의 split 컨테이너가 정말 같은 모양인지 비교 후 판단. 이번에는 `ScratchpadCanvas`만 재사용하므로 추출 동기가 약함.

### F4. strokes 좌표 정규화

가로 → 세로 transform으로 인한 가독성 이슈가 누적되면 좌표를 [0,1] 정규화하는 별도 spec.

---

## 10. 비목표 (이번 spec에서 다루지 않음)

- ❌ 진단 화면에서 strokes 편집/그리기
- ❌ 복습 화면(`review-session-screen-view`) scratchpad
- ❌ 모의고사 화면 (이미 exam-solve-screen 재사용으로 자동 적용됨)
- ❌ 진단 화면의 가로 모드 unlock
- ❌ strokes 좌표 정규화 / 비율 보정
- ❌ 공통 split layout / toolbar 컴포넌트 추출
- ❌ exam-solve-screen 동작 변경 (`ScratchpadCanvas` readOnly prop 추가만 영향)

---

## 11. 참고

- 선행 spec: `docs/superpowers/specs/2026-05-07-ipad-landscape-exam-solve-design.md`
- 관련 코드:
  - `features/quiz/exam/storage/scratchpad-strokes-store.ts` (storage API)
  - `features/quiz/exam/components/scratchpad-canvas.tsx` (재사용 대상)
  - `features/quiz/components/diagnosis-dark-header.tsx` (헤더 props 확장)
  - `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` (메인 변경 화면)
- 디자인 패턴 참고: iOS Mail / Notes 의 첨부 보기 half-sheet
