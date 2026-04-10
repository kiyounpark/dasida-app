# DASIDA — 개발 진행 기록
> 날짜별 작업 로그 + 커밋 기록
> AI(Claude/GPT/Gemini)가 현재 상태를 파악하기 위한 파일

---

## 진행 현황 요약

| 단계 | 내용 | 상태 |
|------|------|------|
| 환경 세팅 | Expo 프로젝트 생성, 기기 테스트 | ✅ 완료 |
| 구조 정의 | 화면/파일 구조, 네비게이션 설계 | ✅ 완료 |
| 데이터 작성 | problemData, practiceMap, diagnosisMap | ✅ 1차 구현 |
| 화면 구현 | 4개 화면 (문제/결과/연습/피드백) | ✅ 1차 구현 |
| 디자인 정합화 | 로고/브랜드 톤 앱 전역 반영 | ✅ 완료 |
| Firebase 연결 | Firestore 피드백 저장 | ⬜ |
| OpenAI 연결 | AI 판정 API 호출 | 🟡 1차 구현 |
| 앱스토어 준비 | 개인정보처리방침, 심사 체크리스트 | 🟡 진행 중 |

---

## 로그

### 2026.04.10

**고2 진단 콘텐츠 구현 완료 — g2_xxx 완전 분리**
- `data/diagnosisMap.ts`: WeaknessId union + weaknessOrder + diagnosisMap에 g2_xxx 20개 추가
- `data/diagnosisTree.ts`: SolveMethodId union에 5개 신규(set/proposition/trig/integral/linear_eq) + 기존 4개(polynomial/diff/radical/counting)에 g2 서브선택지 확장
- `data/detailedDiagnosisFlows.ts`: hasCheckNode 가드 추가 — g2_xxx weaknessId는 check 노드 생성 생략, explain → final 직접 연결 (크래시 방어)
- `data/diagnosis-method-routing.ts`, `data/detailedDiagnosisFlows.ts`: Record<SolveMethodId, ...> 타입에 신규 5개 메서드 추가
- `data/problemData.ts`: grade:'g2' 진단 문제 10개 추가(g2_q1~g2_q10), g1 fallback 제거(`grade === 'g2'` 조건 삭제)
- `data/review-content-map.ts`: g2_xxx 20개 복습 콘텐츠(heroPrompt + 3 thinkingSteps) 추가
- 수정사항: g2_q6 diagnosisMethods diff→quadratic (판별식 문제), g2_prop_contrapositive 예시 명제 교체(거짓→참), g2_radical_rationalize 표기 통일
- 커밋: 10cb337, a1fc4ff, e9025a6, ef1d851, 829bae6, 202021b, 8b1c3ef

### 2026.04.09

**복습 세션 AI 피드백 — 멀티턴 채팅 전환**
- `functions/src/openai-client.ts`: `requestReviewFeedbackFromOpenAI` 시그니처를 `userContent: string` → `messages[]` 배열로 변경, 멀티턴 OpenAI chat completions 지원
- `functions/src/review-feedback.ts`: Zod 스키마를 `messages` 배열로 교체(selectedChoiceText/userText 제거), 첫 user 메시지에 단계 컨텍스트 prepend, 시스템 프롬프트 강화(단계 범위 제약 + 모호한 답변 구분), 첫 메시지 role 검증 `.refine()` 추가
- `features/quiz/review-feedback.ts`: `ChatMessage` 타입 export, `ReviewFeedbackInput.messages: ChatMessage[]` 로 변경
- `features/quiz/hooks/use-review-session-screen.ts`: `stepPhase: 'input'|'chat'`, `chatMessages: ChatEntry[]`, `chatText`, `onSendChatMessage` 추가, `aiFeedback` 제거
- `features/quiz/components/review-session-screen-view.tsx`: chat phase UI — 초록 버블(학생)/연두 버블(AI), 채팅 입력창+전송버튼, "이해했어요, 다음 단계 →" 버튼
- `e2e/review-session.spec.ts`: 테스트 3·4를 chat phase 흐름으로 업데이트 + 루프 안정성 개선
- Firebase 재배포 완료 (`reviewFeedback` asia-northeast3) + curl 검증
- **검증**: TypeScript 빌드 에러 없음, curl 멀티턴 테스트 통과, 첫 메시지 role 검증 400 응답 확인

### 2026.04.07

**개인정보처리방침 코드 반영**
- `constants/legal-urls.ts`: `LEGAL_URLS.privacyPolicy` / `termsOfService` URL 상수 신규 정의
- `features/profile/components/profile-screen-view.tsx`: 학년 설정 카드 하단에 `앱 정보` 카드 추가 — 버전 표시 + "개인정보처리방침" 버튼(Linking.openURL)
- `app.json`: `expo.extra.privacyPolicyUrl` 추가
- **검증**: typecheck/lint 기존 에러 범위 변화 없음, 브라우저 연결 tap 동작 확인 예정
- **남은 작업**: Firebase Hosting에 실제 개인정보처리방침 HTML 배포 + App Store Connect URL 입력

### 2026.04.03

**Playwright E2E Smoke Test 세팅**
- `playwright.config.ts`: Expo 웹 서버(포트 8081) 자동 시작, `reuseExistingServer`, Chromium 단일 브라우저
- `e2e/smoke.spec.ts`: dev-guest 로그인 → `/quiz` 진입 smoke test
- `package.json`: `test:e2e` / `test:e2e:ui` 스크립트 추가
- `.gitignore`: `playwright-report/`, `test-results/` 추가
- **검증**: `npm run test:e2e` 1 passed (21.8s)
- 브랜치: `feat/playwright-e2e` → `main` 머지

### 2026.03.24

**Claude 최근 변경 검토 훅 강화**
- `.claude/hooks/expo-skill-hooks-lib.mjs`: 프롬프트 키워드뿐 아니라 현재 워크트리 또는 최신 커밋의 변경 파일도 읽어 최근 수정 검토 문맥을 만들고, 최근 변경 파일 경로를 기준으로 `building-native-ui`, `native-data-fetching`, `dasida-code-structure` 같은 스킬을 함께 추론하도록 확장
- `.claude/hooks/select-expo-skill.mjs`: 단일 스킬 안내 대신 다중 스킬 목록, 각 스킬 `SKILL.md` 경로, 최근 변경 파일 요약, `findings/회귀/누락 테스트 우선` 검토 규칙을 Claude 문맥에 주입하도록 변경
- `.claude/hooks/check-expo-skill-before-tools.mjs`: 스킬 1개만 읽었는지 보던 방식에서, 선택된 스킬들 중 아직 읽지 않은 `SKILL.md`만 남겨 다시 읽도록 유도하는 다중 스킬 추적 방식으로 변경
- `docs/AI_COLLABORATION.md`: `최근 수정`, `최근 변경`, `review`, `검토`, `검증` 프롬프트에서 Expo 스킬과 `dasida-code-structure`를 함께 적용하는 방식과 권장 검토 프롬프트를 운영 문서에 반영
- 샘플 검증에서는 `최근 수정한 화면 검토해줘. expo skills와 dasida-code-structure 기준으로 review 해줘` 입력 시 최신 커밋의 `features/quiz/components/diagnosis-intro-screen.tsx`가 최근 변경 파일로 잡히고, `building-native-ui + dasida-code-structure`가 함께 선택되는 것을 확인
- **검증**: `node --check .claude/hooks/expo-skill-hooks-lib.mjs`, `node --check .claude/hooks/select-expo-skill.mjs`, `node --check .claude/hooks/check-expo-skill-before-tools.mjs`, 샘플 `UserPromptSubmit`/`PreToolUse` 실행으로 최근 변경 문맥과 다중 스킬 읽기 유도 동작 확인

### 2026.03.22

**문제 풀기 홈을 4단계 학습 여정판으로 전환**
- `features/learning/home-journey-state.ts`, `features/learning/home-state.ts`: 기존 `latestDiagnosticSummary`, `recentActivity`, `dueReviewTasks`, `featuredExamState`만 조합해 `진단 -> 분석 -> 복습 -> 실전 적용` 현재 단계를 계산하는 `journey` 상태를 추가
- `features/quiz/components/journey-board.tsx`, `features/quiz/components/journey-step-node.tsx`, `features/quiz/components/quiz-hub-screen-view.tsx`, `features/quiz/hooks/use-quiz-hub-screen.ts`: 기존 홈 허브의 hero/peer/support 카드 구조를 걷고, 여정 보드 + 현재 단계 카드 + 최근 학습 흐름만 남기는 홈 구조로 교체
- `assets/journey/step-1-diagnostic.png`, `assets/journey/step-2-analysis.png`, `assets/journey/step-3-review.png`, `assets/journey/step-4-exam.png`: 루트에 있던 `character_step*.png` 원본을 그대로 두고, 앱에서 안정적으로 참조할 수 있도록 여정 전용 자산 경로로 복사해 사용
- `app/(tabs)/quiz/_layout.tsx`, `features/profile/hooks/use-profile-screen.ts`, `features/profile/components/profile-screen-view.tsx`: 별도 펫형 `gamification-prototype` 라우트와 설정 진입 버튼을 제거하고 실제 홈 전환 방향으로 정리
- 핵심 원칙은 `현재 단계 1개만 크게 CTA`, `완벽 마스터 대신 실전 적용`, `게임 장식보다 학습 네비게이션`으로 고정
- **검증**: `npm run typecheck`, `npm run lint` 통과

**가벼운 게임화 데모 화면 프로토타입 추가**
- `app/(tabs)/quiz/gamification-prototype.tsx`, `app/(tabs)/quiz/_layout.tsx`, `features/quiz/screens/gamification-prototype-screen.tsx`: `quiz` 스택 안에 별도 `게임화 프로토타입` 라우트를 추가하고, 실제 홈 허브를 건드리지 않는 독립 데모 진입점을 구성
- `features/quiz/gamification-prototype-content.ts`, `features/quiz/hooks/use-gamification-prototype-screen.ts`, `features/quiz/components/gamification-prototype-screen-view.tsx`: `첫 진단 전 / 오늘 복습 있음 / 오늘 목표 달성` 3상태를 로컬 상태로 토글할 수 있는 귀여운 펫형 데모 화면 구현
- 기존 `assets/auth/dasida-login-character.png`를 그대로 재사용하고, 캐릭터 `다시`, 말풍선, 오늘 미션 3단계 체크리스트, 작은 성장 카드, 프로토타입 메모 카드만 넣어 보상 시스템 없는 가벼운 게임화 분위기만 확인할 수 있게 정리
- `features/profile/hooks/use-profile-screen.ts`, `features/profile/components/profile-screen-view.tsx`: `__DEV__` 설정 화면 개발용 카드에서 `게임화 프로토타입 보기` 버튼으로 새 데모 화면에 바로 들어갈 수 있도록 연결
- **검증**: `npm run typecheck`, `npm run lint` 통과

### 2026.03.20

**iPhone Google OAuth redirect 형식 수정**
- `features/auth/firebase-auth-client.ts`: iOS의 Google OAuth redirect URI를 기존 `dasidaapp://oauthredirect` 대신 bundle identifier 기반 `com.dasida.app:/oauthredirect` 형식으로 분기해 Google의 `invalid_request` 차단을 피하도록 조정
- iOS 네이티브 URL scheme에는 이미 `com.dasida.app`가 등록돼 있어 추가 네이티브 수정 없이 dev client에서 바로 검증 가능함
- 실기기 재검증 결과 Google 계정 선택 단계 이후에는 Firebase `auth/operation-not-allowed`까지 진행되어, 다음 확인 지점이 Firebase Console의 Google provider 활성화 상태로 좁혀짐
- **검증**: `npm run typecheck` 통과

**남은 중간 리스크 3건 정리**
- `features/auth/bootstrap-timeouts.ts`를 추가해 Firebase Auth 초기 대기(`10초`)와 learner provider bootstrap watchdog(`15초`)의 관계를 한 파일에서 관리하도록 정리
- `features/auth/firebase-auth-client.ts`는 공통 timeout 상수를 사용하도록 정리했고, `features/learner/provider.tsx`는 동일 상수 기반으로 provider fallback 타이밍을 맞춰 bootstrap 단계의 계층 관계를 명확히 함
- `app/_layout.tsx`의 `AuthGateRedirector`는 `sign-in`/`(tabs)` 진입 보호만 맡기고, 루트 `/` 진입 리다이렉트는 `app/index.tsx`만 처리하도록 역할을 분리해 중복 redirect 가능성을 제거
- `features/learning/firebase-learning-history-api.ts`는 인증 실패(`UNAUTHORIZED`)를 제외한 원격 학습 기록 API 오류를 cache fallback 대상으로 넓히고, `features/learning/firebase-learning-history-repository.ts`는 `recordAttempt`, `summary`, `featured exam`, `attempt list`, `attempt results` 전부에서 fallback 로그와 캐시 복귀 경로를 일관되게 적용
- **검증**: `npm run typecheck`, `npm run lint` 통과

**Claude 재검증**
- Claude CLI로 `app/_layout.tsx`, `app/index.tsx`, `features/auth/bootstrap-timeouts.ts`, `features/auth/firebase-auth-client.ts`, `features/learner/provider.tsx`, `features/learning/firebase-learning-history-api.ts`, `features/learning/firebase-learning-history-repository.ts`를 다시 검토
- 결과: `No blocking issues found`
- 확인된 사항: timeout 10초/15초 계층 관계가 명확하고, 루트 redirect 역할 분리가 일관적이며, 인증 실패를 제외한 원격 학습 기록 오류 fallback 범위도 과도하지 않음
- 남은 수동 검증 포인트: 빠른 auth state 전환 시 redirect 순서, 느린 네트워크/cold start에서 `authStateReady()` 10초 timeout 체감, cache fallback 이후 remote와의 동기화 공백 여부

**설정 화면 개발용 카드 유지**
- `features/profile/hooks/use-profile-screen.ts`, `features/profile/components/profile-screen-view.tsx`: 개발용 익명 세션에서만 보이던 로그인 테스트/상태 미리보기 카드를 `__DEV__` 빌드에서는 로그인 후에도 계속 보이도록 조정
- 인증된 세션에서는 개발용 미리보기를 숨기지 않고, `왜 지금은 실행할 수 없는지`와 `로그아웃 후 개발용 익명으로 계속으로 돌아가는 경로`를 설명하는 안내 카드와 CTA를 표시
- 목적은 로그인 직후 설정 화면에서 개발용 섹션이 통째로 사라져 혼란스러운 문제를 줄이고, 개발 중 UI 레이아웃 확인 동선을 유지하는 것
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI 재리뷰에서 `No blocking issues` 확인

### 2026.03.19

**학습 기록 Cloud Functions 배포 및 로컬 env 연결**
- Firebase 프로젝트 `dasida-app` 기준으로 학습 기록용 Functions를 실제 배포: `getLearningAttemptResults`, `getLearnerSummary`, `importLocalLearningHistory`, `listLearningAttempts`, `recordLearningAttempt`, `saveFeaturedExamState`
- 배포 중 `compute.googleapis.com` 조회 403 경고는 있었지만, 최종적으로 8개 Functions 배포/업데이트가 모두 성공했고 각 학습 기록 endpoint가 `asia-northeast3-dasida-app.cloudfunctions.net` 아래에서 활성화됨
- 로컬 [`.env`](/Users/baggiyun/Documents/dasida-app/.env)에 인증 사용자 학습 기록용 URL 6개를 채워 iOS Apple/Google 로그인 후 `Remote learning history is not configured for authenticated users.` 에러를 제거할 준비를 마침
- **검증**: `npm --prefix functions run build`, `firebase deploy --only functions`, `curl https://asia-northeast3-dasida-app.cloudfunctions.net/getLearnerSummary` (`400` 응답으로 live endpoint 확인)

**Claude Expo 검증**
- Claude CLI로 `expo-dev-client`, `native-data-fetching`, `building-native-ui` 관점의 코드 리뷰를 수행
- 범위: `app/_layout.tsx`, `app/index.tsx`, `app.json`, `features/auth/firebase-auth-client.ts`, `features/learner/provider.tsx`, `features/learning/create-learning-history-repository.ts`, `features/learning/learning-history-repository-router.ts`, `constants/env.ts`
- 결과: 치명적 이슈 없음
- 잔여 중간 리스크: Firebase auth timeout(10초)과 provider bootstrap timeout(15초)의 계층 관계, `app/index.tsx`와 `AuthGateRedirector`의 중복 리다이렉트 가능성, 인증 사용자 원격 저장 실패 시 일부 오류 처리 경로 추가 검증 필요
- **수동 검증 포인트**: 실제 iPhone 저속 네트워크에서 cold start, 로그인 후 learning history Cloud Functions 저장 성공, 비행기 모드/오프라인 fallback, 루트 `/` 직접 진입 시 redirect flicker 여부

