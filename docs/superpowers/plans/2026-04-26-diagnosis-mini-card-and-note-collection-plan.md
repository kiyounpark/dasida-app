# 진단 미니 카드 + 학습 노트 컬렉션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모의고사 약점 분석 흐름에 즉각 보상(미니 완료 카드), 진행 누적 시각화(노트 컬렉션 점 게이지), 감정 보상(마일스톤 배너)을 추가하고, 분석 진행 중일 때 홈을 모드 전환한다. 부분 단계에서 가짜 순위는 절대 노출하지 않는다.

**Architecture:** 신규 컴포넌트 4개(미니 카드, 점 게이지 바, 마일스톤 배너, 홈 분석 진행 카드)를 추가하고 진단 화면/홈 화면의 렌더링 로직만 변경한다. 데이터 모델은 그대로(`exam-diagnosis-progress.ts`의 `diagnosedProblems`). 마일스톤 노출 상태만 AsyncStorage에 추가한다.

**Tech Stack:** React Native (Expo), TypeScript, Jest + React Testing Library, AsyncStorage, Expo Router. BrandColors / BrandSpacing / BrandRadius / FontFamilies 토큰 사용.

**관련 스펙:** `docs/superpowers/specs/2026-04-26-diagnosis-mini-card-and-note-collection-design.md`

---

## File Structure

### 신규 파일
- `features/quiz/exam/components/note-collection-bar.tsx` — 점 게이지 바 (분석 화면 + 홈 두 곳에서 재사용)
- `features/quiz/exam/components/diagnosis-mini-card.tsx` — 진단 완료 미니 카드 + CTA 두 버튼
- `features/quiz/exam/components/diagnosis-milestone-banner.tsx` — 1/3, 2/3 마일스톤 배너
- `features/quiz/exam/components/exam-analysis-resume-card.tsx` — 홈에서 보이는 "분석 진행 중" 카드
- `features/quiz/exam/components/collected-notes-list.tsx` — 홈에서 보이는 모은 노트 리스트
- `features/quiz/exam/diagnosis-milestone-progress.ts` — 마일스톤 도달/노출 상태 AsyncStorage 유틸
- `features/quiz/exam/diagnosis-mini-card-text.ts` — diagnosis tree에서 미니 카드용 텍스트 추출 유틸
- `features/quiz/exam/use-exam-analysis-in-progress.ts` — 홈에서 "분석 진행 중" 감지 훅
- `features/quiz/exam/exam-analysis-in-progress.ts` — 진행 중 모의고사 attempt 조회 유틸
- `features/quiz/exam/diagnosis-milestone.ts` — 마일스톤 임계점 계산 (오답 수 → 33%/67% floor)

### 변경 파일
- `features/quiz/exam/hooks/use-exam-diagnosis.ts` — 진단 final 노드 도달 시 자동 onComplete 제거, 미니 카드/마일스톤 표시 단계 추가, 사용자가 "다음 문제 →" 누를 때 onComplete 호출
- `features/quiz/exam/screens/exam-diagnosis-screen.tsx` — entries 배열에 `mini-card` 또는 `milestone-banner` 신규 항목 렌더링
- `features/quiz/exam/use-exam-diagnosis.ts` 의 `ExamDiagEntry` 타입에 새 변형 추가
- `features/quiz/exam/screens/exam-result-screen-view.tsx` — CTA 카피 변경 + microcopy 한 줄 추가
- `features/quiz/components/quiz-result-report-view.tsx` — 시작 부분에 클라이맥스 배너 + 노트 컬렉션 (15/15 채워진 점) 추가
- `features/quiz/components/quiz-hub-screen-view.tsx` — 홈 모드 분기 (평소 / 모의고사 분석 진행 중)
- `features/quiz/hooks/use-quiz-hub-screen.ts` — 모의고사 분석 진행 중 플래그 추가, 그에 따라 다른 섹션의 show 조건 조정

### 신규 테스트
- `features/quiz/exam/diagnosis-milestone.test.ts`
- `features/quiz/exam/diagnosis-milestone-progress.test.ts`
- `features/quiz/exam/diagnosis-mini-card-text.test.ts`
- `features/quiz/exam/exam-analysis-in-progress.test.ts`

---

## Phase 1: 순수 로직 유틸리티 (TDD)

### Task 1: 마일스톤 임계점 계산 유틸

**왜 먼저 하나:** 다른 파일들이 이 함수를 호출한다. 순수 함수라 테스트가 쉽다. 33%/67% floor + 오답 ≥ 10 임계점 규칙은 한 번만 정의하고 모두가 import.

**Files:**
- Create: `features/quiz/exam/diagnosis-milestone.ts`
- Test: `features/quiz/exam/diagnosis-milestone.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`features/quiz/exam/diagnosis-milestone.test.ts`:

```typescript
import {
  computeMilestoneThresholds,
  detectMilestoneReached,
  type MilestoneFraction,
} from '@/features/quiz/exam/diagnosis-milestone';

describe('computeMilestoneThresholds', () => {
  it('오답 수 9 이하면 마일스톤 없음', () => {
    expect(computeMilestoneThresholds(9)).toEqual({ at33: null, at67: null });
    expect(computeMilestoneThresholds(1)).toEqual({ at33: null, at67: null });
    expect(computeMilestoneThresholds(0)).toEqual({ at33: null, at67: null });
  });

  it('오답 15개일 때 33%=5, 67%=10', () => {
    expect(computeMilestoneThresholds(15)).toEqual({ at33: 5, at67: 10 });
  });

  it('오답 12개일 때 33%=4 (floor), 67%=8 (floor)', () => {
    expect(computeMilestoneThresholds(12)).toEqual({ at33: 4, at67: 8 });
  });

  it('오답 10개일 때 33%=3 (floor 3.3), 67%=6 (floor 6.7)', () => {
    expect(computeMilestoneThresholds(10)).toEqual({ at33: 3, at67: 6 });
  });

  it('오답 11개일 때 33%=3 (floor 3.63), 67%=7 (floor 7.37)', () => {
    expect(computeMilestoneThresholds(11)).toEqual({ at33: 3, at67: 7 });
  });
});

