# 약점 연습 진단 스타일 리디자인

- 작성일: 2026-04-20
- 상태: 기획중
- 작성자: 박기윤 / Claude

## 1. 배경

약점 기반 연습(`app/quiz/practice.tsx`) 화면에서 하단 선택지 패널이 화면을 과도하게 점유해 문제 본문이 거의 보이지 않는다.

근본 원인은 `features/quiz/components/quiz-practice-bottom-panel.tsx`의 `panelMaxHeight = clamp(height × 0.38~0.44, 220, 360)`이 제출 버튼·이중 `insets.bottom` 패딩·패널 자체 패딩과 합쳐져 **400~470px**를 차지한다는 점이다. iPhone SE(667px, compact) 기준 문제 본문이 실질적으로 약 66px만 남는다.

동시에 졸업(`canGraduate`) 바가 노출되면 하단 패널의 `paddingBottom: Math.max(insets.bottom, 12)`와 졸업 바의 `paddingBottom: insets.bottom + lg`가 중복되어 불필요한 여백이 쌓이는 부차적 문제도 있다.

## 2. 목표

- 문제 본문이 화면에 충분히 노출되도록 약점 연습 화면을 **약점 진단 10문제 풀이 화면과 동일한 구조**로 재구성한다.
- 진단과 공용으로 쓸 수 있는 컴포넌트(`QuizSolveHeader`, `QuizQuestionCard`)를 추출해 UI 일관성을 확보하고 중복을 제거한다.
- 피드백(정답/오답/코칭/해설) 플로우, 졸업(`graduateToPractice`), 기록 저장(`recordAttempt`) 등 **기존 비즈니스 로직은 변경하지 않는다**.

## 3. 비목표

- 문제 데이터(`practiceMap`, `challengeProblem`) 변경.
- 피드백 문구 카피 변경.
- 졸업 플로우·복습 큐 규칙 변경.
- 진단 화면(`features/quiz/screens/diagnostic-screen.tsx`)의 동작/비주얼 변경. 내부 컴포넌트 추출은 허용하되, 진단 화면의 최종 렌더 결과는 픽셀 수준에서 동일해야 한다.
- 태블릿 레이아웃 재설계(현행 `QuizSolveLayout`의 tablet 분기는 그대로 사용).

## 4. 최종 UX 구조

### 4.1 화면 컴포넌트 트리

```
quiz-practice-screen.tsx (Thin)
 └─ quiz-practice-screen-view.tsx
     ├─ empty 상태 (activeProblem 없음)
     │   └─ BrandHeader compact + emptyCard (현행 유지)
     │
     └─ 일반 상태
         ├─ QuizSolveLayout (기존)
         │   ├─ header : QuizSolveHeader (신규 공용)
         │   ├─ body   : QuizQuestionCard (신규 공용)
         │   └─ footer : QuizPracticeFooter (신규)
         │               ├─ 피드백 없음 : 원형 1~N 선택 + "정답 확인"
         │               └─ 피드백 있음 : 기존 feedback 패널 컨텐츠
         ├─ GraduateFloatingBar (canGraduate=true 시)
         └─ QuizPracticeExitConfirmModal (isExitModalVisible 시)
```

### 4.2 화면 상태

| 상태 | header | body | footer | 부가 |
|---|---|---|---|---|
| 로딩(현행 없음) | — | — | — | 해당 없음 |
| 빈 상태 | BrandHeader compact | emptyCard + BrandButton | 없음 | — |
| 문제 풀이(피드백 없음) | QuizSolveHeader | QuizQuestionCard | 원형 선택 + 정답확인 | canGraduate 시 GraduateFloatingBar |
| 피드백 표시 | QuizSolveHeader | QuizQuestionCard (선택 표시 유지) | 기존 피드백 카드 + 액션 버튼 | canGraduate 시 GraduateFloatingBar |

### 4.3 헤더 구성

- 좌: `← Back` — 탭 시 `QuizPracticeExitConfirmModal` 표시.
- 중앙: `screenTitle` (mode에 따라 "약점 기반 연습" / "심화 문제" / "오늘 복습").
- 우: `currentQuestionNumber / questionCount` 카운터.
- 하단: 프로그레스 바 (`progressPercent`).