**iOS dev client 재구성과 auth/bootstrap 안전장치 추가**
- `app.json`: iOS `bundleIdentifier`, `usesAppleSignIn`, Android `package`를 명시해 실제 디바이스 빌드 기준 식별자를 고정
- `package.json`, `package-lock.json`: `expo-dev-client`, `@expo/ngrok`를 추가하고 `ios/android` 스크립트를 `expo run:*` 기준으로 맞춤
- `features/auth/firebase-auth-client.ts`: Firebase Auth 초기 상태 대기를 `authStateReady()` + timeout 구조로 보강
- `features/learner/provider.tsx`: bootstrap watchdog을 추가해 초기화 지연 시 sign-in gate로 안전하게 복귀하도록 조정
- `app/_layout.tsx`, `app/index.tsx`: 루트 경로(`/`)가 빈 화면이나 unmatched route로 남지 않도록 sign-in 또는 quiz 탭으로 명시 리다이렉트
- iPhone 실기기 디버깅 과정에서 로컬 Metro 연결은 확인됐고, dev build/라우팅 반영을 위해 패키지 추가나 네이티브 의존성 변경 후에는 `npx expo prebuild --clean -> npx expo run:ios` 순서를 사용하기로 정리
- `CLAUDE.md`, `docs/AI_COLLABORATION.md`: 앞으로 패키지 추가/변경 시 위 iOS 네이티브 재생성 순서를 필수 규칙으로 따르도록 운영 문서에 명시
- **검증**: `npm run typecheck`, `npm run lint` 통과
- **메모**: 인증 사용자용 원격 학습 기록 Functions URL은 아직 비어 있거나 404 상태라, 이후 dev fallback 또는 Functions 배포 정리가 추가로 필요

### 2026.03.18

**앱 전역을 소셜 로그인 필수 정책으로 전환하고 dev guest 우회만 분리**
- `features/auth/auth-policy.ts`, `features/auth/disabled-auth-client.ts`, `features/auth/create-auth-client.ts`, `features/auth/auth-client.ts`, `features/auth/session-store.ts`: 로그인 필수 정책, dev guest 허용 조건, provider 노출 순서, 비활성 auth client, 세션 삭제 API를 추가하고 `signOut()`이 더 이상 익명 세션을 다시 만들지 않도록 계약을 변경
- `features/auth/firebase-auth-client.ts`: Apple/Google 로그인 흐름은 유지하되, 저장된 세션만 읽고 `signIn()` 직후 auto import로 넘길 이전 anonymous session을 그대로 사용하도록 조정했으며, Apple 첫 로그인에서만 내려오는 `fullName/email`도 로컬 세션에 보존하도록 보강
- `features/learner/current-learner-controller.ts`, `features/learner/provider.tsx`, `features/learning/learning-history-repository-router.ts`, `features/learning/learning-history-migration-service.ts`: `authGateState(required/authenticated/guest-dev)` 기반 전역 상태로 확장하고, bootstrap/repository/migration 계층의 익명 자동 생성 경로를 제거했으며, 로그인 직후 anonymous snapshot 자동 import와 import 실패 notice 1회 노출 흐름을 연결
- `app/_layout.tsx`, `app/sign-in.tsx`, `features/auth/screens/sign-in-screen.tsx`, `features/auth/hooks/use-sign-in-screen.ts`, `features/auth/components/sign-in-screen-view.tsx`: 루트 `sign-in` route와 route guard를 추가해 인증 전에는 `(tabs)`를 차단하고, iOS는 Apple -> Google, Android/Web는 Google 순서로 로그인 버튼을 노출하며 `__DEV__`에서만 `개발용 익명으로 계속`을 유지
- `features/profile/hooks/use-profile-screen.ts`, `features/profile/components/profile-screen-view.tsx`, `features/quiz/hooks/use-quiz-hub-screen.ts`, `features/quiz/components/quiz-hub-screen-view.tsx`: 프로덕션 profile을 계정 관리 중심으로 단순화하고, `guest-dev`에서만 로그인 테스트/preview/reset 도구를 노출하며, 자동 import 실패 notice는 quiz 허브에서 한 번만 보여주도록 정리
- 로그인 구현 관련 수정은 Apple/Google/Firebase 공식 문서 기준으로만 검토해 반영했고, Google은 PKCE/브라우저 기반 OAuth 및 Firebase ID token credential 흐름, Apple은 nonce 기반 credential 교환과 첫 로그인 user info 보존 규칙을 기준으로 유지
- **검증**: `npm run typecheck`, `npm run lint`, `npm run test --prefix functions` 통과

**에빙하우스 기반 예약 복습 흐름과 홈 hero 진입을 앱/함수 전반에 연결**
- `features/learning/local-learning-history-repository.ts`, `functions/src/learning-history.ts`: 진단 결과의 상위 3개 약점에 대해 `day1 -> day3 -> day7 -> day30` 계단형 review task를 생성하고, 복습 완료 시 다음 단계 하나만 이어지도록 로컬/원격 스케줄링을 정렬
- `features/learning/history-repository.ts`, `features/learning/types.ts`, `features/learning/history-types.ts`, `features/quiz/build-finalized-attempt-input.ts`: `dueReviewTasks`, `reviewContext`, `day30` 타입 계약을 추가해 scheduled review 완료와 summary 계산이 동일한 payload를 쓰도록 확장
- `features/learning/home-state.ts`, `features/quiz/hooks/use-quiz-hub-screen.ts`, `features/quiz/components/quiz-hub-screen-view.tsx`, `features/history/history-insights.ts`, `features/history/hooks/use-history-screen.ts`: 오늘 due 된 복습이 있을 때만 홈/히스토리 hero가 review 상태로 바뀌고 `/quiz/practice?mode=review` 로 진입하도록 연결
- `features/quiz/hooks/use-practice-screen.ts`, `features/quiz/components/quiz-practice-screen-view.tsx`: 기존 practice 화면에 `review` mode를 추가해 due task queue를 순서대로 처리하고, 마지막 복습이면 홈으로 복귀하도록 분기
- `data/review-content-map.ts`, `features/learning/review-stage.ts`: review hero 질문 문구와 stage label/offset 계산을 분리해 약점별 복습 카피와 단계 진행 규칙을 공통화
- `functions/tests/learning-history-weakness-practice.test.ts`: `top 3 -> day1`, `reviewContext`, `day30`, `dueReviewTasks`를 검증하는 테스트를 추가
- `functions/shared/timestamp-utils.js`, `functions/src/timestamp-utils.ts`: 앱/함수가 같은 timestamp 비교 구현을 보도록 공용 helper를 하나로 정리하고, ISO 문자열 비교에 의존하던 due/정렬 계산을 숫자 timestamp 비교로 교체
- **검증**: `npm run typecheck`, `npm run lint`, `npm run test --prefix functions`, `npm run lint --prefix functions`, `npm run build --prefix functions` 통과, Claude CLI 리뷰에서 blocking issue 없음 확인

**약점 연습 오답 흐름을 조용한 튜터형 미니 코칭으로 확장**
- `features/quiz/hooks/use-practice-screen.ts`: 약점 연습에서 `1차 오답 -> coaching`, `2차 오답 -> resolved`, `정답 -> correct`로 이어지는 상태 분기를 추가하고, 문제 전환 시 오답 횟수를 초기화하도록 조정
- 같은 파일에서 심화 문제(`challenge`)는 기존 단순 재도전 흐름을 유지하되, 정오답 제출 시 iOS 전용 haptics를 공통 helper로 정리
- `features/quiz/components/quiz-practice-screen-view.tsx`: 기존 단일 오답 카드 대신 `코칭 카드`와 `해설 카드`를 구분해 보여주고, 오답 중에는 선택지를 잠가 재입력 타이밍을 명확하게 고정
- 피드백 카드에 `FadeInDown`, `FadeOutUp`, `LinearTransition` 기반 Reanimated 전환을 넣고, 카드/선택지에 `borderCurve: 'continuous'`를 적용해 기존 quiz UI 톤과 맞춤
- 오답 컬러도 위험 알림보다 학습 코칭에 가까운 톤으로 완화해 `다시 혼나는 느낌`보다 `짧게 짚어주고 다시 풀게 하는 흐름`으로 정리
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude Code CLI `building-native-ui` 리뷰에서 blocking issue 없음 확인

### 2026.03.16

**내 기록 탭 성장 화면을 실제 사용자 데이터 기반으로 앱에 반영**
- `app/(tabs)/history.tsx`: 라우트 파일은 화면 진입만 담당하도록 줄이고, 실제 구현은 `features/history/**`로 이동
- `features/history/screens/history-screen.tsx`, `hooks/use-history-screen.ts`, `components/history-screen-view.tsx`, `history-insights.ts`: `오늘 해야 할 1가지`, `직전 대비 변화량`, `지난번 vs 이번`, `지금 다시 잡을 유형`, `짧은 메모` 구조의 실제 앱 화면 추가
- `features/history/history-insights.ts`: `summary.current`와 최근 `diagnostic` 시도 최대 5개를 조합해 hero 우선순위, 변화량, 전후 비교, 반복 약점, 활동 메모를 계산하는 순수 파생 로직 분리
- `features/learner/current-learner-controller.ts`, `features/learner/provider.tsx`: 현재 사용자 세션 기준으로 최근 attempts를 읽는 `loadRecentAttempts()` 인터페이스를 추가해 화면이 목데이터가 아니라 저장된 사용자 기록을 직접 사용하도록 연결
- history 화면은 `summary.updatedAt` 변경 시와 pull-to-refresh 시 최근 진단을 다시 조회하고, 초기 로딩 동안 빈 상태가 잠깐 보이지 않도록 attempts 전용 로딩 상태를 분리
- Claude Code CLI 리뷰 지적을 반영해 `provider`의 `loadRecentAttempts()` 참조를 `useCallback`으로 고정하고, `use-history-screen.ts`의 attempts 재조회 로직을 공통 `loadAttempts()`로 합쳐 effect/refresh 중복을 제거
- 이후 Claude 리뷰에서 확인된 `quiz/history/profile` 세션 공유 리스크를 없애기 위해 `QuizSessionProvider`는 다시 `app/(tabs)/quiz/_layout.tsx` 안으로 되돌리고, `history`는 `reset=1` 진입 파라미터만 넘긴 뒤 실제 세션 초기화는 `quiz/diagnostic` 화면 마운트 시 provider 안쪽에서 처리하도록 조정
- `features/auth/session-store.ts`: `SecureStore`가 허용하지 않는 `/`와 `:`가 섞인 키를 쓰던 문제를 수정하기 위해 SecureStore 전용 키를 `dasida.auth.session_secret.<hex(accountKey)>` 형식으로 분리하고, SecureStore 접근 실패 시 AsyncStorage로 안전하게 폴백하도록 보강
- `features/history/history-insights.ts`, `components/history-screen-view.tsx`: `설계/감각/낙인/메모 수준`처럼 내부 기획 언어로 들리던 문구를 사용자 관점 문장으로 정리하고, `첫 기록`, `비교 카드`, `자주 헷갈린 부분`, `최근 활동` 안내 카피를 더 자연스럽게 다듬음
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude Code CLI 리뷰에서 `No blocking issues` 확인

**내 기록 성장 화면 HTML 프로토타입 v2 리디자인**
- `history-growth-prototype.html`: 기존 v1의 `기록 대시보드` 느낌을 줄이고, `오늘 해야 할 1가지`, `직전 대비 변화량`, `지난번 vs 이번 비교`, `지금 다시 잡을 유형` 중심으로 화면 구조를 전면 재구성
- 그래프는 축/격자 중심 sparkline 대신 `변화량 우선 + 보조 차트` 구조로 바꾸고, 점수 흐름은 area line과 회차 pill로 짧게 보조하는 형태로 재설계
- `최근활동`과 `쌓인기록` 비중을 낮추기 위해 기록 누적 카드 자체는 제거하고, `recentActivity`는 하단 `짧은 메모` 2건만 남겨 맥락 확인용으로 축소
- 외부 앱 패턴을 직접 복제하지 않고 `Duolingo식 행동 우선`, `Apple Fitness식 트렌드+코칭`, `Strava식 상세 차트 후순위` 해석을 설명 패널과 카드 위계에 반영

**내 기록 성장 화면 체험용 HTML 프로토타입 추가**
- `history-growth-prototype.html`: 서버나 앱 상태와 연결하지 않고도 `summary.current + recent diagnostic attempts` 기반 화면 흐름을 볼 수 있도록 standalone HTML 프로토타입 추가
- `fresh`, `첫 진단 완료`, `오늘 복습 있음`, `상승 추세`, `실전 진행 중` 목 시나리오를 버튼으로 전환하면서 hero/graph/반복 약점/기록/활동 카드가 어떻게 달라지는지 바로 확인 가능하게 구성
- 그래프는 `최근 diagnostic 5개`만 쓰는 소형 sparkline으로 만들고, 실전 상태는 별도 카드 없이 `쌓인 기록 + 최근 활동` 안에서 읽히는지 보도록 설계

### 2026.03.15

**오답 진단 화면 오케스트레이션을 상위 hook으로 추가 분리**
- `features/quiz/hooks/use-diagnostic-screen.ts` 추가로 `session + workspace + pager + ai-help` 조합 로직을 상위 오케스트레이션 hook으로 통합
- `features/quiz/screens/diagnostic-screen.tsx`: 화면 파일을 `useDiagnosticScreen()` 호출 후 `DiagnosticScreenView`에 전달만 하는 thin screen으로 축소
- `features/quiz/components/diagnostic-screen-view.tsx`: 훅/라우터/세션 의존을 제거하고 `UseDiagnosticScreenResult` 기반 표현 전용 view로 재구성해 로직 400줄 이상을 바깥으로 이동
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI 리뷰에서 `No blocking issues` 확인

**코드 구조 스킬 계층과 Thin Screen + Custom Hook 기본값 도입**
- `docs/ARCHITECTURE.md`, `.agents/skills/dasida-code-structure/SKILL.md`, `.claude/skills/dasida-code-structure`: DASIDA 공식 코드 구조 기준을 `Feature-based architecture + Thin Screen + Custom Hook`로 고정하고, 로컬 구조 스킬과 Claude 링크 경로를 추가
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `docs/AI_COLLABORATION.md`: 코드 구조/리팩터링/커스텀 훅 분리 작업은 `dasida-code-structure`와 `docs/ARCHITECTURE.md`를 먼저 확인하도록 공통 운영 규칙 확장
- `.claude/hooks/expo-skill-hooks-lib.mjs`, `.claude/hooks/select-expo-skill.mjs`, `.claude/hooks/check-expo-skill-before-tools.mjs`: Claude 훅이 Expo 스킬뿐 아니라 로컬 구조 스킬도 감지/안내하도록 확장하고, `quiz 구조 리팩터링해줘 -> dasida-code-structure`, `Firebase fetch 에러 처리 -> native-data-fetching`, `새 화면 레이아웃 구성 -> building-native-ui` 분류를 확인
- `app/(tabs)/quiz/index.tsx`, `result.tsx`, `practice.tsx`, `diagnostic.tsx`, `features/quiz/screens/*`, `features/quiz/components/*`, `features/quiz/hooks/*`: `quiz` 라우트를 thin route로 줄이고 `screen -> hook -> view` 계층으로 분리해 route/screen 파일을 80줄/200줄 기준 안으로 정리
- `features/quiz/components/diagnostic-screen-view.tsx`, `features/quiz/hooks/use-diagnosis-pager.ts`, `use-diagnosis-workspaces.ts`, `use-diagnosis-ai-help.ts`, `diagnostic-screen-helpers.ts`: 진단 화면의 pager/workspace/ai-help 축을 커스텀 훅으로 나눠 화면 파일 책임을 줄임
- **검증**: `npm run typecheck`, `npm run lint` 통과

### 2026.03.14