describe('detectMilestoneReached', () => {
  it('현재 노트 수가 33% 도달 시점이면 33 반환', () => {
    expect(
      detectMilestoneReached({ totalWrong: 15, currentNoteCount: 5 }),
    ).toBe<MilestoneFraction>(33);
  });

  it('현재 노트 수가 67% 도달 시점이면 67 반환', () => {
    expect(
      detectMilestoneReached({ totalWrong: 15, currentNoteCount: 10 }),
    ).toBe<MilestoneFraction>(67);
  });

  it('마일스톤 시점이 아니면 null 반환', () => {
    expect(detectMilestoneReached({ totalWrong: 15, currentNoteCount: 4 })).toBeNull();
    expect(detectMilestoneReached({ totalWrong: 15, currentNoteCount: 11 })).toBeNull();
  });

  it('오답 9개 이하는 항상 null', () => {
    expect(detectMilestoneReached({ totalWrong: 9, currentNoteCount: 3 })).toBeNull();
    expect(detectMilestoneReached({ totalWrong: 9, currentNoteCount: 6 })).toBeNull();
  });

  it('33%과 67%가 같은 시점일 때 (소수 오답): null로 처리해 중복 발화 방지', () => {
    // 오답 10개는 floor(3.3)=3, floor(6.7)=6 — 안 겹침. 안전
    // 의도적으로 같은 시점 케이스가 나오지 않도록 임계점 규칙이 보장됨
    expect(detectMilestoneReached({ totalWrong: 10, currentNoteCount: 3 })).toBe(33);
    expect(detectMilestoneReached({ totalWrong: 10, currentNoteCount: 6 })).toBe(67);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npx jest features/quiz/exam/diagnosis-milestone.test.ts
```

Expected: FAIL — 모듈을 찾을 수 없음.

- [ ] **Step 3: 최소 구현**

`features/quiz/exam/diagnosis-milestone.ts`:

```typescript
const MILESTONE_MIN_TOTAL = 10;

export type MilestoneFraction = 33 | 67;

export type MilestoneThresholds = {
  at33: number | null;
  at67: number | null;
};

export function computeMilestoneThresholds(totalWrong: number): MilestoneThresholds {
  if (totalWrong < MILESTONE_MIN_TOTAL) {
    return { at33: null, at67: null };
  }
  return {
    at33: Math.floor(totalWrong * 0.33),
    at67: Math.floor(totalWrong * 0.67),
  };
}

export function detectMilestoneReached(input: {
  totalWrong: number;
  currentNoteCount: number;
}): MilestoneFraction | null {
  const thresholds = computeMilestoneThresholds(input.totalWrong);
  if (input.currentNoteCount === thresholds.at33) return 33;
  if (input.currentNoteCount === thresholds.at67) return 67;
  return null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest features/quiz/exam/diagnosis-milestone.test.ts
```

Expected: PASS — 8개 케이스 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/exam/diagnosis-milestone.ts features/quiz/exam/diagnosis-milestone.test.ts
git commit -m "feat(quiz/exam): add diagnosis milestone threshold calculator"
```

---

### Task 2: 마일스톤 노출 상태 AsyncStorage 유틸

**왜:** 한 어템트 안에서 마일스톤 배너를 33%/67% 각 한 번만 띄우려면 노출 여부를 AsyncStorage에 기록해야 한다. 재진입해도 이미 본 마일스톤은 재노출 안 함.

**Files:**
- Create: `features/quiz/exam/diagnosis-milestone-progress.ts`
- Test: `features/quiz/exam/diagnosis-milestone-progress.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`features/quiz/exam/diagnosis-milestone-progress.test.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildMilestoneStorageKey,
  hasMilestoneShown,
  markMilestoneShown,
  type MilestoneScope,
} from '@/features/quiz/exam/diagnosis-milestone-progress';

const mockedAsyncStorage = jest.mocked(AsyncStorage);

const SCOPE: MilestoneScope = {
  examId: 'exam-001',
  attemptId: 'attempt-123',
  attemptDateISO: '2026-04-26',
};

describe('diagnosis-milestone-progress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('buildMilestoneStorageKey: 분기별 고유 키 생성', () => {
    expect(buildMilestoneStorageKey(SCOPE, 33)).toBe(
      'dasida/exam-diagnosis-milestone/exam-001/2026-04-26-attempt-123/33',
    );
    expect(buildMilestoneStorageKey(SCOPE, 67)).toBe(
      'dasida/exam-diagnosis-milestone/exam-001/2026-04-26-attempt-123/67',
    );
  });

  it('hasMilestoneShown: 저장 값 없으면 false', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null);
    await expect(hasMilestoneShown(SCOPE, 33)).resolves.toBe(false);
  });

  it('hasMilestoneShown: 저장 값 있으면 true', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('1');
    await expect(hasMilestoneShown(SCOPE, 33)).resolves.toBe(true);
  });

  it('markMilestoneShown: setItem 호출', async () => {
    mockedAsyncStorage.setItem.mockResolvedValueOnce(undefined);
    await markMilestoneShown(SCOPE, 67);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'dasida/exam-diagnosis-milestone/exam-001/2026-04-26-attempt-123/67',
      '1',
    );
  });

  it('hasMilestoneShown: AsyncStorage 에러 시 false (안전한 기본값)', async () => {
    mockedAsyncStorage.getItem.mockRejectedValueOnce(new Error('storage failed'));
    await expect(hasMilestoneShown(SCOPE, 33)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npx jest features/quiz/exam/diagnosis-milestone-progress.test.ts
```

Expected: FAIL.

- [ ] **Step 3: 구현**

`features/quiz/exam/diagnosis-milestone-progress.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MilestoneFraction } from '@/features/quiz/exam/diagnosis-milestone';

export type MilestoneScope = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
};

export function buildMilestoneStorageKey(
  scope: MilestoneScope,
  fraction: MilestoneFraction,
): string {
  return `dasida/exam-diagnosis-milestone/${scope.examId}/${scope.attemptDateISO}-${scope.attemptId}/${fraction}`;
}

export async function hasMilestoneShown(
  scope: MilestoneScope,
  fraction: MilestoneFraction,
): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(buildMilestoneStorageKey(scope, fraction));
    return value === '1';
  } catch {
    return false;
  }
}

