# 학습 여정 State 재설계 (Phase 1)

- 작성일: 2026-04-20
- 작성자: Claude (브레인스토밍 세션)
- 상태: 기획중
- 관련 스킬: building-native-ui, dasida-code-structure, native-data-fetching
- 슬러그: learning-journey-state-redesign

## 1. 배경 · 문제 정의

### 사용자가 느낀 불편
약점 분석 완료 화면에서 X 버튼을 누르고 홈으로 돌아오면, 아래와 같은 문제가 발생한다.

- 말풍선은 여전히 `"내 약점을 분석 중이에요..."` → 실제로는 분석이 이미 끝났는데 진행 중처럼 보임
- 상단의 `NoReviewDayCard`(잠깐 실력 확인해볼까요?)와 아래의 `HomeWeaknessSection`(약점 차트·목록)이 함께 노출되어, 메시지 초점이 흐트러짐
- 완료 화면의 X 버튼이 아무 상태도 바꾸지 않기 때문에, X 누른 전후가 동일한 화면으로 보임

### 코드 레벨 원인

`features/learning/home-journey-state.ts`의 현재 단계 판단 로직은 아래 4개 state만 관리한다.

```
diagnostic → analysis → review → exam
```

각 단계 전이 조건:
- `diagnostic → analysis`: `latestDiagnosticSummary` 생성
- `analysis → review`: `dueReviewTasks`가 생김 (시스템 스케줄링 기반)
- `review → exam`: 최근 진단 이후 `recentActivity`에 'review' 기록
- `exam → graduated`: `profile.practiceGraduatedAt` 설정

구조적 한계:
- "결과를 확인했는지"를 구분하는 플래그가 없음 → analysis 단계가 결과 확인 전/후를 모두 포괄
- 진단/연습을 중간에 나간 "중단 상태"를 표현할 수 없음
- state 수가 실제 사용자 여정의 단계보다 적어 각 상황에 맞는 메시지를 보여주지 못함

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| **학습 여정** | 10문제 약점진단 → 약점 파악(결과 확인) → 약점 연습문제까지 다 푸는 일련의 과정 |
| **여정보드** | 홈 화면에 뜨는 STEP 1~4 카드 + 캐릭터 + 말풍선 + CTA 버튼 단위 (`JourneyBoard` 컴포넌트) |
| **여정 종료** | 학습 여정을 공식적으로 끝냈다고 마크하는 행위. `practiceGraduatedAt`이 설정됨 |
| **이정표(milestone)** | 되돌릴 수 없는 시각 이벤트. 예: 결과 처음 본 시각, 연습 처음 완료 시각 |

## 3. 유저 분류

이번 작업에서 여정보드가 다뤄야 하는 유저는 3가지로 분류된다.

1. **여정 미시작** — 진단 한 번도 안 함
2. **여정 진행 중** — 아래 새 State 모델의 2~6에 해당
3. **여정 완료** — `practiceGraduatedAt`이 설정됨. 이때는 여정보드 자체가 숨겨지고 일반 퀴즈 허브로 전환

## 4. 새 State 모델 (7가지)

### State 정의

| # | State | 의미 | 판별 조건 |
|---|---|---|---|
| 1 | `journey_not_started` | 진단 한 번도 안 함 | `latestDiagnosticSummary` 없음 |
| 2 | `diagnostic_in_progress` | 진단 풀다 중단 | (Phase 2 범위) 진단 세션이 서버에 "미완료"로 저장됨 |
| 3 | `result_pending` | 진단 완료, 결과 아직 안 봄 | `latestDiagnosticSummary` 있음 + `latestDiagnosticResultViewedAt` 없음 |
| 4 | `viewed_pre_practice` | 결과 봤지만 연습 시작 전 | `latestDiagnosticResultViewedAt` 있음 + 연습 활동 없음 |
| 5 | `practice_in_progress` | 연습 풀다 중단 | (Phase 2 범위) 연습 세션이 서버에 "미완료"로 저장됨 |
| 6 | `journey_complete_pending` | 연습 완료, 여정 종료 직전 | 최근 진단 이후 'review' 활동 존재 + `practiceGraduatedAt` 없음 |
| 7 | `journey_graduated` | 여정 완료, 여정보드 숨김 | `practiceGraduatedAt` 있음 |

