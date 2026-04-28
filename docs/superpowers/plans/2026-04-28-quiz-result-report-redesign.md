# 약점 분석 리포트 리디자인 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `QuizResultReportView` 화면을 약점명 헤드라인 중심의 리디자인 코드로 교체하고, `QuizResultSummary`에 약점별 오답 횟수(`wrongByWeakness`)를 노출한다.

**Architecture:** 데이터 모델 한 필드 추가(optional, 기존 `weaknessScores` 그대로 노출) → 헤더/Hero/View 컴포넌트 3개 전면 교체 → 호출처 prop 정리 → 미사용 자산 삭제. 새 계산 로직 없음, 옛 attempt 데이터는 optional + fallback으로 호환.

**Tech Stack:** TypeScript, React Native (Expo SDK), Jest, expo-router, react-native-safe-area-context

**Spec:** `docs/superpowers/specs/2026-04-28-quiz-result-report-redesign-design.md`

---

## Task 1: `QuizResultSummary`에 `wrongByWeakness` 노출 (TDD)

**Files:**
- Modify: `features/quiz/types.ts:48-58`
- Modify: `features/quiz/engine.ts:40-65`
- Create: `features/quiz/engine.test.ts`

- [ ] **Step 1: failing 테스트 작성**

`features/quiz/engine.test.ts` 새 파일:

```typescript
import { buildQuizResult } from '@/features/quiz/engine';
import type { QuizAnswer } from '@/features/quiz/types';
import type { WeaknessId } from '@/data/diagnosisMap';

describe('buildQuizResult', () => {
  it('약점별 오답 횟수를 wrongByWeakness로 노출한다', () => {
    const answers: QuizAnswer[] = [
      { problemId: 'q1', selectedIndex: 0, isCorrect: false, weaknessId: 'formula_understanding' },
      { problemId: 'q2', selectedIndex: 1, isCorrect: false, weaknessId: 'formula_understanding' },
      { problemId: 'q3', selectedIndex: 0, isCorrect: false, weaknessId: 'calc_repeated_error' },
      { problemId: 'q4', selectedIndex: 0, isCorrect: true, weaknessId: 'formula_understanding' },
    ];
    const weaknessScores = {
      formula_understanding: 2,
      calc_repeated_error: 1,
    } as Record<WeaknessId, number>;

    const result = buildQuizResult(
      'attempt-1',
      '2026-04-28T00:00:00.000Z',
      '2026-04-28T00:10:00.000Z',
      answers,
      weaknessScores,
      4,
    );

    expect(result.wrongByWeakness).toBeDefined();
    expect(result.wrongByWeakness?.['formula_understanding']).toBe(2);
    expect(result.wrongByWeakness?.['calc_repeated_error']).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest features/quiz/engine.test.ts
```

Expected: FAIL — `wrongByWeakness` is undefined (필드 미존재)

- [ ] **Step 3: `types.ts`에 필드 추가**

`features/quiz/types.ts:48-58` 수정:

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
  wrongByWeakness?: Record<WeaknessId, number>;
};
```

- [ ] **Step 4: `engine.ts`에서 `wrongByWeakness` 노출**

`features/quiz/engine.ts:54-64` 수정 (return 객체에 한 줄 추가):

```typescript
  return {
    attemptId,
    startedAt,
    completedAt,
    total: totalQuestions,
    correct,
    wrong,
    accuracy,
    allCorrect,
    topWeaknesses,
    wrongByWeakness: weaknessScores,
  };
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx jest features/quiz/engine.test.ts
```

Expected: PASS

- [ ] **Step 6: 타입체크**

```bash
npm run typecheck
```

Expected: 에러 없음

- [ ] **Step 7: Commit**

```bash
git add features/quiz/types.ts features/quiz/engine.ts features/quiz/engine.test.ts
git commit -m "$(cat <<'EOF'
feat(quiz): expose wrongByWeakness on QuizResultSummary

