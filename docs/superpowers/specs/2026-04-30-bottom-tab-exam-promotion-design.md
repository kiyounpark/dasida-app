# 바텀 탭 4탭화 + 기출 탭 분리 설계

- 작성일: 2026-04-30
- 상태: 기획중
- 관련 영역: 네비게이션 (`app/(tabs)`), 모의고사/학력평가 진입 흐름

## 배경 및 문제

현재 바텀 탭은 3탭 구조(`문제 풀기 / 내 기록 / 설정`)이며, 모의고사/학력평가 선택 화면(`exam-selection-screen`)은 "문제 풀기" 탭 내부의 중첩 스택으로 들어가 있다. 이 때문에:

1. **기출(모의고사/학력평가) 진입이 홈(학습 여정)에서만 가능** — 다른 탭에 있을 때 기출을 풀려면 항상 홈 탭으로 돌아온 뒤 진입해야 한다.
2. **"문제 풀기"라는 탭 라벨이 모호** — 학습 여정(일상 학습)과 모의고사(실전 테스트)가 한 라벨에 묶여 있어, 사용자 입장에서 두 활동의 위계가 불분명하다.

사용자는 "어디서든 바로 모의고사로 진입할 수 있게" 해달라고 요청했고, 동시에 학력평가도 같은 영역에 함께 있다는 점을 고려해야 한다.

## 목표

- 기출(모의고사 + 학력평가)을 1-depth 탭으로 승격해 어느 화면에서든 한 번의 탭으로 진입 가능하게 한다.
- 기존 학습 여정(홈)과 기출의 의미적 분리를 명확히 한다.
- 졸업(`isGraduated`) 전 학습 여정 중심 흐름은 그대로 보존한다 (탭바 hidden 정책 유지).
- 라우트 변경에 따른 기존 코드 영향 범위를 최소화한다.

## 비목표

- 모의고사 풀이/결과/진단 세션 화면(`app/quiz/exam/*`) 자체의 변경.
- 학력평가/모의고사 토글 UI(`exam-selection-screen-view`) 자체의 변경.
- 탭바 시각 디자인 톤 조정(배경, 높이, 폰트 등) — 현재 스타일 그대로 유지.
- 졸업 전 사용자에게 기출 탭 노출. (졸업 후에만 노출 정책 유지)

## 최종 탭 구조

| 위치 | 라벨 | 라우트 폴더 | 아이콘 (SF Symbol) |
| --- | --- | --- | --- |
| 1 | 홈 | `app/(tabs)/quiz` (기존 유지) | `doc.text.magnifyingglass` (기존) |
| 2 | 기출 ✨ | `app/(tabs)/exam` (신규) | `pencil.and.list.clipboard` |
| 3 | 기록 | `app/(tabs)/history` (기존) | `note.text` |
| 4 | 설정 | `app/(tabs)/profile` (기존) | `gearshape.fill` |

- `quiz` 탭은 라벨만 `문제 풀기` → `홈` 으로 변경한다. 라우트 폴더명은 `quiz` 그대로 유지한다 (코드베이스 16곳의 `/(tabs)/quiz` 참조 영향을 0으로 만들기 위함).
- 기출 탭은 진입 시 기존 `exam-selection-screen`(모의고사/학력평가 토글 포함)을 그대로 재사용한다.
- 탭바 가시성은 기존 정책 유지: `isGraduated === true` 일 때만 노출.
- `initialRouteName="quiz"` (홈) 도 그대로 유지.

## 아키텍처 변경 요약

### 신설

- `app/(tabs)/exam/_layout.tsx` — 단일 Stack 레이아웃 (향후 기출 하위 화면 확장 여지 확보)
- `app/(tabs)/exam/index.tsx` — `features/quiz/screens/exam-selection-screen` re-export

### 삭제/이동

- `app/(tabs)/quiz/exams.tsx` — 삭제
- `app/(tabs)/quiz/_layout.tsx` — `<Stack.Screen name="exams" />` 항목 제거

### 수정

- `app/(tabs)/_layout.tsx`
  - `quiz` 탭 `title`: `'문제 풀기'` → `'홈'`
  - `exam` 탭 `<Tabs.Screen>` 추가 (위치는 `quiz` 다음, `history` 앞)
  - 기출 탭에도 `tabBarStyle: isGraduated ? defaultTabBarStyle : { display: 'none' }` 동일 정책 적용
  - 기출 탭 동일 `tabPress` listener는 불필요 (기출은 단일 진입점이라 같은 탭 재탭 시 push 없음)