### 4.4 카운터 계산

```
weakness (state.result && state.practiceMode === 'weakness'):
  current = state.practiceIndex + 1
  total   = state.practiceQueue.length

weakness (direct URL, state.result 없음) | challenge:
  current = 1
  total   = 1

review:
  total   = summary.dueReviewTasks.length 의 최초 진입 시점 스냅샷
  current = total - reviewQueue.length + 1
```

- review 모드의 `total`은 화면 마운트 시점에 ref로 고정해 큐 소진에 따라 카운터가 비정상적으로 변하지 않도록 한다(`useRef` + `useEffect` on mount).
- `progressPercent` = `(current / total) * 100`, 템플릿 리터럴 `${number}%` 포맷 유지(진단과 동일).

### 4.5 졸업 바 (GraduateFloatingBar)

- 표시 조건: `canGraduate === true` (현행 `activeMode === 'weakness' && solvedCount > 0 && !profile?.practiceGraduatedAt`).
- 위치: 화면 최하단, `QuizSolveLayout` 바깥에서 sibling으로 렌더링(현행 구조 유지).
- 스타일 톤다운:
  - `BrandButton variant="neutral"` → `variant="outline"` 또는 동등한 보조 톤(선택지·정답확인과의 시각 경합 최소화).
  - 높이 축소: `paddingTop: BrandSpacing.xs`, `paddingBottom: insets.bottom + BrandSpacing.sm` (현행 `sm + lg` 대비 축소).
- **이중 safe-area 제거**:
  - `QuizPracticeFooter`는 `paddingBottom` 적용하지 않는다.
  - `QuizSolveLayout`의 mobile `footerWrap`이 단일하게 `paddingBottom: Math.max(insets.bottom, 12)` 처리.
  - `GraduateFloatingBar`가 표시될 때는 `footerWrap`의 safe-area 패딩을 0으로 바꾸고, `GraduateFloatingBar`만 `insets.bottom`을 흡수한다.
  - 구현: `QuizSolveLayout`에 `footerSafeArea?: boolean` prop 추가(기본 true). 약점 연습이 졸업 바 노출 시 false 전달.
- 진단 화면은 변경 없음. 진단은 `footerSafeArea` prop을 주지 않으므로 기본 true로 기존 동작 유지.

### 4.6 QuizPracticeFooter 구성

- **피드백 없음**: `DiagnosticSolveBottomPanel` 패턴을 참조하여 유사 구현.
  - 원형 1~N 버튼 row (선택지 개수에 맞춰 동적 생성; 진단은 항상 5개지만 연습은 `activeProblem.choices.length` 기반).
  - 하단에 `BrandButton title="정답 확인"`, `onPress={onSubmit}`, `disabled={selectedIndex === null}`.
- **피드백 있음**: 기존 `quiz-practice-bottom-panel.tsx`의 피드백 렌더 로직(`feedbackPanel`, `feedbackScroll`, `renderPracticeFeedback`)을 그대로 이관.
  - 액션 버튼, `isPersistingAttempt` 상태, `persistErrorMessage` 표시 동일.
- `ScrollView maxHeight`는 더 이상 필요 없다(본문이 body scroll로 옮겨졌으므로). 피드백 본문은 길어질 수 있어 자체 `ScrollView`는 유지하되 `maxHeight` 대신 `flexShrink: 1` 기반으로 조절한다. 진단 화면은 이 컴포넌트를 사용하지 않으므로 영향 없음.

### 4.7 QuizQuestionCard (공용)

- 현 `DiagnosticQuestionCard`를 그대로 `QuizQuestionCard`로 이름만 변경해 공용화.
- props: `{ question: string; choices: string[]; selectedIndex: number | null; isCompactLayout: boolean; subtitle?: string }`
  - `subtitle`은 약점 연습의 `weaknessLabel` 표시용(예: "인수분해"). 현재 진단은 subtitle 없음.
  - 스타일: subtitle 표시 시 questionText 위에 `color: BrandColors.primarySoft`, 기존 practice의 subtitle 스타일과 동일.
- 진단 화면은 `subtitle` 미전달로 기존 동작 유지.

### 4.8 QuizSolveHeader (공용)

