# 약점 분석 리포트 리디자인 — Design Spec

**날짜:** 2026-04-28  
**상태:** 기획중  
**작성:** brainstorming 세션

---

## 목표

`QuizResultReportView` 화면을 리디자인 코드(handoff 파일)로 교체한다.  
핵심 방향: 장식 제거 → 가장 큰 약점명 + 오답 횟수가 첫 픽셀에 보이도록.

---

## 변경 파일

| 파일 | 변경 종류 |
|---|---|
| `features/quiz/types.ts` | `QuizResultSummary`에 `wrongByWeakness` 필드 추가 |
| `features/quiz/engine.ts` | `buildQuizResult`에서 `wrongByWeakness` 노출 |
| `features/quiz/components/quiz-result-report-header.tsx` | 전면 교체 |
| `features/quiz/components/quiz-result-report-hero.tsx` | 전면 교체 |
| `features/quiz/components/quiz-result-report-view.tsx` | 전면 교체 |
| `features/quiz/components/quiz-result-screen-view.tsx` | `totalNotes`/`source` prop 전달 제거 |
| `assets/quiz/result-report/Gemini_Generated_Image_84kar584kar584ka.png` | 삭제 |

`quiz-result-report-card.tsx` — 변경 없음.  
`frame_note_with_stamp_transparent_cropped.png` — 다른 화면(`poster-title-banner.tsx`)에서 사용 중이므로 삭제 불가, 유지.

---

## 1. 데이터 모델

### `types.ts`

```typescript
export type QuizResultSummary = {
  attemptId: string;
  startedAt: string;
  completedAt: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  allCorrect: boolean;
  topWeaknesses: WeaknessId[];
  wrongByWeakness?: Record<WeaknessId, number>; // 추가 — optional (옛 데이터 호환)
};
```

### `engine.ts` — `buildQuizResult`

`weaknessScores`(약점별 오답 횟수)는 이미 계산 중이므로 return에 그대로 노출:

```typescript
return {
  // ...기존 필드
  topWeaknesses,
  wrongByWeakness: weaknessScores, // 추가 — 계산 변경 없음
};
```

### 사용처

```typescript
const primaryWeaknessId = summary.topWeaknesses[0];
const missedCount = summary.wrongByWeakness?.[primaryWeaknessId] ?? 1;
// optional + fallback → 옛 attempt 데이터에서도 안전
```

---

## 2. QuizResultReportHeader

### 제거
- 종이 도장 프레임 (`FRAME_SOURCE` 이미지)
- "나의 약점 분석 리포트" 타이틀

### 추가
- 백 버튼(`‹`) — `router.back()`
- 우측 날짜 표시 (`toLocaleDateString('ko-KR', ...)`)

### Props (변경 없음)
```typescript
type QuizResultReportHeaderProps = {
  isCompactLayout: boolean;
};
```

---

## 3. QuizResultReportHero

### 제거
- 선생님 캐릭터 이미지 (`REPORT_TEACHER_CHARACTER_SOURCE`)
- 말풍선 ("쑥쑥 늘 거예요!")
- `pointCount` prop

### 추가
- 단원 태그 (`info.topicLabel`) + "가장 큰 약점" eyebrow 라벨
- 헤드라인: `{info.labelKo}에서 / {missedCount}번 모두 막혔어요.`
  - 오답 횟수 강조: `color: BrandColors.danger` (`#D64545`)
- 약점 설명 (`info.desc`)
- "이렇게 고쳐봐요" tip 박스 (`info.tip` 존재 시)

### Props
```typescript
type QuizResultReportHeroProps = {
  isCompactLayout: boolean;
  primaryWeaknessId: string;
  missedCount: number;
  // totalCount 제거 — 화면에서 사용하지 않음
};
```

### 카피 톤
| 원본(반말) | 변경(정중체) |
|---|---|
| "3번 다 막혔어." | "3번 모두 막혔어요." |
| "이렇게 고쳐보자" | "이렇게 고쳐봐요" |

---

## 4. QuizResultReportView

### 제거
- `totalNotes` prop
- `source` prop (시험/진단 모드 분기 제거 — 두 모드 통일)
- `climaxBanner` (🎉 이모지 + "N장 노트 모두 수집!")
- `NoteCollectionBar`
- `summaryLine` ("총 N문제 중 N개 정답 · 정답률 N%")

### Props
```typescript
type QuizResultReportViewProps = {
  onOpenWeaknessPractice: (weaknessId: string) => void;
  persistResult: () => Promise<void>;
  saveErrorMessage: string | null;
  saveState: UseResultScreenResult['saveState'];
  summary: NonNullable<UseResultScreenResult['liveSummary']>;
  // totalNotes, source 제거
};
```

### 레이아웃 (위에서 아래)
1. `QuizResultReportHeader`
2. 저장 상태 카드 (saving / error — Hero보다 위에)
3. `QuizResultReportHero` (top1 약점 — 헤드라인)
4. 구분선
5. 약점 카드 (top2~3) — `QuizResultReportCard`
6. 컴팩트 리스트 (top4+) — 토픽 칩 + 약점명 행
7. CTA 영역:
   - Primary: **`{primaryInfo.labelKo}부터 다시 풀기`** → `onOpenWeaknessPractice`
   - Ghost: **"나중에 풀게요"** → `router.replace('/(tabs)/quiz')`로 홈(퀴즈 탭) 이동

### 호출처 (`quiz-result-screen-view.tsx:122~129`)
```typescript
// 변경 전
<QuizResultReportView
  ...
  totalNotes={source === 'exam' ? summary.wrong : undefined}
  source={source}
/>

// 변경 후
<QuizResultReportView
  ...
  // totalNotes, source 전달 제거
/>
```

---

## 5. 자산 삭제

- `assets/quiz/result-report/Gemini_Generated_Image_84kar584kar584ka.png`
  - 사용처: `quiz-result-report-hero.tsx`만 사용 → 삭제 OK
- `features/quiz/components/frame_note_with_stamp_transparent_cropped.png`
  - 사용처: `poster-title-banner.tsx`에서도 사용 중 → **삭제 불가, 유지**

---

## 6. 브랜드/디자인 토큰

| 항목 | 값 |
|---|---|
| 오답 횟수 강조 색 | `BrandColors.danger` (`#D64545`) — 기존 등록 컬러 재사용 |
| 배경 | `#F8F3E8` |
| Tip 박스 배경 | `#E5EFE0`, 테두리 `#87B084` |

---

## 7. 테스트 및 검증 계획

### 자동화
- `engine.test.ts`: `buildQuizResult` 결과에 `wrongByWeakness` 포함 검증 추가
- 컴포넌트 테스트(있다면): props 변경에 맞춰 갱신

### 수동 시뮬레이터 검증
```
npx expo prebuild --clean
npx expo run:ios
```

확인 케이스:
- top3 약점 있는 경우 — Hero + 카드 2개
- top1만 있는 경우 — Hero만
- top4+ 있는 경우 — 컴팩트 리스트 영역 표시
- 저장 중(saving) 상태 카드 — Hero 위에 표시
- 저장 실패(error) 상태 카드 + "다시 저장하기" 버튼
- "나중에 풀게요" → 홈 탭 이동 확인
- `wrongByWeakness` 없는 옛 attempt → missedCount fallback(1) 표시

---

## 8. 위험도 평가

**낮음.**
- 새로운 계산 로직 없음 (기존 `weaknessScores` 노출만)
- optional 필드로 옛 데이터 호환 보장
- 호출처 1개 (`quiz-result-screen-view.tsx`)
- `quiz-result-report-card.tsx` 변경 없음