**학습 히스토리 HTTPS functions 인증과 저장 실패 복구를 보강**
- `features/auth/types.ts`, `features/auth/local-anonymous-auth-client.ts`, `features/learner/provider.tsx`: 익명 세션에 `requestSecret`을 추가하고, 기존 세션도 로컬에서 secret을 보완하도록 마이그레이션
- `features/learning/firebase-learning-history-repository.ts`, `features/learning/create-learning-history-repository.ts`, `features/learning/local-learning-history-repository.ts`, `constants/env.ts`, `.env.example`: Firebase repository가 `accountKey + requestSecret` 헤더로 인증된 요청만 보내도록 수정하고, timeout/에러 분류/로컬 summary fallback/서버 응답 기반 캐시 동기화/list 결과 원격 조회를 추가
- `functions/src/learning-history-auth.ts`, `record-learning-attempt.ts`, `get-learner-summary.ts`, `save-featured-exam-state.ts`, `list-learning-attempts.ts`, `get-learning-attempt-results.ts`, `functions/src/index.ts`: 공개 HTTPS endpoint는 유지하되 요청 헤더의 session secret을 SHA-256 hash로 검증하도록 바꾸고, 원격 list/results 조회 endpoint를 추가
- `functions/src/learning-history.ts`: server summary의 `recentActivity.subtitle`이 클라이언트와 같은 한국어 약점 라벨을 사용하도록 맞추고, remote attempts/results 응답 정렬도 로컬 구현체와 동일하게 정리
- `app/(tabs)/quiz/result.tsx`: 결과 저장을 fire-and-forget에서 상태 기반 저장 흐름으로 바꾸고, 저장 중 안내/저장 실패 카드/수동 재시도 버튼을 추가
- **Claude CLI 검증**: `native-data-fetching` 기준 재리뷰에서 이전 critical/high findings(함수 인증 부재, result 저장 무음 실패, Firebase repository 캐시 불일치)가 해결된 것을 재확인
- **검증**: `npm run typecheck`, `npm run lint`, `npm run functions:build`, `npm run functions:lint` 통과

### 2026.03.13

**학습 히스토리를 `attempt + attemptResult + summary/current` 구조로 정규화**
- `features/learner/types.ts`, `features/learning/types.ts`, `features/quiz/types.ts`, `features/quiz/engine.ts`, `features/quiz/session.tsx`: `LearnerProfile`을 안정 정보만 남기고, `LearningAttempt`, `LearningAttemptResult`, `LearnerSummaryCurrent`, 확장된 `ReviewTask`, `attemptId` 기반 `QuizResultSummary/QuizSessionState`로 타입 계약을 전환
- `features/learning/history-repository.ts`, `local-learning-history-repository.ts`, `firebase-learning-history-repository.ts`, `create-learning-history-repository.ts`, `history-types.ts`: 앱이 `LearningHistoryRepository` 인터페이스만 보도록 저장 계층을 분리하고, AsyncStorage 기반 로컬 구현체와 HTTPS functions 기반 Firebase 구현체를 추가
- `features/learner/current-learner-controller.ts`, `features/learner/provider.tsx`, `features/learning/home-state.ts`, `features/learner/local-learner-profile-store.ts`: 홈/결과/기록/설정 흐름이 `summary/current`를 읽고, profile은 계정/학년/생성 시각만 유지하도록 재구성
- `features/quiz/build-finalized-attempt-input.ts`, `app/(tabs)/quiz/result.tsx`, `app/(tabs)/history.tsx`, `app/(tabs)/quiz/exams.tsx`: 결과 화면이 `recordAttempt()`를 통해 `attempt + results + summary + reviewTasks`를 한 번에 저장하고, 기록/실전 화면도 `summary.current` 기준으로 읽도록 전환
- `functions/src/learning-history.ts`, `record-learning-attempt.ts`, `get-learner-summary.ts`, `save-featured-exam-state.ts`, `functions/src/index.ts`: Firestore `users/{accountKey}/attempts`, `attemptResults`, `reviewTasks`, `summary/current`에 맞춘 HTTPS functions와 repeated weakness/next review/totals/recent activity 집계 로직을 추가
- `constants/env.ts`, `.env.example`, `constants/storage-keys.ts`: 학습 히스토리 functions URL과 로컬 저장 키를 분리해 v1 저장 경로를 고정
- **검증**: `npm run typecheck`, `npm run lint`, `npm run functions:build`, `npm run functions:lint` 통과

**앱 기본 캔버스를 `#F6F2EA`로 통일**
- `constants/brand.ts`: `BrandColors.background`를 `#F6F2EA`로 조정해 홈, 내 기록, 설정, 결과, 연습, 모의고사 목록, 피드백, 진단 화면까지 같은 종이 같은 아이보리 바탕을 공유하도록 변경
- 기존에 `BrandColors.background`를 참조하던 공통 화면들이 별도 파일 수정 없이 같은 캔버스를 사용하게 정리하고, 화면 간 차이는 카드/버튼/히어로 위계로만 나누는 방향으로 고정
- 문제 본문 카드도 같은 배경 토큰을 쓰므로 전체 앱이 더 조용하고 일관된 학습 앱 톤으로 읽히도록 정리
- **검증**: `npm run typecheck`, `npm run lint` 통과

**문제 풀기 탭 배경을 내 기록/설정과 같은 톤으로 통일**
- `app/(tabs)/quiz/index.tsx`: 학습 허브 `screen` 배경색을 `#F5F1E8`에서 `BrandColors.background`로 되돌려, `내 기록`/`설정` 탭과 같은 바탕색 위에서 카드만 위계로 보이도록 조정
- 홈 허브의 카드 구조와 카피는 유지하고, 사용자가 요청한 대로 탭 간 배경 톤만 동일하게 맞춤
- **검증**: `npm run typecheck`, `npm run lint` 통과

**홈 허브 슬로건을 `틀린 문제 정리, 쉽게.`로 교체하고 배경 장식을 제거**
- `app/(tabs)/quiz/index.tsx`: 홈 상단 슬로건을 `틀린 문제 정리, 쉽게.`로 교체하고, 홈/로딩/에러 상태에서 쓰이던 원형 background glow를 모두 제거해 종이 같은 단색 배경으로 정리
- `app/(tabs)/quiz/index.tsx`: 최근 학습 기록 카드의 부연 문구를 `지금 학습 상태를 한눈에 볼 수 있어요.`로 축약해 첫 화면 텍스트 밀도를 더 낮춤
- `features/learning/components/peer-presence-strip.tsx`: live peer strip의 추가 설명 문장을 제거하고 footer를 `함께 보는 중`으로 줄여 히어로 아래 사회적 감각을 더 조용하게 정리
- `features/learning/home-state.ts`: 대표 모의고사 완료 상태 문구를 더 짧고 직접적인 문장으로 다듬어 홈 보조 카드의 톤을 통일
- `app/(tabs)/quiz/index.tsx`: 히어로 내부 halo 장식과 미사용 `headerBody` 스타일까지 제거해 홈 전체를 더 단순한 카드 위계 중심으로 정리
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI 리뷰에서 중대한 이슈 없음 확인

**홈 허브 상단 메시지를 `틀린 문제 정리, 대신.` 슬로건 중심으로 축소**
- `app/(tabs)/quiz/index.tsx`: 홈 상단을 긴 설명형 소개에서 `DASIDA / 틀린 문제 정리, 대신. / 상태 칩` 구조로 압축하고, 최근 학습 요약 카드의 부연 문구도 짧게 다듬어 첫 화면 시선을 히어로 카드로 더 빨리 떨어지게 정리
- `features/learning/home-state.ts`: `fresh`, `review`, `빠른 재진단`, peer fallback, 대표 모의고사, 최근 진단 결과 카피를 `오답 분석` 대신 `틀린 문제 정리`, `다시 보기`, `이어가기` 중심 학생 언어로 단순화
- `features/learning/components/peer-presence-strip.tsx`: live subtitle과 peer footer를 더 짧은 문장으로 조정해 사회적 감각은 유지하면서도 홈 전체 문장 밀도를 낮춤
- 핵심 메시지를 `귀찮은 틀린 문제 정리를 대신해준다`로 고정하고, 상단은 브랜드 슬로건만 남기고 제품 설명은 히어로/peer strip/보조 카드로 분산하는 원칙을 반영
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI 리뷰에서 카피 위계 관련 `No blocking issues` 확인

**홈 허브 카피를 `틀린 문제 정리` 중심 메시지로 재정렬**
- `app/(tabs)/quiz/index.tsx`: 홈 상단 소개 문구를 긴 설명형 문장에서 `틀린 문제 정리, 대신.` 슬로건으로 축소하고, 상단에서 중복 설명을 제거
- `features/learning/home-state.ts`: 홈 hero, peer strip fallback, 대표 모의고사 카드, 최근 진단 결과 카드 문구를 `오답 분석`보다 `틀린 문제 정리 / 다시 보기` 중심 학생 언어로 통일
- `features/learning/components/peer-presence-strip.tsx`: live subtitle과 footer 문구를 `같은 방식으로 틀린 문제를 정리하고 있어요` 톤으로 조정해 사회적 감각과 핵심 가치가 같은 방향으로 읽히게 정리
- 유튜브 인기 제목 패턴의 `짧음`, `즉시 이해성`, `구체 효용`만 가져오고, 과장/랭킹/자극 표현은 홈 카피에 사용하지 않도록 기준 고정
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI 리뷰에서 홈 카피 위계 관련 `No blocking issues` 확인

**학습 허브 전환 1차 골격과 로컬 익명 프로필 도입**
- `@react-native-async-storage/async-storage` 추가로 앱 설치 단위의 로컬 영속 상태 저장 기반 마련
- `features/auth/*`: `AuthProviderId = anonymous | apple | google | kakao`, `AuthClient` 인터페이스, `LocalAnonymousAuthClient` 구현 추가
- `features/learner/*`: `LearnerProfile`, `CurrentLearnerController`, `CurrentLearnerProvider`, `LocalLearnerProfileStore` 추가로 현재 사용자를 전역 컨텍스트로 읽는 구조 도입
- `features/learning/*`: `ReviewTask`, `LocalReviewTaskStore`, `HomeLearningState` 추가로 허브가 읽는 최소 학습 상태 모델 정리
- `constants/storage-keys.ts` 추가로 auth/profile/review/exam 저장 키 규칙을 `accountKey` 기반으로 고정
- `app/_layout.tsx`: 전역 `CurrentLearnerProvider` 삽입
- `app/(tabs)/quiz/index.tsx`: 기존 10문제 시작 화면을 `학습 허브`로 교체하고, hero 카드 1개 + 중간 카드 2개 + 하단 최근 학습 요약 구조 구현
- `app/(tabs)/quiz/diagnostic.tsx` 추가 및 `features/quiz/screens/diagnostic-screen.tsx`로 기존 진단 플로우 이동, `autostart=1` 파라미터 지원 추가
- `app/(tabs)/quiz/_layout.tsx`: `diagnostic`, `exams` 라우트 추가
- `app/(tabs)/quiz/result.tsx`: 라이브 진단 결과를 `latestDiagnosticSummary` snapshot으로 저장하고, 결과 CTA를 `오늘의 약점 학습 시작 -> 대표 모의고사 다시 풀기` 순서로 재배치
- `app/(tabs)/history.tsx`: 최근 진단 결과 / 복습 상태 / 대표 모의고사 상태 요약 카드로 교체
- `app/(tabs)/profile.tsx`: 학년 설정 + 개발용 상태 미리보기(`첫 설치`, `진단 완료`, `오늘 복습 있음`, `모의고사 진행 중`) + 로컬 상태 초기화 UI 추가
- `app/(tabs)/quiz/exams.tsx`: 대표 모의고사 1세트의 현재 준비 상태를 보여주는 placeholder 화면 추가
- 미래 `Apple/Google/Kakao` 소셜 로그인 도입 시 `AuthClient`와 profile store 구현체만 교체하도록 인터페이스 우선 구조로 정리
- **검증**: `npm run typecheck`, `npm run lint` 통과

### 2026.03.12

**제품 전략 문서를 `PROJECT.md`로 재정렬**
- 루트 `PROJECT.md`를 예전 MVP 기획서에서 현재 제품 전략 기준 문서로 전면 갱신
- 핵심 메시지를 `10문제 체험 -> 매일 약점 학습 -> 실전 모의고사`로 재정의하고, 10문제는 activation funnel, 약점 학습은 retention engine, 모의고사는 credibility/expansion engine으로 역할을 분리
- 첫 공개 버전 범위를 `10문제 체험 + 오답 약점 분석 + 매일 학습 + 알림 + 대표 모의고사 1개 묶음`으로 고정하고, 최근 3년 전체 아카이브와 리포트는 후속 단계로 분리
- `docs/PROGRESS.md`는 실행 로그, `PROJECT.md`는 제품 전략 문서라는 운영 원칙을 명시

**오답 분석 완료 후 다음 미완료 문제로 자동 이동**
- `app/(tabs)/quiz/index.tsx`: `findNextIncompleteDiagnosisPageIndex()` 헬퍼를 추가하고, `final` 노드 확정 직후 현재 페이지 오른쪽의 다음 미완료 오답을 우선 찾고 없으면 앞쪽으로 wrap하여 자동 이동하도록 연결
- `handleFinalizeDiagnosis()`: 약점 저장과 완료 transcript append 뒤에 `scrollToDiagnosisPage()`를 한 프레임 뒤 호출하도록 정리해, 완료 버블이 붙은 다음 자연스럽게 다음 미완료 문제로 넘어가게 조정
- 마지막 미완료 문제까지 끝난 경우에는 추가 이동 없이 기존 세션 finalize 흐름에 맡겨 결과 화면으로 자동 전환되도록 유지
- 기존 스와이프, 점 탭, 읽기 전용 완료 페이지, 세로 스크롤 복원 규칙은 그대로 유지
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI 리뷰에서 자동 다음 이동/스크롤 복원 충돌 없음 확인

**상세 진단 `모르겠습니다`에 AI 보충 설명 도입**
- `app/(tabs)/quiz/index.tsx`: 상세 진단 workspace에 `aiHelpUsed`, `aiHelpState`를 추가하고, `explain/check` 노드에서 `모르겠습니다`를 눌렀을 때만 AI 보충 설명 composer가 열리도록 흐름을 재구성
- 같은 문제에서 AI 보충 설명은 1회만 허용하고, 이후 다시 `모르겠습니다`를 누르면 보충 설명 입력 없이 기존 `더 쉬운 설명` 분기로 이어지도록 제한
- `features/quiz/components/diagnosis-conversation-page.tsx`: transcript entry에 `ai-help`, `ai-help-actions`를 추가하고, AI 보충 설명 카드와 후속 액션 카드를 채팅 안에 렌더링하도록 확장
- `features/quiz/components/diagnosis-ai-help-card.tsx`, `diagnosis-ai-help-actions-card.tsx` 추가로 `어디가 막혔는지` 입력 카드와 `확인 문제로 넘어갈게요 / 문제를 다시 볼게요 / 더 쉬운 설명으로 볼게요` 액션 카드를 분리
- `features/quiz/diagnosis-explainer.ts`, `constants/env.ts`, `.env.example`: explain 전용 클라이언트 fetch 모듈과 `EXPO_PUBLIC_DIAGNOSIS_EXPLAIN_URL` 환경변수 경로 추가
- `functions/src/explain-diagnosis-node.ts`, `functions/src/openai-client.ts`, `functions/src/firestore-log.ts`, `functions/src/index.ts`, `functions/src/types.ts`: `gpt-4.1` 기반 설명 전용 HTTPS 함수와 `diagnosisExplainRuns` 메타 로그 경로 추가
- `features/quiz/types.ts`, `features/quiz/diagnosis-flow-engine.ts`: `ai_help_requested / ai_help_continue / ai_help_fallback` 이벤트와 `usedAiHelp` trace 저장 추가
- 기존에 잘못 들어갔던 `저신뢰 풀이법 분류 단계 추가 설명 입력` UI는 제거하고, 풀이법 분류 단계는 다시 `초기 자유 입력 1회 + 후보/수동 선택` 구조로 정리
- **검증**: `npm run typecheck`, `npm run lint`, `npm run lint --prefix functions`, `npm run build --prefix functions` 통과, Claude CLI(`building-native-ui`, `native-data-fetching`) 리뷰에서 치명적 findings 없음

**오답 분석 저신뢰 시 추가 설명 입력 1차 도입**
- `app/(tabs)/quiz/index.tsx`: 오답 분석 workspace에 `clarifyingInput`, `hasSubmittedClarifyingInput` 상태를 추가하고, 저신뢰 추천일 때만 추가 설명을 합쳐 한 번 더 AI 추천을 요청하는 흐름을 연결
- 첫 자유 입력을 수정하면 추가 설명 상태와 저신뢰 재시도 상태를 초기화하고, 수동 선택/AI 확정 시에는 초기 입력과 추가 설명을 합친 텍스트를 진단 trace에 기록하도록 정리
- `features/quiz/components/diagnosis-method-selector-card.tsx`: 저신뢰 카드 안에서만 열리는 `조금만 더 설명해줄래요?` 입력 패널과 `추가 설명으로 다시 추천받기` 버튼을 추가
- `features/quiz/components/diagnosis-conversation-page.tsx`: method selector 카드에 추가 설명 입력과 재추천 액션 props를 전달
- 목표는 `매 단계 입력`이 아니라 `AI가 처음 설명을 애매하게 본 순간에만 1회 추가 설명`을 여는 구조로 유지하는 것
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI Expo UI 리뷰에서 `No significant findings` 확인