- 현 `DiagnosticSolveHeader`를 그대로 `QuizSolveHeader`로 이름 변경해 공용화.
- props에 `title: string` 추가(기존은 "약점 진단" 고정). 진단 측 콜사이트에서 `title="약점 진단"` 명시적으로 전달.
- 그 외 props, 스타일, safeArea, progressTrack 동일.

### 4.9 Exit Confirm Modal

- `DiagnosticSolveExitModal`은 연습 전용 카피("진단을 중단할까요?")를 포함할 수 있으므로 확인 후 공용화 여부 결정.
  - 만약 카피가 공용 가능(예: "문제 풀이를 중단할까요?")하면 `QuizSolveExitModal`로 공용화.
  - 공용화가 카피 변경을 수반하면 이번 작업 범위에서 제외하고, 연습용 `QuizPracticeExitConfirmModal`을 **별도 신규 파일로** 추가한다.
- 구현 단계에서 `DiagnosticSolveExitModal`의 카피를 실제 확인 후 결정. 본 스펙은 "공용화 시도 → 카피 충돌 시 별도 파일로" 원칙만 명시.

## 5. 데이터 흐름 / 훅 변경

`features/quiz/hooks/use-practice-screen.ts` 반환값에 다음 파생값 추가:

| 키 | 타입 | 계산 근거 |
|---|---|---|
| `currentQuestionNumber` | `number` | §4.4 |
| `questionCount` | `number` | §4.4 |
| `progressPercent` | `` `${number}%` `` | (current/total*100).toFixed(0) + '%' |
| `isExitModalVisible` | `boolean` | `useState` |
| `onOpenExitModal` | `() => void` | setIsExitModalVisible(true) |
| `onCloseExitModal` | `() => void` | setIsExitModalVisible(false) |
| `onConfirmExit` | `() => void` | `router.replace('/(tabs)/quiz')` 후 모달 닫음 |

기존 반환값은 전부 유지하되 다음은 view 단에서 새 컴포넌트로 재배치만 이루어진다:

- `selectedIndex`, `onSelectChoice`, `onSubmit`, `feedback`, `continueLabel`, `onContinue`, `onRetry`, `isPersistingAttempt`, `persistErrorMessage` → `QuizPracticeFooter`로 전달.
- `screenTitle`, `weaknessLabel` → `QuizQuestionCard` subtitle + `QuizSolveHeader` title에 분배.
- `canGraduate`, `isGraduating`, `onGraduate` → `GraduateFloatingBar`로 전달.
- `activeProblem` → body로 전달.

훅 내부 로직은 카운터 파생 계산과 exit modal state 추가 외에는 동일.

## 6. 스타일/레이아웃 세부

- 본문 스크롤 영역의 `bodyContentContainerStyle`: 진단과 동일한 `paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, gap: 18`(compact 시 `paddingTop: 8, paddingBottom: 10, gap: 16`).
- `QuizQuestionCard`의 subtitle 표시 위치: questionText 상단, `marginBottom: 6`.
- 원형 버튼 개수: `activeProblem.choices.length`. 진단의 `[0..4]` 하드코드는 그대로 두고, 연습 전용 footer에서는 `choices.length` 사용.
- Graduate 바가 노출될 때 footer와의 수직 간격: 0(바로 붙음). 경계선은 `borderTopWidth: 1, borderTopColor: rgba(41, 59, 39, 0.08)`로 구분.

## 7. 에러/엣지

| 케이스 | 처리 |
|---|---|
| `activeProblem === undefined` | empty 상태 화면(현행 동일) |
| `choices.length === 0` | 방어적으로 원형 버튼 렌더 생략, "정답 확인" 비활성 |
| `choices.length > 5` | 원형 row가 넘치면 `flexWrap: 'wrap'` 허용 (진단과 다른 점) |
| `isPersistingAttempt === true` | "정답 확인"/"다음" 버튼 비활성, 라벨 "기록 저장 중..." |
| `persistErrorMessage` 있음 | 피드백 하단 경고 텍스트(현행 동일) |
| exit modal 표시 중 footer 상호작용 | 모달이 상위 레이어에 있으므로 자연 차단 |
| canGraduate 상태가 피드백 중 변동 | canGraduate는 solvedCount 기반이라 피드백 확정 후에만 변경됨. 피드백 표시 중에는 기존 값 유지 |

