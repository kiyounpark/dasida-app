# 태블릿 반응형 UI 설계 스펙

**날짜:** 2026-04-08  
**상태:** 기획중  
**작성자:** 박기윤 + Claude

---

## 개요

다시다 앱을 iPad(태블릿)에서도 최적화된 UI로 제공한다. 모바일(폰)과 태블릿에서 동일한 코드 경로를 유지하되, 각 화면이 `useIsTablet` 훅을 통해 레이아웃을 분기한다.

**목표:** 태블릿의 넓은 화면을 활용한 2단 레이아웃 제공  
**범위:** 모든 주요 화면 (문제 풀기, 복습, 결과, 히스토리, 설정, 퀴즈 허브)

---

## 접근법: `useIsTablet` 훅 + 화면별 레이아웃 분기

Thin Screen + Custom Hook 구조(기존 dasida 아키텍처)를 그대로 따르며, 각 화면의 `*-view.tsx`에서 태블릿/모바일 레이아웃을 명시적으로 분기한다.

### 브레이크포인트

```ts
// hooks/use-is-tablet.ts
import { useWindowDimensions } from 'react-native';

export function useIsTablet() {
  const { width } = useWindowDimensions();
  return width >= 744; // iPad mini(744pt) 포함, iPhone 최대(430pt) 제외
}
```

**744px 기준 근거:**
- iPhone 최대 너비: ~430pt (iPhone 15 Pro Max)
- iPad mini 6세대 portrait: 744pt
- iPad Air/Pro: 820–1024pt
- 430과 744 사이 충분한 간격 → 오탐 없음

---

## 화면별 태블릿 레이아웃

### 1. 문제 풀기 (`quiz-solve-layout.tsx`)

| | 모바일 | 태블릿 |
|--|--------|--------|
| 구조 | 스크롤로 문제 → 선택지 → 제출 | 좌(60%): 지문/문제, 우(40%): 선택지 + 제출 |
| 근거 | 수학/국어 지문을 좌측에 고정하고 선택지를 우측에서 바로 선택 가능 → 스크롤 없이 풀 수 있음 |

```tsx
// features/quiz/components/quiz-solve-layout.tsx
const isTablet = useIsTablet();
if (isTablet) return <SolveTabletLayout {...props} />;
return <SolveMobileLayout {...props} />;
```

### 2. 복습 세션 (`review-session-screen-view.tsx`)

| | 모바일 | 태블릿 |
|--|--------|--------|
| 구조 | 스크롤로 문제 → 해설 | 좌(55%): 문제, 우(45%): 해설 |
| 근거 | 문제와 해설을 동시에 보며 복습 — 교육 앱의 핵심 UX 개선 |

### 3. 시험 결과 (`exam-result-screen-view.tsx`)

| | 모바일 | 태블릿 |
|--|--------|--------|
| 구조 | 세로 카드 나열 | 좌: 점수 요약, 우: 문항별 결과 |

### 4. 퀴즈 결과 (`quiz-result-screen-view.tsx`)

| | 모바일 | 태블릿 |
|--|--------|--------|
| 구조 | 세로 스크롤 | 좌: 점수/리포트 헤더, 우: 차트 및 상세 |

### 5. 히스토리 (`history-screen-view.tsx`)

| | 모바일 | 태블릿 |
|--|--------|--------|
| 구조 | 단일 리스트 | 2컬럼 그리드 |

### 6. 퀴즈 허브 (`quiz-hub-screen-view.tsx`)

| | 모바일 | 태블릿 |
|--|--------|--------|
| 구조 | 카드 세로 나열 | 카드 2열 그리드 |

### 7. 프로필/설정 (`profile-screen-view.tsx`)

| | 모바일 | 태블릿 |
|--|--------|--------|
| 구조 | 세로 나열 | maxWidth 680px 중앙 정렬 |
| 근거 | 설정 항목은 내용이 단순해 2단 레이아웃보다 중앙 정렬이 적합 |

---

## 구현 패턴

### 뷰 컴포넌트 분기

```tsx
// features/quiz/components/review-session-screen-view.tsx
export function ReviewSessionScreenView(props: Props) {
  const isTablet = useIsTablet();
  if (isTablet) return <ReviewSessionTabletView {...props} />;
  return <ReviewSessionMobileView {...props} />;
}
```

### 태블릿 2단 레이아웃 기본 구조

```tsx
function ReviewSessionTabletView(props: Props) {
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <ScrollView style={{ flex: 0.55 }}>
        {/* 문제 영역 */}
      </ScrollView>
      <ScrollView style={{ flex: 0.45, borderLeftWidth: 1 }}>
        {/* 해설 영역 */}
      </ScrollView>
    </View>
  );
}
```

---

## 규칙

- `useWindowDimensions` 사용 (skill 권장, `Dimensions.get()` 금지)
- 인라인 스타일 사용 (StyleSheet.create가 아닌 경우도 허용)
- CSS/Tailwind 미사용
- `flexbox` 기반 레이아웃 (고정 px 너비 최소화)
- Safe area는 기존 코드에서 이미 처리 중 → 태블릿 레이아웃에서도 유지

---

## 작업 순서 (우선순위)

1. `hooks/use-is-tablet.ts` 생성
2. `quiz-solve-layout.tsx` 태블릿 레이아웃 (핵심 화면)
3. `review-session-screen-view.tsx` 태블릿 레이아웃
4. `exam-result-screen-view.tsx` + `quiz-result-screen-view.tsx`
5. `history-screen-view.tsx` + `quiz-hub-screen-view.tsx`
6. `profile-screen-view.tsx`

---

## 검증 기준

- iPad mini 시뮬레이터(744pt)에서 태블릿 레이아웃 표시 확인
- iPhone 15 Pro Max 시뮬레이터(430pt)에서 모바일 레이아웃 유지 확인
- portrait/landscape 전환 시 레이아웃 재계산 확인 (`useWindowDimensions`가 자동 처리)
