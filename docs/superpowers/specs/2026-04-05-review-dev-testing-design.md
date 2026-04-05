# 복습 기능 개발 테스트 인프라 설계

**날짜:** 2026-04-05  
**범위:** 1순위 + 2순위 (3순위 Firebase Emulator는 별도 계획으로 분리)

---

## 배경

에빙하우스 복습 시스템(day1→day3→day7→day30) 구현 후, 각 단계를 실제로 테스트하려면 며칠을 기다려야 한다. 또한 Playwright E2E 테스트가 없어 복습 UI 흐름의 자동화 검증이 불가능한 상태다.

---

## 테스트 전략 레이어

| 레이어 | 도구 | 검증 범위 |
|---|---|---|
| 유닛 테스트 | `functions/tests/` | Cloud Function 로직 (입출력 형식) |
| E2E 테스트 | Playwright | 복습 UI 흐름 (AsyncStorage 경로) |
| 수동 테스트 | dev 빌드 실기기 | AI 피드백 품질, 전체 사용자 흐름 |
| *(향후)* | Firebase Emulator | Cloud Function → Firestore 통합 |

**Playwright가 검증하지 않는 것:** AI 피드백 내용 (비용/비결정성), Firestore 직접 저장 (별도 계획)

---

## 1순위: 날짜 당기기 버튼

### 목적

실제 진단 퀴즈를 완료해 생성된 ReviewTask를 기다리지 않고 즉시 테스트한다.

### 동작

프로필 화면 Dev 섹션에 **"복습 날짜 당기기"** 버튼 추가.

- `LocalReviewTaskStore`에서 미완료 ReviewTask 전체 로드
- `scheduledFor`를 오늘 날짜(`YYYY-MM-DD`)로 업데이트
- `refresh()` 호출 → 홈 상태 즉시 반영 → ReviewHomeCard 표시

### 사용 흐름 (실제 라이프사이클 테스트)

```
진단 퀴즈 완료 → day1 태스크 생성
  → 날짜 당기기 → day1 즉시 due → 복습 세션
  → "기억났어요!" → day3 태스크 생성 (3일 후)
  → 날짜 당기기 → day3 즉시 due → 복습 세션
  → ... day7, day30 반복
```

### 구현 위치

- `features/learner/current-learner-controller.ts` — `pullReviewDueDates()` 메서드 추가
- `features/learner/provider.tsx` — context에 노출
- `features/profile/hooks/use-profile-screen.ts` — `onPullReviewDueDates` 핸들러 추가
- `features/profile/components/profile-screen-view.tsx` — Dev 섹션에 버튼 추가

---

## 1순위: 단계별 시드 추가

### 목적

Playwright E2E 테스트에서 각 단계를 빠르게 세팅한다.

### 추가할 시드 상태

`PreviewSeedState`에 3개 추가:

| 시드 | 생성되는 태스크 |
|---|---|
| `review-day3-available` | day3 태스크, `scheduledFor = today` |
| `review-day7-available` | day7 태스크, `scheduledFor = today` |
| `review-day30-available` | day30 태스크, `scheduledFor = today` |

각 시드는 `review-available`과 동일한 패턴으로 진단 완료 기록을 먼저 생성한 뒤 해당 stage의 태스크를 심는다.

### 구현 위치

- `features/learner/types.ts` — `PreviewSeedState` 유니온 확장
- `features/learner/current-learner-controller.ts` — `seedPreview` switch 케이스 추가

---

## 2순위: Playwright E2E 테스트

### 파일

`e2e/review-session.spec.ts` 신규 생성

### 테스트 케이스

**1. ReviewHomeCard 표시 확인**
```
dev guest 로그인 → review-available 시드 → 퀴즈 탭 이동
→ ReviewHomeCard 텍스트 확인
→ 10초 후 CTA 버튼 활성화 확인
```

**2. 복습 세션 진입**
```
ReviewHomeCard CTA 탭
→ URL /review-session 진입 확인
→ 첫 번째 단계 카드 표시 확인
```

**3. 단계 진행 (입력 없이)**
```
"다음으로" 탭 (입력 없음 → AI 호출 없음)
→ 피드백 없이 "다음 단계 →" 버튼 표시 확인
→ "다음 단계 →" 탭 → 2단계 진행 확인
```

**4. 완료 화면**
```
3단계 모두 완료
→ "모든 단계 완료!" 화면 확인
→ "기억났어요!" / "다시 볼게요" 버튼 표시 확인
```

**5. 단계별 시드 확인 (day3/day7/day30)**
```
각 시드 → ReviewHomeCard stage 표시 확인
```

### 10초 카운트다운 처리

`__DEV__ === true`일 때 카운트다운을 **1초**로 단축. `review-home-card.tsx`에서 분기:

```ts
const COUNTDOWN_SECONDS = __DEV__ ? 1 : 10;
```

### AI 피드백 처리

`EXPO_PUBLIC_REVIEW_FEEDBACK_URL` 미설정 시 URL이 빈 문자열 → `requestReviewFeedback` throw → 훅의 `catch`에서 `setAiFeedback(null)` → 피드백 없이 진행. 별도 처리 불필요.

---

## 3순위: Firebase Emulator (향후 별도 계획)

이번 설계에서 제외. 다음 이유로 별도 작업으로 분리:

- 설정 공수: `firebase.json` 에뮬레이터 설정, 앱 연결 분기, CI 연동 (약 1~2일)
- 이번 1+2순위와 독립적으로 진행 가능

**검증 목표 (향후):**
- `recordAttempt` → Cloud Function → `reviewTasks` 응답 → `cacheRecord` → AsyncStorage 전체 경로
- Playwright에서 Firestore 에뮬레이터 데이터 직접 확인

계획 수립 시: `docs/superpowers/specs/YYYY-MM-DD-firebase-emulator-design.md` 별도 작성.

---

## 파일 변경 요약

| 파일 | 변경 |
|---|---|
| `features/learner/types.ts` | `PreviewSeedState` 3개 추가 |
| `features/learner/current-learner-controller.ts` | `pullReviewDueDates()` + 시드 케이스 3개 |
| `features/learner/provider.tsx` | `pullReviewDueDates` context 노출 |
| `features/profile/hooks/use-profile-screen.ts` | `onPullReviewDueDates` 핸들러 |
| `features/profile/components/profile-screen-view.tsx` | Dev 섹션 버튼 |
| `features/quiz/components/review-home-card.tsx` | `COUNTDOWN_SECONDS` 분기 |
| `e2e/review-session.spec.ts` | 신규 Playwright 테스트 |
