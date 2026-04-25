# DASIDA 앱 전체 점검 설계

**날짜**: 2026-04-25  
**목적**: 출시 전 전체 기능 완성도 + UX 흐름 검증  
**타임라인**: 2주 이내 출시 목표  
**접근법**: 사용자 여정 순서 점검

---

## 배경

최근 2주간 학습 여정 상태 머신 버그픽스, stale 가드 개선, 진단/분석/연습 플로우 다수 수정이 있었다. 전체적으로 에러를 정리한 상태에서 놓친 지점이 없는지 확인하고, Firebase 미완성 항목과 앱스토어 체크리스트를 점검해 출시 준비를 마무리한다.

---

## 점검 방식

각 단계마다 두 가지를 병행한다:

1. **코드 리뷰** — 해당 화면/훅 코드를 읽고 잠재 버그·엣지케이스 공백 확인
2. **실기기/시뮬레이터 검증** — 실제 흐름을 흘려보며 막히는 지점 체크

**산출물**: 단계별 이슈를 `Critical` / `Minor`로 분류한 목록

---

## 7단계 점검 계획

### 1단계 — 온보딩 & 로그인

**점검 파일**
- `app/onboarding.tsx`, `app/sign-in.tsx`
- `features/onboarding/`, `features/auth/`

**체크 포인트**
- [ ] 첫 실행 시 온보딩 화면이 정상 노출되는가
- [ ] 학년(g1/g2) + 트랙 선택 흐름이 막히지 않는가
- [ ] dev-guest 로그인 이외 실제 로그인 경로가 있는가 (또는 없는 게 의도인가)
- [ ] 온보딩 완료 후 홈으로 이동이 정상인가
- [ ] 앱 재실행 시 로그인 상태가 유지되는가

---

### 2단계 — 홈 (여정보드)

**점검 파일**
- `features/learning/home-journey-state.ts`
- `features/learning/home-state.ts`
- `features/quiz/hooks/use-quiz-hub-screen.ts`
- `features/quiz/components/quiz-hub-screen-view.tsx`

**체크 포인트**
- [ ] 7개 state 각각에서 여정보드 카드가 올바르게 노출되는가
- [ ] `showReviewHomeCard` 가드 — 여정 진행 중 ReviewHomeCard가 노출되지 않는가
- [ ] stale pending resume 가드 — 오래된 진행 상태가 잘못 표시되지 않는가
- [ ] 졸업(state 6) 후 여정 완료 화면이 정상 노출되는가
- [ ] 빈 학습 기록(신규 유저) 상태에서 홈이 정상 렌더링되는가

---

### 3단계 — 진단 플로우

**점검 파일**
- `features/quiz/hooks/use-diagnostic-screen.ts`
- `features/quiz/diagnosis-flow-engine.ts`
- `features/quiz/diagnosis-router.ts`
- `app/(tabs)/quiz/` 진단 관련 라우트

**체크 포인트**
- [ ] 진단 시작 → 질문 → 완료까지 흐름이 막히지 않는가
- [ ] 진단 중 나가기 후 재진입 시 resume이 정상 동작하는가
- [ ] 시간 기반 stale 가드 — 오래된 resume이 무시되는가 (hasValidPendingResume)
- [ ] g1/g2 학년별 진단 콘텐츠가 올바르게 분기되는가
- [ ] 진단 완료 → step-complete(diagnostic) 전환이 정상인가
- [ ] `isDiagnosing` 감지 useEffect 무한루프 방지 ref가 동작하는가

---

### 4단계 — 분석 플로우

**점검 파일**
- `features/quiz/exam/hooks/use-exam-diagnosis.ts`
- `features/quiz/components/diagnosis-chat-bubble.tsx`
- `features/quiz/components/diagnosis-conversation-page.tsx`
- `features/quiz/exam/exam-diagnosis-progress.ts`

**체크 포인트**
- [ ] AI 채팅 분석이 시작→완료까지 정상 동작하는가
- [ ] 부분 완료 후 나가기 → 리포트 이동이 동작하는가 (2026-04-25 구현)
- [ ] `completedDiagnosisCount` 1개 이상 완료 후 나가기 조건이 올바른가
- [ ] AsyncStorage 기반 진행 상태 저장/복원이 정상인가
- [ ] 분석 완료 → step-complete(analysis) 전환이 정상인가
- [ ] 멀티턴 채팅에서 네트워크 오류 시 UI가 적절히 처리되는가

---

### 5단계 — 약점 연습

**점검 파일**
- `features/quiz/hooks/use-practice-screen.ts`
- `features/quiz/components/` 연습 관련
- `features/quiz/screens/step-complete-screen.tsx`

**체크 포인트**
- [ ] 약점 연습 시작 흐름이 정상인가
- [ ] 완료 버튼 노출 타이밍 — 마지막 문제 제출 후 정확히 노출되는가 (2026-04-25 개선)
- [ ] `resetSession()` — Android 백 스택 보호가 동작하는가
- [ ] step-complete(practice) 화면 → 닫기(X) 버튼 동작이 정상인가
- [ ] 자유 약점 연습이 `kind='review'`로 기록되는가 (state 6 전이 조건)
- [ ] 스케줄 연습 중복 방지가 동작하는가

---

### 6단계 — 설정/프로필

**점검 파일**
- `features/profile/hooks/use-profile-screen.ts`
- `features/profile/components/profile-screen-view.tsx`
- `features/learner/current-learner-controller.ts`
- `constants/legal-urls.ts`

**체크 포인트**
- [ ] 학년 변경 시 확인 모달이 노출되는가
- [ ] 학년 변경 후 로컬 학습 기록이 초기화되는가
- [ ] Firestore `save()` 내 `undefined` 필드 필터링 — 학년 변경 시 에러가 없는가
- [ ] 개인정보처리방침 링크가 열리는가
- [ ] 앱 버전이 올바르게 표시되는가

---

### 7단계 — 미완성 기능 & 앱스토어 체크

**Firebase 상태**
- [ ] Firestore 피드백 저장 — 현재 상태 파악 (미구현이면 출시 범위에서 제외 여부 결정)
- [ ] Firebase Functions 배포 상태 확인 (`reviewFeedback` asia-northeast3)
- [ ] OpenAI API 연결 — 실제 호출 정상 동작 여부

**앱스토어 체크리스트**
- [ ] 개인정보처리방침 Firebase Hosting 배포 완료 여부
- [ ] App Store Connect URL 입력 여부
- [ ] `app.json` 버전/빌드 번호 확인
- [ ] TestFlight 빌드 업로드 및 내부 테스트 여부
- [ ] 스크린샷 준비 여부
- [ ] 앱 카테고리, 연령 등급, 설명 작성 여부

---

## 우선순위 기준

| 등급 | 기준 | 처리 |
|------|------|------|
| **Critical** | 앱이 크래시되거나, 핵심 플로우(진단→분석→연습)가 막히거나, 데이터 손실 가능성 | 즉시 수정 |
| **Minor** | UX 불편, 엣지케이스 미처리, 문구 오류 | 가능하면 수정, 없으면 출시 후 패치 |

---

## 실행 순서

1. Claude가 단계 1부터 순서대로 코드 리뷰 수행
2. 각 단계 결과를 보고 (Critical/Minor 분류)
3. Critical 이슈 즉시 수정
4. 7단계 완료 후 종합 이슈 목록 정리
5. 앱스토어 제출 준비 마무리