export async function markMilestoneShown(
  scope: MilestoneScope,
  fraction: MilestoneFraction,
): Promise<void> {
  try {
    await AsyncStorage.setItem(buildMilestoneStorageKey(scope, fraction), '1');
  } catch {
    // 저장 실패해도 UX 흐름은 막지 않음. 다음 진입에 다시 노출될 수 있음 (수용 가능)
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest features/quiz/exam/diagnosis-milestone-progress.test.ts
```

Expected: PASS — 5개 케이스 통과.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/exam/diagnosis-milestone-progress.ts features/quiz/exam/diagnosis-milestone-progress.test.ts
git commit -m "feat(quiz/exam): add milestone-shown async storage utility"
```

---

### Task 3: 미니 카드 텍스트 추출 유틸

**왜:** 진단 tree의 마지막 의미 있는 노드(보통 final 직전 Check 또는 Explain) 텍스트를 미니 카드 설명으로 사용. 80자 컷. 데이터가 없으면 fallback ("분석 완료" 한 줄).

**Files:**
- Create: `features/quiz/exam/diagnosis-mini-card-text.ts`
- Test: `features/quiz/exam/diagnosis-mini-card-text.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`features/quiz/exam/diagnosis-mini-card-text.test.ts`:

```typescript
import {
  buildMiniCardText,
  type MiniCardTextInput,
} from '@/features/quiz/exam/diagnosis-mini-card-text';

describe('buildMiniCardText', () => {
  it('methodLabel + lastNodeText (80자 이하) 그대로 반환', () => {
    const input: MiniCardTextInput = {
      methodLabel: '계산 실수',
      lastNodeText: '시간 압박 상황에서 부호를 놓쳤어요. 검산 한 번이면 잡을 수 있어요.',
    };
    expect(buildMiniCardText(input)).toEqual({
      patternName: '계산 실수',
      patternDescription: '시간 압박 상황에서 부호를 놓쳤어요. 검산 한 번이면 잡을 수 있어요.',
    });
  });

  it('lastNodeText 80자 초과 시 잘림 + ellipsis', () => {
    const long =
      '아주 긴 텍스트입니다. '.repeat(20); // 250자 이상
    const input: MiniCardTextInput = {
      methodLabel: '개념 이해 부족',
      lastNodeText: long,
    };
    const result = buildMiniCardText(input);
    expect(result.patternName).toBe('개념 이해 부족');
    expect(result.patternDescription.length).toBeLessThanOrEqual(80);
    expect(result.patternDescription).toMatch(/…$/);
  });

  it('lastNodeText 없으면 fallback 설명', () => {
    const input: MiniCardTextInput = {
      methodLabel: '문제 해석 오류',
      lastNodeText: null,
    };
    expect(buildMiniCardText(input)).toEqual({
      patternName: '문제 해석 오류',
      patternDescription: '이 패턴을 알아둔 거예요. 다음에 같은 유형이 나오면 한 번 더 떠올려보세요.',
    });
  });

  it('methodLabel과 lastNodeText 둘 다 없으면 generic fallback', () => {
    const input: MiniCardTextInput = {
      methodLabel: null,
      lastNodeText: null,
    };
    expect(buildMiniCardText(input)).toEqual({
      patternName: '분석 완료',
      patternDescription: '한 문제 분석이 끝났어요. 학습 노트로 저장됐어요.',
    });
  });

  it('methodLabel 없지만 lastNodeText는 있는 경우: lastNodeText만 보여줌', () => {
    const input: MiniCardTextInput = {
      methodLabel: null,
      lastNodeText: '풀이의 핵심은 검산이에요.',
    };
    expect(buildMiniCardText(input)).toEqual({
      patternName: '분석 완료',
      patternDescription: '풀이의 핵심은 검산이에요.',
    });
  });
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
npx jest features/quiz/exam/diagnosis-mini-card-text.test.ts
```

Expected: FAIL.

- [ ] **Step 3: 구현**

`features/quiz/exam/diagnosis-mini-card-text.ts`:

```typescript
const MAX_DESCRIPTION_LENGTH = 80;
const FALLBACK_PATTERN_NAME = '분석 완료';
const FALLBACK_DESCRIPTION_NO_TEXT =
  '이 패턴을 알아둔 거예요. 다음에 같은 유형이 나오면 한 번 더 떠올려보세요.';
const FALLBACK_DESCRIPTION_NO_DATA = '한 문제 분석이 끝났어요. 학습 노트로 저장됐어요.';

export type MiniCardTextInput = {
  methodLabel: string | null;
  lastNodeText: string | null;
};

export type MiniCardText = {
  patternName: string;
  patternDescription: string;
};

function truncate(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;
  return text.slice(0, MAX_DESCRIPTION_LENGTH - 1) + '…';
}

export function buildMiniCardText(input: MiniCardTextInput): MiniCardText {
  const patternName = input.methodLabel ?? FALLBACK_PATTERN_NAME;

  if (input.lastNodeText) {
    return { patternName, patternDescription: truncate(input.lastNodeText) };
  }

  if (input.methodLabel) {
    return { patternName, patternDescription: FALLBACK_DESCRIPTION_NO_TEXT };
  }

  return {
    patternName: FALLBACK_PATTERN_NAME,
    patternDescription: FALLBACK_DESCRIPTION_NO_DATA,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest features/quiz/exam/diagnosis-mini-card-text.test.ts
```

Expected: PASS — 5개 케이스 통과.

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/exam/diagnosis-mini-card-text.ts features/quiz/exam/diagnosis-mini-card-text.test.ts
git commit -m "feat(quiz/exam): add mini-card text builder with fallback"
```

---

## Phase 2: 표시 컴포넌트 (UI 단독)

### Task 4: NoteCollectionBar 컴포넌트

**왜 먼저:** 다른 컴포넌트(DiagnosisMiniCard, DiagnosisMilestoneBanner, ExamAnalysisResumeCard)에서 모두 사용한다. 가장 작은 leaf 컴포넌트.

**Files:**
- Create: `features/quiz/exam/components/note-collection-bar.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`features/quiz/exam/components/note-collection-bar.tsx`:

```typescript
import { StyleSheet, Text, View } from 'react-native';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type NoteCollectionBarProps = {
  current: number;
  total: number;
  variant?: 'full' | 'compact'; // full: 분석 화면, compact: 홈 카드
  showRemainingHint?: boolean; // "10장 더 모으면 종합 리포트" 표시 여부
};

export function NoteCollectionBar({
  current,
  total,
  variant = 'full',
  showRemainingHint = true,
}: NoteCollectionBarProps) {
  const dots = Array.from({ length: total }, (_, i) => i < current);
  const remaining = total - current;
  const isCompact = variant === 'compact';

  return (
    <View style={[styles.wrap, isCompact && styles.wrapCompact]}>
      <View style={styles.header}>
        <Text style={[styles.title, isCompact && styles.titleCompact]}>📔 학습 노트</Text>
        <Text style={[styles.count, isCompact && styles.countCompact]}>
          {current}
          <Text style={styles.countSuffix}>{isCompact ? ` / ${total}` : '장'}</Text>
        </Text>
      </View>

      <View style={[styles.dotsRow, isCompact && styles.dotsRowCompact]}>
        {dots.map((filled, idx) => (
          <View
            key={idx}
            style={[styles.dot, filled ? styles.dotFilled : styles.dotEmpty, isCompact && styles.dotCompact]}
          />
        ))}
      </View>

      {showRemainingHint && remaining > 0 ? (
        <Text style={styles.hint}>
          <Text style={styles.hintHighlight}>{remaining}장</Text> 더 모으면 종합 리포트 ✦
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#EDF7ED',
    borderColor: '#2A5C3833',
    borderWidth: 1,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
  },
  wrapCompact: {
    backgroundColor: BrandColors.card,
    padding: BrandSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: '#2A5C38',
    letterSpacing: 0.6,
  },
  titleCompact: {
    fontSize: 11,
  },
  count: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 18,
    color: BrandColors.text,
  },
  countCompact: {
    fontSize: 14,
  },
  countSuffix: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: BrandColors.mutedText,
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginVertical: BrandSpacing.xs,
  },
  dotsRowCompact: {
    marginVertical: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: BrandColors.success,
  },
  dotEmpty: {
    backgroundColor: BrandColors.border,
  },
  hint: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: BrandColors.text,
    textAlign: 'center',
  },
  hintHighlight: {
    fontFamily: FontFamilies.bold,
    color: BrandColors.success,
  },
});
```

- [ ] **Step 2: 타입체크**

```bash
npx tsc --noEmit
```

Expected: PASS (관련 에러 없음).

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/components/note-collection-bar.tsx
git commit -m "feat(quiz/exam): add NoteCollectionBar component"
```

---

### Task 5: DiagnosisMiniCard 컴포넌트

**Files:**
- Create: `features/quiz/exam/components/diagnosis-mini-card.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`features/quiz/exam/components/diagnosis-mini-card.tsx`:

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { NoteCollectionBar } from '@/features/quiz/exam/components/note-collection-bar';

export type DiagnosisMiniCardProps = {
  problemNumber: number;
  patternName: string;
  patternDescription: string;
  noteCount: number;
  totalNotes: number;
  onPause: () => void;
  onNext: () => void;
  isLastProblem?: boolean; // true면 "다음 문제 →" 대신 "리포트 보기 →"
};

export function DiagnosisMiniCard({
  problemNumber,
  patternName,
  patternDescription,
  noteCount,
  totalNotes,
  onPause,
  onNext,
  isLastProblem = false,
}: DiagnosisMiniCardProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.completionBlock}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkText}>✓</Text>
        </View>
        <Text style={styles.completionLabel}>분석 완료</Text>
        <Text style={styles.problemLabel}>{problemNumber}번 문제</Text>

        <View style={styles.patternBlock}>
          <Text style={styles.patternKicker}>오답 패턴</Text>
          <Text style={styles.patternName}>{patternName}</Text>
          <Text style={styles.patternDesc}>{patternDescription}</Text>
        </View>
      </View>

      <NoteCollectionBar current={noteCount} total={totalNotes} variant="full" />

      <View style={styles.buttonRow}>
        <Pressable style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]} onPress={onPause}>
          <Text style={styles.btnGhostText}>잠시 쉬기</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]} onPress={onNext}>
          <Text style={styles.btnPrimaryText}>{isLastProblem ? '리포트 보기 →' : '다음 문제 →'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    gap: BrandSpacing.sm,
  },
  completionBlock: {
    backgroundColor: '#C8EAC8',
    borderColor: '#6BAA7244',
    borderWidth: 1,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.md,
    alignItems: 'center',
    gap: BrandSpacing.xs,
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontFamily: FontFamilies.bold,
    color: '#FFFFFF',
    fontSize: 22,
  },
  completionLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#1C2C19',
  },
  problemLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: '#4A4540',
  },
  patternBlock: {
    backgroundColor: BrandColors.card,
    borderRadius: BrandRadius.sm,
    borderColor: '#2E7A2E1F',
    borderWidth: 1,
    padding: BrandSpacing.sm,
    width: '100%',
    gap: 4,
  },
  patternKicker: {
    fontFamily: FontFamilies.bold,
    fontSize: 9,
    color: BrandColors.success,
    letterSpacing: 0.7,
  },
  patternName: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: BrandColors.text,
  },
  patternDesc: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: '#4A4540',
    lineHeight: 17,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: BrandSpacing.xs,
  },
  btnGhost: {
    flex: 1,
    backgroundColor: 'transparent',
    borderColor: BrandColors.border,
    borderWidth: 1.5,
    borderRadius: BrandRadius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnGhostText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: BrandColors.mutedText,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: BrandColors.success,
    borderRadius: BrandRadius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.7,
  },
});
```

- [ ] **Step 2: 타입체크**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/components/diagnosis-mini-card.tsx
git commit -m "feat(quiz/exam): add DiagnosisMiniCard component"
```

---

### Task 6: DiagnosisMilestoneBanner 컴포넌트

**Files:**
- Create: `features/quiz/exam/components/diagnosis-milestone-banner.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`features/quiz/exam/components/diagnosis-milestone-banner.tsx`:

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MilestoneFraction } from '@/features/quiz/exam/diagnosis-milestone';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { NoteCollectionBar } from '@/features/quiz/exam/components/note-collection-bar';

export type DiagnosisMilestoneBannerProps = {
  fraction: MilestoneFraction; // 33 | 67
  noteCount: number;
  totalNotes: number;
  onPause: () => void;
  onContinue: () => void;
};

export function DiagnosisMilestoneBanner({
  fraction,
  noteCount,
  totalNotes,
  onPause,
  onContinue,
}: DiagnosisMilestoneBannerProps) {
  const isFirst = fraction === 33;
  const icon = isFirst ? '🌱' : '🌿';
  const title = isFirst ? '1/3 도달' : '2/3 도달';
  const subtitle = isFirst
    ? `노트 ${noteCount}장 모았어요\n여기까지 잘 왔어요`
    : `노트 ${noteCount}장 모았어요\n조금만 더 가면 끝이에요`;

  return (
    <View style={styles.outer}>
      <View style={styles.banner}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.fracPill}>
          <Text style={styles.fracText}>
            {noteCount} / {totalNotes}
          </Text>
        </View>
      </View>

      <NoteCollectionBar current={noteCount} total={totalNotes} variant="full" showRemainingHint={false} />

      <View style={styles.buttonRow}>
        <Pressable style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]} onPress={onPause}>
          <Text style={styles.btnGhostText}>잠시 쉬기</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]} onPress={onContinue}>
          <Text style={styles.btnPrimaryText}>계속하기 →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    gap: BrandSpacing.sm,
  },
  banner: {
    backgroundColor: '#FFF8EF',
    borderColor: '#A89F8C66',
    borderWidth: 1.5,
    borderRadius: BrandRadius.lg,
    paddingVertical: 22,
    paddingHorizontal: BrandSpacing.md,
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 17,
    color: '#1C2C19',
  },
  subtitle: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: '#4A4540',
    textAlign: 'center',
    lineHeight: 18,
  },
  fracPill: {
    backgroundColor: '#EDF7ED',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginTop: 6,
  },
  fracText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: BrandColors.success,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: BrandSpacing.xs,
  },
  btnGhost: {
    flex: 1,
    backgroundColor: 'transparent',
    borderColor: BrandColors.border,
    borderWidth: 1.5,
    borderRadius: BrandRadius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnGhostText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: BrandColors.mutedText,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: BrandColors.success,
    borderRadius: BrandRadius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.7,
  },
});
```

- [ ] **Step 2: 타입체크 + 커밋**

```bash
npx tsc --noEmit
```

Expected: PASS.

```bash
git add features/quiz/exam/components/diagnosis-milestone-banner.tsx
git commit -m "feat(quiz/exam): add DiagnosisMilestoneBanner component"
```

---

## Phase 3: 진단 흐름에 미니 카드 + 마일스톤 통합

### Task 7: ExamDiagEntry 타입에 mini-card / milestone 변형 추가

**왜:** `exam-diagnosis-screen.tsx`의 entries 배열은 union type이다. 새 변형을 추가해야 미니 카드와 마일스톤을 끼워 넣을 수 있다.

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts` (ExamDiagEntry 타입)

