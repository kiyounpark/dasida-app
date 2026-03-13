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
| 앱스토어 준비 | 개인정보처리방침, 심사 체크리스트 | ⬜ |

---

## 로그

### 2026.03.13

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