**오답 분석 페이지별 세로 스크롤 유지**
- `app/(tabs)/quiz/index.tsx`: answerIndex 기준으로 페이지별 세로 스크롤 위치와 실제 상호작용 여부를 ref로 저장하도록 변경
- 점 탭/가로 스와이프 후 다른 오답 문제로 돌아오면, 입력·선택·진행이 있었던 페이지에 한해 마지막으로 보던 세로 위치를 복원하도록 정리
- 아직 상호작용하지 않은 문제는 스크롤 위치를 저장하더라도 복원하지 않고, 다시 열면 `오늘 같이 볼 문제` 카드부터 보이도록 규칙 추가
- 현재 보고 있는 문제에서 새 사용자 답변/플로우 카드/완료 카드가 생길 때만 자동으로 아래로 이동하고, 단순 페이지 복귀 시에는 맨 아래로 강제 이동하지 않도록 분리
- `features/quiz/components/diagnosis-conversation-page.tsx`: 기존 `isActive` 기반 `scrollToEnd` 로직을 제거하고 `restore / auto-scroll / onScroll` 분리 구조로 재구성
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI Expo UI 리뷰에서 `No significant findings` 확인

**오답 약점 분석 상단 세션 바 단순화**
- `app/(tabs)/quiz/index.tsx`: 상단 진단 바에서 `x/x`, 숫자 캡슐, 좌우 화살표를 제거하고 `닫기 버튼 + 제목 + 자연어 메타 텍스트 + 작은 진행점` 구조로 단순화
- 진행 상태는 `두 번째 문제` 같은 자연어 메타와 탭 가능한 작은 점 인디케이터로만 표현하고, 완료/현재/미래 상태는 점의 fill과 길이 차이로 구분하도록 재설계
- 오답 문제 수가 6개를 넘을 때도 한 줄에서 유지되도록 compact dot 규칙을 추가하고, 이동 방식은 `점 탭 + 스와이프`만 남기도록 정리
- `features/quiz/components/diagnosis-conversation-page.tsx`, `diagnosis-problem-bubble.tsx`: 상단 세션 바와 문제 카드가 더 자연스럽게 이어지도록 transcript top rhythm을 소폭 조정
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI Expo UI 리뷰에서 `No significant findings` 확인

**오답 약점 분석 디자인 리디자인**
- `constants/diagnosis-theme.ts` 추가로 오답 분석 전용 색상 토큰을 분리하고, 전체 진단 화면을 `아이보리 캔버스 + 짙은 그린 + 차분한 잉크색` 기준으로 재정렬
- `app/(tabs)/quiz/index.tsx`: 오답 진단 화면 전용 배경 레이어, 세션형 상단 바, 캡슐형 페이지 네비게이션으로 재구성
- `components/ui/icon-symbol.tsx`: 진단 헤더에서 사용할 `xmark`, `chevron.left`, `checkmark.circle.fill` 심볼 매핑 추가
- `features/quiz/components/diagnosis-problem-bubble.tsx`: 문제 카드를 `오늘 같이 볼 문제` 히어로 카드로 승격하고, 상단 밴드와 보조 문구를 추가해 첫 화면 존재감 강화
- `features/quiz/components/diagnosis-chat-bubble.tsx`: 사용자 버블을 짙은 브랜드 그린 솔리드로, AI 버블을 백색 상담 카드형으로 재설계하고 tone별 accent 라인을 추가
- `features/quiz/components/diagnosis-method-selector-card.tsx`: 붉은 경고 패널 느낌을 제거하고, 선택 도구 패널형 카드와 메모 입력, 추천/저신뢰 영역을 같은 디자인 언어로 통일
- `features/quiz/components/diagnosis-flow-card.tsx`: `choice/explain/check/final` 노드 종류에 따라 카드 배경과 강조 톤을 분리하고, `모르겠습니다` 버튼도 중립적 보조 버튼으로 조정
- `features/quiz/components/diagnosis-conversation-page.tsx`: transcript 간격과 리듬을 조정하고, 새 assistant/user 엔트리에 얕은 등장 모션을 추가
- `features/quiz/components/diagnosis-exit-confirm-modal.tsx`: 종료 확인 모달을 진단 테마에 맞는 시트형 카드로 정리
- **검증**: `npm run typecheck`, `npm run lint` 통과

### 2026.03.11

**오답 분석 문제 포함 채팅형 스와이프 플로우 재구성**
- `app/(tabs)/quiz/index.tsx`: 오답 분석 단계를 순차형 단일 채팅에서 `문제별 독립 workspace + horizontal pager` 구조로 재구성
- 문제 카드, AI 질문, 풀이법 선택 카드, 상세 진단 카드가 한 문제당 하나의 transcript 안에 누적되도록 정리하고, 별도 상단 문제 영역 제거
- 좌우 스와이프와 좌우 화살표, 탭 가능한 상단 진행 점/숫자를 모두 제공해 원하는 오답 문제로 자유 이동 가능하게 변경
- 각 오답 문제의 입력값, AI 추천 결과, 상세 진단 draft, transcript를 개별 상태로 저장해 다른 문제를 보고 돌아와도 이어서 진행 가능하도록 보강
- 완료한 페이지는 읽기 전용으로 고정하고, 마지막에 `이 문제는 분석을 마쳤어요.` 보조 버블을 남기도록 정리
- `features/quiz/components/diagnosis-conversation-page.tsx`, `diagnosis-problem-bubble.tsx`, `diagnosis-method-selector-card.tsx`, `diagnosis-exit-confirm-modal.tsx` 추가로 채팅 페이지, 문제 카드, 선택 카드, 종료 확인 모달을 분리
- `features/quiz/session.tsx`, `features/quiz/types.ts`: 순차 진단 인덱스를 제거하고 `finishDiagnosis()` 액션을 추가해 조기 종료 시 완료한 분석만 결과에 반영할 수 있도록 변경
- `app/(tabs)/quiz/result.tsx`: 완료한 약점 분석이 0개인 상태로 종료했을 때를 위한 빈 결과 카드 추가
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI 리뷰에서 `FlatList pager + 페이지 ScrollView` 조합의 제스처 충돌 가능성만 비차단 잔여 리스크로 확인

**오답 분석 다단계 상세 플로우 도입**
- `data/detailedDiagnosisFlows.ts` 추가로 모든 `SolveMethodId`를 커버하는 상세 오답 분석 플로우 데이터 정의
- `features/quiz/diagnosis-flow-engine.ts` 추가로 분기/설명/확인 문제/최종 약점 노드 이동을 처리하는 순수 엔진 구현
- `features/quiz/components/diagnosis-flow-card.tsx` 추가로 오답 분석 전용 카드 UI 분리
- `features/quiz/types.ts`: `DiagnosisFlowEvent`, `DiagnosisDetailTrace` 추가 및 `QuizAnswer`에 상세 진단 trace 저장 필드 확장
- `features/quiz/session.tsx`: `submitDiagnosisWeakness`가 최종 약점과 함께 상세 진단 trace도 저장하도록 확장
- `app/(tabs)/quiz/index.tsx`: 기존 `풀이법 선택 -> 약점 버튼 3개` 구조를 `풀이법 선택 -> 상세 분기 -> 설명 카드 -> 확인 문제 -> 최종 약점 기록` 구조로 교체
- 설명 카드 진행 버튼은 `확인 문제로 넘어갈게요`로 고정하고, `이해했습니다`류 문구 없이 `모르겠습니다` 분기를 모든 설명/확인 문제 단계에 제공
- `cps/vertex/diff/unknown`은 기존 `index.html` 흐름을 앱용으로 정리해 반영하고, 나머지 7개 풀이법은 공통 템플릿형 플로우로 구성
- 기존 OpenAI/Firebase 분류는 `풀이법 추정`까지만 유지하고, 상세 오답 진단은 전부 클라이언트 로컬 플로우에서 처리
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI 리뷰에서 치명적 findings 없음

**오답 분석 대화형 챗 UI 전환**
- `app/(tabs)/quiz/index.tsx`: 상세 진단 단계를 현재 카드 1장 렌더링 방식에서 `AI 카드 -> 사용자 응답 -> 다음 AI 카드`가 누적되는 채팅 transcript 방식으로 전환
- `features/quiz/components/diagnosis-chat-bubble.tsx` 추가로 사용자/보조 AI 메시지 버블 컴포넌트 분리
- `features/quiz/components/diagnosis-flow-card.tsx`: 과거 단계 재진입 방지를 위한 비활성화 처리, 버튼 접근성 역할 추가, 버튼 텍스트 `selectable` 제거
- `index.html`처럼 이전 대화가 계속 남고, 과거 선택지는 비활성화된 상태로 보이도록 정리
- 설명/확인 문제 단계에서 사용자의 선택과 `모르겠습니다` 응답이 실제 채팅 말풍선으로 쌓이도록 보강
- 확인 문제 정오답에 따라 짧은 보조 피드백 버블을 추가해 다음 설명 카드나 최종 정리 카드로 자연스럽게 이어지도록 조정
- `ScrollView`의 `onContentSizeChange`를 이용해 새 메시지가 추가될 때마다 하단으로 자동 스크롤되도록 개선
- **검증**: `npm run typecheck`, `npm run lint` 통과, Claude CLI 리뷰 후 접근성/중복 호출/스크롤 타이밍 보완 반영

**GPT-4.1 기반 오답 풀이법 분류 1차 구현**
- `functions/`: Firebase Functions(TypeScript) 신규 추가
- `functions/src/diagnosis-method.ts`: HTTPS 함수 `diagnoseMethod` 구현, 요청 검증, OpenAI 결과 후처리, Firestore 메타로그 저장 추가
- `functions/src/openai-client.ts`: OpenAI `gpt-4.1` + Responses API(JSON Schema 응답) 호출 모듈 추가
- `functions/src/firestore-log.ts`: `diagnosisMethodRuns` 컬렉션에 결과 메타데이터만 저장하도록 분리
- `features/quiz/diagnosis-router.ts`: 원격 OpenAI 분류 우선 호출 후 실패/저신뢰 시 mock 라우터로 fallback 하도록 리팩토링
- `features/quiz/diagnosis-router-mock.ts`: 기존 키워드 기반 mock 분류 로직 분리
- `app/(tabs)/quiz/index.tsx`: `problemId`와 허용 풀이법 메타데이터를 함께 보내도록 연결, trace source를 `openai-router/mock-router/manual-selection` 기준으로 정리
- `.env.example`, `constants/env.ts`: Expo 클라이언트에서 함수 URL을 읽는 환경변수 경로 추가
- `firebase.json`, `functions/package.json`, `functions/tsconfig.json`: Firebase 함수 코드베이스와 빌드 설정 추가
- **남은 설정**: 실제 배포 전 `OPENAI_API_KEY` secret, Firebase 프로젝트 연결, `EXPO_PUBLIC_DIAGNOSIS_ROUTER_URL` 값 주입 필요
- **검증**: `npm run typecheck`, `npm run lint`, `npm run lint --prefix functions`, `npm run build --prefix functions` 통과

**Firebase 진단 함수 공개 호출/복구 안정화**
- `.firebaserc` 추가로 현재 레포를 Firebase 프로젝트 `dasida-app`에 연결
- `functions/src/diagnosis-method.ts`에 `invoker: 'public'` 적용으로 외부 호출 가능한 2nd gen HTTP 함수로 정리
- Firestore 로그 저장 실패가 전체 진단 응답을 500으로 만들지 않도록 함수 내부에서 로그 실패를 별도 처리
- `.gitignore`에 `firebase-debug.log` 추가로 로컬 배포 로그가 워크트리를 오염시키지 않도록 정리
- 실제 함수 호출 기준 `200` 응답과 `openai-router` 분류 결과 반환 확인

**저신뢰 오답 진단 후보 선택 UX 개선**
- `features/quiz/diagnosis-router.ts`: 저신뢰 원격 결과를 바로 버리지 않고 mock 결과와 병합해 수동 선택 단계에서도 좁혀진 후보를 유지하도록 변경
- `app/(tabs)/quiz/index.tsx`: 저신뢰 시 generic 경고문만 보여주지 않고 상위 후보 2개를 버튼으로 먼저 제안하도록 UI 개선
- 애매한 입력에서도 `다시 적으세요`보다 `가까운 풀이법을 바로 고르게 하는 흐름`으로 보강
- **검증**: `npm run typecheck`, `npm run lint`, `npm run build --prefix functions` 재확인, Claude Code CLI 리뷰에서 치명적 findings 없음

**원격 푸시 기록 (Firebase 진단 함수 공개 호출 안정화)**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `dd115b7`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/dd115b72e080cc70fa2f2d5a54f0f16c145cdd9f`

**원격 푸시 기록 (저신뢰 오답 진단 후보 선택 가이드)**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `2d8540b`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/2d8540b818ce5bd3039b77f7998aafedc506859b`

### 2026.03.10

**오답 진단 자유 입력 라우팅 1차 구현 (Claude Code 연동)**
- `features/quiz/types.ts`: `DiagnosisRoutingTrace` 타입 추가 및 `QuizAnswer` 확장
- `features/quiz/session.tsx`: 진단 액션을 `confirmDiagnosisMethod`와 `submitDiagnosisWeakness`로 분리
- `data/diagnosis-method-routing.ts`: 11종의 풀이법 카탈로그 데이터 (키워드 매칭) 추가
- `features/quiz/diagnosis-router.ts`: 단어 매칭 기반 mock 라우터 비동기 함수 구현
- `app/(tabs)/quiz/index.tsx`: 진단 UI를 자유 입력 폼과 라우팅 결과(고압/저압 신뢰도 점수 기반 카드 노출)로 리팩토링
- **구현 핵심 요약 (Mock 라우터 로직)**: 학생이 오답 원인을 입력하면 현재는 OpenAI 연동 없이 미리 정의된 풀이법별 키워드 배열에 매칭해 점수를 냅니다. 상위 2개의 점수 차이가 크면(2점 이상) 확정된 풀이법으로 추천해주고, 애매하면 사용자에게 직접 고르도록 객관식 버튼을 띄우는 구조입니다. 차후 `analyzeDiagnosisMethod` 함수 내부만 OpenAI 연동으로 교체하면 실제 AI 기반 분류가 가능하도록 확장성을 확보했습니다.
- `PLAN.md`의 구현 단계 및 Claude Code 연계 방식 모두 적용 완료

### 2026.03.09

**오답 일괄 진단(Bulk Diagnosis) 플로우 리팩토링**
- `features/quiz/session.tsx`에서 오답 처리 시 바로 진단 화면을 띄우지 않도록 `isDiagnosing` 및 `diagnosisQueue` 상태 도입
- 10문제를 모두 푼 뒤, 큐에 쌓인 오답 인덱스에 대해 순차적으로 진단 트리를 진행하는 단계 분리
- `app/(tabs)/quiz/index.tsx`에 `isDiagnosing` 렌더링 경로를 추가해, 진단 모드일 때는 오답 원인 분석 UI 우선 노출
- Claude Code CLI 검증을 통해 Expo UI 스킬 권장 사항(`React.use`, `borderCurve: 'continuous'`, `Haptics`, `selectable`)을 반영하고 타입 검사(`tsc --noEmit`) 통과
**안드로이드 하단 탭 안전 영역 보정**
- `app/(tabs)/_layout.tsx`의 `tabBarStyle`이 React Navigation 기본 하단 inset 처리를 덮어쓰고 있던 문제를 확인
- `useSafeAreaInsets()`를 적용해 하단 탭바 높이와 `paddingBottom`에 안드로이드 하단 시스템 내비게이션 inset을 직접 반영
- 3버튼 내비게이션 또는 제스처 바가 있는 기기에서 탭 버튼이 시스템 영역과 겹치지 않도록 조정