### 상태 전이 다이어그램

```
[1. journey_not_started]
        │ (진단 시작)
        ▼
[2. diagnostic_in_progress] ──┐
        │                      │ (Phase 2에서 분기)
        │ (10문제 완료)         │
        ▼                      │
[3. result_pending] ◀──────────┘
        │ (결과 화면 첫 진입)
        ▼
[4. viewed_pre_practice] ─────┐
        │                      │ (Phase 2에서 분기)
        │ (연습 시작)           │
        ▼                      │
[5. practice_in_progress] ◀────┘
        │ (첫 연습 완료)
        ▼
[6. journey_complete_pending]
        │ (새로 시작 버튼)
        ▼
[7. journey_graduated] (여정보드 숨김)
```

### Phase 1 기준 실제 구현되는 state

Phase 1에서는 **중단 상태(2, 5)를 제외한 5가지 state**를 구현한다.
- 2, 5는 서버 세션 저장 구조가 필요하므로 Phase 2로 분리
- 구현 대상: `journey_not_started`, `result_pending`, `viewed_pre_practice`, `journey_complete_pending`, `journey_graduated`

## 5. 각 State별 여정보드 화면 컨텐츠

### Phase 1 대상 5 state의 문구/CTA

| State | 말풍선 | CTA 라벨 | CTA 아래 안내 | 섹션 가시성 |
|---|---|---|---|---|
| 1. journey_not_started | 반가워요! 첫 진단부터 시작해볼까요? | 첫 진단 시작하기 | 10문제로 지금 위치를 먼저 확인합니다 | 여정보드만 |
| 3. result_pending | 약점 찾기 끝! 결과부터 볼까요? | 약점 결과 보기 | 결과를 보면 연습 단계로 이어집니다 | 여정보드만 |
| 4. viewed_pre_practice | 약점 확인 끝! 이제 연습 차례예요 | 약점 연습 시작하기 | 약점 연습을 마치면 여정이 완성됩니다 | 여정보드만 |
| 6. journey_complete_pending | 여정을 다 돌아봤어요. 새 출발 준비됐나요? | 새로 시작하기 → | 여정을 마무리하고 일반 허브로 이동합니다 | 여정보드만 |
| 7. journey_graduated | — | — | — | 여정보드 숨김, 일반 허브 (기존) |

### 섹션 가시성 규칙

여정 진행 중(state 1, 3, 4, 6)은 홈에서 아래 섹션을 숨긴다.
- `NoReviewDayCard` (상단 "잠깐 실력 확인해볼까요?")
- `HomeWeaknessSection` (스크롤 시 나오는 약점 차트·목록)

여정 완료(state 7) 상태에서는 기존처럼 모든 섹션 노출.

## 6. 저장 전략 & 정규화 원칙

### 3원칙
1. **한 사실은 한 곳에만** — 같은 정보를 여러 컬렉션에 복제하지 않는다.
2. **파생 가능한 값은 저장하지 않는다** — `currentStep` 같은 계산 가능한 값은 메모리에서 매번 유도한다.
3. **도메인별 컬렉션 분리** — profile, sessions, activities 등 역할별 분리.

### Phase 1에서 추가되는 데이터

**`profile.latestDiagnosticResultViewedAt: string | null`** (ISO 타임스탬프)

- 위치: `users/{uid}/profile/data` (기존 profile 문서에 필드만 추가)
- 의미: 약점 결과 화면을 처음 본 시각. 한 번 설정되면 새로운 진단이 시작될 때까지 유지
- 갱신 시점: `/quiz/result` 진입 직후, 서버에 업데이트 요청
- 리셋 시점: 새 진단이 완료되어 `latestDiagnosticSummary`가 갱신되면 서버 측에서 `null`로 초기화