## 8. 테스트 / 검증

**수동 체크(우선)**:

- [ ] iPhone SE(375×667), iPhone 14(390×844), iPad Mini 가로/세로에서 문제 본문이 스크롤 없이도 첫 2~3줄 이상 노출되는지.
- [ ] 선택지 5개 기준 원형 버튼 1~5 선택 → 정답 확인 → 피드백 전환 → 다음 문제 이동이 깨지지 않는지.
- [ ] 피드백 `correct` / `retry` / `coaching` / `resolved` 네 분기 모두 렌더되는지.
- [ ] `isPersistingAttempt`가 true일 때 버튼 상태·라벨 동일한지.
- [ ] Back → Exit modal → 확인 시 `/(tabs)/quiz`로 이동, 취소 시 문제 유지.
- [ ] `canGraduate=true`일 때 졸업 바가 표시되고, 이중 safe-area 여백이 사라졌는지.
- [ ] `canGraduate=false` 혹은 `practiceGraduatedAt` 있을 때 졸업 바가 나타나지 않는지.
- [ ] 졸업 성공 시 `/(tabs)/quiz`로 이동 후 이전 화면으로 돌아오지 않는지.
- [ ] 태블릿 분기(`QuizSolveLayout` tablet)가 깨지지 않는지(좌우 2컬럼 유지, 우측 footer에 원형·정답확인).
- [ ] 진단 화면의 시각/동작이 회귀하지 않는지(카운터·헤더·body·footer 동일).

**자동 검증**:

- `npx tsc --noEmit` 통과.
- `npm run lint` 통과(기존 규칙 범위 내).
- `npm run test`가 있다면 관련 파일 테스트 통과. 없으면 생략.

## 9. 마이그레이션 영향 범위

**변경 파일**:

- 신규: `features/quiz/components/quiz-solve-header.tsx` (기존 diagnostic-solve-header 이동)
- 신규: `features/quiz/components/quiz-question-card.tsx` (기존 diagnostic-question-card 이동)
- 신규: `features/quiz/components/quiz-practice-footer.tsx`
- 신규: `features/quiz/components/graduate-floating-bar.tsx`
- 신규(조건부): `features/quiz/components/quiz-practice-exit-confirm-modal.tsx`
- 수정: `features/quiz/components/quiz-practice-screen-view.tsx` (전면 재작성)
- 수정: `features/quiz/hooks/use-practice-screen.ts` (반환값 추가)
- 수정: `features/quiz/components/diagnostic-quiz-stage.tsx` (새 공용 컴포넌트 참조로 교체)
- 수정: `features/quiz/components/quiz-solve-layout.tsx` (footerSafeArea prop 추가)
- 삭제: `features/quiz/components/diagnostic-solve-header.tsx` (이동)
- 삭제: `features/quiz/components/diagnostic-question-card.tsx` (이동)
- 삭제: `features/quiz/components/quiz-practice-bottom-panel.tsx` (footer로 흡수)

**영향 없는 파일(확인 대상)**:

- `app/quiz/practice.tsx`, `app/quiz/diagnostic.tsx`, `app/quiz/_layout.tsx`: 라우트 레이어는 변경 없음.
- `features/quiz/session.tsx`, `features/learner/provider.tsx`: Provider·상태 흐름 변경 없음.

## 10. 릴리스 체크

- Expo 규칙: 컴포넌트 파일 추가·삭제는 네이티브 빌드에 영향 없음. `expo prebuild --clean` 불필요.
- 개발 검증: `npx expo run:ios` (또는 기존 개발 빌드)로 실제 디바이스/시뮬레이터에서 §8 체크리스트 수행.
- Notion "DASIDA 개발 기록" 초안 페이지 생성(상태: 기획중) — 스펙 저장 직후.

## 11. 오픈 이슈

- `DiagnosticSolveExitModal` 카피 확인 후 공용화 여부 최종 결정 (구현 단계).
- 졸업 바 `variant="outline"`에 해당하는 BrandButton variant가 이미 존재하는지 확인. 없으면 기존 `neutral`을 축소 스타일로 사용.
