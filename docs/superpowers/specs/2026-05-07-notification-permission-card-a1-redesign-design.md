# Design: 알림 권한 카드 A1 디자인 교체

**Status**: DRAFT
**Date**: 2026-05-07
**Branch**: `claude/busy-wescoff-b48f17`
**Builds on**: [2026-05-06-notification-permission-timing-design.md](2026-05-06-notification-permission-timing-design.md) — 카드 위치/타이밍은 이전 spec에서 확정. 이 문서는 그 카드의 **시각 디자인 교체**만 다룬다.

## Problem Statement

`features/quiz/components/notification-opt-in-card.tsx`는 현재 라이트 테마의 평범한 카드다. 권한 허용률을 높이는 priming UX로는 약하다.

핸드오프(`Downloads/handoff/notification-permission-card/README.md`)에서 받은 **A1 디자인**은 에빙하우스 망각 곡선(58%) 데이터와 시각적 타임라인 게이지를 활용해 사용자가 "지금 알림을 켜야 한다"는 동기를 갖도록 설계된 다크 테마 카드다. 이 디자인으로 교체한다.

## Scope

### In scope
- `features/quiz/components/notification-opt-in-card.tsx`의 시각 디자인 완전 교체 (A1 사양)
- `features/quiz/hooks/use-notification-opt-in.ts`의 단순 정리 (기존 동작 그대로 유지, 의미 없는 분기 제거)