- [ ] **Step 1: ExamDiagEntry 타입 확장**

`features/quiz/exam/hooks/use-exam-diagnosis.ts`에서 `ExamDiagEntry` 타입을 찾아서 확장.

기존 (예시):
```typescript
export type ExamDiagEntry =
  | { kind: 'problem-card'; ... }
  | { kind: 'bubble'; ... }
  | { kind: 'method-selector'; ... }
  | { kind: 'flow-node'; ... };
```

확장:
```typescript
import type { MilestoneFraction } from '@/features/quiz/exam/diagnosis-milestone';

export type ExamDiagEntry =
  | { kind: 'problem-card'; ... } // 기존 그대로
  | { kind: 'bubble'; ... }
  | { kind: 'method-selector'; ... }
  | { kind: 'flow-node'; ... }
  | {
      kind: 'mini-card';
      id: string;
      patternName: string;
      patternDescription: string;
      noteCount: number;
      totalNotes: number;
      problemNumber: number;
      isLastProblem: boolean;
    }
  | {
      kind: 'milestone-banner';
      id: string;
      fraction: MilestoneFraction;
      noteCount: number;
      totalNotes: number;
    };
```

- [ ] **Step 2: 타입체크**

```bash
npx tsc --noEmit
```

Expected: PASS — 타입만 확장한 거라 사용처는 아직 영향 없음 (exhaustive switch가 있다면 그 부분에서 에러 날 수 있는데, 일단 미사용 변형 추가).

만약 exhaustive switch에서 에러가 난다면 `default: return null;` 또는 적절한 fallthrough 추가.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "feat(quiz/exam): add mini-card and milestone-banner entry variants"
```

---

### Task 8: useExamDiagnosis에 미니 카드 표시 + onComplete 사용자 트리거 전환

**핵심 변경:** 기존엔 `useEffect`에서 final 노드 도달 → 3초 후 자동 `onComplete()`. 이제는 → 미니 카드 또는 마일스톤 배너 entry를 entries에 추가하고, 사용자가 "다음 문제 →" 또는 "계속하기 →" 누를 때 `onComplete()` 호출.

**Files:**
- Modify: `features/quiz/exam/hooks/use-exam-diagnosis.ts`

- [ ] **Step 1: 의존성 import 추가**

파일 상단에:

```typescript
import {
  detectMilestoneReached,
  type MilestoneFraction,
} from '@/features/quiz/exam/diagnosis-milestone';
import {
  hasMilestoneShown,
  markMilestoneShown,
} from '@/features/quiz/exam/diagnosis-milestone-progress';
import { buildMiniCardText } from '@/features/quiz/exam/diagnosis-mini-card-text';
```

- [ ] **Step 2: 새 입력 props 받기 — totalNotes, currentNoteCount, isLastProblem, onPauseRequested**

훅의 입력에 추가:

```typescript
type UseExamDiagnosisInput = {
  // 기존 필드들...
  totalNotes: number; // 전체 오답 수 (점 게이지 total)
  currentNoteCountBeforeThis: number; // 이번 진단 완료 직전까지의 노트 수
  isLastProblem: boolean; // 진단 큐의 마지막 문제 여부
  onPauseRequested: () => void; // 잠시 쉬기 핸들러
};
```

- [ ] **Step 3: final 노드 도달 시 동작 변경**

기존 로직 (line 273-328 근처):

```typescript
useEffect(() => {
  if (node?.kind !== 'final') return;
  // 저장 + 3초 후 onComplete() 자동 호출
}, [...]);
```

새 로직:

```typescript
useEffect(() => {
  if (node?.kind !== 'final') return;
  if (hasAdvancedRef.current) return;

  setIsDone(true);
  logDiagnosisCompleted();
  setIsSaving(true);

  const noteCountAfterThis = currentNoteCountBeforeThis + 1;
  const milestoneFraction = detectMilestoneReached({
    totalWrong: totalNotes,
    currentNoteCount: noteCountAfterThis,
  });

  void Promise.all([
    markProblemDiagnosed({ examId, attemptId, attemptDateISO }, problemNumber, weaknessId),
    recordAttempt(/* 기존 인자 */),
  ])
    .then(async () => {
      setIsSaving(false);

      // 마일스톤 도달 체크 (이미 본 적 없으면 배너, 본 적 있으면 미니 카드)
      let shouldShowMilestone = false;
      if (milestoneFraction !== null) {
        const seen = await hasMilestoneShown(
          { examId, attemptId, attemptDateISO },
          milestoneFraction,
        );
        if (!seen) {
          shouldShowMilestone = true;
          await markMilestoneShown({ examId, attemptId, attemptDateISO }, milestoneFraction);
        }
      }

      if (shouldShowMilestone && milestoneFraction !== null) {
        appendMilestoneBanner(milestoneFraction, noteCountAfterThis);
      } else {
        appendMiniCard(noteCountAfterThis);
      }
    })
    .catch((err) => {
      setIsSaving(false);
      // 저장 실패해도 미니 카드는 띄움 (UX 우선). 다음 진입에 재시도 (기존 정책)
      appendMiniCard(noteCountAfterThis);
    });
}, [node, ...]);
```

`appendMiniCard` 헬퍼:

```typescript
const appendMiniCard = useCallback(
  (noteCount: number) => {
    const lastNodeText = extractLastMeaningfulNodeText(draftRef.current);
    const { patternName, patternDescription } = buildMiniCardText({
      methodLabel: selectedMethodLabelRef.current ?? null,
      lastNodeText,
    });
    freezeAndAppend({
      kind: 'mini-card',
      id: `mini-card-${problemNumber}`,
      patternName,
      patternDescription,
      noteCount,
      totalNotes,
      problemNumber,
      isLastProblem,
    });
  },
  [problemNumber, totalNotes, isLastProblem],
);