약점 분석 리포트 화면이 약점별 오답 횟수를 표시할 수 있도록 weaknessScores를 결과에 노출.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `QuizResultReportHeader` 전면 교체

**Files:**
- Modify: `features/quiz/components/quiz-result-report-header.tsx` (전체 교체)

- [ ] **Step 1: 파일 전체 교체**

`features/quiz/components/quiz-result-report-header.tsx`:

```typescript
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { FontFamilies } from '@/constants/typography';

type QuizResultReportHeaderProps = {
  isCompactLayout: boolean;
};

export function QuizResultReportHeader(_props: QuizResultReportHeaderProps) {
  const router = useRouter();
  const today = new Date()
    .toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/\. /g, '·')
    .replace('.', '');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Text style={styles.date}>{today}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8F3E8',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#1A1916',
    fontWeight: '300',
    lineHeight: 32,
    marginTop: -2,
  },
  date: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: '#6B675E',
    fontVariant: ['tabular-nums'],
  },
});
```

**주의:** `isCompactLayout` prop은 유지하되 사용하지 않으므로 `_props`로 받아 lint 경고 회피. props signature는 호출처 변경 없이 유지.

- [ ] **Step 2: 타입체크**

```bash
npm run typecheck
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add features/quiz/components/quiz-result-report-header.tsx
git commit -m "$(cat <<'EOF'
refactor(quiz): redesign QuizResultReportHeader to back button + date

도장 프레임/타이틀 제거. 날짜는 첫 픽셀 위계에서 빠지고, 헤드라인은 Hero가 담당.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `QuizResultReportHero` 전면 교체

**Files:**
- Modify: `features/quiz/components/quiz-result-report-hero.tsx` (전체 교체)

- [ ] **Step 1: 파일 전체 교체**

`features/quiz/components/quiz-result-report-hero.tsx`:

```typescript
import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';

type QuizResultReportHeroProps = {
  isCompactLayout: boolean;
  primaryWeaknessId: string;
  missedCount: number;
};

export function QuizResultReportHero({
  isCompactLayout,
  primaryWeaknessId,
  missedCount,
}: QuizResultReportHeroProps) {
  const info = diagnosisMap[primaryWeaknessId as keyof typeof diagnosisMap];
  if (!info) return null;

  return (
    <View style={[styles.wrap, isCompactLayout && styles.wrapCompact]}>
      <View style={styles.tagRow}>
        <View style={styles.topicTag}>
          <Text style={styles.topicTagText}>{info.topicLabel}</Text>
        </View>
        <Text style={styles.eyebrow}>가장 큰 약점</Text>
      </View>

      <Text style={[styles.headline, isCompactLayout && styles.headlineCompact]}>
        {info.labelKo}에서{'\n'}
        <Text style={styles.missedHighlight}>{missedCount}번 모두 막혔어요.</Text>
      </Text>

      <Text style={[styles.desc, isCompactLayout && styles.descCompact]}>
        {info.desc}
      </Text>

      {info.tip ? (
        <View style={styles.tipBox}>
          <Text style={styles.tipLabel}>이렇게 고쳐봐요</Text>
          <Text style={styles.tipText}>{info.tip}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingBottom: 4,
  },
  wrapCompact: {
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicTag: {
    backgroundColor: '#E5EFE0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#87B084',
  },
  topicTagText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#355135',
  },
  eyebrow: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: '#6B675E',
  },
  headline: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: '#1A1916',
  },
  headlineCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  missedHighlight: {
    color: BrandColors.danger,
  },
  desc: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 22,
    color: '#3A3833',
  },
  descCompact: {
    fontSize: 13,
    lineHeight: 21,
  },
  tipBox: {
    backgroundColor: '#E5EFE0',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#87B084',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 4,
  },
  tipLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#355135',
  },
  tipText: {
    fontFamily: FontFamilies.semibold,
    fontSize: 13,
    lineHeight: 20,
    color: '#293B27',
  },
});
```

**핵심 변경:**
- `pointCount`/`message` props 제거 → `primaryWeaknessId`/`missedCount`로 교체
- 캐릭터 이미지 + 말풍선 제거
- 헤드라인: "{labelKo}에서 / {missedCount}번 모두 막혔어요." (정중체)
- 강조 색: `BrandColors.danger` (`#D64545`) — `#E85A4F` 대신
- "이렇게 고쳐봐요" tip 박스 (정중체)

