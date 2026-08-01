# 홈 학습 여정 참조 지도

홈(`/(tabs)/quiz`)의 "학습 여정"을 걷어낼지 판단하기 위한 재료다.
**아직 아무것도 걷어내지 않았다.** 이 문서는 지도일 뿐이고, 방향은 확정이 아니다.

기준 커밋: `8810a27` (main). 대상 파일은 아래 두 grep의 합집합(29개) + 이번에 추가한 스위치 1개.

```
grep -rlE "isGraduated|practiceGraduatedAt|graduateToPractice" --include="*.ts" --include="*.tsx" app features
grep -rlE "journey|Journey" --include="*.ts" --include="*.tsx" app features
```

## 한 줄 요약

여정은 **`profile.practiceGraduatedAt` 하나가 켜고 끄는 스위치**다.
이 값이 없으면 홈은 여정 화면이고, 생기면 홈은 일반 허브가 된다.
여정을 걷어낸다 = "졸업한 상태를 모두의 기본값으로 만든다"에 가깝다.

---

## 미리보기 스위치

- `features/learning/dev-force-graduated.ts` — `DEV_FORCE_GRADUATED` 상수 하나. **기본값 `false`.**
  `true`로 바꾸면 실제 프로필과 무관하게 졸업 상태 화면을 볼 수 있다. DB에는 쓰지 않는다.
  읽는 곳은 두 군데뿐: `home-journey-state.ts:getCurrentState`, `app/(tabs)/_layout.tsx`.

---

## 파일별 판정

판정은 세 가지 중 하나다: **같이 사라짐** / **고쳐야 함** / **그대로 둬도 됨**.

### 여정 보드 UI (전부 `quiz-hub-screen-view.tsx`를 통해서만 도달)

- `features/quiz/components/journey-board.tsx` — 보드 본체. 768×960 SVG에 4개 노드·점선 경로·말풍선을 그린다. → **같이 사라짐**. 여정 전용, 다른 화면에서 안 쓴다.
- `features/quiz/components/journey-step-node.tsx` — 보드 위 노드 1개(그림 + 상태별 투명도 + active 펄스). → **같이 사라짐**. `journey-board.tsx`만 import.
- `features/quiz/components/journey-active-bubble.tsx` — 캐릭터 말풍선. 단계별 % 좌표로 절대 배치. → **같이 사라짐**. `journey-board.tsx`만 import.
- `features/quiz/components/journey-board-layout.ts` — `calcJourneyBoardWidth()`. 폰/태블릿별 보드 폭 계산. → **같이 사라짐**. 보드 전용 순수 함수.
- `features/quiz/components/journey-cta-button.tsx` — PNG 배경 CTA 버튼. → **같이 사라짐**. 호출처 2곳(`journey-hub-right-panel.tsx:46`, `quiz-hub-screen-view.tsx:342`) 둘 다 여정 안.
- `features/quiz/components/journey-hub-split-layout.tsx` — 태블릿 2열 프레임. 왼쪽 폭을 측정해 `leftBoard(width)` 렌더프롭에 넘긴다. → **같이 사라짐**. 여정 보드를 놓으려고 만든 레이아웃.
- `features/quiz/components/journey-hub-right-panel.tsx` — 태블릿 오른쪽 칼럼(단계 상세 카드 + 분석 이어하기 캐러셀 + CTA). → **고쳐야 함**. 껍데기는 여정용이지만 안에 든 `ExamAnalysisResumeCarousel`(기출 분석 이어하기)은 여정과 무관하다. 태블릿에서 그 캐러셀을 어디에 둘지 다시 정해야 한다.
- `features/quiz/components/step-detail-card.tsx` — 현재 단계 설명 카드(rich/compact 두 모드). → **같이 사라짐**. 비테스트 import는 `journey-hub-right-panel.tsx:4` 하나뿐.
- `features/quiz/components/journey-step-detail-copy.ts` — 4단계 문구·메타(예상 시간/난이도/문항 수) 테이블. → **같이 사라짐**. `step-detail-card.tsx`만 소비.

### 여정 상태 계산

