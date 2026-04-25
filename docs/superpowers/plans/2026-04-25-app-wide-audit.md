# 앱 전체 점검 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 출시 전 사용자 여정 순서(온보딩→홈→진단→분석→연습→설정→앱스토어)로 코드·UX를 빡세게 점검하고, Critical 이슈를 즉시 수정한다.

**Architecture:** 각 Task는 하나의 여정 단계를 담당한다. 코드 리뷰(파일 직접 읽기 + grep 패턴 검색)와 TypeScript 타입 검사를 병행하고, 발견된 이슈를 Critical/Minor로 분류해 보고한다. Critical 이슈는 Task 8에서 일괄 수정한다.

**Tech Stack:** Expo (React Native), TypeScript, Firebase Firestore + Functions, AsyncStorage, jest-expo

---

## 점검 등급 기준

| 등급 | 기준 |
|------|------|
| **Critical** | 크래시, 핵심 플로우 차단, 데이터 손실/오염, 잘못된 state 전이 |
| **Minor** | UX 불편, 엣지케이스 미처리, 문구 오류, 불필요한 re-render |

---

## 결과 기록 양식

각 Task 말미에 이 블록으로 결과를 기록한다:

```
## 점검 결과 — Task N: [단계명]

### Critical
- [ ] (없음 또는 내용)

### Minor
- [ ] (없음 또는 내용)
```

---

## Task 1: TypeScript 전체 빌드 검사

**Files:**
- Read: `tsconfig.json`, `package.json`

먼저 전체 타입 에러를 파악한다. 이후 단계에서 발견한 코드 이슈와 비교한다.

- [ ] **Step 1: TypeScript 전체 빌드 실행**

```bash
npx tsc --noEmit 2>&1 | head -100
```

Expected: 에러 목록 또는 `0 errors`

- [ ] **Step 2: 에러 건수 파악**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

- [ ] **Step 3: 에러 파일별 분류**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c | sort -rn | head -20
```

- [ ] **Step 4: 기존 테스트 전체 실행**

```bash
npx jest --passWithNoTests 2>&1 | tail -30
```

Expected: 통과/실패 건수 확인

- [ ] **Step 5: 결과 기록**

```
## 점검 결과 — Task 1: TypeScript 전체 빌드 검사

### Critical
- [ ] TS 에러 중 런타임 크래시 가능성 있는 항목 (undefined 접근, 잘못된 타입 캐스팅 등)

### Minor
- [ ] 잔존 TS 에러 (빌드는 되나 타입 불일치)
```

---

## Task 2: 온보딩 & 로그인 점검

**Files:**
- Read: `app/onboarding.tsx`, `app/sign-in.tsx`
- Read: `features/auth/firebase-auth-client.ts`, `features/auth/session-store.ts`
- Read: `features/auth/auth-policy.ts`
- Read: `features/onboarding/hooks/`, `features/onboarding/screens/`

- [ ] **Step 1: 온보딩 진입 조건 확인**

`app/_layout.tsx` 또는 진입 라우트에서 온보딩 판단 로직을 읽는다.

```bash
grep -n "onboarding\|isFirstLaunch\|hasCompletedOnboarding\|profileComplete" \
  app/_layout.tsx features/auth/session-store.ts 2>/dev/null | head -40
```

체크:
- 첫 실행 시 온보딩으로 정확히 라우팅되는가
- 온보딩 완료 후 재실행 시 홈으로 바로 가는가 (온보딩 반복 방지)

- [ ] **Step 2: 로그인 상태 유지 확인**

```bash
grep -n "persistSession\|AsyncStorage\|SecureStore\|token\|refresh" \
  features/auth/session-store.ts features/auth/firebase-auth-client.ts | head -40