**10문제 약점진단 진행률 바 추가**
- `app/(tabs)/quiz/index.tsx` 상단에 현재 문항 진행 상태를 보여주는 진행률 트랙 추가
- 기존 `1 / 10` 텍스트는 유지하되, 같은 상태값으로 막대가 조금씩 차오르도록 구성
- 진단 화면 진입 시 현재 단계가 숫자뿐 아니라 시각적으로도 바로 보이도록 보강

**10문제 약점진단 시작 화면 분리**
- `features/quiz/session.tsx`와 `features/quiz/types.ts`에 `hasStarted` 세션 상태를 추가해 시작 전 인트로와 진행 중 화면을 안정적으로 분리
- `app/(tabs)/quiz/index.tsx`에 시작 전 인트로 카드와 `진단 시작하기` 버튼을 추가
- 진단 시작 후에는 `10문제 약점 진단` 큰 제목을 제거하고, 상단을 `진행률 바 + 단계 수 + 단원 칩`만 남기는 구조로 단순화

**피드백 입력 방식 비교 HTML 프로토타입 추가**
- 루트에 `feedback-input-demo.html`을 추가해 Live Server에서 기존 방식과 개선 방식을 바로 비교할 수 있도록 구성
- 기존 방식은 `raw text만 저장`, 개선 방식은 `추천 답변 칩 + 직접 입력 + normalizedReasonId 저장` 흐름을 한 화면에서 체험 가능하게 구현
- 자유 입력을 바로 OpenAI로 보내기 전에, 대표 표현 10~15개로 얼마나 유도/정규화할 수 있는지 확인하는 데 사용할 수 있는 데모

**수식 표기 브랜치 재정렬**
- `codex/feat-math-notation-rendering`의 기능 커밋 중 실제 작업 커밋 `3d77738`만 분리
- 최신 `main` 위에서 새 브랜치 `codex/feat-math-notation-rendering-main-based` 생성
- `main`의 Expo Skills, Claude 훅, 최근 UI 정리 커밋을 유지한 상태로 수식 표기 기능을 재적용

**원격 푸시 기록 (수식 표기 브랜치 재정렬)**
- 브랜치: `codex/feat-math-notation-rendering-main-based`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `7ea8d22`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/7ea8d22f0e52a56b5adc28a8729965c4722c5aad`

**수식 표기 범위 보강**
- `MathText`가 `x^2`는 처리하지만 `x^n`, `x^(n-1)` 같은 문자/괄호 지수는 처리하지 못하던 범위를 확인
- `components/math/MathText.tsx`의 지수 매핑을 확장해 문자 지수와 괄호 지수를 유니코드 윗첨자로 변환하도록 보강
- 실제 데이터 기준 샘플 확인:
  - `x^n은 n*x^(n-1)` → `xⁿ은 n×x⁽ⁿ⁻¹⁾`
  - `sqrt(75) - 6/sqrt(3) + sqrt(48)` → `√75 - 6⁄√3 + √48`

**원격 푸시 기록 (수식 표기 범위 보강)**
- 브랜치: `codex/feat-math-notation-rendering-main-based`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `e9ad1f4`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/e9ad1f4dbedd5cd08368141ad743a67cc4b89234`

**수식 표기 기능 main 병합 완료**
- `codex/feat-math-notation-rendering-main-based`의 수식 표기 기능과 기록 커밋을 `main`에 fast-forward 병합
- 현재 `main`은 수식 표기 컴포넌트 추가와 지수 렌더링 보강을 포함한 상태로 정렬

**원격 푸시 기록 (수식 표기 기능 main 병합)**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `013fde0`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/013fde0e6281389c3ee871fa11978679d2107b86`

**수식 문제 본문 가독성 개선**
- `components/math/problem-statement.tsx`를 추가해 문제 문장과 핵심 수식을 분리 렌더링하도록 정리
- `MathText`에 문제 본문 분해 로직을 넣어 설명 문장과 큰 식을 구분하고, 식 블록은 별도 박스로 강조
- `quiz/index`, `quiz/practice`에서 공통 `ProblemStatement`를 사용하도록 맞추고 선택지 스타일도 웹 시안 톤에 가깝게 조정

**원격 푸시 기록 (수식 문제 본문 가독성 개선)**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `a50d1d2`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/a50d1d2ad8226615800bcb234fe7491f63d80cd4`

**문제별 맞춤형 진단 방법 지원**
- `diagnosisMap`에 4개 새 약점 추가 (factoring_pattern_recall, complex_factoring_difficulty, quadratic_formula_memorization, discriminant_calculation)
- `diagnosisTree`에 각 약점별 대응하는 풀이법(SolveMethodId) 추가
- `problemData`의 각 문제에 `diagnosisMethods` 배열 할당하여 문제별 사용 가능한 진단 방법 정의
- `practiceMap`에 4개 새 약점에 대응하는 연습문제 추가 (인수분해 패턴, 복잡한 식 인수분해, 근의공식, 판별식 계산)
- `app/(tabs)/quiz/index.tsx`에서 화면에 보여줄 진단 옵션 버튼을 고정 4개에서 문제별 `availableMethods` 배열로 동적 렌더링으로 변경
- `tsc --noEmit` 검증 통과

**원격 푸시 기록 (문제별 맞춤형 진단 방법 지원)**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `1abc79a`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/1abc79a3817cc54aa39368f523ed9dc4c6d94a94`

**문제 유형별 맞춤 진단 풀이법 선택지 추가**
- `diagnosisTree`에 풀이법 5개 추가 — `radical`(무리수 계산), `polynomial`(다항식 전개), `complex_number`(복소수 계산), `remainder_theorem`(나머지정리), `counting`(경우의 수)
- 각 풀이법마다 2~3개의 약점 분기를 `diagnosisTree`에 정의
- `diagnosisMap`에 10개 새 약점 추가 (√간소화, 유리화, 전개부호, 동류항, i²혼동, 복소수정리, 나머지대입, 연립방정식, 경우의수방법혼동, 중복처리)
- `practiceMap`에 신규 약점 10개에 대응하는 연습문제 추가
- `problemData` q1(무리수), q2(다항식), q3(복소수), q5(나머지정리), q7(경우의 수)에 적절한 풀이법 할당 — 기존 `['unknown']`만 있어 '잘 모르겠어' 하나만 나오던 문제 해소
- `tsc --noEmit` 검증 통과

**원격 푸시 기록 (문제 유형별 맞춤 진단 풀이법 선택지 추가)**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `21cb18b`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/21cb18bf6107dcb9d2ec34a314aa34155cbfc937`

### 2026.03.08

**Expo 스킬 프로젝트 반영 완료**
- `.agents/skills/*`에 Expo Skills 본문과 참고 자료 추가
- `.agent/skills/*`, `.claude/skills/*`는 `.agents/skills/*`를 가리키는 심볼릭 링크로 정리
- `skills-lock.json` 추가로 스킬 버전과 해시를 고정

**에이전트 자동 적용 규칙 정리**
- `AGENTS.md`에 작업 유형별 Expo Skills 자동 적용 규칙 추가
- UI/네비게이션, API/Firebase, 배포, 업그레이드 등 요청 유형에 따라 먼저 열어야 할 `SKILL.md`를 명시

**Codex + Claude 운영 모델 정리**
- 기본 구현은 `Codex`, Expo 검증은 `Claude Code CLI` 권장, `Gemini`는 보조 또는 대체 검토 도구로 문서 전면 동기화
- Codex의 Expo 스킬 활용은 네이티브 자동 훅이 아니라 문서 규칙 기반임을 명시
- Claude 검증은 필수가 아니라 비용을 고려한 권장 규칙으로 정리

**Claude 검증 권장 기준 정리**
- UI 구조 변경, 네비게이션 변경, API/Firebase 연동, Expo SDK 업그레이드, 배포/EAS 변경은 Claude 검증 권장
- 문서 수정, 단순 카피 변경, 영향 범위가 좁은 수정은 Claude 검증 생략 가능으로 정리

**Claude 훅 자동 라우팅 추가**
- `.claude/settings.json`에 `UserPromptSubmit`, `PreToolUse`, `SessionEnd` 훅 추가
- `.claude/hooks/select-expo-skill.mjs`가 프롬프트 키워드로 관련 Expo 스킬을 자동 선택
- `.claude/hooks/check-expo-skill-before-tools.mjs`가 첫 `Edit|Write|Bash` 전에 스킬 확인을 한 번 유도
- 임시 훅 상태는 레포 내부가 아니라 `/tmp/dasida-claude-hooks`에서 관리하도록 구성

**Expo UI 스킬 기준 코드 정리**
- `building-native-ui` 기준으로 주요 화면 `ScrollView`에 `contentInsetAdjustmentBehavior="automatic"` 적용
- `history`, `profile` 화면도 스크롤 기반 레이아웃으로 정리해 작은 화면과 안전 영역 대응 강화
- `quiz/index` 카드의 레거시 `shadow/elevation` 스타일을 `boxShadow`로 교체
- `quiz/result`, `quiz/index`, `quiz/feedback`의 숫자 정보에 `tabular-nums` 정렬 적용
- 중복되던 `getSingleParam` 헬퍼를 `utils/get-single-param.ts`로 분리해 라우트 파일의 반복 유틸 제거

**원격 푸시 기록 (Expo UI 스킬 기준 코드 정리)**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `7231d5c`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/7231d5cc654b212359e52015dd79fe2e15843169`

**원격 푸시 기록 (Claude 훅 자동 라우팅)**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `6da899c`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/6da899c63d28df35b77c7aab2b279622df3a04c4`

**원격 푸시 기록 (운영 모델 문서 동기화)**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `1fe14b0`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/1fe14b04f6b6db2a5fd03ba4c1936b15d083e07a`

**원격 푸시 기록**
- 브랜치: `main`
- 원격: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`
- 원격 푸시 커밋: `fa9efca`
- 원격 푸시 커밋 URL: `https://github.com/kiyounpark/dasida-app/commit/fa9efca60c4e333c530396449e747fb59b56c70d`

### 2026.03.07

**AI 협업/알림 규약 정리**
- `scripts/slack-notify.js` 추가 및 `npm run notify:*` 명령 연결
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `docs/AI_COLLABORATION.md` 작성
- 작업 시작/진행/완료/실패 시 Slack Webhook 알림 전송 규약 고정
- 웹훅은 코드 하드코딩이 아닌 `SLACK_WEBHOOK_URL` 또는 `~/.config/dasida/slack-webhook`에서 읽도록 정리

**Git 작업 마무리 규약 정리**
- `pre-commit` 훅은 당분간 도입하지 않기로 결정
- 작업 종료 시 `git commit -> git push origin <현재 브랜치> -> npm run log:commit` 순서 사용
- 개발 기록 기준 문서를 `docs/PROGRESS.md`로 고정

**커밋 기록 자동화 강화**
- `scripts/log-commit.js`가 앞으로 브랜치, 원격명, 원격 URL, 커밋 링크까지 함께 기록
- 원격 저장소 기준: `origin`
- 원격 URL: `https://github.com/kiyounpark/dasida-app.git`

### 2026.03.06

**작업 시작 / 범위 고정**
- 내부 ID 키 전략(`WeaknessId`)으로 데이터 계약 전환
- 구현 범위: `10문제 풀이 -> 진단 트리 -> 상위 3개 약점 -> 약점/심화 연습 -> 피드백`
- 문서 동기화 범위: `DATA/STRUCTURE/PROGRESS` 즉시 반영

**내부 ID 키 전략 확정**
- 약점 키를 한글 라벨이 아닌 내부 고정 ID(`WeaknessId`)로 분리
- 화면 문구는 `labelKo`로 분리해 추후 문구 수정 시 로직 영향 제거
- 기존 `weakTag`는 이행기간 fallback으로만 유지

**데이터 레이어 구현 완료**
- `data/problemData.ts` — 10문제 데이터 추가
- `data/diagnosisMap.ts` — `id/labelKo/desc/tip` 구조 추가
- `data/diagnosisTree.ts` — 오답 진단 2단계 트리 추가
- `data/practiceMap.ts` — 약점별 연습문제 9개 추가
- `data/challengeProblem.ts` — 전부 정답용 심화 문제 추가

**퀴즈 로직/상태 레이어 구현 완료**
- `features/quiz/types.ts` — 세션 타입 정의
- `features/quiz/engine.ts` — 점수 누적/상위 3개 산정 로직
- `features/quiz/session.tsx` — 세션 컨텍스트/리듀서 구현

**화면 구현 완료**
- `app/(tabs)/quiz/_layout.tsx` — `QuizSessionProvider` 연결
- `app/(tabs)/quiz/index.tsx` — 10문제 풀이 + 오답 진단 트리
- `app/(tabs)/quiz/result.tsx` — 정답률/상위 약점/심화 분기
- `app/(tabs)/quiz/practice.tsx` — 오답 재시도 + 정답 진행 흐름
- `app/(tabs)/quiz/feedback.tsx` — 최종 요약 + 의견 입력

**문서 동기화 완료**
- `docs/DATA.md` — ID 고정/라벨 분리 정책으로 개정
- `docs/STRUCTURE.md` — 10문제 + 진단/연습 플로우 반영
- `docs/PROGRESS.md` — 본 작업 로그 추가

**원문 10문제 정밀 반영 완료**
- 소스 기준: `dasida_mvp_10problems_final.md` (사용자 제공 원문)
- 반영 파일: `data/problemData.ts`
- 반영 내용: 문제 본문/선택지/정답 인덱스 10문항 전체 교체
- 검증: `npm run lint`, `npx tsc --noEmit` 재통과

**검증 완료**
- `npm run lint` 통과
- `npx tsc --noEmit` 통과

**브랜드 디자인 정합화 완료 (index.html 기준)**
- 확정 방향 반영: SVG 로고 유지, 앱 전역 적용(quiz/history/profile), 로고만 헤더 노출
- `react-native-svg` 의존성 추가 및 `components/brand/*` 공통 계층 도입
- `constants/brand.ts` 토큰 추가, `constants/theme.ts` 탭 색상 브랜드 그린 정렬
- 화면 적용 파일:
  - `app/(tabs)/quiz/index.tsx`
  - `app/(tabs)/quiz/result.tsx`
  - `app/(tabs)/quiz/practice.tsx`
  - `app/(tabs)/quiz/feedback.tsx`
  - `app/(tabs)/history.tsx`
  - `app/(tabs)/profile.tsx`
  - `app/(tabs)/quiz/_layout.tsx`
  - `app/(tabs)/_layout.tsx`
- 문서 동기화:
  - `docs/STRUCTURE.md` 브랜드 UI 계층 섹션 추가
  - `docs/PROGRESS.md` 본 작업 로그 추가

**AppBar 겹침/정렬 개선 완료**
- 상태바(시간/배터리) 영역과 겹치지 않도록 `BrandHeader`를 `SafeAreaView(edges=['top'])` 기반으로 변경
- 로고 좌측 여백을 `12px`로 축소해 유튜브 스타일의 좌측 정렬감 반영
- `app/_layout.tsx`의 `StatusBar`를 `style='dark'`, `translucent={false}`로 명시
- `history/profile` 화면의 외곽 패딩을 제거하고 카드에 `marginHorizontal`을 적용해 AppBar 폭/정렬 충돌 해소

**다음 작업**
- [ ] 수식 표기(예: sqrt, i, 분수) UI 렌더링 개선
- [ ] Firebase 피드백 저장 연결
- [ ] OpenAI API 연동(규칙 기반 진단 보강)

### 2026.03.05

**환경 세팅 완료**
- Node.js v23.7.0 확인
- `npx create-expo-app@latest` 로 프로젝트 생성
- `tsconfig.json` jsx 설정 수정 (`react` → `react-jsx`)
- Expo Go 앱으로 안드로이드 기기 테스트 성공

**문서 구조 세팅**
- `PROJECT.md` — 전체 기획서 작성
- `docs/STRUCTURE.md` — 앱 구조 정의
- `docs/PROGRESS.md` — 진행 기록 (이 파일)
- `docs/DATA.md` — 데이터 구조 정의

**네비게이션 정합화 완료 (Tabs + Nested Stack)**
- 하단 탭을 `문제 풀기(quiz) / 내 기록(history) / 설정(profile)`으로 고정
- `quiz` 내부 Stack 경로를 `index → result → practice → feedback`으로 정리
- `feedback.tsx` 화면 파일 추가 및 `params` 안전 처리 반영
- 미사용 템플릿 라우트(`app/modal.tsx`) 제거
- `docs/STRUCTURE.md` 경로/상태표를 실제 코드와 동기화