- `features/learning/home-journey-state.ts` — **여정의 심장.** 8개 state 우선순위, 4개 시각 노드 매핑, 말풍선/CTA 문구 테이블(505줄). → **같이 사라짐**. 다만 삭제 순서는 맨 마지막이어야 한다(아래 순서 참고).
- `features/learning/home-state.ts` — 홈 전체 상태를 조립. `HomeLearningState.journey` 필드(37줄)와 `buildHomeJourneyState(...)` 호출(311줄)만 여정 몫. 히어로·약점 진행·최근 활동·대표 모의고사는 여정과 무관. → **고쳐야 함**. `journey` 필드와 그 호출만 걷어내면 된다.
- `features/learning/dev-force-graduated.ts` — 이번에 추가한 미리보기 스위치. → **같이 사라짐**. 여정이 없어지면 존재 이유도 없어진다.

### 홈 화면 조립부

- `features/quiz/hooks/use-quiz-hub-screen.ts` — **가장 위험한 파일.** 홈의 모든 섹션 표시 여부가 여기서 `isGraduated` 하나로 갈린다(313~345줄). → **고쳐야 함**. 자세한 건 아래 "위험한 자리".
- `features/quiz/components/quiz-hub-screen-view.tsx` — 홈 뷰. 여정 렌더 분기, 태블릿 split 분기, 보드 높이 계산(`boardAvailableHeight`), CTA 푸터 높이 역산(138~155줄)이 전부 여기 있다. → **고쳐야 함**. 여정을 빼면 레이아웃 계산의 절반이 죽는다.
- `features/quiz/screens/quiz-hub-screen.tsx` — 훅과 뷰를 잇는 6줄 Thin Screen. → **그대로 둬도 됨**. 여정을 몰라도 되는 구조다.
- `app/(tabs)/_layout.tsx` — 탭 구성. `isGraduated`가 홈·기출 탭바의 표시 여부를 가른다(49·68줄). → **고쳐야 함**. 아래 "위험한 자리" 참고.

### 졸업 기록 쓰기 경로

- `features/learner/types.ts` — `practiceGraduatedAt?: string`(62줄), 프리뷰 시드 이름 `'practice-graduated'`(13줄). → **고쳐야 함**. 필드 자체는 기존 사용자 데이터에 이미 저장돼 있어서 즉시 삭제하면 안 된다.
- `features/learner/current-learner-controller.ts` — `graduateToPractice()`(561줄)가 `practiceGraduatedAt`을 실제로 저장. `'practice-graduated'` 프리뷰 시드(823줄)도 여기. → **고쳐야 함**. 호출처가 사라지면 이 메서드도 죽지만, 마이그레이션 판단 후에 지운다.
- `features/learner/provider.tsx` — `graduateToPractice`를 컨텍스트로 노출(122·311줄). → **고쳐야 함**. 컨트롤러와 세트로 정리.
- `features/quiz/hooks/can-graduate.ts` — 13줄. `activeMode==='weakness'` + 다 풀었고 + 아직 졸업 안 했을 때만 `true`. → **같이 사라짐**. 졸업 개념 전용.
- `features/quiz/hooks/use-practice-screen.ts` — 연습 화면 훅. `canGraduate`/`isGraduating`/`onGraduate`(68~71, 483~490줄)로 "졸업하기" 버튼을 노출하고 누르면 `graduateToPractice()` → `/(tabs)/quiz`로 replace. → **고쳐야 함**. 연습 화면 자체는 남고, 졸업 관련 3개만 걷어낸다.
- `features/quiz/hooks/use-step-complete-screen.ts` — 61줄. `stepKey==='practice'`일 때 `onContinue`가 `graduateToPractice()` 호출(38줄). 두 번째 졸업 입구. → **고쳐야 함**. 이 화면이 여정 전용인지 먼저 확인해야 한다.

### 여정과 상관없는데 grep에 걸린 것들

- `features/quiz/components/review-session/done-view.tsx` — 여기 `isGraduated`는 **다른 뜻이다.** 21줄 `task.stage === 'day30'`, 즉 복습 사다리(day1→3→7→30)를 끝냈다는 뜻. 여정 졸업과 무관. → **그대로 둬도 됨**. 이름만 겹친 함정.
- `app/quiz/exam/solve.tsx` — `'journey_hub'`은 애널리틱스 소스 문자열일 뿐(8줄 `VALID_SOURCES`). 여정 UI 없음. → **고쳐야 함**(문자열 값 정리 수준). 홈에서 기출을 열었다는 표시라서, 홈 이름이 바뀌면 값 이름도 같이 볼 것.
- `features/analytics/event-types.ts` — 위와 같은 `'journey_hub'`이 `ExamSource` 유니온 멤버(22줄). → **고쳐야 함**(같은 이유, 과거 데이터 호환은 확인 필요).