- [ ] **Step 2: 타입체크**

```bash
npm run typecheck
```

Expected: 에러 없음 (이 시점에서는 `quiz-result-report-view.tsx`가 아직 옛 prop signature(`pointCount`)로 Hero를 호출하므로 에러가 날 수 있음 — 다음 Task에서 해결됨)

만약 에러가 나면 다음 Task와 함께 같은 commit으로 묶어도 무방함. 본 Task에서 에러가 안 나는 것이 이상적이지만, 호출처(view)와 호출체(hero) 시그니처가 함께 바뀌는 경우 한 번에 처리하는 것이 자연스럽다.

→ **Hero만 단독으로 commit하면 typecheck가 깨질 수 있으므로, Task 4 완료 후 함께 commit하기 위해 본 Task의 commit 단계는 건너뛴다.**

- [ ] **Step 3: Commit (skip — Task 4와 함께 commit)**

이 Task는 작업만 수행하고 commit은 Task 4 완료 후 진행.

---

## Task 4: `QuizResultReportView` 전면 교체

**Files:**
- Modify: `features/quiz/components/quiz-result-report-view.tsx` (전체 교체)

- [ ] **Step 1: 파일 전체 교체**

`features/quiz/components/quiz-result-report-view.tsx`:

```typescript
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandColors, BrandRadius } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import type { UseResultScreenResult } from '@/features/quiz/hooks/use-result-screen';

import { QuizResultReportCard } from './quiz-result-report-card';
import { QuizResultReportHeader } from './quiz-result-report-header';
import { QuizResultReportHero } from './quiz-result-report-hero';

type QuizResultReportViewProps = {
  onOpenWeaknessPractice: (weaknessId: string) => void;
  persistResult: () => Promise<void>;
  saveErrorMessage: string | null;
  saveState: UseResultScreenResult['saveState'];
  summary: NonNullable<UseResultScreenResult['liveSummary']>;
};

export function QuizResultReportView({
  onOpenWeaknessPractice,
  persistResult,
  saveErrorMessage,
  saveState,
  summary,
}: QuizResultReportViewProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 390;

  const primaryWeaknessId = summary.topWeaknesses[0];
  const primaryInfo = primaryWeaknessId
    ? diagnosisMap[primaryWeaknessId as keyof typeof diagnosisMap]
    : null;
  const missedCount = primaryWeaknessId
    ? summary.wrongByWeakness?.[primaryWeaknessId] ?? 1
    : 1;

  const secondaryWeaknesses = summary.topWeaknesses.slice(1, 3);
  const extraWeaknesses = summary.topWeaknesses.slice(3);

  return (
    <View style={styles.screen}>
      <QuizResultReportHeader isCompactLayout={isCompactLayout} />

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.container,
          isCompactLayout && styles.containerCompact,
        ]}>
        {saveState === 'saving' ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>학습 기록을 저장 중이에요</Text>
            <Text style={styles.statusBody}>
              결과, 반복 약점, 다음 복습 일정을 같이 정리하고 있습니다.
            </Text>
          </View>
        ) : null}

        {saveState === 'error' ? (
          <View style={[styles.statusCard, styles.errorCard]}>
            <Text style={styles.statusTitle}>결과 저장이 완료되지 않았어요</Text>
            <Text style={styles.statusBody}>
              {saveErrorMessage ?? '네트워크를 확인한 뒤 다시 시도해 주세요.'}
            </Text>
            <View style={styles.statusButtonWrap}>
              <BrandButton
                title="다시 저장하기"
                variant="danger"
                onPress={() => void persistResult()}
              />
            </View>
          </View>
        ) : null}

        {primaryWeaknessId ? (
          <>
            <QuizResultReportHero
              isCompactLayout={isCompactLayout}
              primaryWeaknessId={primaryWeaknessId}
              missedCount={missedCount}
            />
            <View style={styles.divider} />
          </>
        ) : null}

        {secondaryWeaknesses.length > 0 ? (
          <View style={styles.cardList}>
            {secondaryWeaknesses.map((weaknessId) => {
              const info = diagnosisMap[weaknessId as keyof typeof diagnosisMap];
              return (
                <QuizResultReportCard
                  key={weaknessId}
                  description={info.desc}
                  isCompactLayout={isCompactLayout}
                  tip={info.tip}
                  title={info.labelKo}
                />
              );
            })}
          </View>
        ) : null}

        {extraWeaknesses.length > 0 ? (
          <View style={styles.extraSection}>
            <Text style={styles.extraSectionLabel}>
              그 외 약점 {extraWeaknesses.length}개
            </Text>
            <View style={styles.compactList}>
              {extraWeaknesses.map((weaknessId) => {
                const info = diagnosisMap[weaknessId as keyof typeof diagnosisMap];
                return (
                  <View key={weaknessId} style={styles.compactRow}>
                    <View style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{info.topicLabel}</Text>
                    </View>
                    <Text style={styles.compactRowName} numberOfLines={1}>
                      {info.labelKo}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.ctaWrap}>
          <BrandButton
            title={
              primaryInfo
                ? `${primaryInfo.labelKo}부터 다시 풀기`
                : '약점 기반 연습문제 풀기'
            }
            variant="neutral"
            disabled={!primaryWeaknessId}
            onPress={() => {
              if (!primaryWeaknessId) return;
              onOpenWeaknessPractice(primaryWeaknessId);
            }}
            style={styles.primaryCta}
          />
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.replace('/(tabs)/quiz')}>
            <Text style={styles.ghostBtnText}>나중에 풀게요</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F3E8',
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  containerCompact: {
    paddingHorizontal: 14,
    gap: 12,
  },
  statusCard: {
    borderWidth: 1,
    borderColor: 'rgba(53, 72, 50, 0.16)',
    borderRadius: BrandRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  errorCard: {
    borderColor: '#D48B7A',
    backgroundColor: '#FFF7F4',
  },
  statusTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 22,
    color: BrandColors.text,
  },
  statusBody: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 20,
    color: '#4F5B52',
  },
  statusButtonWrap: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECE4CD',
  },
  cardList: {
    gap: 12,
  },
  extraSection: {
    gap: 8,
  },
  extraSectionLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B675E',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  compactList: {
    gap: 6,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.10)',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topicChip: {
    backgroundColor: 'rgba(74, 124, 89, 0.13)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  topicChipText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    lineHeight: 16,
    color: '#2A5C38',
  },
  compactRowName: {
    flex: 1,
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 18,
    color: '#1C2C19',
  },
  ctaWrap: {
    gap: 8,
    paddingTop: 6,
  },
  primaryCta: {
    minHeight: 52,
    borderRadius: 999,
    paddingVertical: 14,
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  ghostBtnText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: '#6B675E',
  },
});
```

