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
| OpenAI 연결 | AI 판정 API 호출 | ⬜ |
| 앱스토어 준비 | 개인정보처리방침, 심사 체크리스트 | ⬜ |

---

## 로그

### 2026.03.08

**Expo 스킬 프로젝트 반영 완료**
- `.agents/skills/*`에 Expo Skills 본문과 참고 자료 추가
- `.agent/skills/*`, `.claude/skills/*`는 `.agents/skills/*`를 가리키는 심볼릭 링크로 정리
- `skills-lock.json` 추가로 스킬 버전과 해시를 고정

**에이전트 자동 적용 규칙 정리**
- `AGENTS.md`에 작업 유형별 Expo Skills 자동 적용 규칙 추가
- UI/네비게이션, API/Firebase, 배포, 업그레이드 등 요청 유형에 따라 먼저 열어야 할 `SKILL.md`를 명시

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
