# 분석 진행 중 카드 V2 — 도트 → 가로 프로그레스 바 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면의 `ExamAnalysisResumeCard` 진행 표시를 도트(●●○○)에서 가로 프로그레스 바로 교체하고, 부수적 안내 문구를 정리한다.

**Architecture:** 단일 컴포넌트 전체 rewrite. props 시그니처와 호출부는 변경하지 않는다. `NoteCollectionBar`는 단일 사용처라 함께 삭제. 컬러는 기존 `BrandColors` 토큰만 재사용 (신규 토큰 0개).

**Tech Stack:** React Native 0.81, Expo 54, TypeScript, jest + jest-expo, @testing-library/react-native, react-native-svg.

**Spec:** `docs/superpowers/specs/2026-05-05-v2-analysis-resume-card-design.md`

---

## File Structure

| 경로 | 작업 | 책임 |
|---|---|---|
| `features/quiz/exam/components/exam-analysis-resume-card.tsx` | **수정 (rewrite)** | 홈 카드 UI 표현. props 시그니처 유지 |
| `features/quiz/exam/components/__tests__/exam-analysis-resume-card.test.tsx` | **신규** | 카드 렌더링 + 진행률 fill width + onPress 회귀 방지 |
| `features/quiz/exam/components/note-collection-bar.tsx` | **삭제** | 도트 진행률 컴포넌트 (단일 사용처) |

호출부 `features/quiz/components/quiz-hub-screen-view.tsx`는 변경하지 않는다.

---

## Task 1: 새 카드 테스트 파일 작성 (실패 상태)

**Files:**
- Create: `features/quiz/exam/components/__tests__/exam-analysis-resume-card.test.tsx`

같은 폴더의 `diagnosis-mini-card.test.tsx` 패턴을 그대로 따른다. Fill width 테스트는 새 컴포넌트가 부착할 `testID="progress-fill"`을 기준으로 한다 — 현재 컴포넌트에는 해당 testID가 없으므로 반드시 실패한다.

- [ ] **Step 1: 테스트 파일 작성**