### 라우트 참조 갱신 (총 2곳)

- `features/quiz/hooks/use-mock-exam-intro-screen.ts:9` — `'/(tabs)/quiz/exams'` → `'/(tabs)/exam'`
- `features/quiz/hooks/use-quiz-hub-screen.ts:190` — `'/(tabs)/quiz/exams'` → `'/(tabs)/exam'`

> 그 외 16곳의 `/(tabs)/quiz` 참조는 모두 학습 여정(홈)으로 향하는 정상 경로이므로 변경하지 않는다.

## 영향 분석

### 영향 받지 않는 영역

- 모의고사 풀이/결과/진단 화면(`app/quiz/exam/solve.tsx`, `app/quiz/exam/result.tsx`, `app/quiz/exam/diagnosis*.tsx`)은 루트 Stack에 등록되어 있어 (`app/_layout.tsx:141` `<Stack.Screen name="quiz" />`) 탭 구조 변경에 영향 없음.
- 모의고사 분석 진행 중 카드(`ExamAnalysisResumeCard`), 수집된 노트 리스트(`CollectedNotesList`) 등 홈 내부 컴포넌트는 그대로 동작.
- `ExamSessionProvider`, 진단 큐 빌더 등 도메인 로직은 변경 없음.
- 졸업 전 사용자: 탭바 자체가 hidden이므로 4탭이든 3탭이든 화면상 차이 없음. 졸업 직후 탭바가 처음 보일 때 4탭으로 노출됨.

### 잠재 위험

- **기출 탭 재탭(같은 탭 두 번 탭) 동작**: 기출 화면은 `exam-selection-screen` 단일 화면이라 stack reset 동작과 충돌하지 않음. `quiz` 탭에 있던 `tabPress` preventDefault listener는 `quiz` 탭에 그대로 두고, `exam` 탭에는 추가하지 않음.
- **딥링크/푸시 알림 라우팅**: `app/_layout.tsx` 알림 핸들러는 `'/quiz/review-session'` 으로 이동하므로 영향 없음.
- **back 동작**: 기출 진입 후 사용자가 back 제스처를 쓰면 expo-router 기본 동작에 따라 이전 탭으로 복귀(또는 OS 뒤로가기). 기존 `quiz/exams` Stack push 흐름 대비 UX 차이가 발생할 수 있으나, 탭 간 전환은 일반적으로 stack push가 아니라 tab switch라서 자연스러운 동작이다.

## 데이터 흐름 (변경 없음)

- 기출 진입 → `exam-selection-screen` → 회차 선택 → `app/quiz/exam/solve` 진입 → 결과/진단으로 이동.
- 분석 진행 중 카드는 홈(`quiz-hub-screen`)에 그대로 노출되며 `onResumeAnalysis` 핸들러도 그대로.

## 테스트 / 검증 항목

졸업 후 상태(`isGraduated === true`)에서 다음을 수동 확인한다.

1. 바텀 탭바에 `홈 / 기출 / 기록 / 설정` 4탭이 노출되는지.
2. 기출 탭 아이콘이 `pencil.and.list.clipboard`로 보이고 라벨 `기출`이 노출되는지.
3. 어느 탭에서든 `기출` 탭을 누르면 `exam-selection-screen`이 즉시 보이는지.
4. 기출 탭 → 회차 선택 → 풀이 시작 → 결과 → 진단 → 홈 복귀 전체 흐름이 정상 동작하는지.
5. 홈(`quiz-hub`)의 "모의고사 시작" CTA, `mock-exam-intro-screen`의 "모의고사 시작" 버튼 모두 새 라우트(`/(tabs)/exam`)로 이동하는지.
6. 모의고사 분석 진행 중 카드 → "이어서 분석" → 진단 세션 흐름이 정상 동작하는지.
7. 졸업 전 사용자에게 탭바가 여전히 hidden인지 (`onboarding`/`practice graduate` 시나리오).
8. 푸시 알림 탭 시 복습 세션 진입(`/quiz/review-session`)이 정상 동작하는지.

자동화 가능한 부분(라우트 등록 누락, 임포트 깨짐)은 `npx tsc --noEmit` 통과 여부로 1차 확인한다.

## 후속 정리(선택)

- 향후 `quiz` 폴더명을 `home`으로 통일하고 싶다면 별도 리팩터 작업으로 진행한다 (16곳 일괄 치환 필요). 본 작업 범위에는 포함하지 않는다.