정규화 원칙 체크:
- ① 한 사실은 한 곳: profile 한 곳에만 저장 ✓
- ② 파생 저장 안 함: "결과 봤는지"는 이 필드로 1차 정보이므로 저장 타당 ✓
- ③ 도메인 분리: 학습자 메타데이터의 이정표이므로 profile이 적절 ✓

### Phase 1에서 **건드리지 않는** 부분
- `sessions` 컬렉션 (Phase 2)
- 진단/연습 세션의 로컬/서버 저장 구조
- 기존 `LearningAttempt`, `ReviewTask`, `recentActivity` 스키마

## 7. 구현 포인트 (파일 수준)

### 수정 파일

**`features/learner/types.ts`**
- `LearnerProfile`에 `latestDiagnosticResultViewedAt?: string` 필드 추가

**`features/learner/firestore-learner-profile-store.ts`**
- 필드 읽기/쓰기 매핑 추가
- 새 진단 완료 시 이 필드를 `null`로 리셋하는 로직 (서버 또는 클라이언트)

**`features/learner/current-learner-controller.ts`**
- `markDiagnosticResultViewed()` 액션 추가. `/quiz/result` 첫 진입 시 호출
- 이미 값이 있으면 재호출 생략

**`features/learning/home-journey-state.ts`**
- `JourneyStepKey` → `JourneyStateKey`로 확장. 타입을 위의 7가지 state로 변경
- `getCurrentStep` 로직을 새 state 모델로 재작성
- 각 state별 말풍선·CTA 라벨·CTA 안내 문구 매핑 테이블로 정리 (§5 표 그대로 반영)
- 캐릭터 위치(`currentStepKey`)는 기존 4단계 매핑을 유지하되, 새 state에서 적절한 단계로 매핑

**`features/quiz/hooks/use-quiz-hub-screen.ts`**
- `showJourneyBoard`, `showNoReviewDayCard` 계산을 새 state 기반으로 재작성
- `showWeaknessSection` 플래그 신규 도입 (여정 진행 중엔 false)
- `onPressJourneyCta`의 분기에 `journey_complete_pending` 상태 추가 → `graduateToPractice()` 호출

**`features/quiz/components/quiz-hub-screen-view.tsx`**
- `HomeWeaknessSection` 렌더링에 `showWeaknessSection` 플래그 연결
- `NoReviewDayCard` 렌더링 조건은 훅에서 이미 제어하므로 변경 최소

**`app/(tabs)/quiz/result.tsx` 또는 `features/quiz/hooks/use-result-screen.ts`**
- 화면 첫 렌더 시 `markDiagnosticResultViewed()` 호출 (이미 값이 있으면 no-op)

**`features/quiz/components/step-complete-screen-view.tsx`**
- 변경 없음 (X 버튼은 기존처럼 `router.replace('/(tabs)/quiz')`만 수행)
- 이유: 홈 여정보드가 state 6에서 "새로 시작하기" CTA를 스스로 제공하므로 X 버튼의 추가 책임 불필요

### 백엔드(서버) 작업

**`latestDiagnosticResultViewedAt` 필드를 다루는 엔드포인트 확장**
- `POST /updateLearnerProfile` 또는 유사 엔드포인트에서 이 필드 쓰기 허용
- 새 `LearningAttempt` (source='diagnostic')가 저장될 때 해당 필드를 `null`로 자동 리셋 (서버 측에서 처리하는 게 정규화에 안전)
- 구체 엔드포인트 이름은 기존 컨벤션에 맞춰 plan 단계에서 확정

## 8. Phase 2 예고 (이번 작업 범위 밖)

Phase 2에서는 진단/연습 세션의 중단 상태(state 2, 5)를 지원한다. 이를 위해 아래 작업이 필요하다.

