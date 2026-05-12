# iPad 가로모드 레이아웃 일관성

작성일: 2026-05-12
상태: 기획중

## 문제

iPad 가로모드에서 화면을 옮겨다닐 때 좌우 여백과 콘텐츠 폭이 화면마다 달라 일관성이 없다. 화면별 `tabletContainer.maxWidth`가 제각각이고(680/720/800/1040), 좌우 패딩도 12·14·16·18·20·22·24가 섞여 있다.

현재 값 조사 결과:

| 화면 | 현재 maxWidth (가로모드) |
| --- | --- |
| Profile | 680 |
| History | 800 |
| Quiz Result | 720 |
| Quiz Hub | `min(width × 0.92, 1040)` |
| Journey Board | `min(width × 0.7, 680)` |

토큰 파일(`constants/brand.ts`)에는 spacing은 있으나 태블릿 max-width나 페이지 좌우 패딩 토큰이 없다. 각 화면이 매직넘버를 직접 들고 있어서 다 다른 게 당연한 상태다.

## 목표

iPad 가로모드에서 화면들을 오갈 때 좌우 여백과 콘텐츠 폭이 **카테고리별로 일관**되게 보이도록 한다. 모든 화면을 같은 너비로 통일하는 것이 아니라, 화면 성격(읽기형 / 허브형 / 풀이형)에 따라 정해진 너비를 쓰게 한다.

성공 기준:
1. iPad Pro 11" 가로모드에서 Profile → History → Quiz Result → Quiz Hub를 순서대로 켰을 때, 좌우 여백과 콘텐츠 폭이 카테고리 안에서 동일하게 느껴진다.
2. 모든 페이지에서 `tabletContainer: { maxWidth: ... }` 매직넘버가 사라진다(grep 확인 가능).
3. 폰 화면에 비주얼 회귀가 없다.

## 비목표 (이번 범위 밖)

- 폰 좌우 패딩 통일 (별도 작업으로 분리)
- 카드 내부 패딩 토큰화 (12/13/14/16 혼재)
- 카드 간 gap 토큰화
- 폰 세로모드 디자인 변경
- 색상/타이포 토큰화
- 모달/Sheet 내부 레이아웃

## 설계

### 1. 레이아웃 토큰 (`constants/brand.ts`)

```ts
export const BrandLayout = {
  tablet: {
    reading: { contentMaxWidth: 720, pagePaddingH: 24 },
    hub:     { contentMaxWidth: 1040, pagePaddingH: 24 },
    split:   { pagePaddingH: 20 }, // maxWidth 없음 — 화면 전체 사용
  },
} as const;
```

폰 토큰은 이번 작업에서 추가하지 않는다. PageContainer는 폰에서는 자식을 그대로 통과시킨다.

### 2. 컴포넌트 (`components/layout/page-container.tsx`, 신규)

```tsx
type PageContainerProps = {
  variant: 'reading' | 'hub' | 'split';
  children: React.ReactNode;
  style?: ViewStyle;
};
```

동작:
- `useIsTablet()` 호출 → 태블릿일 때만 토큰을 적용
- 태블릿 + `reading|hub`: `maxWidth` + `alignSelf:'center'` + 좌우 패딩
- 태블릿 + `split`: 좌우 패딩만 적용, `maxWidth`/가운데 정렬 없음
- 폰: 자식을 그대로 통과 (추가 스타일 없음)

단일 책임: PageContainer는 "콘텐츠 최대 너비 + 좌우 패딩"만 책임진다. 헤더, 키보드 회피, sticky footer, 스크롤은 모두 화면 측에 남긴다.

### 3. Variant 매핑 (초기 분류)

**`reading` (max 720, padding 24)** — 글/리스트 중심

| 화면 | 현재 | 변경 후 |
| --- | --- | --- |
| Profile | 680 | 720 |
| History | 800 | 720 |
| Quiz Result | 720 | 720 |
| Quiz Result Report | (확인) | 720 |
| Sign-in | (추측 분류) | 720 |
| Exam Selection | (추측 분류) | 720 |

**`hub` (max 1040, padding 24)** — 카드/포스터 중심

| 화면 | 현재 | 변경 후 |
| --- | --- | --- |
| Quiz Hub | `min(width × 0.92, 1040)` | 1040 |

**`split` (maxWidth 없음, padding 20)** — 좌/우 분할

| 화면 |
| --- |
| Quiz Solve (연습) |
| Diagnostic Solve |
| Exam Solve |
| Review Session (태블릿 분기) |

추측으로 분류한 화면(Sign-in, Exam Selection, Quiz Practice Screen 등)은 작업 중 어색하면 토큰 한 줄 또는 variant 변경으로 수정한다.

### 4. 마이그레이션 (PR 3개)

**PR 1 — 토큰 + 컴포넌트 도입**
- `BrandLayout` 추가
- `PageContainer` 컴포넌트 신규
- 화면 변경 없음 → 비주얼 변화 0

**PR 2 — reading 묶음**
- 각 화면의 `tabletContainer` 스타일 삭제
- `<PageContainer variant="reading">`로 감싸기
- 대상: Profile, History, Quiz Result, Quiz Result Report, Sign-in, Exam Selection

**PR 3 — hub + split 묶음**
- Quiz Hub → `hub`
- Quiz Solve / Diagnostic / Exam Solve / Review Session 태블릿 분기 → `split`
- 풀이 화면 내부 좌/우 분할 로직은 그대로 유지

각 PR 검증: iPad Pro 11" 시뮬레이터에서 가로/세로 전환, iPhone 15 Pro Max에서 회귀 확인.

### 5. 엣지케이스

| 상황 | 처리 |
| --- | --- |
| 회전 | `useWindowDimensions` 자동 재계산. 추가 처리 불필요 |
| iPad Split View / Slide Over | width < 744면 폰 레이아웃으로 fallback (현 동작 유지) |
| 키보드 | PageContainer 무관여. 화면이 `KeyboardAvoidingView`로 처리 |
| 모달/Sheet | 범위 밖. PageContainer는 페이지 루트에서만 사용 |
| Safe Area / 헤더 | PageContainer 무관여. 기존 처리 유지 |
| 풀이 화면 회귀 | PR 3에서 split 적용 후 좌/우 분할 비율 변화 없는지 시뮬레이터 비교 |

## 영향 받는 파일 (예상)

신규:
- `components/layout/page-container.tsx`

수정:
- `constants/brand.ts` (BrandLayout 추가)
- `features/profile/components/profile-screen-view.tsx`
- `features/history/components/history-screen-view.tsx`
- `features/quiz/components/quiz-result-screen-view.tsx`
- `features/quiz/components/quiz-result-report-view.tsx`
- `features/auth/components/sign-in-screen-view.tsx`
- `features/quiz/components/exam-selection-screen-view.tsx`
- `features/quiz/components/quiz-hub-screen-view.tsx`
- `features/quiz/components/quiz-solve-layout.tsx`
- `features/quiz/components/diagnostic-solve-tablet-layout.tsx`
- `features/quiz/exam/components/exam-solve-tablet-layout.tsx`
- `features/quiz/components/review-session-screen-view.tsx`

## 열린 질문

- Quiz Practice Screen이 풀이형(`split`)인지 진입카드형(`reading`)인지 — PR 3 작업 시 코드 보고 확정
- Quiz Result Report의 현재 너비 값 — PR 2 작업 시 파일 열어 확인