```

체크:
- 앱 재시작 후 로그인 상태가 복원되는가
- 로그인 만료/에러 시 sign-in 화면으로 보내는가 (무한 로딩 없는가)

- [ ] **Step 3: 학년/트랙 선택 저장 확인**

```bash
grep -n "grade\|track\|onboardingProfile\|updateOnboardingProfile" \
  features/onboarding/hooks/*.ts features/onboarding/screens/*.tsx 2>/dev/null | head -40
```

체크:
- g1/g2 선택이 프로필에 올바르게 저장되는가
- 트랙 없이 학년만 선택해도 완료 가능한가 (의도된 경우)

- [ ] **Step 4: dev-guest 경로 격리 확인**

```bash
grep -rn "dev-guest\|devGuest\|isDevGuest\|local-anonymous" \
  features/auth/ features/learner/ | head -30
```

체크:
- dev-guest가 프로덕션에 노출되지 않는가
- `EXPO_PUBLIC_` 환경 변수 또는 `__DEV__` 가드가 있는가

- [ ] **Step 5: 결과 기록**

```
## 점검 결과 — Task 2: 온보딩 & 로그인

### Critical
- [ ]

### Minor
- [ ]
```

---

## Task 3: 홈 (여정보드) 상태 머신 점검

**Files:**
- Read: `features/learning/home-journey-state.ts` (전체)
- Read: `features/learning/home-state.ts`
- Read: `features/quiz/hooks/use-quiz-hub-screen.ts`
- Read: `features/learning/home-journey-state.test.ts`

- [ ] **Step 1: getCurrentState early-return 순서 검증**

`home-journey-state.ts`의 `getCurrentState` 함수를 읽고, 파일 상단 주석의 우선순위 순서와 실제 early-return 순서가 일치하는지 대조한다.

```bash
grep -n "return\|if (" features/learning/home-journey-state.ts | head -60
```

파일 상단 주석 순서:
1. `journey_graduated`
2. `diagnostic_analysis_pending`
3. `diagnostic_in_progress`
4. `journey_not_started`
5. `journey_complete_pending`
6. `practice_in_progress`
7. `viewed_pre_practice`
8. `result_pending`

실제 코드 순서가 위와 동일한지 확인한다. 불일치 시 Critical.

- [ ] **Step 2: stale 가드 3종 확인**

```bash
grep -n "isPendingDiagnosticFresh\|isPendingPracticeFresh\|hasValidPendingResume" \
  features/learning/home-journey-state.ts | head -20
```

각 함수가 `pendingAt > latestCompletedAt` 시간 기반 + attemptId 보조 가드 패턴을 따르는지 읽는다.

체크:
- `pendingAt`이 undefined일 때 false를 반환하는가 (undefined > timestamp = false, 안전한가)
- Date 비교가 `getTime()`이나 ISO 문자열 비교 중 어느 방식인가, 일관성 있는가

- [ ] **Step 3: showReviewHomeCard 가드 확인**

```bash
grep -n "showReviewHomeCard\|isGraduated\|ReviewHomeCard" \
  features/quiz/hooks/use-quiz-hub-screen.ts \
  features/quiz/components/quiz-hub-screen-view.tsx | head -20
```

체크:
- `showReviewHomeCard`가 `isGraduated` 가드를 포함하는가
- 여정 진행 중 상태에서 ReviewHomeCard가 조건부로 숨겨지는가

- [ ] **Step 4: 테스트 커버리지 확인**

```bash
grep -n "describe\|it(\|test(" features/learning/home-journey-state.test.ts | head -40
```

체크:
- 8개 state 각각에 대한 테스트 케이스가 있는가
- stale 가드 엣지케이스 (pendingAt=undefined, pendingAt < latestCompletedAt) 케이스가 있는가
- 없다면 Minor로 기록

- [ ] **Step 5: 테스트 실행**

```bash
npx jest features/learning/home-journey-state.test.ts --verbose 2>&1 | tail -30
```

Expected: 전체 통과

- [ ] **Step 6: 결과 기록**

```
## 점검 결과 — Task 3: 홈 (여정보드) 상태 머신

### Critical
- [ ]

### Minor
- [ ]
```

---

## Task 4: 진단 플로우 점검

**Files:**
- Read: `features/quiz/hooks/use-diagnostic-screen.ts`
- Read: `features/quiz/diagnosis-flow-engine.ts`
- Read: `features/quiz/diagnosis-router.ts`
- Read: `features/learning/home-journey-state.ts` (hasValidPendingResume 부분)

- [ ] **Step 1: isDiagnosing useEffect 무한루프 방지 확인**

```bash
grep -n "isDiagnosing\|hasNavigatedToAnalysisRef\|useEffect\|step-complete" \
  features/quiz/hooks/use-diagnostic-screen.ts | head -30
```

체크:
- `hasNavigatedToAnalysisRef`가 useEffect 의존성 배열 밖에서 선언되었는가
- `isDiagnosing` 감지 → step-complete 이동 후 ref가 `true`로 세팅되어 재진입 방지되는가
- dependency array에 불필요한 값이 있어 루프를 유발할 수 있는가

- [ ] **Step 2: resume 로직 확인**

```bash
grep -n "pendingResume\|hasValidPendingResume\|resume\|pendingAt\|attemptId" \
  features/quiz/hooks/use-diagnostic-screen.ts \
  features/learning/home-journey-state.ts | head -40
```

체크:
- 진단 중단 후 재진입 시 resume 조건이 올바르게 평가되는가
- `hasValidPendingResume`이 시간 기반 + attemptId 가드를 모두 통과해야 resume하는가
- resume 실패 시 처음부터 시작하는가 (무한 resume 루프 없는가)

- [ ] **Step 3: g1/g2 분기 확인**

```bash
grep -n "grade\|g1\|g2\|'g1'\|'g2'" \
  features/quiz/diagnosis-router.ts \
  features/quiz/diagnosis-flow-engine.ts \
  data/diagnosisMap.ts | head -40
```

체크:
- g2 학습자가 g1 진단 콘텐츠를 받지 않는가
- g2 진단 흐름에서 check 노드가 없는 경우 (`hasCheckNode` 가드) explain → final 직결인가
- 존재하지 않는 weaknessId 접근 시 크래시가 없는가

- [ ] **Step 4: 진단 완료 → step-complete 전환 확인**

```bash
grep -n "step-complete\|router.push\|router.replace\|diagnostic" \
  features/quiz/hooks/use-diagnostic-screen.ts | head -20
```

체크:
- 진단 완료 시 `step-complete?step=diagnostic`로 이동하는가
- `router.push` vs `router.replace` — 뒤로가기 시 진단 화면으로 돌아오지 않는가 (replace 사용 여부)

- [ ] **Step 5: 진단 중 뒤로가기 처리 확인**

```bash
grep -n "usePreventRemove\|BackHandler\|beforeRemove\|swipe.*back\|gestureEnabled" \
  features/quiz/hooks/use-diagnostic-screen.ts \
  app/\(tabs\)/quiz/_layout.tsx 2>/dev/null | head -20
```

체크:
- 진단 중 스와이프백/뒤로가기가 차단되는가
- 차단 미구현 시 진단 중단으로 올바르게 처리되는가

- [ ] **Step 6: 결과 기록**

```
## 점검 결과 — Task 4: 진단 플로우

### Critical
- [ ]

### Minor
- [ ]
```

---

## Task 5: 분석 플로우 점검

**Files:**
- Read: `features/quiz/exam/hooks/use-exam-diagnosis.ts`
- Read: `features/quiz/exam/exam-diagnosis-progress.ts`
- Read: `features/quiz/components/diagnosis-conversation-page.tsx`
- Read: `features/quiz/components/diagnosis-chat-bubble.tsx`

- [ ] **Step 1: 부분 완료 후 나가기 → 리포트 이동 확인**

```bash
grep -n "completedDiagnosisCount\|onExit\|router\|result\|report" \
  features/quiz/exam/hooks/use-exam-diagnosis.ts | head -30
```

체크:
- `completedDiagnosisCount >= 1` 조건으로 나가기 시 리포트로 이동하는가
- `completedDiagnosisCount === 0` 상태에서 나가기 시 그냥 뒤로 가는가
- 리포트 라우트 경로가 실제로 등록되어 있는가

```bash
grep -rn "exam-result\|examResult\|result" app/\(tabs\)/quiz/exam/ 2>/dev/null | head -20
```

- [ ] **Step 2: AsyncStorage 직렬화 큐 확인**

```bash
grep -n "queue\|serialize\|AsyncStorage\|save\|load\|progress" \
  features/quiz/exam/exam-diagnosis-progress.ts | head -40
```

체크:
- 직렬화 큐가 있는 경우, 동시 write 충돌이 방지되는가
- 앱 재시작 후 진행 상태 복원이 정상 동작하는가
- 복원 실패(파싱 오류) 시 초기 상태로 폴백하는가 (`try/catch`)

- [ ] **Step 3: AI 채팅 네트워크 오류 처리 확인**

```bash
grep -n "catch\|error\|Error\|loading\|isLoading\|isPending" \
  features/quiz/exam/hooks/use-exam-diagnosis.ts | head -30
```

체크:
- API 호출 실패 시 에러 메시지가 UI에 표시되는가
- 재시도 버튼이 있는가 (없으면 사용자가 막힘)
- 타임아웃 처리가 있는가

- [ ] **Step 4: 분석 완료 → step-complete 전환 확인**

```bash
grep -n "step-complete\|router\|analysis\|isComplete\|isDone" \
  features/quiz/exam/hooks/use-exam-diagnosis.ts | head -20
```

체크:
- 분석 완료 시 `step-complete?step=analysis`로 이동하는가
- 이미 완료된 분석을 다시 열면 어떻게 처리되는가

- [ ] **Step 5: 결과 기록**

```
## 점검 결과 — Task 5: 분석 플로우

### Critical
- [ ]

### Minor
- [ ]
```

---

## Task 6: 약점 연습 점검

**Files:**
- Read: `features/quiz/hooks/use-practice-screen.ts` (전체)
- Read: `features/quiz/screens/step-complete-screen.tsx`
- Read: `features/quiz/hooks/use-step-complete-screen.ts`
- Read: `features/learning/local-learning-history-repository.ts` (weakness 기록 부분)

- [ ] **Step 1: 완료 버튼 노출 타이밍 확인**

```bash
grep -n "canGraduate\|isGraduating\|continueLabel\|onGraduate\|lastQuestion\|isLast" \
  features/quiz/hooks/use-practice-screen.ts | head -30
```

체크:
- `canGraduate`가 마지막 문제 제출 후에만 `true`가 되는가
- 마지막 문제 제출 전에 완료 버튼이 노출되는 경우가 없는가
- `isGraduating` 중 다른 버튼들이 비활성화되는가

- [ ] **Step 2: resetSession 순서 확인**

```bash
grep -n "resetSession\|router\|step-complete\|push\|replace" \
  features/quiz/hooks/use-practice-screen.ts | head -20
```

체크:
- `resetSession()` 호출이 `router.push` **이전**에 일어나는가
- Android 백 스택에서 연습 화면으로 돌아왔을 때 세션이 초기화되어 있는가

- [ ] **Step 3: weakness 기록 kind='review' 확인**

```bash
grep -n "kind\|review\|weakness\|recentActivity\|recordAttempt" \
  features/learning/local-learning-history-repository.ts | head -40
```

체크:
- 자유 약점 연습 완료 시 `kind='review'`로 기록되는가 (state 6 전이 조건)
- `reviewStage`가 undefined인 경우에도 올바르게 처리되는가

- [ ] **Step 4: 스케줄 연습 중복 방지 확인**

```bash
grep -n "duplicate\|isDuplicate\|scheduledReview\|reviewTask\|alreadyDone" \
  features/learning/local-learning-history-repository.ts \
  features/quiz/hooks/use-practice-screen.ts | head -20
```

체크:
- 동일 스케줄 연습이 두 번 기록되지 않는가
- 기록 중 앱 종료 후 재진입 시 중복 기록이 생기지 않는가

- [ ] **Step 5: step-complete X 닫기 버튼 동작 확인**

```bash
grep -n "onDismiss\|isGraduating\|router.back\|dismiss\|X\|close" \
  features/quiz/hooks/use-step-complete-screen.ts \
  features/quiz/screens/step-complete-screen.tsx | head -20
```

체크:
- practice 단계에서 X 버튼이 `router.back()`을 호출하는가
- `isGraduating` 중에는 X 버튼이 비활성화되는가

- [ ] **Step 6: 결과 기록**

```
## 점검 결과 — Task 6: 약점 연습

### Critical
- [ ]

### Minor
- [ ]
```

---

## Task 7: 설정/프로필 점검

**Files:**
- Read: `features/profile/hooks/use-profile-screen.ts`
- Read: `features/profile/components/profile-screen-view.tsx`
- Read: `features/learner/current-learner-controller.ts`
- Read: `features/learner/firestore-learner-profile-store.ts`
- Read: `constants/legal-urls.ts`

- [ ] **Step 1: Firestore undefined 필드 필터링 확인**

```bash
grep -n "undefined\|filter\|Object.entries\|save\|track" \
  features/learner/firestore-learner-profile-store.ts | head -30
```

체크:
- `save()` 내에서 `undefined` 필드가 Firestore로 전송되지 않는가
- `Object.entries(...).filter(([, v]) => v !== undefined)` 패턴이 있는가
- `null`이나 `false`, `0` 같은 falsy 값은 보존되는가 (undefined만 제거)

- [ ] **Step 2: 학년 변경 시 로컬 기록 초기화 확인**

```bash
grep -n "clearLearningHistory\|onUpdateGradeAndTrack\|grade.*change\|confirm" \
  features/profile/hooks/use-profile-screen.ts | head -20
```

체크:
- 학년 변경 전 확인 모달이 반드시 표시되는가
- 확인 후 `clearLearningHistory()` → `updateOnboardingProfile()` 순서로 실행되는가
- 취소 시 아무것도 바뀌지 않는가

- [ ] **Step 3: clearLearningHistory 권한 확인**

```bash
grep -n "clearLearningHistory\|readAccessibleSnapshot\|dev-guest\|isDevGuest" \
  features/learner/current-learner-controller.ts | head -20
```

체크:
- `clearLearningHistory()`가 dev-guest 전용 제한을 해제한 `readAccessibleSnapshot()`을 사용하는가
- 일반 사용자도 학년 변경 시 기록 초기화가 가능한가 (의도된 동작인가)

- [ ] **Step 4: 개인정보처리방침 링크 확인**

```bash
grep -n "privacyPolicy\|LEGAL_URLS\|Linking.openURL\|termsOfService" \
  features/profile/components/profile-screen-view.tsx \
  constants/legal-urls.ts | head -20
```

체크:
- `LEGAL_URLS.privacyPolicy` URL이 실제로 존재하는 URL인가 (Firebase Hosting 배포 여부)
- `Linking.openURL` 호출 시 에러 처리가 있는가
- URL이 하드코딩된 임시 값이 아닌가

- [ ] **Step 5: 앱 버전 표시 확인**

```bash
grep -n "version\|Constants\|expoConfig\|buildNumber\|versionCode" \
  features/profile/components/profile-screen-view.tsx \
  app.json | head -20
```

체크:
- 표시되는 버전이 `app.json`의 `version`과 일치하는가
- iOS `buildString`과 Android `versionCode`가 올바르게 증가되었는가

- [ ] **Step 6: 결과 기록**

```
## 점검 결과 — Task 7: 설정/프로필

### Critical
- [ ]

### Minor
- [ ]
```

---

## Task 8: Firebase & 앱스토어 체크

**Files:**
- Read: `functions/src/index.ts`, `functions/src/learning-history.ts`
- Read: `app.json`
- Read: `docs/PROGRESS.md` (앱스토어 섹션)

- [ ] **Step 1: Firebase Functions 배포 상태 확인**

```bash
grep -n "exports\.\|functions\." functions/src/index.ts | head -30
```

체크:
- `reviewFeedback`, `recordLearningAttempt` 등 주요 Functions이 export되어 있는가
- 리전 설정이 `asia-northeast3`인가

```bash
grep -n "asia-northeast3\|region" functions/src/index.ts functions/src/review-feedback.ts | head -10
```

- [ ] **Step 2: Firestore 피드백 저장 구현 여부 확인**

`docs/PROGRESS.md` 진행 현황 표에서 `Firebase 연결`이 `⬜`(미구현)으로 표시되어 있다. 실제 코드를 확인한다.

```bash
grep -rn "firestore\|Firestore\|collection\|doc\|setDoc\|addDoc" \
  features/quiz/ features/learning/ | grep -v "test\|spec\|mock" | head -30
```

체크:
- 피드백 저장이 실제로 구현되어 있는가
- 미구현이라면 출시 범위에서 제외할지 결정이 필요하다 → Critical로 기록

- [ ] **Step 3: OpenAI API 연결 확인**

```bash
grep -n "OPENAI_API_KEY\|openai\|model\|gpt" \
  functions/src/openai-client.ts | head -20
```

체크:
- API 키가 환경 변수로 관리되는가 (하드코딩 없는가)
- 모델 이름이 최신인가 (`gpt-4o` 또는 지정 모델)
- 에러 응답 처리가 있는가 (rate limit, 5xx)

- [ ] **Step 4: app.json 출시 준비 확인**

`app.json`을 읽어 다음을 체크한다:

```bash
grep -n "version\|buildNumber\|versionCode\|bundleIdentifier\|package\|privacy\|extra" app.json | head -30
```

체크 항목:
- `version`이 출시 버전인가 (예: `1.0.0`)
- iOS `buildNumber`가 1 이상인가
- Android `versionCode`가 1 이상인가
- `bundleIdentifier` / `package`가 프로덕션 값인가
- `extra.privacyPolicyUrl`이 실제 URL인가

- [ ] **Step 5: 앱스토어 체크리스트 확인**

```
[ ] 개인정보처리방침 Firebase Hosting 배포 완료
[ ] App Store Connect URL 입력 완료
[ ] TestFlight 내부 빌드 업로드 및 테스트 완료
[ ] 앱 스크린샷 준비 완료 (6.5인치, 5.5인치)
[ ] 앱 카테고리, 연령 등급, 한국어 설명 작성 완료
[ ] 지원 URL (웹사이트 또는 이메일) 입력 완료
```

- [ ] **Step 6: 결과 기록**

```
## 점검 결과 — Task 8: Firebase & 앱스토어

### Critical
- [ ]

### Minor
- [ ]
```

---

## Task 9: 네비게이션 & 라우트 엣지케이스 점검

**Files:**
- Read: `app/(tabs)/quiz/_layout.tsx`
- Read: `app/_layout.tsx`

- [ ] **Step 1: 모든 라우트 등록 확인**

```bash
grep -n "step-complete\|diagnosis\|exam\|practice\|result" \
  app/\(tabs\)/quiz/_layout.tsx | head -30
```

체크:
- `step-complete`, `exam/diagnosis`, `exam/result` 등 최근 추가된 라우트가 모두 Stack에 등록되어 있는가

- [ ] **Step 2: 스와이프백 차단 설정 확인**

```bash
grep -n "gestureEnabled\|swipeEnabled\|headerLeft\|PreventRemove" \
  app/\(tabs\)/quiz/_layout.tsx \
  features/quiz/hooks/use-diagnostic-screen.ts 2>/dev/null | head -20
```

체크:
- 진단 중 스와이프백이 차단되는가
- 연습 중 스와이프백이 차단되는가

- [ ] **Step 3: 탭 바 가시성 확인**

```bash
grep -n "tabBar\|hideTabBar\|tabBarStyle\|display.*none" \
  app/\(tabs\)/quiz/_layout.tsx \
  app/\(tabs\)/_layout.tsx 2>/dev/null | head -20
```

체크:
- 퀴즈 세션 중 탭 바가 숨겨지는가
- 세션 완료 후 탭 바가 다시 표시되는가

- [ ] **Step 4: 결과 기록**

```
## 점검 결과 — Task 9: 네비게이션 & 라우트

### Critical
- [ ]

### Minor
- [ ]
```

---

## Task 10: Critical 이슈 일괄 수정

**Files:** Task 2~9에서 Critical로 기록된 항목의 파일들

- [ ] **Step 1: Critical 이슈 목록 정리**

Task 2~9의 결과 블록에서 Critical 항목만 추출한다.

```
Critical 이슈 목록:
- [Task N] [파일] [이슈 설명]
```

- [ ] **Step 2: 이슈별 수정 우선순위 결정**

크래시 > 데이터 손실 > 플로우 차단 > 잘못된 state 순으로 정렬한다.

- [ ] **Step 3: 이슈 수정**

각 Critical 이슈를 순서대로 수정한다.
수정 후 관련 테스트를 실행해 회귀가 없는지 확인한다:

```bash
npx jest --passWithNoTests 2>&1 | tail -20
```

- [ ] **Step 4: TypeScript 재검사**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

Task 1보다 에러가 늘지 않았는지 확인한다.

- [ ] **Step 5: 수정 사항 커밋**

```bash
git add -p
git commit -m "fix: 앱 전체 점검 — Critical 이슈 수정

[이슈 목록 요약]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 6: 종합 점검 결과 docs/PROGRESS.md에 기록**

`docs/PROGRESS.md` 상단 로그에 오늘 날짜로 점검 결과 요약을 추가한다.

```markdown
### 2026.04.25

**앱 전체 점검 완료 (출시 전 점검)**
- Critical N건 수정: [요약]
- Minor N건 확인: [요약]
- 앱스토어 체크리스트: [완료 항목 / 미완료 항목]
```

- [ ] **Step 7: 최종 커밋**

```bash
git add docs/PROGRESS.md
git commit -m "docs(progress): 2026-04-25 앱 전체 점검 결과 기록

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 완료 기준

- [ ] Task 1~9 점검 결과 블록이 모두 채워짐
- [ ] 모든 Critical 이슈가 수정되거나 의도적으로 제외 결정됨
- [ ] TypeScript 에러가 Task 1 대비 증가하지 않음
- [ ] 기존 테스트 전부 통과
- [ ] `docs/PROGRESS.md`에 점검 결과 기록됨