`features/quiz/exam/components/__tests__/exam-analysis-resume-card.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExamAnalysisResumeCard } from '../exam-analysis-resume-card';

const defaultProps = {
  examTitle: '2025년 9월 고3 확률과통계 모의고사',
  noteCount: 1,
  totalNotes: 4,
  onPress: jest.fn(),
};

describe('ExamAnalysisResumeCard', () => {
  beforeEach(() => {
    defaultProps.onPress.mockClear();
  });

  it('examTitle 텍스트가 렌더링된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    expect(screen.queryByText('2025년 9월 고3 확률과통계 모의고사')).not.toBeNull();
  });

  it('"분석 진행 중" pill 뱃지와 "이어서 분석하기 →" CTA가 표시된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    expect(screen.queryByText('분석 진행 중')).not.toBeNull();
    expect(screen.queryByText('이어서 분석하기 →')).not.toBeNull();
  });

  it('noteCount=1, totalNotes=4 이면 "1 / 4" 카운트 텍스트가 표시된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    expect(screen.queryByText('1 / 4')).not.toBeNull();
  });

  it('진행률 바 fill width 가 noteCount/totalNotes 비율(25%)로 설정된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    const fill = screen.getByTestId('progress-fill');
    const flatStyle = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style.flat())
      : fill.props.style;
    expect(flatStyle.width).toBe('25%');
  });

  it('totalNotes=0 이면 fill width 가 "0%" 로 안전하게 표시된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} noteCount={0} totalNotes={0} />);
    const fill = screen.getByTestId('progress-fill');
    const flatStyle = Array.isArray(fill.props.style)
      ? Object.assign({}, ...fill.props.style.flat())
      : fill.props.style;
    expect(flatStyle.width).toBe('0%');
  });

  it('카드 Pressable 클릭 시 onPress 콜백이 호출된다', () => {
    render(<ExamAnalysisResumeCard {...defaultProps} />);
    fireEvent.press(screen.getByText('이어서 분석하기 →'));
    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run:
```bash
npm test -- exam-analysis-resume-card
```

Expected: 최소 `progress-fill` testID 관련 두 케이스(`fill width 25%`, `totalNotes=0 fill 0%`)는 `Unable to find an element with testID: progress-fill` 로 FAIL. 다른 케이스는 현재 구현이 우연히 통과할 수도 있으나, 다음 task에서 모두 그린이 되어야 한다.

- [ ] **Step 3: Commit**

```bash
git add features/quiz/exam/components/__tests__/exam-analysis-resume-card.test.tsx
git commit -m "test(exam-resume-card): V2 카드 회귀 방지 테스트 신규 (failing)"
```

---

## Task 2: 컴포넌트 rewrite — 모든 테스트 통과시키기

**Files:**
- Modify: `features/quiz/exam/components/exam-analysis-resume-card.tsx` (전체 rewrite)

기존 import (`NoteCollectionBar`)를 제거하고 V2 디자인 그대로 단일 파일로 구성한다. 분리할 만큼 복잡한 하위 단위는 없으므로 한 컴포넌트 안에서 표현한다.

- [ ] **Step 1: 컴포넌트 전체 rewrite**

`features/quiz/exam/components/exam-analysis-resume-card.tsx` 의 모든 내용을 다음으로 교체:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type ExamAnalysisResumeCardProps = {
  examTitle: string;
  noteCount: number;
  totalNotes: number;
  onPress: () => void;
};

export function ExamAnalysisResumeCard({
  examTitle,
  noteCount,
  totalNotes,
  onPress,
}: ExamAnalysisResumeCardProps) {
  const safeCurrent = Math.min(Math.max(noteCount, 0), totalNotes);
  const fillPercent = totalNotes > 0 ? `${(safeCurrent / totalNotes) * 100}%` : '0%';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}>
      <View style={styles.pill}>
        <View style={styles.pillDot} />
        <Text style={styles.pillText}>분석 진행 중</Text>
      </View>

      <Text style={styles.title}>{examTitle}</Text>

      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>학습 노트</Text>
          <Text style={styles.progressCount}>
            {noteCount} / {totalNotes}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            testID="progress-fill"
            style={[styles.progressFill, { width: fillPercent }]}
          />
        </View>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>이어서 분석하기 →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.examPaleGreen,
    borderColor: BrandColors.examSoftGreen,
    borderWidth: 1.5,
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.md,
  },
  cardPressed: {
    opacity: 0.85,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: BrandColors.examSoftGreen,
    gap: 6,
    marginBottom: BrandSpacing.sm,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.primarySoft,
  },
  pillText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: BrandColors.examForest,
  },

  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: BrandColors.examDeepGreen,
    marginBottom: BrandSpacing.md,
  },

  progressSection: {
    marginBottom: BrandSpacing.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: BrandColors.mutedText,
  },
  progressCount: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 13,
    color: BrandColors.examForest,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: BrandColors.examSoftGreen,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.primarySoft,
  },

  cta: {
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: BrandColors.examLightText,
  },
});
```

- [ ] **Step 2: TypeScript 검사**

Run:
```bash
npm run typecheck
```

Expected: 에러 없음. (`NoteCollectionBar` import가 사라졌고, `BrandColors`/`BrandRadius`/`BrandSpacing` 토큰은 모두 기존 export에 존재)

- [ ] **Step 3: 테스트 실행하여 모두 통과 확인**

Run:
```bash
npm test -- exam-analysis-resume-card
```

Expected: 6 케이스 모두 PASS.

만약 4번 테스트(`fill width 25%`)에서 `flatStyle.width`가 number(`6`)로 잡히면 `progressTrack` 의 `width: '100%'` 가 fill에 잘못 병합된 것이므로 stylesheet 분리 상태를 다시 확인한다.

- [ ] **Step 4: Lint 검사**

