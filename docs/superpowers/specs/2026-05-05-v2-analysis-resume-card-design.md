# 분석 진행 중 카드 V2 — 도트 → 가로 프로그레스 바 전환

## 목적

홈 화면의 "모의고사 분석 진행 중" 카드(`ExamAnalysisResumeCard`) 진행 표시를 도트(`●●○○`) 방식에서 V2 디자인 시안의 **가로 프로그레스 바** 방식으로 교체한다. 시각적 노이즈를 줄이고, 진행률을 더 직관적으로 인지하도록 한다.

원본 디자인 시안: `/Users/baggiyun/Downloads/DiagnosisMiniCard Variants - Lite.html` 의 `V2Progress`.

## 변경 범위

- **수정**: `features/quiz/exam/components/exam-analysis-resume-card.tsx`
- **삭제**: `features/quiz/exam/components/note-collection-bar.tsx` (다른 사용처 없음, grep 확인 완료)
- **신규**: `features/quiz/exam/components/__tests__/exam-analysis-resume-card.test.tsx`
- `constants/brand.ts` 변경 없음 (기존 토큰만 재사용)
- 호출부 `features/quiz/components/quiz-hub-screen-view.tsx` 변경 없음 (props 시그니처 유지)

## V2 시안 분석에서 도출한 결정

V2 시안 그대로 옮기면 진행률이 3중 표시(상단 5px 바 + 라벨 우측 X/Y + 바 옆 X/Y)된다. 디자인 의도가 아닌 시안 단계의 중복으로 판단하여 **중복을 제거한 변형**을 채택한다.

| 시안 요소 | 채택 여부 | 사유 |
|---|---|---|
| 카드 최상단 5px 진행 바 | **제거** | 내부 progress bar와 중복 표시 |
| 라벨 우측 "1 / 4" 텍스트 | **유지** | 명시적 카운트 |
| 바 우측 "1 / 4" 텍스트 | **제거** | 라벨 우측과 중복 |
| pill 뱃지 (dot + 텍스트) | **유지** | "분석 진행 중" 상태 신호 |
| 가로 프로그레스 바 | **유지** | 시각적 진행률 |
| 시험 제목 | **유지** | 어떤 시험인지 식별 |
| 부가 안내 문구 | **제거** | CTA "이어서 분석하기 →"와 의미 중복 |

## UI 구조

```
┌─────────────────────────────────┐
│  ● 분석 진행 중                  │  pill 뱃지
│                                  │
│  2025년 9월 고3                  │  시험 제목 (2줄 가능)
│  확률과통계 모의고사              │
│                                  │
│  학습 노트            1 / 4      │  라벨 행 (justify space-between)
│  ▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░    │  진행률 바
│                                  │
│  [    이어서 분석하기 →    ]     │  CTA
└─────────────────────────────────┘
```

### 카드 컨테이너

- 배경: `BrandColors.examPaleGreen` (`#EDF7ED`)
- border: `1.5px solid BrandColors.examSoftGreen` (`#C8EAC8`)
- borderRadius: `BrandRadius.lg`
- padding: `BrandSpacing.md`
- Pressable, pressed 시 `opacity: 0.85` (기존 동작 유지)

### Pill 뱃지 (`● 분석 진행 중`)

- 컨테이너: `flexDirection: row`, `alignSelf: flex-start`, paddingH 12, paddingV 5, borderRadius 999, 배경 `examSoftGreen`
- Dot: 6×6, borderRadius 3, 배경 `primarySoft` (`#4A7C59`)
- 텍스트: "분석 진행 중", fontFamily `bold`, fontSize 12, color `examForest` (`#2A5C38`)
- 카드 상단 마진 0, 제목과 간격: `BrandSpacing.sm` (12)

### 시험 제목

- fontFamily `extrabold`, fontSize 17, lineHeight 23, letterSpacing -0.3
- color `examDeepGreen` (`#1C2C19`)
- 다음 섹션과 간격: `BrandSpacing.md` (16)

### 진행률 섹션

라벨 행:
- `flexDirection: row`, `justifyContent: space-between`, marginBottom 8
- "학습 노트" — fontFamily `medium`, fontSize 13, color `mutedText` (`#5B6A5D`)
- "{noteCount} / {totalNotes}" — fontFamily `extrabold`, fontSize 13, color `examForest`

진행률 바:
- 트랙: width `100%`, height 6, borderRadius 999, 배경 `examSoftGreen` (`#C8EAC8`), `overflow: hidden`
- Fill: height `100%`, borderRadius 999, 배경 `primarySoft` (`#4A7C59`)
- Fill width 계산: `totalNotes > 0 ? ${(noteCount / totalNotes) * 100}% : '0%'` (division by zero 가드)
- noteCount > totalNotes 보호도 함께 적용: `Math.min(noteCount, totalNotes) / totalNotes`
- 다음 섹션과 간격: `BrandSpacing.md` (16)

### CTA 버튼

- 기존 스타일 유지: 배경 `BrandColors.primary`, borderRadius `BrandRadius.md`, paddingV 12
- 텍스트: "이어서 분석하기 →", fontFamily `bold`, fontSize 13, color `examLightText`

## Props 시그니처 (변경 없음)

```ts
type ExamAnalysisResumeCardProps = {
  examTitle: string;
  noteCount: number;
  totalNotes: number;
  onPress: () => void;
};
```

호출부(`features/quiz/components/quiz-hub-screen-view.tsx:223`) 변경 없음.

## NoteCollectionBar 삭제 영향

- grep 결과: `NoteCollectionBar` import는 `exam-analysis-resume-card.tsx` 한 곳뿐
- 컴포넌트 파일과 테스트 파일이 함께 제거됨
- 부수 기능 손실: `MAX_DOTS=45` 캡 로직, `showRemainingHint` 옵션 — 현재 호출부에서 `showRemainingHint={false}`였으므로 사용자 영향 없음

## 테스트

`features/quiz/exam/components/__tests__/exam-analysis-resume-card.test.tsx` 신규 작성. 같은 폴더의 `diagnosis-mini-card.test.tsx`와 결을 맞춘다.

케이스:

1. `examTitle` 문자열이 렌더링됨
2. `noteCount={1} totalNotes={4}` 줬을 때 화면에 `"1 / 4"` 텍스트 노출
3. 진행률 바 fill의 `style.width`가 `"25%"`인지 검증 (testID 부착)
4. `onPress` prop이 카드 Pressable 클릭 시 호출됨

`totalNotes === 0` edge case는 unit 테스트 범위 외 (호출부에서 `analysisState.isInProgress`가 true일 때만 렌더링되므로 0 진입 시나리오 비현실적). 단, 컴포넌트 내부 가드(위 Fill width 계산식)는 추가한다.

## 검증

- `npm run typecheck`
- `npm run lint`
- `npm test -- exam-analysis-resume-card`
- `npx expo start` → 분석 진행 중 상태로 홈 진입 → 카드 시각 확인

## 회귀 위험

- **낮음**. props 시그니처 동일, 호출부 무변경, 컬러 토큰 재사용으로 다른 화면 영향 없음
- 삭제되는 `NoteCollectionBar`는 단일 사용처라 외부 영향 없음
- 카드 높이가 약간 변경될 수 있음 (도트 그리드 → 1줄 바). 홈 레이아웃은 ScrollView라 영향 없음
