# 여정보드 Y 위치 고정 설계

## 문제

`quiz-hub-screen-view.tsx`의 `ScrollView` 안에 여정보드(JourneyBoard) 위에 가변 높이 요소들이 존재한다. 이 요소들의 높이가 변할 때마다 보드의 화면 Y 좌표가 달라진다.

구체적 원인:

1. **AuthNotice** (~40px 알림 알약): step 전환 후 나타났다 사라지며 보드를 40px 밀어냄
2. **JourneyScreenHero**: ScrollView 안에 있어 위에 요소가 추가될 경우 보드가 또 이동될 수 있는 구조적 위험

사용자 경험: step 1 완료 후 화면에 돌아왔을 때 보드가 다른 위치에 있어 화면 배치가 달라 보임.

## 해결 방안

`JourneyScreenHero`와 `AuthNotice`를 `ScrollView` 밖으로 이동시켜 여정보드의 Y 좌표를 완전히 고정한다.

### 구조 변경

**현재:**
```
<View screen>
  {BrandHeader?}
  <ScrollView paddingTop={insets.top + 56}>
    {showJourneyHero → JourneyScreenHero}   ← ScrollView 안
    {authNoticeMessage → AuthNotice}         ← ScrollView 안, 가변
    {showJourneyBoard → JourneyBoard}        ← Y 불안정
    {showWeaknessSection → HomeWeaknessSection}
    ...
  </ScrollView>
  {CTA Footer}
</View>
```

**수정 후:**
```
<View screen>
  {BrandHeader?}
  {showJourneyHero → JourneyScreenHero}     ← ScrollView 밖 (고정)
  {authNoticeMessage → AuthNotice}           ← ScrollView 밖 (고정)
  <ScrollView paddingTop={14}>               ← 기존 gap:14 보존
    {showJourneyBoard → JourneyBoard}        ← Y 항상 고정
    {showWeaknessSection → HomeWeaknessSection}
    ...
  </ScrollView>
  {CTA Footer}
</View>
```

### 패딩 계산 조정

현재 `posterTopPadding`은 두 역할을 하나로 묶어 처리한다:
- SafeArea inset 처리
- Hero의 `translateY: -32` 시각 효과 보정 (`bannerRaise`)

Hero가 ScrollView 밖으로 나오면 이 두 역할을 분리한다.

| 컨테이너 | 여정 진행 중 | 졸업 후 |
|---|---|---|
| Hero 컨테이너 (신규) | `paddingTop: insets.top + (compact ? 14 : 24)` | 렌더링 안 됨 |
| ScrollView `paddingTop` | `14` (기존 gap:14 보존) | 기존 `posterTopPadding` 유지 |

Hero 컨테이너에 `paddingTop = insets.top + 오프셋`을 적용하면, 기존에 `posterTopPadding + bannerRaise`로 조합하던 효과를 동등하게 재현할 수 있다.

`board.marginTop: 52`(`journey-board.tsx` 내부)는 유지한다. Hero 아래 시각적 간격은 ScrollView `paddingTop: 14` + `board.marginTop: 52` = 66px로 기존과 동일하게 유지된다.

### 졸업 후 상태 (변경 없음)

`showBrandHeader = true, showJourneyHero = false` 상태에서는 BrandHeader(기존에도 ScrollView 밖)만 있고 Hero가 없으므로 현재 구조 그대로 유지된다. `posterTopPadding` 계산 분기에서 `showBrandHeader = true` 경로는 수정하지 않는다.

## 변경 범위

| 파일 | 변경 내용 |
|---|---|
| `features/quiz/components/quiz-hub-screen-view.tsx` | 레이아웃 구조 변경 (Hero, AuthNotice ScrollView 밖으로 이동), 패딩 계산 조정 |

변경 없는 파일:
- `journey-board.tsx` — 내부 로직 무관
- `poster-title-banner.tsx` — 스타일 무관
- `use-quiz-hub-screen.ts` — 로직 무관
- `home-journey-state.ts` — 상태 무관

## 검증 항목

- [ ] Step 1 → 2 → 3 → 4 전환 시 보드 Y 좌표 불변
- [ ] AuthNotice 표시 / 숨김 시 보드 Y 좌표 불변
- [ ] 일반 레이아웃(≥390pt)과 compact 레이아웃(<390pt) 양쪽 확인
- [ ] 졸업 후 상태(BrandHeader + ReviewCard 등) 회귀 없음
- [ ] iPhone SE(compact) / iPhone 14 Pro(standard) 시뮬레이터 양쪽 확인
- [ ] 로딩 중(`isReady=false`) 상태 레이아웃 회귀 없음
