# PosterTitleBanner 고정 폰트 크기 지원 설계

## Context

`PosterTitleBanner`는 `adjustsFontSizeToFit`을 사용해 텍스트를 한 줄에 자동 축소한다.
"학습 여정"(4자) 같은 짧은 타이틀은 32px 그대로 렌더링되지만,
"나의 약점 분석 리포트"(11자)는 배너 내부 가용 너비(~253px)에 맞추려다
`minimumFontScale={0.72}` 한계(약 23px)까지 쪼그라든다.
사용자가 의도한 크기보다 훨씬 작게 보이는 문제가 있어 수정한다.

## 목표

- "나의 약점 분석 리포트" 배너 텍스트를 shrink 없이 의도한 크기로 표시한다.
- 기존 "학습 여정" 등 다른 배너는 변경 없이 유지한다.

## 설계

### 1. `PosterTitleBanner` — `fontSize` prop 추가

**파일**: `features/quiz/components/poster-title-banner.tsx`

```tsx
type PosterTitleBannerProps = {
  isCompactLayout: boolean;
  title: string;
  fontSize?: number; // 지정 시 adjustsFontSizeToFit 비활성화
};
```

- `fontSize` prop이 **없으면**: 기존 동작 유지 (32px / 28px compact + `adjustsFontSizeToFit`)
- `fontSize` prop이 **있으면**: 해당 값으로 고정, `adjustsFontSizeToFit` 제거

```tsx
<Text
  numberOfLines={1}
  adjustsFontSizeToFit={fontSize === undefined}
  minimumFontScale={fontSize === undefined ? 0.72 : undefined}
  style={[
    styles.heroTitle,
    isCompactLayout && styles.heroTitleCompact,
    fontSize !== undefined && { fontSize },
  ]}
>
  {title}
</Text>
```

### 2. `QuizResultReportHeader` — fontSize 전달

**파일**: `features/quiz/components/quiz-result-report-header.tsx`

```tsx
<PosterTitleBanner
  isCompactLayout={isCompactLayout}
  title="나의 약점 분석 리포트"
  fontSize={isCompactLayout ? 19 : 22}
/>
```

- normal: `fontSize={22}` — 가용 너비 ~253px에서 shrink 없이 렌더링
- compact: `fontSize={19}` — compact 레이아웃(maxWidth 390) 비율에 맞춤

## 영향 범위

| 파일 | 변경 |
|------|------|
| `features/quiz/components/poster-title-banner.tsx` | `fontSize` prop 추가, 조건부 `adjustsFontSizeToFit` |
| `features/quiz/components/quiz-result-report-header.tsx` | `fontSize` prop 전달 |

기타 `PosterTitleBanner` 사용처(`quiz-hub-screen-view.tsx`, `exam-selection-screen-view.tsx`)는 변경 없음.

## 검증

1. `npx expo start`로 시뮬레이터 실행
2. 퀴즈 결과 화면 진입 → "나의 약점 분석 리포트" 텍스트가 22px 고정으로 렌더링되는지 확인
3. 퀴즈 허브 탭 진입 → "학습 여정" 배너가 기존 32px로 변하지 않았는지 확인
4. 작은 기기(iPhone SE, 375px)에서 텍스트가 잘리지 않는지 확인