**의사결정 기록**
- 커밋 이력은 `docs/PROGRESS.md`에 반자동 방식(`npm run log:commit`)으로 누적 기록
- 기록 원칙: 커밋 직후 `npm run log:commit` 실행 (기본값 `HEAD`)
- 작업 종료 절차는 `git commit -> git push origin <현재 브랜치> -> npm run log:commit`
- 커밋 로그에는 브랜치, 원격명, 원격 URL, 커밋 링크를 함께 남김
- 커밋 메시지는 Conventional 형식(`type: 설명`) 유지 + `설명`은 한글 중심으로 작성
- 커밋 메시지 검증은 `commit-msg` Git Hook으로 자동 강제

---

## 커밋 로그 (반자동)
> 커밋 후 아래 명령으로 최신 커밋(또는 특정 커밋)을 자동 기록합니다.
> - `npm run log:commit`
> - `npm run log:commit -- HEAD~1`
> - 기록 항목: 해시, 브랜치, 원격명, 원격 URL, 실제 커밋 링크, 작성자, 메시지(파일 목록은 기록하지 않음)
> - `log:commit` 실행으로 생긴 `docs/PROGRESS.md` 변경은 별도 문서 커밋으로 반영 가능
> - 정렬 규칙: 최신 커밋이 항상 맨 위

## 커밋 메시지 규칙 (자동 검증)
> Git Hook(`commit-msg`)으로 커밋 시점에 자동 검사합니다.
> - 형식: `feat: 퀴즈 탭 네비게이션 추가`
> - 허용 타입: `feat|fix|chore|docs|style|refactor|test|build|ci|perf|revert`
> - 설명 규칙: 한글 1자 이상 포함 + 영문자 금지
> - 설정 명령: `npm run setup:hooks` (현재 로컬 저장소 적용 완료)

<!-- COMMIT_LOGS_START -->