const appendMilestoneBanner = useCallback(
  (fraction: MilestoneFraction, noteCount: number) => {
    freezeAndAppend({
      kind: 'milestone-banner',
      id: `milestone-${fraction}-${problemNumber}`,
      fraction,
      noteCount,
      totalNotes,
    });
  },
  [problemNumber, totalNotes],
);
```

`extractLastMeaningfulNodeText` 헬퍼 (같은 파일 내):

```typescript
function extractLastMeaningfulNodeText(draft: DiagnosisFlowDraft | null): string | null {
  if (!draft) return null;
  // draft.history (있다면) 또는 visited nodes에서 final 직전의 explain/check 노드의 message/text 반환
  const meaningful = [...(draft.visitedNodes ?? [])]
    .reverse()
    .find((n) => n.kind === 'check' || n.kind === 'explain');
  return meaningful?.message ?? meaningful?.text ?? null;
}
```

(실제 draft 구조는 `diagnosis-flow-engine.ts` 확인 후 정확히 매핑)

- [ ] **Step 4: onComplete를 사용자 액션에 연결**

훅의 return에 두 개 핸들러 노출:

```typescript
return {
  entries,
  isDone,
  isSaving,
  // 신규
  onPause: () => onPauseRequested(),
  onAdvance: () => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    onComplete();
  },
};
```

- [ ] **Step 5: 타입체크**

```bash
npx tsc --noEmit
```

Expected: PASS — `exam-diagnosis-screen.tsx`에서 새 props를 안 넘겨주면 에러. 다음 Task에서 수정.

만약 너무 많이 깨지면 그건 정상. 다음 task에서 호출처를 수정할 거니까.

- [ ] **Step 6: 임시 커밋 (다음 task와 묶을 거니 WIP)**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts
git commit -m "wip(quiz/exam): replace auto-onComplete with mini-card user-driven flow"
```

---

### Task 9: ExamDiagnosisPage가 미니 카드 + 마일스톤 entry 렌더링

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-screen.tsx`

- [ ] **Step 1: import 추가**

```typescript
import { DiagnosisMiniCard } from '@/features/quiz/exam/components/diagnosis-mini-card';
import { DiagnosisMilestoneBanner } from '@/features/quiz/exam/components/diagnosis-milestone-banner';
```

- [ ] **Step 2: EntryRenderer switch에 새 case 추가**

기존 EntryRenderer (대략 line 156-209):

```typescript
function EntryRenderer({ entry, ... }) {
  switch (entry.kind) {
    case 'problem-card': ...
    case 'bubble': ...
    case 'method-selector': ...
    case 'flow-node': ...
  }
}
```

새 case:

```typescript
case 'mini-card':
  return (
    <DiagnosisMiniCard
      problemNumber={entry.problemNumber}
      patternName={entry.patternName}
      patternDescription={entry.patternDescription}
      noteCount={entry.noteCount}
      totalNotes={entry.totalNotes}
      onPause={hook.onPause}
      onNext={hook.onAdvance}
      isLastProblem={entry.isLastProblem}
    />
  );
case 'milestone-banner':
  return (
    <DiagnosisMilestoneBanner
      fraction={entry.fraction}
      noteCount={entry.noteCount}
      totalNotes={entry.totalNotes}
      onPause={hook.onPause}
      onContinue={hook.onAdvance}
    />
  );
```

- [ ] **Step 3: ExamDiagnosisPage가 새 props를 받아서 hook에 전달**

`ExamDiagnosisPageProps`에 추가:

```typescript
type ExamDiagnosisPageProps = {
  // 기존
  totalNotes: number;
  currentNoteCountBeforeThis: number;
  isLastProblem: boolean;
  onPauseRequested: () => void;
};
```

훅 호출 시 전달:

```typescript
const hook = useExamDiagnosis({
  // 기존
  totalNotes,
  currentNoteCountBeforeThis,
  isLastProblem,
  onPauseRequested,
});
```

- [ ] **Step 4: 타입체크**

```bash
npx tsc --noEmit
```

Expected: 호출처(`exam-diagnosis-session-screen.tsx`)에서 새 props 미전달 에러. 다음 task에서 처리.

---

### Task 10: ExamDiagnosisSessionScreen가 새 props 전달 + 잠시 쉬기 핸들러

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`

- [ ] **Step 1: 잠시 쉬기 핸들러 추가**

기존 `handlePageComplete` 옆에:

```typescript
const handlePauseRequested = useCallback(() => {
  // 진행 상태는 이미 markProblemDiagnosed로 저장됨. 그냥 홈으로 이동
  router.replace('/(tabs)/quiz');
}, [router]);
```

- [ ] **Step 2: 각 ExamDiagnosisPage 렌더링에 props 전달**

phone (FlatList) 모드와 tablet 모드 둘 다 ExamDiagnosisPage 호출 부분에:

```typescript
const totalNotes = session.problemNumbers.length; // 또는 wrongNumbers.length
const currentNoteCountBeforeThis = session.diagnosedIndices.length; // 진단 완료 수
const isLastProblem = session.getNextProblemNumber(activeIndex) === null;

<ExamDiagnosisPage
  // 기존
  totalNotes={totalNotes}
  currentNoteCountBeforeThis={
    session.diagnosedIndices.includes(index)
      ? session.diagnosedIndices.indexOf(index)
      : session.diagnosedIndices.length
  }
  isLastProblem={isLastProblem}
  onPauseRequested={handlePauseRequested}
/>
```

(주의: `currentNoteCountBeforeThis`는 "이번 진단을 완료하기 전까지의 노트 수"라는 의미. 이 문제 진단이 완료되면 +1이 되어 현재 노트 수가 된다.)

- [ ] **Step 3: 타입체크 + lint**

```bash
npx tsc --noEmit
```

Expected: PASS.

```bash
npm run lint
```

Expected: PASS (또는 무관한 기존 경고만).

- [ ] **Step 4: 커밋 (Task 8, 9와 묶기)**

```bash
git add features/quiz/exam/hooks/use-exam-diagnosis.ts \
  features/quiz/exam/screens/exam-diagnosis-screen.tsx \
  features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
git commit -m "feat(quiz/exam): integrate mini-card and milestone-banner into diagnosis flow

- Replace 3-second auto-advance with user-driven '다음 문제 →' button
- Append mini-card or milestone-banner entry after final node + save
- '잠시 쉬기' navigates back to home; AsyncStorage state already persisted"
```

---

## Phase 4: 채점 결과 화면 카피 변경

### Task 11: ExamResultScreenView 카피 업데이트

**Files:**
- Modify: `features/quiz/exam/screens/exam-result-screen-view.tsx`

- [ ] **Step 1: 현재 CTA 문구 위치 찾기**

```bash
grep -n "약점 분석\|분석 시작" features/quiz/exam/screens/exam-result-screen-view.tsx
```

- [ ] **Step 2: 카피 수정**

CTA 위에 microcopy 한 줄 추가, CTA 아래에 정직한 안내:

기존:
```tsx
<Pressable style={styles.cta} onPress={onStartDiagnosis}>
  <Text>약점 분석 시작하기</Text>
</Pressable>
```

변경:
```tsx
<Text style={styles.frameMicrocopy}>
  틀린 문제를 하나씩 분석하면서{`\n`}
  <Text style={styles.frameMicrocopyEm}>학습 노트를 모아보세요</Text>
</Text>
<Pressable style={styles.cta} onPress={onStartDiagnosis}>
  <Text style={styles.ctaText}>약점 분석 시작하기</Text>
</Pressable>
<Text style={styles.bottomNote}>
  {wrongCount}장 노트 모두 모으면 종합 리포트가 열려요
</Text>
```

스타일 추가:

```typescript
frameMicrocopy: {
  fontFamily: FontFamilies.regular,
  fontSize: 12,
  color: BrandColors.mutedText,
  textAlign: 'center',
  lineHeight: 18,
  marginBottom: BrandSpacing.sm,
},
frameMicrocopyEm: {
  fontFamily: FontFamilies.bold,
  color: BrandColors.text,
},
bottomNote: {
  fontFamily: FontFamilies.regular,
  fontSize: 10,
  color: BrandColors.mutedText,
  textAlign: 'center',
  marginTop: 6,
},
```

`wrongCount`는 기존에 props로 받거나 계산되어 있는 값을 사용 (없으면 `tiles.filter(t => t.status === 'wrong').length`).

- [ ] **Step 3: 타입체크**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/exam/screens/exam-result-screen-view.tsx
git commit -m "feat(quiz/exam): update result screen copy to '학습 노트를 모아보세요' frame"
```

---

## Phase 5: 종합 리포트 클라이맥스 배너

### Task 12: QuizResultReportView 시작 부분에 클라이맥스 배너 + 점 게이지

**Files:**
- Modify: `features/quiz/components/quiz-result-report-view.tsx`

- [ ] **Step 1: 모의고사 기반 진입 여부 판별**

이 화면은 `source=exam`일 때 모의고사 진단의 종합 리포트로 사용됨. exam source일 때만 클라이맥스 배너 노출.

기존 props에 `source` 또는 `totalNotes`가 있는지 확인. 없으면 추가:

```typescript
type QuizResultReportViewProps = {
  // 기존
  source?: 'exam' | 'diagnostic';
  totalNotes?: number; // exam source일 때만 사용
};
```

- [ ] **Step 2: import 추가**

```typescript
import { NoteCollectionBar } from '@/features/quiz/exam/components/note-collection-bar';
```

- [ ] **Step 3: 컨텐츠 시작 부분에 배너 렌더링**

```tsx
{source === 'exam' && totalNotes ? (
  <View style={styles.climaxBanner}>
    <Text style={styles.climaxEmoji}>🎉</Text>
    <Text style={styles.climaxTitle}>{totalNotes}장 노트 모두 수집!</Text>
    <Text style={styles.climaxSub}>전체 분석 완료 · 약점 {topWeaknesses.length}개 발견</Text>
  </View>
) : null}