**핵심 변경:**
- `totalNotes`, `source` props 제거
- `climaxBanner`, `NoteCollectionBar`, `summaryLine` 제거
- top1 약점 → Hero, top2~3 → 카드, top4+ → 컴팩트 리스트
- CTA: `${primaryInfo.labelKo}부터 다시 풀기` 동적 문구
- "나중에 풀게요" → `router.replace('/(tabs)/quiz')`로 홈 이동

- [ ] **Step 2: 타입체크 (Task 3 + Task 4 통합 검증)**

```bash
npm run typecheck
```

Expected: 에러 없음

이 시점에서 `quiz-result-screen-view.tsx`(호출처)가 아직 `totalNotes`/`source` prop을 넘기고 있어 타입 에러가 발생할 수 있다. → **Task 5에서 해결.** 본 Task의 commit도 Task 5 완료 후 통합 commit한다.

- [ ] **Step 3: Commit (skip — Task 5와 함께 commit)**

---

## Task 5: 호출처 정리 (`quiz-result-screen-view.tsx`)

**Files:**
- Modify: `features/quiz/components/quiz-result-screen-view.tsx:122-130`

- [ ] **Step 1: prop 전달 제거**

`features/quiz/components/quiz-result-screen-view.tsx:122-130` 수정:

변경 전:
```typescript
<QuizResultReportView
  onOpenWeaknessPractice={onOpenWeaknessPractice}
  persistResult={persistResult}
  saveErrorMessage={saveErrorMessage}
  saveState={saveState}
  summary={summary}
  source={source}
  totalNotes={source === 'exam' ? summary.wrong : undefined}
/>
```