### 테스트

- `features/learning/home-journey-state.test.ts` — `getCurrentState` 단일 describe, **13 케이스.** 8개 state 전부 + 우선순위 2건 + stale pending resume 2건. → **같이 사라짐**.
- `features/quiz/components/journey-board-layout.test.ts` — `calcJourneyBoardWidth` 9 케이스(폰 3 / 태블릿 6). 폭 상한·높이 클램프·`availableHeight===0` 처리. → **같이 사라짐**.
- `features/quiz/components/journey-step-detail-copy.test.ts` — 3 케이스. 4개 키 노출, 메타 필드, 알 수 없는 키 폴백. → **같이 사라짐**.
- `features/quiz/components/__tests__/journey-hub-right-panel.test.tsx` — 4 케이스. rich/compact 모드 전환, 캐러셀 표시 조건, CTA 클릭. → **고쳐야 함**. 캐러셀 케이스는 살릴 가치가 있다.
- `features/quiz/components/__tests__/journey-hub-split-layout.test.tsx` — 5 케이스. 측정 전 `leftBoard` 미호출, 측정 후 호출, 폭 0 처리, 자식 렌더, authNotice 조건. → **같이 사라짐**.
- `features/quiz/components/__tests__/step-detail-card.test.tsx` — 7 케이스. rich/compact 차이, stepKey→문구 매핑. → **같이 사라짐**.
- `features/quiz/hooks/use-practice-screen.test.ts` — 3개 describe 중 `computeCanGraduate` 1개(5 케이스)만 졸업 관련. 나머지 2개(`pickActiveWeaknessId`, `resolveQueueSeed`)는 남는다. → **고쳐야 함**. describe 하나만 걷어낸다.
- `e2e/journey-board.spec.ts` — Playwright 3 케이스. 첫 설치·진단 완료에는 `학습 여정` 텍스트가 보이고, 약점 연습 완료에는 **안 보인다**를 고정한다. → **같이 사라짐**. 걷어내면 이 스펙 자체가 뒤집힌다.

여정 관련 테스트는 **총 8개 파일 / 대략 49 케이스**(jest 7파일 46 + Playwright 1파일 3).
현재 jest 전체는 77 suite / 495 케이스이므로, 여정 몫은 약 9%다.

---

## 위험한 자리

`use-quiz-hub-screen.ts`의 313~345줄에서 홈의 거의 모든 섹션이 `isGraduated` 하나에 매달려 있다.
`isGraduated`는 `journey?.currentStateKey === 'journey_graduated'`(290줄)이고,
그건 다시 `profile.practiceGraduatedAt`(`home-journey-state.ts:309`)이다.

**졸업 전에는 숨겨져 있고, 졸업해야 나타나는 것 — 즉 여정 게이트 뒤에 갇혀 있는 것:**

- `showBrandHeader = isGraduated` (313줄) → 브랜드 헤더. 여정 중에는 헤더 자체가 없다.
- `showWeaknessSection = isGraduated` (339줄) → **약점 섹션 전체**(`HomeWeaknessSection`). 조건이 이것 하나뿐이라 여정 중에는 데이터가 있어도 무조건 안 보인다.
- `showReviewHomeCard = isGraduated && nextReviewTask && todayReviewCount > 0` (341~344줄) → **오늘의 복습 카드.** 복습이 밀려 있어도 졸업 전이면 안 뜬다.
- `showNoReviewDayCard = isGraduated && nextReviewTask && todayReviewCount===0 && !분석중` (317~321줄) → 복습 없는 날 카드. 역시 졸업이 선행 조건.
- `app/(tabs)/_layout.tsx` 49·68줄 → **홈 탭과 기출 탭의 탭바.** 졸업 전에는 `{ display: 'none' }`이라 탭바가 아예 안 보인다. 즉 졸업 전 사용자는 하단 네비게이션 없이 여정 화면에 갇혀 있다. `내 기록`·`설정` 탭에는 이 조건이 없다.