{source === 'exam' && totalNotes ? (
  <NoteCollectionBar
    current={totalNotes}
    total={totalNotes}
    variant="full"
    showRemainingHint={false}
  />
) : null}

{/* 기존 1위/2위/3위 카드들 */}
```

스타일 추가:
```typescript
climaxBanner: {
  backgroundColor: '#C8EAC8',
  borderColor: '#2A5C3855',
  borderWidth: 1.5,
  borderRadius: BrandRadius.lg,
  padding: BrandSpacing.md,
  alignItems: 'center',
  marginBottom: BrandSpacing.sm,
},
climaxEmoji: {
  fontSize: 32,
  marginBottom: 4,
},
climaxTitle: {
  fontFamily: FontFamilies.extrabold,
  fontSize: 16,
  color: '#1C2C19',
  marginBottom: 2,
},
climaxSub: {
  fontFamily: FontFamilies.regular,
  fontSize: 11,
  color: '#4A4540',
},
```

- [ ] **Step 4: 호출처에서 totalNotes 전달**

`source=exam` 진입 경로 (`exam-result-screen.tsx` → `quiz-result-screen.tsx` → 이 view)에서 `totalNotes` 전달.

```bash
grep -rn "QuizResultReportView" features/quiz --include="*.tsx" | head -5
```

각 호출처에서 `totalNotes={wrongAnswerCount}` 추가.

- [ ] **Step 5: 타입체크**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/quiz-result-report-view.tsx [기타 호출처 파일]
git commit -m "feat(quiz): add climax banner + completed note collection to exam report"
```

---

## Phase 6: 홈 모드 분기 (모의고사 분석 진행 중)

### Task 13: 모의고사 분석 진행 중 감지 유틸 (TDD)

**왜:** 홈에서 "지금 분석 진행 중인 모의고사 어템트가 있나?"를 알아야 한다. 이는 (a) 가장 최근 어템트 ID, (b) 그 어템트의 오답 수, (c) 진단 완료 수를 비교해서 도출.

**Files:**
- Create: `features/quiz/exam/exam-analysis-in-progress.ts`
- Test: `features/quiz/exam/exam-analysis-in-progress.test.ts`

- [ ] **Step 1: 데이터 형태 명확화 — 호출처가 무엇을 넘겨주나?**

`use-quiz-hub-screen.ts`에서 이미 가지고 있을 가능성이 큼:
- `latestExamAttempt`: { examId, attemptId, attemptDateISO, wrongProblemNumbers: number[] }
- `getDiagnosisProgress(scope)`: { [problemNumber]: weaknessId }

만약 위 정보가 hub screen hook에 없다면, 별도 데이터 로드 로직이 필요. 우선 순수 함수만 정의하고, hub hook 통합은 다음 task에서.

- [ ] **Step 2: 실패하는 테스트 작성**

`features/quiz/exam/exam-analysis-in-progress.test.ts`:

```typescript
import {
  computeAnalysisInProgressState,
  type AnalysisInProgressInput,
} from '@/features/quiz/exam/exam-analysis-in-progress';

describe('computeAnalysisInProgressState', () => {
  it('어템트 없으면 inactive', () => {
    expect(computeAnalysisInProgressState({ latestAttempt: null, diagnosedProblems: {} })).toEqual({
      isInProgress: false,
    });
  });

  it('오답 0개면 inactive', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: { examId: 'e1', attemptId: 'a1', attemptDateISO: '2026-04-26', wrongProblemNumbers: [] },
        diagnosedProblems: {},
      }),
    ).toEqual({ isInProgress: false });
  });

  it('진단 0/N: 진행 중', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: {
          examId: 'e1',
          attemptId: 'a1',
          attemptDateISO: '2026-04-26',
          wrongProblemNumbers: [1, 2, 3],
        },
        diagnosedProblems: {},
      }),
    ).toEqual({
      isInProgress: true,
      examId: 'e1',
      attemptId: 'a1',
      noteCount: 0,
      totalNotes: 3,
      diagnosedNotes: [],
    });
  });

  it('진단 2/3: 진행 중, noteCount 2', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: {
          examId: 'e1',
          attemptId: 'a1',
          attemptDateISO: '2026-04-26',
          wrongProblemNumbers: [1, 2, 3],
        },
        diagnosedProblems: { 1: 'w_basic', 2: 'w_advanced' },
      }),
    ).toEqual({
      isInProgress: true,
      examId: 'e1',
      attemptId: 'a1',
      noteCount: 2,
      totalNotes: 3,
      diagnosedNotes: [
        { problemNumber: 1, weaknessId: 'w_basic' },
        { problemNumber: 2, weaknessId: 'w_advanced' },
      ],
    });
  });

  it('진단 3/3 (완료): inactive (종합 리포트가 노출되어야 함)', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: {
          examId: 'e1',
          attemptId: 'a1',
          attemptDateISO: '2026-04-26',
          wrongProblemNumbers: [1, 2, 3],
        },
        diagnosedProblems: { 1: 'w1', 2: 'w2', 3: 'w3' },
      }),
    ).toEqual({ isInProgress: false });
  });

  it('diagnosedProblems에 wrongProblemNumbers 외 키가 있어도 무시 (재시도 케이스)', () => {
    expect(
      computeAnalysisInProgressState({
        latestAttempt: {
          examId: 'e1',
          attemptId: 'a1',
          attemptDateISO: '2026-04-26',
          wrongProblemNumbers: [1, 2],
        },
        diagnosedProblems: { 1: 'w1', 99: 'w_stale' },
      }),
    ).toEqual({
      isInProgress: true,
      examId: 'e1',
      attemptId: 'a1',
      noteCount: 1,
      totalNotes: 2,
      diagnosedNotes: [{ problemNumber: 1, weaknessId: 'w1' }],
    });
  });
});
```

- [ ] **Step 3: 테스트 실행해서 실패 확인**

```bash
npx jest features/quiz/exam/exam-analysis-in-progress.test.ts
```

Expected: FAIL.

- [ ] **Step 4: 구현**

`features/quiz/exam/exam-analysis-in-progress.ts`:

```typescript
import type { WeaknessId } from '@/features/learner/types'; // 또는 실제 정의 위치

export type LatestExamAttemptSummary = {
  examId: string;
  attemptId: string;
  attemptDateISO: string;
  wrongProblemNumbers: number[];
};

export type AnalysisInProgressInput = {
  latestAttempt: LatestExamAttemptSummary | null;
  diagnosedProblems: Record<number, WeaknessId>;
};

export type DiagnosedNote = {
  problemNumber: number;
  weaknessId: WeaknessId;
};

export type AnalysisInProgressState =
  | { isInProgress: false }
  | {
      isInProgress: true;
      examId: string;
      attemptId: string;
      noteCount: number;
      totalNotes: number;
      diagnosedNotes: DiagnosedNote[];
    };

export function computeAnalysisInProgressState(
  input: AnalysisInProgressInput,
): AnalysisInProgressState {
  const { latestAttempt, diagnosedProblems } = input;

  if (!latestAttempt || latestAttempt.wrongProblemNumbers.length === 0) {
    return { isInProgress: false };
  }

  const totalNotes = latestAttempt.wrongProblemNumbers.length;
  const diagnosedNotes: DiagnosedNote[] = latestAttempt.wrongProblemNumbers
    .filter((n) => diagnosedProblems[n] !== undefined)
    .map((n) => ({ problemNumber: n, weaknessId: diagnosedProblems[n] }));

  if (diagnosedNotes.length >= totalNotes) {
    return { isInProgress: false };
  }

  return {
    isInProgress: true,
    examId: latestAttempt.examId,
    attemptId: latestAttempt.attemptId,
    noteCount: diagnosedNotes.length,
    totalNotes,
    diagnosedNotes,
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx jest features/quiz/exam/exam-analysis-in-progress.test.ts
```