변경 후:
```typescript
<QuizResultReportView
  onOpenWeaknessPractice={onOpenWeaknessPractice}
  persistResult={persistResult}
  saveErrorMessage={saveErrorMessage}
  saveState={saveState}
  summary={summary}
/>
```

- [ ] **Step 2: 타입체크**

```bash
npm run typecheck
```

Expected: 에러 없음 (Task 3, 4, 5가 모두 정합)

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: 에러/경고 없음

- [ ] **Step 4: 기존 테스트 통과 확인**

```bash
npx jest features/quiz
```

Expected: 모든 기존 quiz 테스트 PASS

- [ ] **Step 5: Commit (Task 3 + 4 + 5 통합)**

```bash
git add features/quiz/components/quiz-result-report-hero.tsx \
        features/quiz/components/quiz-result-report-view.tsx \
        features/quiz/components/quiz-result-screen-view.tsx
git commit -m "$(cat <<'EOF'
refactor(quiz): redesign QuizResultReport — weakness headline + tip box

- Hero: 약점명 + 오답 횟수 헤드라인, 정중체 카피, 캐릭터/말풍선 제거
- View: climaxBanner / NoteCollectionBar / summaryLine 제거, source/totalNotes prop 제거
- "나중에 풀게요" ghost 버튼 → 홈 탭 이동
- 호출처에서 더 이상 source/totalNotes 전달 안 함

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 미사용 자산 삭제

**Files:**
- Delete: `assets/quiz/result-report/Gemini_Generated_Image_84kar584kar584ka.png`

- [ ] **Step 1: 사용처 재확인**

```bash
grep -rn "Gemini_Generated_Image_84kar" /Users/baggiyun/dev/dasida-app --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v worktree | grep -v ".test."
```

Expected: 0건 (Task 3에서 import 제거됨)

만약 결과가 1건 이상이면 그 파일을 먼저 처리하고 본 Task로 돌아온다.

- [ ] **Step 2: 자산 삭제**

```bash
rm /Users/baggiyun/dev/dasida-app/assets/quiz/result-report/Gemini_Generated_Image_84kar584kar584ka.png
```

- [ ] **Step 3: 폴더 비었는지 확인 후 정리**

```bash
ls /Users/baggiyun/dev/dasida-app/assets/quiz/result-report/ 2>/dev/null
```

비어 있으면:
```bash
rmdir /Users/baggiyun/dev/dasida-app/assets/quiz/result-report
```

다른 파일이 있다면 폴더는 그대로 둔다.

- [ ] **Step 4: 빌드 영향 확인 (typecheck)**

```bash
npm run typecheck
```

Expected: 에러 없음

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(quiz): remove unused report teacher character asset

Hero에서 캐릭터 이미지 사용을 중단하면서 더 이상 참조되지 않는 자산 정리.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 시뮬레이터 검증 (수동)

**Files:** 없음 (검증만)

- [ ] **Step 1: prebuild 후 시뮬레이터 실행**

```bash
npx expo prebuild --clean
npx expo run:ios
```

CLAUDE.md 규칙: 패키지 변경은 없지만 컴포넌트 리팩터링이 광범위하므로 prebuild로 깨끗한 상태에서 검증.

- [ ] **Step 2: 검증 케이스 (시뮬레이터에서 직접 확인)**

각 케이스 동작 확인 후 체크:

- [ ] 모의고사 풀고 약점 분석 리포트 진입 — Hero 헤드라인이 첫 픽셀에 보임
- [ ] 약점이 3개 이상 — Hero + 약점 카드 2개 + (있다면) 컴팩트 리스트
- [ ] 약점이 1개 — Hero만, 카드/리스트 영역 안 보임
- [ ] 진단 모드 진입 시에도 동일하게 표시 (시험/진단 분기 통일 검증)
- [ ] 저장 중(saving) — 상태 카드가 Hero 위에 표시
- [ ] 저장 실패(error) — 상태 카드 + "다시 저장하기" 버튼 표시
- [ ] CTA 동적 문구 — "{약점명}부터 다시 풀기" 표시
- [ ] CTA 클릭 → 약점 연습 화면 이동
- [ ] "나중에 풀게요" 클릭 → 퀴즈 탭(홈)으로 이동
- [ ] 옛 attempt 데이터 (`wrongByWeakness` 없음)도 missedCount 1로 fallback 표시

- [ ] **Step 3: 종료 알림**

성공:
```bash
npm run notify:done -- "약점 분석 리포트 리디자인 — Hero 헤드라인 + 정중체 카피 + 자산 정리"
```

실패:
```bash
npm run notify:fail -- "<원인>"
```

---

## Task 8: 마무리 (Notion 업데이트 및 PROGRESS.md)

**Files:**
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: PROGRESS.md에 항목 추가**

`docs/PROGRESS.md` 상단에 항목 추가 (기존 형식 유지):

```markdown
- 2026-04-28: 약점 분석 리포트 리디자인 — `QuizResultReportView`/`Header`/`Hero` 전면 교체. 약점명 헤드라인 + 오답 횟수 강조, 캐릭터/말풍선/노트수집 UI 제거, 카피 정중체 통일, "나중에 풀게요" → 홈 탭 라우팅 추가. `QuizResultSummary.wrongByWeakness` optional 필드 노출.
```

(상단 형식이 다르면 기존 항목 형식에 맞춘다.)

- [ ] **Step 2: Commit**

```bash
git add docs/PROGRESS.md
git commit -m "$(cat <<'EOF'
docs(progress): 약점 분석 리포트 리디자인 기록

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Push**

```bash
git push origin main
npm run log:commit
```

(현재 브랜치가 main이 아니라면 해당 브랜치로 push.)

- [ ] **Step 4: Notion 업데이트**

CLAUDE.md 규칙에 따라 Notion "DASIDA 개발 기록" 페이지(ID: `35073f86-2604-81b5-a19a-c8e960af6c4f`)를 업데이트:

1. `notion-update-page`로 상태 → `구현완료`
2. 구현완료일 → 오늘 날짜
3. Spec 필드 → 최종 commit 해시 포함 GitHub permalink
4. Plan 필드 → plan 파일 GitHub permalink
5. 본문에 `## 완료 메모` 섹션 추가 (특이사항이 있는 경우)

---

## 검증 요약

전체 작업 완료 후 다음이 모두 PASS여야 한다:

- [ ] `npm run typecheck` — 에러 0건
- [ ] `npm run lint` — 에러/경고 0건
- [ ] `npx jest features/quiz` — 모든 테스트 PASS (engine.test.ts 신규 + 기존 테스트)
- [ ] 시뮬레이터에서 Task 7의 검증 케이스 모두 통과
- [ ] PROGRESS.md 업데이트 + Notion 페이지 구현완료 갱신