**반대로 졸업하면 사라지는 것:**

- `showJourneyHero`, `showJourneyBoard` (314~315줄) → 여정 히어로("학습 여정" 포스터 배너)와 보드, 그리고 하단 CTA 푸터(`quiz-hub-screen-view.tsx:340`).
- 태블릿 split 레이아웃(`useTabletSplitLayout`, 157~164줄)은 `showJourneyBoard`를 조건에 포함하므로 졸업 후에는 2열이 아니라 단일 열이 된다.

정리하면 **여정을 걷어내는 것 = 위 5가지를 상시 노출로 바꾸는 것**과 거의 같다.
새 기능을 만드는 게 아니라, 이미 만들어 놓고 잠가둔 것을 여는 쪽에 가깝다.

곁다리로 주의할 것 하나 더: `quiz-hub-screen-view.tsx`의 CTA 푸터 높이 역산(138~155줄)은
`showJourneyBoard`가 `false`가 되면 `ctaFooterHeight = 0`이 되어 보드 높이 계산이 통째로 무의미해진다.
여정을 빼면 이 계산 블록도 같이 지워야 죽은 코드가 안 남는다.

---

## 걷어내기 순서 제안

중간에 앱이 안 깨지는 순서로. 각 단계마다 커밋하고 폰에서 한 번 본다.

1. **미리보기로 결정부터 한다.** `DEV_FORCE_GRADUATED = true`로 두고 홈·탭바를 눈으로 본다.
   코드는 한 줄도 안 지운다. 여기서 "아니다" 싶으면 끝. 되돌리기 비용 0.
2. **게이트를 연다.** `use-quiz-hub-screen.ts`에서 `showBrandHeader`/`showWeaknessSection`/`showReviewHomeCard`/`showNoReviewDayCard`의 `isGraduated &&`를 떼고, `app/(tabs)/_layout.tsx`의 탭바 `display:'none'` 분기를 없앤다.
   이 시점에서 여정 보드는 **아직 그대로 있다.** 여정 + 약점/복습이 같이 보이는 과도기 화면이 된다. 앱은 안 깨진다.
3. **여정 UI를 끈다.** `showJourneyHero`/`showJourneyBoard`를 `false`로 고정하고, `quiz-hub-screen-view.tsx`에서 보드·CTA 푸터·태블릿 split 분기와 높이 계산 블록을 걷어낸다.
   `journey-*` 컴포넌트 파일들은 이 단계에서 고아가 되지만 아직 지우지 않는다. 되돌릴 여지를 남긴다.
4. **고아 파일과 테스트를 지운다.** `journey-*` 9개 컴포넌트/유틸 + `home-journey-state.ts` + 여정 전용 테스트 6개 + `e2e/journey-board.spec.ts` + `dev-force-graduated.ts`.
   `home-state.ts`에서 `journey` 필드와 `buildHomeJourneyState` 호출을 뺀다.
5. **졸업 쓰기 경로를 정리한다.** `can-graduate.ts`, `use-practice-screen.ts`의 졸업 3형제, `use-step-complete-screen.ts`의 졸업 호출, `provider.tsx`/`current-learner-controller.ts`의 `graduateToPractice`.
   **`practiceGraduatedAt` 필드 자체는 마지막까지 남긴다** — 기존 사용자 프로필에 이미 저장돼 있어서, 읽는 쪽을 다 없앤 걸 확인한 뒤에 지워야 안전하다.

1~2단계까지가 되돌리기 쉬운 구간이다. 3단계부터는 되돌리는 데 시간이 든다.

---

## 사람이 판단해야 할 것

- 여정 4단계(진단 → 분석 → 연습 → 마스터)가 온보딩으로서 값을 하고 있었는지. 코드로는 알 수 없다.
- `'journey_hub'` 애널리틱스 값을 바꾸면 과거 데이터와 끊긴다. 이름을 유지할지 결정 필요.
- `use-step-complete-screen.ts`가 여정 전용 화면인지, 다른 흐름에서도 쓰이는지 확인.
- 여정을 걷어냈을 때 **첫 설치 사용자가 뭘 먼저 보는지.** 지금은 여정이 그 자리를 채우고 있다. 비우면 그 자리가 빈다.