Expected: PASS — 6개 케이스.

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/exam/exam-analysis-in-progress.ts features/quiz/exam/exam-analysis-in-progress.test.ts
git commit -m "feat(quiz/exam): add analysis-in-progress state computer"
```

---

### Task 14: ExamAnalysisResumeCard 컴포넌트 (홈 카드)

**Files:**
- Create: `features/quiz/exam/components/exam-analysis-resume-card.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { NoteCollectionBar } from '@/features/quiz/exam/components/note-collection-bar';

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
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <Text style={styles.kicker}>📔 모의고사 분석 진행 중</Text>
      <Text style={styles.title}>{examTitle}</Text>
      <Text style={styles.sub}>지난 분석을 이어서 해보세요</Text>

      <View style={styles.collection}>
        <NoteCollectionBar
          current={noteCount}
          total={totalNotes}
          variant="compact"
          showRemainingHint={false}
        />
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>이어서 분석하기 →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#C8EAC8',
    borderColor: '#2A5C3833',
    borderWidth: 1,
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.md,
  },
  cardPressed: {
    opacity: 0.85,
  },
  kicker: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#2A5C38',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 16,
    color: '#1C2C19',
    marginBottom: 2,
  },
  sub: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: '#2A5C38',
    marginBottom: BrandSpacing.sm,
  },
  collection: {
    marginBottom: BrandSpacing.sm,
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
    color: '#F8F3E8',
  },
});
```

- [ ] **Step 2: 타입체크 + 커밋**

```bash
npx tsc --noEmit
```

```bash
git add features/quiz/exam/components/exam-analysis-resume-card.tsx
git commit -m "feat(quiz/exam): add ExamAnalysisResumeCard for home"
```

---

### Task 15: CollectedNotesList 컴포넌트 (홈 모은 노트 리스트)

**Files:**
- Create: `features/quiz/exam/components/collected-notes-list.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
import { StyleSheet, Text, View } from 'react-native';
import type { DiagnosedNote } from '@/features/quiz/exam/exam-analysis-in-progress';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type CollectedNotesListProps = {
  notes: DiagnosedNote[];
  resolveLabel: (weaknessId: string) => string; // diagnosisMap에서 라벨 가져오는 함수
};