- 서버에 `sessions/{uid}/{sessionId}` 컬렉션 신설
- 세션 종류: diagnostic, practice
- 필드: `startedAt`, `lastSavedAt`, `answers[]`, `currentIndex`, `kind`, `completedAt`
- 새 엔드포인트: `POST /saveSessionProgress`, `GET /listOngoingSessions`
- 클라이언트의 진단/연습 세션 컨텍스트를 "매 답 변경마다 throttle된 서버 저장"으로 재설계
- 홈 로드 시 ongoing sessions를 조회해 state 2, 5를 판별
- 멀티 디바이스 동기화를 위해 AsyncStorage 폴백 캐시만 허용, 소스 오브 트루스는 서버

Phase 1 완료 후 사용성을 보고 Phase 2 착수 여부와 우선순위를 결정한다.

## 9. 테스트 시나리오 (Phase 1)

### 시나리오 A. 첫 진단부터 졸업까지
1. 계정 생성 직후 → state 1 (`journey_not_started`)
2. 10문제 진단 완료 → StepCompleteScreenView(diagnostic/analysis) 노출
3. 완료 화면에서 X 버튼 누름 → 홈 이동 → **state 3 (`result_pending`)**
   - 기대: 말풍선 "약점 찾기 끝! 결과부터 볼까요?", CTA "약점 결과 보기", NoReviewDayCard/HomeWeaknessSection 숨김
4. "약점 결과 보기" 클릭 → `/quiz/result` 진입 → `latestDiagnosticResultViewedAt` 기록됨
5. 결과 화면에서 홈 돌아옴 → **state 4 (`viewed_pre_practice`)**
   - 기대: 말풍선 "약점 확인 끝! 이제 연습 차례예요", CTA "약점 연습 시작하기"
6. 연습 진행 & 1회 완료 → **state 6 (`journey_complete_pending`)**
   - 기대: 말풍선 "여정을 다 돌아봤어요. 새 출발 준비됐나요?", CTA "새로 시작하기 →"
7. "새로 시작하기" 클릭 → `graduateToPractice()` → **state 7 (`journey_graduated`)**, 여정보드 숨김

### 시나리오 B. 여정 완료 화면에서 X 버튼
1. 연습까지 끝난 상태에서 practice 완료 화면 ("이제 새로운 시작이에요!") 노출
2. X 버튼 누름 → 홈 이동 → **state 6 유지**
3. 여정보드에 "새로 시작하기 →" CTA가 뜸 → 거기서도 여정 마무리 가능

### 시나리오 C. 멀티 디바이스
1. 아이폰에서 진단 완료 → 결과 화면 열기 → `latestDiagnosticResultViewedAt` 서버에 기록
2. 아이패드로 전환 → 홈 열면 **state 4**로 계산됨 ✓

### 회귀 위험 확인
- `HomeWeaknessSection`은 여정 완료 후에만 보여야 함. state 3, 4, 6에서 숨겨지는지 검증
- 기존 `practiceGraduatedAt` 기반 "졸업 후 여정보드 숨김"이 그대로 동작하는지 회귀 테스트
- 결과 화면을 보지 않고 직접 `/quiz/practice`로 진입해도 `latestDiagnosticResultViewedAt`이 설정되지 않아 state 3→4 진입이 안 되는 이슈가 있을지 확인 (진입 시점을 확정할 것)

## 10. Out of Scope (이번 Phase 1에서 하지 않는 일)

- 진단/연습 세션의 중단 상태 감지 (Phase 2)
- 서버 `sessions` 컬렉션 신설 (Phase 2)
- 이어 풀기(resume) UX 구현 (Phase 2)
- `StepCompleteScreenView`의 X 버튼 동작 변경 (그대로 유지)
- 캐릭터 이미지 교체
- `JourneyBoard` 컴포넌트의 레이아웃 재디자인 (문구·CTA 라벨만 교체)
- 기존 `JourneyStepKey` 기반 타 위치 로직 (애널리틱스 로깅 등)의 광범위 리팩토링

## 11. 다음 단계

1. 본 spec 사용자 승인
2. Notion "DASIDA 개발 기록"에 초안 페이지 생성 (상태: 기획중)
3. 구현 계획 문서 작성: `docs/superpowers/plans/2026-04-20-learning-journey-state-redesign.md`
4. 계획 승인 후 구현 시작