Run:
```bash
npm run lint -- features/quiz/exam/components/exam-analysis-resume-card.tsx
```

Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/components/exam-analysis-resume-card.tsx
git commit -m "feat(exam-resume-card): V2 디자인 리뉴얼 — 도트 → 가로 프로그레스 바"
```

---

## Task 3: 사용처 없는 NoteCollectionBar 제거

**Files:**
- Delete: `features/quiz/exam/components/note-collection-bar.tsx`

Task 2에서 import가 사라졌으므로 이 컴포넌트는 dead code다. 다른 import 경로가 없는지 한 번 더 검증 후 삭제한다.

- [ ] **Step 1: NoteCollectionBar 다른 import 처가 없는지 확인**

Run:
```bash
grep -r "NoteCollectionBar\|note-collection-bar" \
  --include="*.tsx" --include="*.ts" \
  features app components hooks lib
```

Expected: 검색 결과 0건. (Task 2 commit 이후 시점이므로 자기 자신 파일 외에는 참조 없음)

- [ ] **Step 2: 파일 삭제**

Run:
```bash
git rm features/quiz/exam/components/note-collection-bar.tsx
```

- [ ] **Step 3: TypeScript & 테스트 재실행**

Run:
```bash
npm run typecheck && npm test -- exam-analysis-resume-card
```

Expected: typecheck 에러 없음, 테스트 6/6 PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(exam): NoteCollectionBar 제거 — V2 카드 도입으로 단일 사용처 사라짐"
```

---

## Task 4: 통합 검증

**Files:** (변경 없음 — 검증 단계)

Task 1~3 후 회귀가 없는지 전체 단위 테스트와 시각 확인을 수행한다.

- [ ] **Step 1: 전체 typecheck**

Run:
```bash
npm run typecheck
```

Expected: 에러 없음.

- [ ] **Step 2: 전체 lint**

Run:
```bash
npm run lint
```

Expected: 에러 없음.

- [ ] **Step 3: 전체 테스트 실행**

Run:
```bash
npm test
```

Expected: 모든 기존 테스트 + 신규 6 케이스 PASS.

- [ ] **Step 4: 시각 확인**

Run:
```bash
npx expo start
```

검증 시나리오:
1. iOS 시뮬레이터/기기에서 앱 실행 → 로그인
2. 모의고사 선택 → 진단 분석 시작 → 1문제 분석 후 홈으로 나가기 (back gesture)
3. 홈 화면에서 V2 카드가 보이는지 확인:
   - `● 분석 진행 중` pill 뱃지 (초록 dot)
   - 시험 제목 굵게 표시
   - "학습 노트 ──── 1 / N" 라벨 행
   - 가로 프로그레스 바 (1/N 비율 채움)
   - "이어서 분석하기 →" CTA
4. CTA 누르면 분석 화면으로 복귀하는지 확인
5. 도트(●●○○)는 더 이상 보이지 않는지 확인 (V1 잔재 없음)

- [ ] **Step 5: 발견된 이슈가 있으면 수정 후 commit; 없으면 종료**

이슈 없으면 별도 commit 없이 종료. 시각/회귀 이슈가 있으면 fix 커밋을 추가한다.

---

## Self-Review Checklist (작성자가 직접 점검 완료)

**1. Spec coverage:**
- ✅ 카드 시각 구조 (pill, 제목, 진행률, CTA) → Task 2 Step 1
- ✅ 컬러 매핑 (기존 토큰 재사용) → Task 2 Step 1 styles
- ✅ Props 시그니처 유지 → Task 2 Step 1 type 선언
- ✅ NoteCollectionBar 삭제 → Task 3
- ✅ 테스트 4 케이스 (스펙) + 0% edge + onPress → Task 1 (총 6 케이스)
- ✅ totalNotes=0 division 가드 → Task 2 Step 1 fillPercent 식
- ✅ noteCount > totalNotes 가드 → Task 2 Step 1 safeCurrent
- ✅ 검증 항목 (typecheck/lint/test/시각) → Task 4

**2. Placeholder scan:**
- "TBD/TODO" 없음. 모든 코드 블록 완전한 형태.

**3. Type consistency:**
- `ExamAnalysisResumeCardProps` (Task 2)와 호출부(`quiz-hub-screen-view.tsx:223`) 일치 확인됨
- testID `progress-fill` (Task 1, Task 2) 일치
- StyleSheet key 이름 (`progressFill`, `progressTrack`, `pill`, `pillDot`, `pillText`, `title`, `cta`) 일관

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-05-v2-analysis-resume-card.md`.