### Out of scope
- 카드 위치/타이밍 변경 — 이전 spec에서 확정 (`/quiz/result` 화면 내 인라인)
- A2/A3 변형 구현 — 핸드오프 README에 언급된 다른 변형들은 다루지 않음
- "나중에" 후 7일 재노출 로직 — 핸드오프 README에는 명시되어 있으나 이번 스펙에서는 제외 (단순 dismiss로 처리)
- dismiss 상태의 화면 간 동기화 — 카드는 `/quiz/result` 한 화면에만 노출되므로 불필요
- review task 생성 흐름 변경 — 모의고사 흐름은 이미 `source: 'featured-exam'`으로 `buildReviewTasks`를 호출해 review task를 생성한다 ([local-learning-history-repository.ts:423-457](../../../features/learning/local-learning-history-repository.ts#L423-L457))

## Goals

1. 핸드오프 A1 디자인을 픽셀에 가깝게 재현 — 다크 forest 그라디언트 배경, SVG 원형 게이지(58%), 망각 타임라인.
2. 기존 hook props/state 인터페이스를 유지해 호출부(`use-result-screen.ts`, `quiz-result-report-view.tsx`) 변경을 최소화.
3. Reanimated v4로 진입 애니메이션 구현 (퇴장은 부모 unmount에 위임).

## Non-Goals

- 카드의 등장 위치를 다른 화면으로 옮기는 일.
- 카드를 다국어 처리하는 일 (한국어 고정).
- A1 게이지 수치/카피 변경 (핸드오프 그대로 사용).

## Premises

1. **`react-native-svg` 15.12.1, `react-native-reanimated` 4.1.1, `expo-linear-gradient`(이미 설치됨) 사용 가능**.
2. **OS 권한 상태가 진실 공급원**: `Notifications.getPermissionsAsync()`가 `granted`/`denied`면 카드 자체가 안 뜸. "나중에"는 메모리 상태로만 처리.
3. **`/quiz/result` 화면은 단일 세션 결과 표시** — 누적 약점이 아니라 이번 회차 약점만 보여줌. 카드 노출 빈도 제어를 위한 추가 로직 불필요.
4. **모의고사 진단 완료 후 자동으로 `/quiz/result?source=exam`으로 router.replace** ([use-exam-result-screen.ts:142-154](../../../features/quiz/exam/hooks/use-exam-result-screen.ts#L142-L154)). 즉 카드는 진단/연습/모의고사 모든 흐름의 종점에서 동일하게 노출된다.

## Design

### 컴포넌트 구조

```
NotificationOptInCard (단일 파일, 로컬 sub-component 포함)
├── AnimatedCardContainer (Reanimated entrance)
│   ├── LinearGradient (expo-linear-gradient, 좌상→우하 #4A6F4A → #293B27)
│   │   ├── TopRow (flex row, gap 14)
│   │   │   ├── TextBlock
│   │   │   │   ├── Eyebrow ("망각 곡선 경고")
│   │   │   │   └── Headline ("내일이면 오늘 배운 것 [58%가 사라져요.]")
│   │   │   └── ForgettingGauge (SVG circle, 64x64, 58% arc)
│   │   ├── ForgettingTimeline
│   │   │   ├── ProgressBar (height 3, 28% honey fill)
│   │   │   ├── TimelineMarkers ([지금 100% / 내일 42% / 3일 후 20% / 1주 10%])
│   │   │   └── SourceLabel ("에빙하우스 망각 곡선")
│   │   └── ButtonRow
│   │       ├── PrimaryButton ("알림 켜기")
│   │       └── SecondaryButton ("나중에")
└── (퇴장: 부모가 state 변경 시 unmount → entrance 역재생 없음)
```

`ForgettingGauge`와 `ForgettingTimeline`은 같은 파일 내 로컬 함수 컴포넌트로 둔다. 별도 파일 분리는 재사용 가능성이 없으므로 하지 않는다.

### Props 인터페이스 (변경 없음)

```ts
type Props = {
  weaknessLabels: string[];        // 사용 안 함 — 호환 위해 유지
  state: NotificationOptInCardState;
  onEnable: () => void;
  onDismiss: () => void;
};
```

`weaknessLabels`는 기존 라이트 카드의 본문에 쓰이던 props이지만, A1 카피는 약점 라벨에 의존하지 않는다("내일이면 오늘 배운 것 58%가 사라져요" 고정). 호출부 변경을 피하기 위해 props는 유지하되, 컴포넌트 내부에서는 사용하지 않는다.

### State / Hook 변경

`use-notification-opt-in.ts`:
- 기존 동작 유지 (idle/requesting/granted/denied/dismissed 5상태).
- 코드 정리만 — 변경 없음으로 처리할 수도 있다. 검토 결과 명시적 변경 사항 없음.

상태 전이는 핸드오프 README와 동일:
- `idle` → 카드 노출 (권한 미정)
- `requesting` → OS 다이얼로그 응답 대기
- `granted` → 영구 숨김 (카드 unmount), `scheduleReviewNotifications` 호출
- `denied` → 영구 숨김
- `dismissed` → 세션 내 숨김 ("나중에" 탭)

### Radial gradient 처리

핸드오프: `radial-gradient(ellipse at 80% -20%, #4A6F4A → #293B27)`.
React Native View는 radial gradient 미지원. 다음 옵션을 검토:

| 옵션 | 시각 충실도 | 구현 복잡도 |
|------|-------------|-------------|
| react-native-svg 전체 배경 | 100% | 높음 — 자식 레이아웃을 SVG 안에 배치해야 함 |
| **expo-linear-gradient (대각선 linear)** | ~85% | 낮음 |
| 단색 #293B27 | ~60% | 가장 낮음 |

**선택: expo-linear-gradient (대각선)**. 핸드오프 README도 단색 fallback을 명시적으로 허용 ("그라디언트 배경을 지원하지 않는 환경에서는 #293B27 단색 fallback"). 대각선 linear는 그보다 더 충실한 근사다.

방향: 우상단(`{x: 0.8, y: 0}`) → 좌하단(`{x: 0, y: 1}`), colors `['#4A6F4A', '#293B27']`, locations `[0, 0.55]`.

### SVG 원형 게이지 (ForgettingGauge)

```
viewBox: 64 64
center: (32, 32)
radius: 27
strokeWidth: 5.5

배경 원: stroke="rgba(255,255,255,0.1)"
진행 원:
  stroke="#F4B942"
  strokeLinecap="round"
  strokeDasharray=[circumference * 0.58, circumference]
  transform="rotate(-90 32 32)"

중앙 텍스트(절대 위치 View):
  "58%" — 14/900/#F4B942
  "망각" — 8.5/600/#AECBAA
```

`circumference = 2 * Math.PI * 27 ≈ 169.65`. dasharray 첫 값 = `circumference * 0.58 ≈ 98.4`.

### 망각 타임라인

```
ProgressBar (height 3, bg rgba(255,255,255,0.1)):
  - LinearGradient fill: width 28%, colors ['#87B084', '#F4B942']

Markers (flex row, justifyContent: space-between):
  지금   100%  → #87B084
  내일   42%   → #F4B942
  3일 후 20%   → rgba(255,255,255,0.25)
  1주 후 10%   → rgba(255,255,255,0.18)
  - 퍼센트: 10/700
  - 레이블: 9.5

Source label: "에빙하우스 망각 곡선" — 10/rgba(255,255,255,0.25)/text-align right
```

### 애니메이션

진입 (`idle`로 마운트 시 1회):
```ts
opacity: 0 → 1
translateY: 12 → 0
duration: 320ms
easing: Easing.bezier(0.2, 0.8, 0.2, 1)
```

Reanimated 4의 `useSharedValue` + `withTiming` + `useAnimatedStyle`로 구현.

퇴장: `state`가 `granted`/`denied`/`dismissed`로 바뀌면 컴포넌트가 곧바로 `null` 반환 → 부모가 unmount. 별도 퇴장 애니메이션 없음. 의도적 단순화 — Reanimated v4의 layout transition으로 height collapse를 시도하면 복잡도 대비 가치가 낮다.

### Color/Spacing 토큰

핸드오프 README와 동일 (이 spec에서는 토큰 추가 없음, 카드 파일 내 const로 인라인):
- `#293B27` forest-800 — 카드 배경 끝 색
- `#4A6F4A` forest-600 — 그라디언트 시작 색
- `#F4B942` honey — 58% 강조, 게이지 색
- `#87B084` forest-400 — 타임라인 시작점
- `#AECBAA` forest-300 — 보조 텍스트
- `#FFFCF4` paper — Primary 버튼 배경

### 접근성

- Primary 버튼: `accessibilityLabel="알림 켜기"`, `accessibilityRole="button"`.
- Secondary 버튼: `accessibilityLabel="나중에 결정"`, `accessibilityRole="button"`.
- 카드 컨테이너: `accessibilityRole="alert"` (기존 동작 유지).
- 색 대비: `#F4B942` on `#293B27` ≈ 8.5:1 → WCAG AA 통과.

## Files Affected

**수정**:
- [features/quiz/components/notification-opt-in-card.tsx](../../../features/quiz/components/notification-opt-in-card.tsx) — 디자인 완전 교체. Props/export 시그니처는 유지.

**참조 (변경 없음, 호환성 확인용)**:
- [features/quiz/hooks/use-notification-opt-in.ts](../../../features/quiz/hooks/use-notification-opt-in.ts)
- [features/quiz/hooks/use-result-screen.ts](../../../features/quiz/hooks/use-result-screen.ts)
- [features/quiz/components/quiz-result-report-view.tsx](../../../features/quiz/components/quiz-result-report-view.tsx)
- [features/quiz/components/__tests__/notification-opt-in-card.test.tsx](../../../features/quiz/components/__tests__/notification-opt-in-card.test.tsx) — 시각 변경에 맞춰 assertions 일부 수정 필요. 권한 요청 동작 검증은 그대로.

## Testing

### Unit
- 기존 `notification-opt-in-card.test.tsx` 업데이트:
  - "알림 켜기"/"나중에" 버튼 텍스트로 쿼리 (변경 없음)
  - state별 렌더 분기 (granted/denied/dismissed → null) 그대로
  - 약점 라벨 본문 assertion은 제거 (A1은 약점 라벨 본문 사용 안 함)

### Manual (iOS 시뮬레이터)
1. 권한 미허용 상태에서 `/quiz/result` 진입 → A1 카드 노출 확인
2. "알림 켜기" → OS 다이얼로그 → 허용 → 카드 사라짐
3. (앱 재실행) 권한 미허용 상태에서 진입 → "나중에" → 카드 사라짐 → 같은 화면 재진입 시 다시 노출
4. (앱 재실행) 이미 허용된 상태에서 진입 → 카드 안 뜸
5. 모의고사 완료 → 모든 진단 완료 → `/quiz/result` 자동 진입 → 카드 노출 동일 흐름
6. 다크 모드 / 라이트 모드 양쪽에서 시각 확인 (forest 다크 카드는 항상 다크 톤)

### Visual regression
없음. 컴포넌트 단위 시각 확인은 manual로 충분.

## Open Questions

없음.

## Migration / Rollout

단일 PR 머지 즉시 모든 사용자에게 적용. 기능 플래그 불필요 (시각 교체일 뿐, 동작 변경 없음).

## Risks

| 위험 | 가능성 | 완화 |
|------|--------|------|
| Reanimated 진입 애니메이션이 일부 디바이스에서 깜박임 | 낮음 | initial 값을 0으로 설정해 첫 프레임부터 보이지 않게 |
| LinearGradient가 핸드오프와 시각적으로 차이 큼 | 낮음 | 대각선 방향과 stops를 핸드오프와 비교해 미세 조정 |
| SVG 게이지가 안드로이드에서 anti-alias 흐릿함 | 중간 | strokeLinecap="round" + 적절한 strokeWidth로 보정 |
| 기존 테스트가 본문 텍스트("내일이면 절반 이상 잊혀져요")로 검증 중 | 중간 | 테스트 업데이트 필수 — checklist에 명시 |