export function CollectedNotesList({ notes, resolveLabel }: CollectedNotesListProps) {
  if (notes.length === 0) {
    return null;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.title}>📚 모은 노트</Text>
      {notes.map((note, idx) => (
        <View
          key={`${note.problemNumber}-${note.weaknessId}`}
          style={[styles.row, idx === notes.length - 1 && styles.rowLast]}
        >
          <Text style={styles.num}>{note.problemNumber}번 문제</Text>
          <Text style={styles.label}>{resolveLabel(note.weaknessId)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.card,
    borderColor: '#4A45401F',
    borderWidth: 1,
    borderRadius: BrandRadius.md,
    padding: BrandSpacing.sm,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.mutedText,
    marginBottom: BrandSpacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  num: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: BrandColors.text,
  },
  label: {
    fontFamily: FontFamilies.regular,
    fontSize: 10,
    color: BrandColors.mutedText,
  },
});
```

- [ ] **Step 2: 타입체크 + 커밋**

```bash
npx tsc --noEmit
```

```bash
git add features/quiz/exam/components/collected-notes-list.tsx
git commit -m "feat(quiz/exam): add CollectedNotesList component for home"
```

---

### Task 16: useQuizHubScreen에 분석 진행 중 상태 통합

**Files:**
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts`

- [ ] **Step 1: 최근 어템트 + 진단 진행 상태 로드**

훅 안에서 (기존 `useEffect` 또는 새로):

```typescript
import { computeAnalysisInProgressState, type AnalysisInProgressState } from '@/features/quiz/exam/exam-analysis-in-progress';
import { getDiagnosisProgress } from '@/features/quiz/exam/exam-diagnosis-progress';

const [analysisState, setAnalysisState] = useState<AnalysisInProgressState>({ isInProgress: false });

useEffect(() => {
  const latestAttempt = getLatestExamAttemptSummary(/* 기존 어디선가 가져오는 데이터 */);
  if (!latestAttempt) {
    setAnalysisState({ isInProgress: false });
    return;
  }
  let cancelled = false;
  void getDiagnosisProgress({
    examId: latestAttempt.examId,
    attemptId: latestAttempt.attemptId,
    attemptDateISO: latestAttempt.attemptDateISO,
  }).then((diagnosed) => {
    if (cancelled) return;
    setAnalysisState(
      computeAnalysisInProgressState({ latestAttempt, diagnosedProblems: diagnosed }),
    );
  });
  return () => {
    cancelled = true;
  };
}, [/* dep: 어템트 변경 신호 */]);
```

`getLatestExamAttemptSummary`는 기존 home learning state에서 추출하거나 신규 헬퍼 작성 (필요 시 별도 파일).

- [ ] **Step 2: show 플래그 추가**

```typescript
const isAnalysisInProgress = analysisState.isInProgress;

// 기존 플래그 조정
const showJourneyHero = isJourneyActive && !isAnalysisInProgress;
const showJourneyBoard = isJourneyActive && !isAnalysisInProgress;
const showNoReviewDayCard =
  isGraduated &&
  !!homeState?.nextReviewTask &&
  homeState.todayReviewCount === 0 &&
  !isAnalysisInProgress; // 모의고사 분석 진행 중에는 NoReviewDay 숨김
const showWeaknessSection = isGraduated; // 그대로
const showReviewHomeCard = isGraduated && !!homeState?.nextReviewTask && homeState.todayReviewCount > 0; // 그대로 (단, 순서가 바뀜)
const showAnalysisResumeCard = isAnalysisInProgress;
const showCollectedNotes = isAnalysisInProgress;

// 모의고사 시작하기 등 다른 카드도 isAnalysisInProgress일 때 숨김 처리 (코드에서 모의고사 시작 카드의 위치 찾아서)
```

- [ ] **Step 3: return에 새 필드 추가**

```typescript
return {
  // 기존
  showAnalysisResumeCard,
  showCollectedNotes,
  analysisState, // ExamAnalysisResumeCard와 CollectedNotesList에 전달용
};
```

- [ ] **Step 4: 타입체크**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: 커밋 (다음 task와 묶을 거니 wip)**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "wip(quiz): expose analysis-in-progress state from hub hook"
```

---

### Task 17: QuizHubScreenView 렌더링 분기

**Files:**
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx`

- [ ] **Step 1: import 추가**

```typescript
import { ExamAnalysisResumeCard } from '@/features/quiz/exam/components/exam-analysis-resume-card';
import { CollectedNotesList } from '@/features/quiz/exam/components/collected-notes-list';
import { resolveWeaknessLabel } from '@/data/diagnosisMap'; // 또는 실제 위치
```

- [ ] **Step 2: 렌더링 순서 조정**

기존 (대략):
```tsx
{showBrandHeader ? <BrandHeader compact /> : null}
{showJourneyHero ? <JourneyScreenHero /> : null}
{showReviewHomeCard ? <ReviewHomeCard /> : null}
{showNoReviewDayCard ? <NoReviewDayCard /> : null}
{showJourneyBoard ? <JourneyBoard /> : null}
{showWeaknessSection ? <HomeWeaknessSection /> : null}
```

변경:
```tsx
{showBrandHeader ? <BrandHeader compact /> : null}

{/* 평소 모드: 기존 순서대로 */}
{!showAnalysisResumeCard ? (
  <>
    {showJourneyHero ? <JourneyScreenHero /> : null}
    {showReviewHomeCard ? <ReviewHomeCard task={...} onPress={...} /> : null}
    {showNoReviewDayCard ? <NoReviewDayCard /> : null}
    {showJourneyBoard ? <JourneyBoard /> : null}
    {showWeaknessSection ? <HomeWeaknessSection /> : null}
  </>
) : (
  /* 모의고사 분석 진행 중 모드 */
  <>
    {/* 1. 복습 있는 날엔 복습이 최상단 */}
    {showReviewHomeCard ? <ReviewHomeCard task={...} onPress={...} /> : null}

    {/* 2. 분석 진행 중 카드 (메인) */}
    {analysisState.isInProgress ? (
      <ExamAnalysisResumeCard
        examTitle={getExamTitle(analysisState.examId)}
        noteCount={analysisState.noteCount}
        totalNotes={analysisState.totalNotes}
        onPress={() => onPressResumeAnalysis(analysisState)}
      />
    ) : null}

    {/* 3. 모은 노트 */}
    {analysisState.isInProgress ? (
      <CollectedNotesList notes={analysisState.diagnosedNotes} resolveLabel={resolveWeaknessLabel} />
    ) : null}

    {/* 4. 지난 약점 데이터 (모순 없음) */}
    {showWeaknessSection ? <HomeWeaknessSection /> : null}
  </>
)}
```

`getExamTitle`과 `onPressResumeAnalysis`는 hub hook에서 추가로 노출 (Task 16에서 이미 했거나 여기서 추가).

- [ ] **Step 3: 타입체크 + lint**

```bash
npx tsc --noEmit
npm run lint
```

Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/hooks/use-quiz-hub-screen.ts features/quiz/components/quiz-hub-screen-view.tsx
git commit -m "feat(quiz): split home into normal mode and exam-analysis-in-progress mode

- In-progress mode: ReviewHomeCard at top, AnalysisResumeCard, CollectedNotesList
- Hide JourneyBoard, JourneyScreenHero, NoReviewDayCard during analysis
- Keep HomeWeaknessSection (past data, no conflict)"
```

---

## Phase 7: 빌드 + 시뮬레이터 검증

### Task 18: Prebuild + iOS 시뮬레이터 실행

**왜:** Claude는 React Native 코드를 정적으로만 검증할 수 있다. UI가 실제로 작동하는지는 시뮬레이터에서 봐야 한다. 프로젝트 규칙(`CLAUDE.md` 3절)에 따라 패키지 변경이 없어도 변경 후엔 prebuild 후 iOS run 권장.

이번 작업은 **새 패키지 추가 없음**. 그래서 prebuild는 선택사항이지만, 화면 검증은 필수.

- [ ] **Step 1: 시작 알림**

```bash
npm run notify:start -- "diagnosis 미니 카드 + 노트 컬렉션 시뮬레이터 검증"
```

- [ ] **Step 2: 타입체크 + 린트 + 테스트 (출시 전 게이트)**

```bash
npx tsc --noEmit
```

Expected: PASS.

```bash
npm run lint
```

Expected: PASS (또는 무관한 기존 경고만).

```bash
npm run test
```

Expected: PASS — 신규 4개 테스트 파일 + 기존 테스트 모두 통과.

- [ ] **Step 3: 시뮬레이터 실행**

```bash
npx expo run:ios
```

Expected: 빌드 성공 후 시뮬레이터 부팅 및 앱 실행. 빌드 실패 시 에러 메시지 분석.

- [ ] **Step 4: 핵심 흐름 수동 테스트 — 골든 패스**

다음을 시뮬레이터에서 직접 확인:

1. **모의고사 풀이 → 채점 결과 화면**
   - "학습 노트를 모아보세요" 카피 확인
   - 하단 "N장 노트 모두 모으면 종합 리포트가 열려요" 확인
   - 거짓 약속 카피 ("3개만 해도..." 류) 없음 확인

2. **약점 분석 시작 → 진단 1개 완료 시점**
   - 미니 카드 등장 (3초 자동 진행 안 함)
   - "오답 패턴" 영역 텍스트 표시 확인
   - 노트 컬렉션 점 게이지 1장 채워짐
   - "다음 문제 →" 누르면 다음 진단으로 이동
   - "잠시 쉬기" 누르면 홈으로 이동

3. **마일스톤 (오답 ≥ 10 케이스)**
   - 33% 도달 시 "🌱 1/3 도달" 배너 등장
   - 67% 도달 시 "🌿 2/3 도달" 배너 등장
   - 동일 어템트 내 재진입해도 마일스톤 재노출 안 됨
   - 9개 이하 케이스에서는 마일스톤 안 뜸

4. **홈 — 모의고사 분석 진행 중 모드**
   - 진단 도중 홈 진입: JourneyBoard 등 평소 요소 숨김
   - 분석 진행 중 카드 노출 (그라디언트 그린)
   - 노트 점 게이지 미니 버전 표시
   - 모은 노트 리스트 표시
   - 복습 있는 날: ReviewHomeCard가 분석 카드 위
   - 복습 없는 날: NoReviewDayCard 안 보임, 분석 카드만

5. **15/15 완주 → 종합 리포트**
   - "🎉 N장 노트 모두 수집!" 클라이맥스 배너
   - 점 게이지 모두 채워짐
   - 1위/2위/3위 약점 카드 (이때 처음 등장)
   - "약점 기반 연습문제" CTA 작동

6. **엣지 케이스**
   - 오답 1~2개 케이스: 마일스톤 없이 미니 카드만, 종합 리포트 정상
   - 진단 도중 앱 종료 후 재진입: 점 게이지 카운트 복원
   - 같은 문제 재진단 시도: 기존 정책대로 안 됨

각 단계마다 스크린샷 또는 영상 캡처 권장.

- [ ] **Step 5: 발견된 이슈 수정 (반복 가능)**

이슈 발견 시:
- 이슈 → 코드 수정 → 추가 커밋 (Task 단위로 묶기)

이슈 없을 시 다음 단계.

- [ ] **Step 6: 종료 알림**

```bash
npm run notify:done -- "diagnosis 미니 카드 + 노트 컬렉션 + 마일스톤 + 홈 분기 시뮬레이터 검증 완료"
```

또는 실패 시:

```bash
npm run notify:fail -- "<실패 원인>"
```

---

## 자체 리뷰 체크리스트

작성자가 직접 확인:

**1. Spec 커버리지**
- 미니 카드 (Phase 2 Task 5, Phase 3 Task 8-10) ✓
- 노트 컬렉션 점 게이지 (Phase 2 Task 4) ✓
- 마일스톤 33%/67% + 임계점 ≥10 (Phase 1 Task 1, Phase 3 Task 8) ✓
- 마일스톤 어템트당 1회 (Phase 1 Task 2, Phase 3 Task 8) ✓
- 채점 결과 카피 변경 (Phase 4 Task 11) ✓
- 종합 리포트 클라이맥스 배너 (Phase 5 Task 12) ✓
- 홈 분기 — 평소 vs 분석 진행 중 (Phase 6 Task 16-17) ✓
- 복습 있는 날 ReviewHomeCard 최상단 (Phase 6 Task 17) ✓
- 복습 없는 날 NoReviewDayCard 숨김 (Phase 6 Task 16) ✓
- 모은 노트 리스트 (Phase 6 Task 15, 17) ✓
- 미니 카드 텍스트 fallback (Phase 1 Task 3) ✓

**2. Placeholder 스캔**
- "TBD", "TODO", "implement later" — 없음
- "적절한 에러 처리 추가" — 없음. AsyncStorage 실패는 명시적 try/catch
- "기타 호출처" — Task 12 Step 4에 있음. 실행자가 grep으로 찾도록 명시. 보강 필요 → Task 12에 grep 명령어 명시함

**3. 타입 일관성**
- `MilestoneFraction` Task 1에서 정의 → Task 2, 3, 6, 8, 12에서 사용. 이름 동일 ✓
- `MilestoneScope` Task 2에서 정의 → Task 8에서 사용. 이름 동일 ✓
- `AnalysisInProgressState` Task 13 → Task 16, 17. 이름 동일 ✓
- `DiagnosedNote` Task 13 → Task 15에서 사용. 이름 동일 ✓
- `NoteCollectionBarProps` Task 4 → Task 5, 6, 12, 14에서 사용. props 이름 동일 ✓

**4. 누락 가능 항목**
- `extractLastMeaningfulNodeText` 헬퍼는 `diagnosis-flow-engine.ts`의 `DiagnosisFlowDraft` 구조에 의존. Task 8 Step 3에서 실제 구조 확인 후 정확한 매핑 필요. 만약 visited nodes 또는 history 필드가 다른 이름이면 거기에 맞춤
- `getLatestExamAttemptSummary` Task 16에서 호출 — 실제로 hub hook 입력에서 어떻게 가져올지는 기존 코드 확인 필요. 없으면 별도 작은 task로 분리 가능
- 모의고사 시작하기 카드의 정확한 컴포넌트명/위치는 미지정. Task 16 Step 2의 "모의고사 시작 카드" 항목에서 grep 후 적절히 처리 필요

위 세 항목은 **실행 단계에서 정확히 확인 후 보완**. 실행자에게 명확한 grep 명령어로 시작점을 제공함.

---

## 실행 모드 선택

**계획서 저장 완료: `docs/superpowers/plans/2026-04-26-diagnosis-mini-card-and-note-collection-plan.md`**

두 가지 실행 옵션:

**1. Subagent-Driven (추천)** — task별 fresh subagent, 매 task 후 리뷰, 빠른 반복

**2. Inline Execution** — 이 세션에서 executing-plans 스킬로 실행, 체크포인트 단위 배치

어느 쪽으로 갈까요?