### 커밋 2026.04.10 17:50
- 해시: `6ed0136` (`6ed013602c871f346875a8a26f17a55fc94a11b2`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/6ed013602c871f346875a8a26f17a55fc94a11b2
- 작성자: 박기윤
- 메시지: docs: 2026-04-10 고2 진단 콘텐츠 구현 완료 기록

### 커밋 2026.04.09 21:37
- 해시: `5e28733` (`5e287332ad9c2893e465db24d91f499bdbf71004`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/5e287332ad9c2893e465db24d91f499bdbf71004
- 작성자: 박기윤
- 메시지: test(feedback): 취약한 부정 단언 제거 — 원칙 검증 2개로 충분

### 커밋 2026.04.09 21:12
- 해시: `dd1d92b` (`dd1d92be28ae362d56c2e9268ef183061d8acf49`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/dd1d92be28ae362d56c2e9268ef183061d8acf49
- 작성자: 박기윤
- 메시지: fix(keyboard): 태블릿 ScrollView ref 연결 + chatMessages 자동 스크롤 + iOS insets
- 본문: - tabletInputScrollRef 추가, 태블릿 우측 ScrollView에 연결 / - scrollToBottom에서 두 ref 모두 scrollToEnd 호출 / - useEffect로 chatMessages.length 변화 시 자동 스크롤 / - setTimeout 150ms → 250ms (레이아웃 완료 후 스크롤 보장) / - automaticallyAdjustKeyboardInsets 태블릿 iOS ScrollView에 추가 / - import 순서 정리: react → react-native 순 / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.09 20:07
- 해시: `7eaadd8` (`7eaadd8e5b7bb354149f040b1940cad7240adaa9`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/7eaadd8e5b7bb354149f040b1940cad7240adaa9
- 작성자: 박기윤
- 메시지: test(e2e): 루프 안정성 개선 — 전환 대기 시간 증가 + 빈 반복 방지

### 커밋 2026.04.08 22:01
- 해시: `4fe1cd3` (`4fe1cd33744bca1f1224f99ced81a93a40ff4761`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/4fe1cd33744bca1f1224f99ced81a93a40ff4761
- 작성자: 박기윤
- 메시지: Merge branch 'feat/tablet-responsive-ui'

### 커밋 2026.04.08 09:03
- 해시: `c87598a` (`c87598a6a42b9f355e76369de6c55a53e4333eaf`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/c87598a6a42b9f355e76369de6c55a53e4333eaf
- 작성자: 박기윤
- 메시지: feat(eas): App Store 제출 설정 추가 (ascAppId, appleId, buildNumber, 앱 이름 한글화)

### 커밋 2026.04.08 08:57
- 해시: `23b83a0` (`23b83a05fb5bd2bbe92689aa695c8204530a1e4e`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/23b83a05fb5bd2bbe92689aa695c8204530a1e4e
- 작성자: 박기윤
- 메시지: feat: listReviewTasks Cloud Function + 클라이언트 연동 (서버 복습 데이터 동기화)

### 커밋 2026.04.08 00:11
- 해시: `aeda50d` (`aeda50d6604a91465832627faf37c47c917a2738`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/aeda50d6604a91465832627faf37c47c917a2738
- 작성자: 박기윤
- 메시지: feat: day1 단계에서 진단 기준 막대 표시 (빈 상태 개선)
- 본문: day1 복습을 아직 완료하지 않은 경우, 진단 정답률을 기준 막대로 표시하여 / 빈 상태가 아닌 맥락 있는 차트를 보여준다. / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.08 00:05
- 해시: `42a5bca` (`42a5bcab5fdf988f3404a5bdd8e448087df6d9d2`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/42a5bcab5fdf988f3404a5bdd8e448087df6d9d2
- 작성자: 박기윤
- 메시지: fix: seedPreview에 이전 단계 weakness-practice 시도 추가 (차트 솔리드 막대 표시)

### 커밋 2026.04.07 23:59
- 해시: `c660f16` (`c660f16944435cf5e50a44004f8eade6d1e337fa`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/c660f16944435cf5e50a44004f8eade6d1e337fa
- 작성자: 박기윤
- 메시지: fix: StageBar undefined 방어 처리 및 indexOf -1 가드 추가

### 커밋 2026.04.07 23:43
- 해시: `dd7627e` (`dd7627ec44610a44431b70ef8ac39ab356c7d62b`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/dd7627ec44610a44431b70ef8ac39ab356c7d62b
- 작성자: 박기윤
- 메시지: design(profile): 회원 탈퇴 확인 다이얼로그를 커스텀 모달로 교체 (다시다 디자인)

### 커밋 2026.04.07 23:38
- 해시: `3066dcb` (`3066dcb783aaba9419ce39eff930aa1700a117f9`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/3066dcb783aaba9419ce39eff930aa1700a117f9
- 작성자: 박기윤
- 메시지: fix: 퍼센트 레이블 overflow 방지(barRow 높이 +16) 및 진단 막대 색 진하게
- 본문: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.07 23:38
- 해시: `56a9e6b` (`56a9e6b7610b71cdf24d6873c1a646658f7e73cb`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/56a9e6b7610b71cdf24d6873c1a646658f7e73cb
- 작성자: 박기윤
- 메시지: design(profile): 회원 탈퇴 UI 다시다 방향으로 개선 (텍스트 링크 스타일 + 제공자 뱃지)

### 커밋 2026.04.07 23:34
- 해시: `5024af8` (`5024af8dd64f45778a47885daa0ed0a238763831`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/5024af8dd64f45778a47885daa0ed0a238763831
- 작성자: 박기윤
- 메시지: fix: 시드 데이터 questions.isCorrect를 alternating으로 수정하여 약점별 정답률 0% 문제 해결
- 본문: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.07 23:33
- 해시: `e2e6db3` (`e2e6db34375781c82f731ce95963db7be127e3bd`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/e2e6db34375781c82f731ce95963db7be127e3bd
- 작성자: 박기윤
- 메시지: feat: 계정 탈퇴 기능 추가 (Apple App Store 필수)

### 커밋 2026.04.07 23:27
- 해시: `021b74e` (`021b74e1ca6af3f5ed1731160efd086dc970bacf`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/021b74e1ca6af3f5ed1731160efd086dc970bacf
- 작성자: 박기윤
- 메시지: fix: ref 선언 순서 정정 및 wrongCount에서 null(미선택) 제외
- 본문: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.07 21:31
- 해시: `3de752f` (`3de752fb919e6467015a3f418f18b357e6b58771`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/3de752fb919e6467015a3f418f18b357e6b58771
- 작성자: 박기윤
- 메시지: feat: HomeWeaknessSection을 WeaknessAccuracyChart로 연결
- 본문: WeaknessAccuracyChart import 추가 및 weaknessProgressItems props 연결 / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.07 21:25
- 해시: `12faf69` (`12faf69ec448562dff4227a6e143db4d050d4fac`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/12faf69ec448562dff4227a6e143db4d050d4fac
- 작성자: 박기윤
- 메시지: feat: WeaknessProgressItem에 diagnosticAccuracy/reviewAccuracy 추가, resolvedWeaknessHistory 제거

### 커밋 2026.04.07 19:53
- 해시: `93612bc` (`93612bce368e075d4afb9f203ae2b2fb20ce3fe5`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/93612bce368e075d4afb9f203ae2b2fb20ce3fe5
- 작성자: 박기윤
- 메시지: refactor: 로그인 화면 개인정보처리방침 문구 간소화
- 본문: 동의 강제 문구 제거, 링크 텍스트만 표시 / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.07 19:52
- 해시: `af4d360` (`af4d360cc0822ea049ccc46facc255f1e3dbd9a5`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/af4d360cc0822ea049ccc46facc255f1e3dbd9a5
- 작성자: 박기윤
- 메시지: feat: 로그인 화면에 개인정보처리방침 동의 문구 추가
- 본문: 로그인 버튼 하단에 "로그인하면 개인정보처리방침에 동의한 것으로 간주됩니다." 문구를 추가하고, / '개인정보처리방침' 텍스트를 탭하면 브라우저에서 방침 페이지를 열도록 연결 / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.07 19:42
- 해시: `23c5664` (`23c56648e23c7c1060848fecf3ee981667fee1cd`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/23c56648e23c7c1060848fecf3ee981667fee1cd
- 작성자: 박기윤
- 메시지: feat: Firebase Hosting 설정 및 개인정보처리방침 페이지 배포
- 본문: - firebase.json: hosting 설정 추가 (public/ 디렉터리) / - public/privacy/index.html: 한국어 개인정보처리방침 페이지 / - public/index.html: Hosting 루트 페이지 / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.07 19:40
- 해시: `92244a2` (`92244a230bba3fcc175a53adc5b8e099e041fd38`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/92244a230bba3fcc175a53adc5b8e099e041fd38
- 작성자: 박기윤
- 메시지: feat: 개인정보처리방침 코드 반영 (legal-urls, 앱 정보 카드, app.json)
- 본문: - constants/legal-urls.ts: privacyPolicy/termsOfService URL 상수 신규 / - profile-screen-view: 학년 설정 카드 아래 앱 정보 카드 추가 (버전 + 개인정보처리방침 버튼) / - app.json: expo.extra.privacyPolicyUrl 추가 / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.07 19:31
- 해시: `087b7c5` (`087b7c568c5c5c9a4103cb72744cc9f183867ad8`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/087b7c568c5c5c9a4103cb72744cc9f183867ad8
- 작성자: 박기윤
- 메시지: feat: 홈 하단 약점 섹션 추가 (WeaknessProgressItem, WeaknessGrowthChart, HomeWeaknessSection)

### 커밋 2026.04.06 23:16
- 해시: `9ab1ab1` (`9ab1ab1e221c819e9e1e5c96ca7dda5f09e42387`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/9ab1ab1e221c819e9e1e5c96ca7dda5f09e42387
- 작성자: 박기윤
- 메시지: fix: 복습 없는 날 NoReviewDayCard 상단 정렬 (헤더 바로 아래)

### 커밋 2026.04.06 23:14
- 해시: `d5e3a67` (`d5e3a67150001fd187ef63fbf4c0d7ff2e2e28ab`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/d5e3a67150001fd187ef63fbf4c0d7ff2e2e28ab
- 작성자: 박기윤
- 메시지: feat: 복습 없는 날 화면에 BrandHeader 추가

### 커밋 2026.04.06 22:04
- 해시: `5fbe366` (`5fbe36665e2b81163692f0854314c9db04b5cd69`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/5fbe36665e2b81163692f0854314c9db04b5cd69
- 작성자: 박기윤
- 메시지: Merge branch 'feat/hide-journey-board-after-onboarding'

### 커밋 2026.04.06 18:25
- 해시: `0827b13` (`0827b13f700225404d5e8bffc4e3ce9d2c4d4be4`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/0827b13f700225404d5e8bffc4e3ce9d2c4d4be4
- 작성자: 박기윤
- 메시지: feat: Firebase 에뮬레이터 포트 설정 + devDep 추가
- 본문: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.06 16:33
- 해시: `9b6ac5c` (`9b6ac5ce58ea83dea27d3bf90a6a48286c50577c`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/9b6ac5ce58ea83dea27d3bf90a6a48286c50577c
- 작성자: 박기윤
- 메시지: feat: 복습 dev 테스팅 인프라 구현 (시드 3개 + 날짜 당기기 + E2E 7개)

### 커밋 2026.04.04 11:51
- 해시: `fe842d1` (`fe842d166b214c5033e91d8c1537499553e9a098`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/fe842d166b214c5033e91d8c1537499553e9a098
- 작성자: 박기윤
- 메시지: feat: 홈 화면에 ReviewHomeCard 연결 + 오버듀 패널티 effect

### 커밋 2026.04.03 19:51
- 해시: `78313d9` (`78313d97265e15d53c493123f85c4271dec0b26f`)
- 브랜치: feat/playwright-e2e
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/78313d97265e15d53c493123f85c4271dec0b26f
- 작성자: 박기윤
- 메시지: feat: 온보딩 고3 트랙 선택 스텝 추가 (미적분/확통/기하)

### 커밋 2026.04.03 09:05
- 해시: `6fe5891` (`6fe5891812542be34ef4575f1c7422f304cbba4c`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/6fe5891812542be34ef4575f1c7422f304cbba4c
- 작성자: 박기윤
- 메시지: refactor: 피드백 화면 단순화 — TextInput·더미 state 제거, 홈 이동 버튼으로 정리
- 본문: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.03 00:41
- 해시: `0f90885` (`0f90885a8b958fff4653d12097090a1e331dcbc9`)
- 브랜치: fix/web-local-profile-store
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/0f90885a8b958fff4653d12097090a1e331dcbc9
- 작성자: 박기윤
- 메시지: fix: exam 잠금 해제 의도 주석 추가, 경로 표기 통일

### 커밋 2026.04.03 00:12
- 해시: `c49eb23` (`c49eb23e7f1e19c7924de069ef7ed31ab068612d`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/c49eb23e7f1e19c7924de069ef7ed31ab068612d
- 작성자: 박기윤
- 메시지: fix: getCurrentStepBody에서 복습 완료(dueCount=0) 상태 텍스트 수정

### 커밋 2026.04.02 00:45
- 해시: `58c5bdd` (`58c5bdd33013391fc6d795d8c833549db501e3aa`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/58c5bdd33013391fc6d795d8c833549db501e3aa
- 작성자: 박기윤
- 메시지: Merge branch 'feat/mock-exam-graduation'

### 커밋 2026.04.02 00:32
- 해시: `43b5df5` (`43b5df52635108aad9a18f5c1e17ab0b10aa8eed`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/43b5df52635108aad9a18f5c1e17ab0b10aa8eed
- 작성자: 박기윤
- 메시지: feat: 설정 화면에서 온보딩 화면 진입 버튼 추가 (개발용)
- 본문: 소셜 로그인 후 온보딩 플로우 테스트를 위해 설정 화면에 / 온보딩 화면 이동 버튼을 추가. __DEV__ 빌드에서만 노출. / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.02 00:28
- 해시: `6c2111b` (`6c2111b4a3ae962a3f6603fdc388acb123865a27`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/6c2111b4a3ae962a3f6603fdc388acb123865a27
- 작성자: 박기윤
- 메시지: Merge branch 'fix/firestore-permission-denied'

### 커밋 2026.04.01 21:33
- 해시: `e809037` (`e80903748328dd91411fe6b25563a3ea1ebc2a59`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/e80903748328dd91411fe6b25563a3ea1ebc2a59
- 작성자: 박기윤
- 메시지: fix: 온보딩 submit 에러 처리 추가, 미인증 접근 가드 추가
- 본문: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.04.01 19:06
- 해시: `9fbc672` (`9fbc672d768607811a824012a8eb7bec94775c0b`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/9fbc672d768607811a824012a8eb7bec94775c0b
- 작성자: 박기윤
- 메시지: fix: imageKey 변경 시 imageAspectRatio 리셋 추가

### 커밋 2026.03.31 01:44
- 해시: `63b319a` (`63b319a9dbfebd08d8f24f25f0a947a34097c489`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/63b319a9dbfebd08d8f24f25f0a947a34097c489
- 작성자: 박기윤
- 메시지: docs: PROGRESS.md 커밋 로그 업데이트
- 본문: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.03.31 01:38
- 해시: `5ab0676` (`5ab067662e4deb0b0d7ce535f23e802b1617f917`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/5ab067662e4deb0b0d7ce535f23e802b1617f917
- 작성자: 박기윤
- 메시지: feat: 기출 풀기 기능 구현
- 본문: - ExamSessionProvider: useReducer 기반 독립 세션 (DiagnosticSession과 분리) / - 풀기 화면: 객관식(1-5) + 단답형(숫자 키보드), 이미지 기반 문제 표시 / - 결과 화면: 획득점수/만점/정답률, Firebase 자동 저장 (source: 'exam') / - 결과 저장 후 약점 분석(진단) 또는 홈 이동 CTA / - 버그픽스: resetExam으로 stale isFinished 방지, 비동기 저장 재시도, 단답형 중복 저장 제거 / - 라우트: app/(tabs)/quiz/exam/ (solve, result, _layout) / - LearningSource에 'exam' 추가 / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.03.26 00:10
- 해시: `465ccef` (`465ccef4b7f406007320ce236d4a14697879ffee`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/465ccef4b7f406007320ce236d4a14697879ffee
- 작성자: 박기윤
- 메시지: style: 리포트 배너 여백 정리

### 커밋 2026.03.26 00:06
- 해시: `88ebc33` (`88ebc339ec343861b27d3d5ba6372a90fda508a4`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/88ebc339ec343861b27d3d5ba6372a90fda508a4
- 작성자: 박기윤
- 메시지: refactor: 공통 배너 규칙 통일

### 커밋 2026.03.25 23:53
- 해시: `b2f7b5c` (`b2f7b5cd06e2c20a9b610f1fd2cc223acb1d069a`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/b2f7b5cd06e2c20a9b610f1fd2cc223acb1d069a
- 작성자: 박기윤
- 메시지: style: 약점 분석 리포트 화면 정리

### 커밋 2026.03.25 23:08
- 해시: `b2fda94` (`b2fda9485fd61b47b04ce55a959ad19829f2c89c`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/b2fda9485fd61b47b04ce55a959ad19829f2c89c
- 작성자: 박기윤
- 메시지: feat: 약점 분석 리포트 화면 추가

### 커밋 2026.03.25 22:15
- 해시: `7e7e973` (`7e7e9731eb0602c282f0c94008add88f65550bf5`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/7e7e9731eb0602c282f0c94008add88f65550bf5
- 작성자: 박기윤
- 메시지: revert: 풀이 화면 정보형 화면으로 복귀

### 커밋 2026.03.25 19:15
- 해시: `93aecea` (`93aecea0f2f0664612f12a425072d6b2df9add60`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/93aecea0f2f0664612f12a425072d6b2df9add60
- 작성자: 박기윤
- 메시지: revert: 오답 약점 분석 화면 스케치 요소 제거

### 커밋 2026.03.25 18:33
- 해시: `2979057` (`2979057f4e1ff9302fb8420d12821dd4f247cd07`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/2979057f4e1ff9302fb8420d12821dd4f247cd07
- 작성자: 박기윤
- 메시지: feat: 오답 약점 분석 화면에 스케치 포인트 반영

### 커밋 2026.03.24 22:42
- 해시: `51ae2fb` (`51ae2fb838f79d155e37ca12e6062edb9a85da07`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/51ae2fb838f79d155e37ca12e6062edb9a85da07
- 작성자: 박기윤
- 메시지: docs: 클로드 최근 변경 검토 기록 추가

### 커밋 2026.03.24 20:35
- 해시: `2f729ba` (`2f729ba37c6fd9a8b138939f1f376b4199cf736b`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/2f729ba37c6fd9a8b138939f1f376b4199cf736b
- 작성자: 박기윤
- 메시지: feat: 약점 분석 인트로 화면 추가 (10문제 진단 직후)

### 커밋 2026.03.24 19:59
- 해시: `9ffd345` (`9ffd3450656f5e6f0d6c744ab3810fbc765c8d6a`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/9ffd3450656f5e6f0d6c744ab3810fbc765c8d6a
- 작성자: 박기윤
- 메시지: fix: 진단 진행 레이어 정렬

### 커밋 2026.03.24 19:32
- 해시: `3329747` (`3329747abb7bc551556a3736e24f8b549bf2b507`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/3329747abb7bc551556a3736e24f8b549bf2b507
- 작성자: 박기윤
- 메시지: fix: 진단 진행 바 디자인 통일

### 커밋 2026.03.24 18:49
- 해시: `0ccd72a` (`0ccd72afdaf178c8e44c4290ffc71397d5db2850`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/0ccd72afdaf178c8e44c4290ffc71397d5db2850
- 작성자: 박기윤
- 메시지: fix: 진단 문제 영역 빈 공간 축소

### 커밋 2026.03.24 18:46
- 해시: `20fc99c` (`20fc99cb272a43995e251098a67f1393fb00046a`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/20fc99cb272a43995e251098a67f1393fb00046a
- 작성자: 박기윤
- 메시지: fix: 진단 손그림 화면 그리드와 헤더 보정

### 커밋 2026.03.24 18:28
- 해시: `c6f7af1` (`c6f7af1bda20a75a075389e36def92ceeb19e695`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/c6f7af1bda20a75a075389e36def92ceeb19e695
- 작성자: 박기윤
- 메시지: feat: 진단 풀이 화면 손그림 스타일 적용

### 커밋 2026.03.23 23:43
- 해시: `b5d7aff` (`b5d7aff19be0082596d385538d6e9b929c3754e3`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/b5d7aff19be0082596d385538d6e9b929c3754e3
- 작성자: 박기윤
- 메시지: refactor: 문항 풀이 화면 하단 패널 고정 구조로 변경

### 커밋 2026.03.23 01:18
- 해시: `ca7bd14` (`ca7bd141dbd168a60da445404734eb0c677b3acc`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/ca7bd141dbd168a60da445404734eb0c677b3acc
- 작성자: 박기윤
- 메시지: feat: 약점 진단 풀이 화면 개편

### 커밋 2026.03.23 00:41
- 해시: `ce54d98` (`ce54d985634b5791a171937e82693ec2383f2598`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/ce54d985634b5791a171937e82693ec2383f2598
- 작성자: 박기윤
- 메시지: feat: 학습 여정판 비주얼 다듬기

### 커밋 2026.03.22 14:12
- 해시: `8815558` (`88155582fbd78d9d74791da68b540aba97fbaf7d`)
- 브랜치: (브랜치 정보 없음)
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/88155582fbd78d9d74791da68b540aba97fbaf7d
- 작성자: 박기윤
- 메시지: chore: 학습여정 3단계 자산 업데이트

### 커밋 2026.03.22 14:06
- 해시: `55eb256` (`55eb2566b5fc93c0413bd6182087d00eadc09db7`)
- 브랜치: (브랜치 정보 없음)
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/55eb2566b5fc93c0413bd6182087d00eadc09db7
- 작성자: 박기윤
- 메시지: fix: 학습여정 단계 강조 단순화

### 커밋 2026.03.22 12:14
- 해시: `c2f6071` (`c2f6071093b576c4b75a1828c2dfc13caa5b29c8`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/c2f6071093b576c4b75a1828c2dfc13caa5b29c8
- 작성자: 박기윤
- 메시지: feat: 학습여정 포스터형 화면 구성

### 커밋 2026.03.20 23:24
- 해시: `e647e3e` (`e647e3e2b5928fc1a8905aedae3848040f55c083`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/e647e3e2b5928fc1a8905aedae3848040f55c083
- 작성자: 박기윤
- 메시지: revert: 로그인 화면 비디오 제거

### 커밋 2026.03.20 22:41
- 해시: `4e3ae97` (`4e3ae97c9b976bef2e8d37038107e0d79f11829e`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/4e3ae97c9b976bef2e8d37038107e0d79f11829e
- 작성자: 박기윤
- 메시지: feat: 로그인 화면 히어로 비디오 적용

### 커밋 2026.03.20 22:32
- 해시: `a754ec0` (`a754ec0ff0a007b5f1e937381d42afa3afe3227e`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/a754ec0ff0a007b5f1e937381d42afa3afe3227e
- 작성자: 박기윤
- 메시지: feat: 로그인 화면 비주얼 홈 스타일 반영

### 커밋 2026.03.20 21:23
- 해시: `3da97b2` (`3da97b2f6e69edfc65054520633794a9641addc1`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/3da97b2f6e69edfc65054520633794a9641addc1
- 작성자: 박기윤
- 메시지: fix: 로그인 홈 버튼 정렬과 비스크롤 레이아웃 조정

### 커밋 2026.03.20 21:17
- 해시: `14bbc9a` (`14bbc9a7949572a803ffa88f78112e0e052f9207`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/14bbc9a7949572a803ffa88f78112e0e052f9207
- 작성자: 박기윤
- 메시지: feat: 로그인 홈 공식 인증 버튼 적용

### 커밋 2026.03.20 20:56
- 해시: `df98411` (`df9841142b54597ba6c142b88e77e8c9a6b800a1`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/df9841142b54597ba6c142b88e77e8c9a6b800a1
- 작성자: 박기윤
- 메시지: fix: 아이폰 구글 로그인 리디렉트 주소 정렬

### 커밋 2026.03.20 00:31
- 해시: `58cf03d` (`58cf03d0f3ede8192c55695b9ea61a002a88baa0`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/58cf03d0f3ede8192c55695b9ea61a002a88baa0
- 작성자: 박기윤
- 메시지: fix: 설정 개발 카드 노출 정리

### 커밋 2026.03.20 00:19
- 해시: `a80897d` (`a80897dfc687a4bf1514eb0df2b9ac22fe83ea9b`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/a80897dfc687a4bf1514eb0df2b9ac22fe83ea9b
- 작성자: 박기윤
- 메시지: fix: 인증 시작 흐름과 학습 기록 복구 정리

### 커밋 2026.03.20 00:02
- 해시: `b532e61` (`b532e61d84c07bcdfd34d3948a2d3a228ff5a046`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/b532e61d84c07bcdfd34d3948a2d3a228ff5a046
- 작성자: 박기윤
- 메시지: docs: 클로드 검증 기록 추가

### 커밋 2026.03.19 23:51
- 해시: `52f38b3` (`52f38b3341f9994afa9a4666773b097a380be7f0`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/52f38b3341f9994afa9a4666773b097a380be7f0
- 작성자: 박기윤
- 메시지: docs: 학습 기록 함수 배포 기록

### 커밋 2026.03.19 23:36
- 해시: `704a552` (`704a552b6a045a4f2c467d83d38ffdace82e3c99`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/704a552b6a045a4f2c467d83d38ffdace82e3c99
- 작성자: 박기윤
- 메시지: docs: 네이티브 빌드 규칙 반영

### 커밋 2026.03.19 23:32
- 해시: `c9eb935` (`c9eb935e86bb3e91bb2b365aa2d172a14e331112`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/c9eb935e86bb3e91bb2b365aa2d172a14e331112
- 작성자: 박기윤
- 메시지: fix: 아이오에스 개발 빌드 시작 흐름 안정화

### 커밋 2026.03.18 23:53
- 해시: `7596f1e` (`7596f1e2c982622410a4f8980a6b4ada9396e994`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/7596f1e2c982622410a4f8980a6b4ada9396e994
- 작성자: 박기윤
- 메시지: feat: 앱 전역 소셜 로그인 필수 전환

### 커밋 2026.03.18 22:57
- 해시: `5eaffe2` (`5eaffe228a81bdaa2e0b011adb9c00346df66bf7`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/5eaffe228a81bdaa2e0b011adb9c00346df66bf7
- 작성자: 박기윤
- 메시지: feat: 예약 복습 흐름과 복습 모드 추가

### 커밋 2026.03.18 20:22
- 해시: `74d1ecc` (`74d1ecc92e7406d500b6918f376c6f873e20fc9e`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/74d1ecc92e7406d500b6918f376c6f873e20fc9e
- 작성자: 박기윤
- 메시지: feat: 약점 연습 결과 저장 추가

### 커밋 2026.03.18 19:46
- 해시: `7e18f8d` (`7e18f8d501aab22aa7e91465fccb40c71784547e`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/7e18f8d501aab22aa7e91465fccb40c71784547e
- 작성자: 박기윤
- 메시지: feat: 약점 연습 오답 코칭 플로우 추가

### 커밋 2026.03.16 23:07
- 해시: `d6de34f` (`d6de34f489ab38e6bf03872baf39751b845798d8`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/d6de34f489ab38e6bf03872baf39751b845798d8
- 작성자: 박기윤
- 메시지: fix: 내 기록 화면 문구 사용자화

### 커밋 2026.03.16 22:47
- 해시: `742e84f` (`742e84fb32882c179ee6537e9c8659b3a0f8f8ee`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/742e84fb32882c179ee6537e9c8659b3a0f8f8ee
- 작성자: 박기윤
- 메시지: fix: 인증 시크릿 저장 키 정리

### 커밋 2026.03.16 22:42
- 해시: `c7e3916` (`c7e3916d663522522b30b064d016a028878ae83e`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/c7e3916d663522522b30b064d016a028878ae83e
- 작성자: 박기윤
- 메시지: fix: 내 기록 진단 시작 시 세션 손실 방지

### 커밋 2026.03.16 22:34
- 해시: `fc85dbf` (`fc85dbf8628fbcf4acd8054f2eb576783acf3502`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/fc85dbf8628fbcf4acd8054f2eb576783acf3502
- 작성자: 박기윤
- 메시지: fix: 탭 전역 퀴즈 세션 범위 조정

### 커밋 2026.03.16 22:24
- 해시: `413048f` (`413048f863383dca1832e9d4146b1bfce99b711a`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/413048f863383dca1832e9d4146b1bfce99b711a
- 작성자: 박기윤
- 메시지: fix: 내 기록 최근 시도 로딩 안정화

### 커밋 2026.03.16 22:14
- 해시: `3e6b9d9` (`3e6b9d999f1998e0476bfa241a60cb208e611165`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/3e6b9d999f1998e0476bfa241a60cb208e611165
- 작성자: 박기윤
- 메시지: feat: 내 기록 성장 화면 적용

### 커밋 2026.03.16 21:57
- 해시: `176879e` (`176879ec8534fc94837606f8e6e632d406d3b5fa`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/176879ec8534fc94837606f8e6e632d406d3b5fa
- 작성자: 박기윤
- 메시지: feat: 내 기록 성장 프로토타입 브이투 반영

### 커밋 2026.03.16 21:16
- 해시: `4c61535` (`4c61535f98e29f9e417f75f13e45cb870de012f8`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/4c61535f98e29f9e417f75f13e45cb870de012f8
- 작성자: 박기윤
- 메시지: feat: 내 기록 성장 화면 체험용 추가

### 커밋 2026.03.16 20:55
- 해시: `07f4d25` (`07f4d251835216d888a5d06c217fac8265aaef44`)
- 브랜치: (브랜치 정보 없음)
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/07f4d251835216d888a5d06c217fac8265aaef44
- 작성자: 박기윤
- 메시지: feat: 인증 로그인과 기록 이관 흐름 추가

### 커밋 2026.03.15 16:44
- 해시: `3dabdf4` (`3dabdf41418e7ecc3ec2b4ce72e0098b2c96b9e6`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/3dabdf41418e7ecc3ec2b4ce72e0098b2c96b9e6
- 작성자: 박기윤
- 메시지: refactor: 오답 진단 상위 훅 분리

### 커밋 2026.03.15 16:29
- 해시: `14fbc36` (`14fbc367e866176961ccb6a997f4ad87de55b4ce`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/14fbc367e866176961ccb6a997f4ad87de55b4ce
- 작성자: 박기윤
- 메시지: feat: 코드 구조 스킬 계층 도입

### 커밋 2026.03.14 08:09
- 해시: `2c07b94` (`2c07b94a2fdbc42b36d0b0f7fafa082452cfaac2`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/2c07b94a2fdbc42b36d0b0f7fafa082452cfaac2
- 작성자: 박기윤
- 메시지: fix: 학습 히스토리 인증과 저장 복구 보강

### 커밋 2026.03.13 23:38
- 해시: `2df6132` (`2df61320aa1ed77ce64227ebe25f9ecb570a19a2`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/2df61320aa1ed77ce64227ebe25f9ecb570a19a2
- 작성자: 박기윤
- 메시지: feat: 학습 히스토리 저장 구조 정규화

### 커밋 2026.03.13 22:05
- 해시: `cc67aa7` (`cc67aa788d8c4159fee2bff843e8edf685a5c31c`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/cc67aa788d8c4159fee2bff843e8edf685a5c31c
- 작성자: 박기윤
- 메시지: style: 앱 기본 배경 캔버스를 아이보리로 통일

### 커밋 2026.03.13 21:54
- 해시: `6c0485f` (`6c0485f1b29e34b3bc07e3770627f882108d4bbe`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/6c0485f1b29e34b3bc07e3770627f882108d4bbe
- 작성자: 박기윤
- 메시지: style: 문제 풀기 배경 톤을 다른 탭과 통일

### 커밋 2026.03.13 21:46
- 해시: `9994177` (`9994177f95c41fc9a6a719e11d9b116077180552`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/9994177f95c41fc9a6a719e11d9b116077180552
- 작성자: 박기윤
- 메시지: refactor: 홈 허브 슬로건과 배경 위계를 단순화

### 커밋 2026.03.13 21:32
- 해시: `7f49270` (`7f4927022ecca40ce6b66075f8b10dcc531bd6db`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/7f4927022ecca40ce6b66075f8b10dcc531bd6db
- 작성자: 박기윤
- 메시지: refactor: 홈 허브 메시지를 틀린 문제 정리 중심으로 조정

### 커밋 2026.03.13 20:41
- 해시: `ccbff62` (`ccbff62fb5b9137d497f4b8a76cb2c7025a8f951`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/ccbff62fb5b9137d497f4b8a76cb2c7025a8f951
- 작성자: 박기윤
- 메시지: feat: 홈 허브에 수트 타이포 시스템 적용

### 커밋 2026.03.13 20:08
- 해시: `65cc196` (`65cc1967538a41ebc39d66bf92fbae7c5cc270d4`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/65cc1967538a41ebc39d66bf92fbae7c5cc270d4
- 작성자: 박기윤
- 메시지: feat: 홈 허브를 프로필 기반 사회적 감각으로 리디자인

### 커밋 2026.03.13 19:34
- 해시: `759227a` (`759227a728e4aa7ebeb2643d927c5a79ac2aa4bd`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/759227a728e4aa7ebeb2643d927c5a79ac2aa4bd
- 작성자: 박기윤
- 메시지: fix: 비동기 저장소 버전을 엑스포 호환으로 조정

### 커밋 2026.03.13 19:27
- 해시: `58caac7` (`58caac7e7223910a8501fda52c43f69360e01b65`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/58caac7e7223910a8501fda52c43f69360e01b65
- 작성자: 박기윤
- 메시지: feat: 학습 허브와 로컬 익명 프로필 골격 추가

### 커밋 2026.03.12 19:24
- 해시: `7f67d02` (`7f67d02f9cd8bcd036c64a070377daa7150145cb`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/7f67d02f9cd8bcd036c64a070377daa7150145cb
- 작성자: 박기윤
- 메시지: docs: 제품 전략 문서를 현재 방향으로 재정렬

### 커밋 2026.03.12 19:08
- 해시: `3043ac4` (`3043ac4043618ea1d4829ef9c5d01fc60ac5cf9e`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/3043ac4043618ea1d4829ef9c5d01fc60ac5cf9e
- 작성자: 박기윤
- 메시지: feat: 오답 분석 완료 후 다음 문제 자동 이동

### 커밋 2026.03.12 18:45
- 해시: `56b6ebf` (`56b6ebf1201a66703ce235cfbda267c457d47e17`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/56b6ebf1201a66703ce235cfbda267c457d47e17
- 작성자: 박기윤
- 메시지: fix: 보충 설명 제한 문구를 중립 안내로 조정

### 커밋 2026.03.12 18:34
- 해시: `0fca03c` (`0fca03cd8ae69eb9d614895a200b9011ff7c853c`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/0fca03cd8ae69eb9d614895a200b9011ff7c853c
- 작성자: 박기윤
- 메시지: feat: 오답 진단 모르겠습니다 보충 설명 추가

### 커밋 2026.03.12 17:57
- 해시: `5cf5d6d` (`5cf5d6d65baa72e6c4a5eeff5c9c420178685fc2`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/5cf5d6d65baa72e6c4a5eeff5c9c420178685fc2
- 작성자: 박기윤
- 메시지: feat: 저신뢰 진단에 추가 설명 재추천을 추가

### 커밋 2026.03.12 17:40
- 해시: `9b3683f` (`9b3683ff11d767fb6bb49a0888a2f8c2f06fa0ff`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/9b3683ff11d767fb6bb49a0888a2f8c2f06fa0ff
- 작성자: 박기윤
- 메시지: feat: 오답 진단 페이지별 세로 스크롤을 유지

### 커밋 2026.03.12 17:25
- 해시: `d255eb5` (`d255eb52ab6c537f3bf1184e86caaa80e7b1791f`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/d255eb52ab6c537f3bf1184e86caaa80e7b1791f
- 작성자: 박기윤
- 메시지: feat: 오답 진단 상단 세션 바를 단순화

### 커밋 2026.03.12 00:34
- 해시: `f656804` (`f6568042ca118f3af25215325663d3f7c9b0a348`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/f6568042ca118f3af25215325663d3f7c9b0a348
- 작성자: 박기윤
- 메시지: feat: 오답 진단 화면을 튜터형으로 리디자인

### 커밋 2026.03.12 00:14
- 해시: `724b9c4` (`724b9c4de816e53a8e124dfa5ff40199e116936b`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/724b9c4de816e53a8e124dfa5ff40199e116936b
- 작성자: 박기윤
- 메시지: feat: 오답 분석을 문제 포함 스와이프 채팅으로 재구성

### 커밋 2026.03.11 23:39
- 해시: `184a457` (`184a457c49d3abaf3b8838f2ab8ca0faecb2f00f`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/184a457c49d3abaf3b8838f2ab8ca0faecb2f00f
- 작성자: 박기윤
- 메시지: feat: 오답 분석을 채팅형 대화 화면으로 전환

### 커밋 2026.03.11 23:29
- 해시: `982743f` (`982743f93077f70c2286d89f425fc64c8fe29831`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/982743f93077f70c2286d89f425fc64c8fe29831
- 작성자: 박기윤
- 메시지: feat: 오답 분석 다단계 상세 플로우 도입

### 커밋 2026.03.11 22:55
- 해시: `3b8fc6f` (`3b8fc6fc9caf9e067daba7dc3a6b14629035991b`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/3b8fc6fc9caf9e067daba7dc3a6b14629035991b
- 작성자: 박기윤
- 메시지: docs: 진단 함수 공개 호출 및 후보 선택 흐름 기록

### 커밋 2026.03.11 18:08
- 해시: `3e6959f` (`3e6959f23c9aa576cf170be18a5879254e5d7e22`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/3e6959f23c9aa576cf170be18a5879254e5d7e22
- 작성자: 박기윤
- 메시지: feat: 오답 진단에 인공지능 풀이법 분류 경로 추가

### 커밋 2026.03.10 23:22
- 해시: `391ca89` (`391ca89ff0f1d62d08468b9b5cd5032b1bfcb2a8`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/391ca89ff0f1d62d08468b9b5cd5032b1bfcb2a8
- 작성자: 박기윤
- 메시지: docs: 오답 진단 라우팅 구현 핵심 요약 추가

### 커밋 2026.03.10 23:13
- 해시: `45d3e80` (`45d3e809ae5c48eb4699c25520439290a45f3b7f`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/45d3e809ae5c48eb4699c25520439290a45f3b7f
- 작성자: 박기윤
- 메시지: feat: 오답 진단 자유 입력 라우팅 1차 구현

### 커밋 2026.03.10 22:25
- 해시: `ddc3a8b` (`ddc3a8b0db05dc30fae60f2f6c8c6785f8066299`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/ddc3a8b0db05dc30fae60f2f6c8c6785f8066299
- 작성자: 박기윤
- 메시지: feat: 피드백 데모 2차 라우터 흐름 추가

### 커밋 2026.03.10 18:35
- 해시: `90299a8` (`90299a8412f1f1d475dd694142fe833677043464`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/90299a8412f1f1d475dd694142fe833677043464
- 작성자: 박기윤
- 메시지: feat: 피드백 데모 분류 기준 설명 보강

### 커밋 2026.03.09 23:17
- 해시: `21cb18b` (`21cb18bf6107dcb9d2ec34a314aa34155cbfc937`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/21cb18bf6107dcb9d2ec34a314aa34155cbfc937
- 작성자: 박기윤
- 메시지: feat: 문제 유형별 맞춤 진단 풀이법 선택지 추가
- 본문: - diagnosisTree에 풀이법 5개 추가 (무리수계산, 다항식전개, 복소수계산, 나머지정리, 경우의수) / - diagnosisMap에 약점 10개 추가 (√간소화, 유리화, 전개부호, 동류항, i²혼동 등) / - practiceMap에 신규 약점 10개 연습문제 추가 / - problemData q1(무리수), q2(다항식), q3(복소수), q5(나머지정리), q7(경우의수)에 적절한 diagnosisMethods 할당 / - 기존 unknown만 있던 문제들에서 '잘 모르겠어' 하나만 나오던 문제 해소 / - tsc --noEmit 검증 통과 / Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

### 커밋 2026.03.09 23:03
- 해시: `0dc232c` (`0dc232cacc4e2f56a411f0f240e8b46d2eafc9db`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/0dc232cacc4e2f56a411f0f240e8b46d2eafc9db
- 작성자: 박기윤
- 메시지: docs: 문제별 진단 방법 지원 작업 로그 추가

### 커밋 2026.03.09 22:40
- 해시: `c5d0097` (`c5d0097f08baf0a31f4b559d42d6fa9d448b4ef4`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/c5d0097f08baf0a31f4b559d42d6fa9d448b4ef4
- 작성자: 박기윤
- 메시지: docs: 오답 일괄 진단 작업 로그 및 커밋 기록 추가

### 커밋 2026.03.09 22:38
- 해시: `0fddc1a` (`0fddc1adbda6ed3fb7d22a216972518f08fe5256`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/0fddc1adbda6ed3fb7d22a216972518f08fe5256
- 작성자: 박기윤
- 메시지: refactor: 오답 일괄 진단 플로우 적용 및 엑스포 유아이 스킬 검토 반영

### 커밋 2026.03.09 21:40
- 해시: `a50d1d2` (`a50d1d2c4a50b03ba568c28e6a00fb02e2fbd0cd`)
- 브랜치: (브랜치 정보 없음)
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/a50d1d2c4a50b03ba568c28e6a00fb02e2fbd0cd
- 작성자: 박기윤
- 메시지: feat: 수식 문제 본문 가독성 개선

### 커밋 2026.03.09 20:48
- 해시: `013fde0` (`013fde0e6281389c3ee871fa11978679d2107b86`)
- 브랜치: (브랜치 정보 없음)
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/013fde0e6281389c3ee871fa11978679d2107b86
- 작성자: 박기윤
- 메시지: chore: 수식 표기 보강 푸시 기록 반영

### 커밋 2026.03.09 20:47
- 해시: `e9ad1f4` (`e9ad1f4dbedd5cd08368141ad743a67cc4b89234`)
- 브랜치: codex/feat-math-notation-rendering-main-based
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/e9ad1f4dbedd5cd08368141ad743a67cc4b89234
- 작성자: 박기윤
- 메시지: fix: 수식 표기 지수 렌더링 범위 보강

### 커밋 2026.03.09 20:40
- 해시: `7ea8d22` (`7ea8d22f0e52a56b5adc28a8729965c4722c5aad`)
- 브랜치: codex/feat-math-notation-rendering-main-based
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/7ea8d22f0e52a56b5adc28a8729965c4722c5aad
- 작성자: 박기윤
- 메시지: feat: 수식 표기 렌더링 개선

### 커밋 2026.03.08 19:55
- 해시: `7231d5c` (`7231d5cc654b212359e52015dd79fe2e15843169`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/7231d5cc654b212359e52015dd79fe2e15843169
- 작성자: 박기윤
- 메시지: refactor: 엑스포 화면 스킬 기준 구조 정리

### 커밋 2026.03.08 19:33
- 해시: `6da899c` (`6da899c63d28df35b77c7aab2b279622df3a04c4`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/6da899c63d28df35b77c7aab2b279622df3a04c4
- 작성자: 박기윤
- 메시지: feat: 클로드 훅 기반 엑스포 스킬 자동 라우팅 추가

### 커밋 2026.03.08 16:27
- 해시: `1fe14b0` (`1fe14b08d09db993ec4d683ac5babdf08d1e71b5`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/1fe14b08d09db993ec4d683ac5babdf08d1e71b5
- 작성자: 박기윤
- 메시지: docs: 코덱스와 클로드 운영 규칙 동기화

### 커밋 2026.03.08 15:17
- 해시: `fa9efca` (`fa9efca60c4e333c530396449e747fb59b56c70d`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/fa9efca60c4e333c530396449e747fb59b56c70d
- 작성자: 박기윤
- 메시지: chore: 엑스포 스킬과 자동 적용 규칙 추가

### 커밋 2026.03.07 12:36
- 해시: `aa8c537` (`aa8c537c9f284232bc73e1409696e1d36b7a1c34`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/aa8c537c9f284232bc73e1409696e1d36b7a1c34
- 작성자: 박기윤
- 메시지: chore: 협업 알림과 작업 기록 규약 정리

### 커밋 2026.03.06 08:55
- 해시: `698b564` (`698b5640e512fdf1baae92eaf0f5d92cffe07c52`)
- 브랜치: main
- 원격: origin
- 원격 URL: https://github.com/kiyounpark/dasida-app.git
- 링크: https://github.com/kiyounpark/dasida-app/commit/698b5640e512fdf1baae92eaf0f5d92cffe07c52
- 작성자: 박기윤
- 메시지: docs: 이동 중 브랜치 작업용 코드베이스 빠른 요약 문서 추가

### 커밋 2026.03.06 00:56
- 해시: `ea6fa95` (`ea6fa9533b3eb70835b7494087c4be4390dadacc`)
- 링크: https://github.com/kiyounpark/dasida-app/commit/ea6fa9533b3eb70835b7494087c4be4390dadacc
- 작성자: 박기윤
- 메시지: fix: 앱바 겹침과 로고 여백 조정

### 커밋 2026.03.06 00:45
- 해시: `f0fa590` (`f0fa590ac9bf36f707f8d20e67f87ee854760dca`)
- 링크: https://github.com/kiyounpark/dasida-app/commit/f0fa590ac9bf36f707f8d20e67f87ee854760dca
- 작성자: 박기윤
- 메시지: feat: 브랜드 로고와 전역 화면 디자인 정합화

### 커밋 2026.03.06 00:24
- 해시: `5632169` (`5632169bc5f0842026567151f965cd34f6ec0d82`)
- 링크: https://github.com/kiyounpark/dasida-app/commit/5632169bc5f0842026567151f965cd34f6ec0d82
- 작성자: 박기윤
- 메시지: feat: 약점 진단 흐름과 원문 10문제 반영

### 커밋 2026.03.05 23:48
- 해시: `c556083` (`c5560832ec64c7c09d02ab10300362797d97c3c9`)
- 링크: https://github.com/kiyounpark/dasida-app/commit/c5560832ec64c7c09d02ab10300362797d97c3c9
- 작성자: 박기윤
- 메시지: chore: 커밋 기록 링크와 최신순 정렬 적용

### 커밋 2026.03.05 23:29
- 해시: `a475c2b` (`a475c2b95c8055adab954aff561cc76824eb1d7e`)
- 링크: https://github.com/kiyounpark/dasida-app/commit/a475c2b95c8055adab954aff561cc76824eb1d7e
- 작성자: 박기윤
- 메시지: chore: initial commit - bootstrap dasida-app MVP

### 커밋 2026.03.05 20:53
- 해시: `b4b6a1f` (`b4b6a1fcc54f25204db11f15d41cd40434f2fe39`)
- 링크: https://github.com/kiyounpark/dasida-app/commit/b4b6a1fcc54f25204db11f15d41cd40434f2fe39
- 작성자: 박기윤
- 메시지: Initial commit
- 본문: Generated by create-expo-app 3.5.3.

<!-- COMMIT_LOGS_END -->

---

<!-- 새 작업 로그는 위 형식으로 날짜별로 추가 -->
