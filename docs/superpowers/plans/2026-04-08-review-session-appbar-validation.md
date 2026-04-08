# Review Session: AppBar + 입력 Validation + AI 피드백 URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 세션 화면에 "오늘의 복습" AppBar와 뒤로가기 버튼을 추가하고, 선택 없이 "다음으로"를 누를 수 없도록 하며, AI 피드백 URL을 설정한다.

**Architecture:** View 기반 커스텀 AppBar를 `review-session-screen-view.tsx` 내부에 추가한다. Hook에서 `hasInput` 계산값을 반환해 View에서 버튼 비활성화 처리한다. `.env` / `.env.example` 에 Firebase Function URL을 추가한다.

**Tech Stack:** React Native, Expo Router, Playwright (e2e), SafeAreaView, IconSymbol

---

## File Map

| 파일 | 변경 |
|---|---|
| `.env` | `EXPO_PUBLIC_REVIEW_FEEDBACK_URL` 추가 |
| `.env.example` | `EXPO_PUBLIC_REVIEW_FEEDBACK_URL` 항목 추가 |
| `features/quiz/hooks/use-review-session-screen.ts` | `hasInput` 반환값 추가, dead code 제거 |
| `features/quiz/components/review-session-screen-view.tsx` | AppBar 추가, `hasInput` prop 사용해 버튼 비활성화, `paddingTop` insets 제거 |
| `e2e/review-session.spec.ts` | 테스트 3/4 수정 (버튼 비활성화 동작 반영, 타임아웃 조정), AppBar 검증 추가 |

---

## Task 1: .env 파일 URL 추가

**Files:**
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: `.env` 에 URL 추가**

  `.env` 파일 마지막에 한 줄 추가:
  ```
  EXPO_PUBLIC_REVIEW_FEEDBACK_URL=https://asia-northeast3-dasida-app.cloudfunctions.net/reviewFeedback
  ```

- [ ] **Step 2: `.env.example` 에 항목 추가**

  `.env.example` 파일 마지막에 한 줄 추가:
  ```
  EXPO_PUBLIC_REVIEW_FEEDBACK_URL=https://asia-northeast3-your-firebase-project.cloudfunctions.net/reviewFeedback
  ```

- [ ] **Step 3: 커밋**

  ```bash
  git add .env.example
  git commit -m "feat: add EXPO_PUBLIC_REVIEW_FEEDBACK_URL to env"
  ```
  (`.env` 는 `.gitignore` 대상이므로 커밋하지 않는다)

---

## Task 2: e2e 테스트 업데이트 (구현 전 작성 → 실패 확인)

**Files:**
- Modify: `e2e/review-session.spec.ts`

버튼 비활성화 동작으로 기존 테스트 3, 4가 깨진다. 구현 전에 테스트를 먼저 수정해 실패를 확인한다.

- [ ] **Step 1: 테스트 3 수정 — "입력 없이는 버튼 비활성" 으로 변경**

  기존 테스트 3 (`'3. 입력 없이 다음으로 → AI 호출 없이 다음 단계 버튼 표시'`) 전체를 아래로 교체:

  ```ts
  test('3. 입력 없이 다음으로 버튼은 비활성 — 선택 후 활성화', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });

    // AppBar 확인
    await expect(page.getByText('오늘의 복습')).toBeVisible({ timeout: 5000 });

    // 선택 없으면 비활성
    const nextBtn = page.getByRole('button', { name: '다음으로' });
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await expect(nextBtn).toBeDisabled();

    // 첫 번째 선택지 클릭 → 활성화
    const firstChoice = page.getByRole('button').filter({ hasNotText: /다음으로|뒤로가기/ }).first();
    await firstChoice.click();
    await expect(nextBtn).toBeEnabled();

    // 활성화된 버튼 클릭 → AI 피드백 또는 다음 단계 버튼
    await nextBtn.click();
    await expect(page.getByText(/다음 단계 →|완료 →/)).toBeVisible({ timeout: 15000 });
  });
  ```

- [ ] **Step 2: 테스트 4 수정 — 루프에서 선택지 먼저 클릭 + 타임아웃 증가**

  기존 테스트 4 (`'4. 모든 단계 완료 → 완료 화면 표시'`) 의 루프 부분을 교체:

  ```ts
  test('4. 모든 단계 완료 → 완료 화면 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });

    // 최대 10단계 반복 (실제는 약점에 따라 3단계 전후)
    for (let i = 0; i < 10; i++) {
      const isDone = await page.getByText('모든 단계 완료!').isVisible();
      if (isDone) break;

      const hasNext = await page.getByText('다음으로').isVisible();
      if (hasNext) {
        // 선택지를 먼저 골라야 버튼이 활성화됨
        const firstChoice = page.getByRole('button').filter({ hasNotText: /다음으로|뒤로가기/ }).first();
        await firstChoice.click();
        await page.getByText('다음으로').click();
        // AI 호출 포함 최대 15초 대기
        await expect(page.getByText(/다음 단계 →|완료 →/)).toBeVisible({ timeout: 15000 });
      }

      const hasContinue = await page.getByText(/다음 단계 →|완료 →/).isVisible();
      if (hasContinue) {
        await page.getByText(/다음 단계 →|완료 →/).click();
        await page.waitForTimeout(200);
      }
    }

    await expect(page.getByText('모든 단계 완료!')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('✓ 기억났어요!')).toBeVisible();
    await expect(page.getByText('🤔 다시 볼게요')).toBeVisible();
  });
  ```

- [ ] **Step 3: 테스트 2에 AppBar 검증 추가**

  기존 테스트 2 의 마지막 줄 (`await expect(page).toHaveURL(...)`) 뒤에 추가:

  ```ts
  await expect(page.getByText('오늘의 복습')).toBeVisible({ timeout: 3000 });
  ```

- [ ] **Step 4: 테스트 3이 실패하는지 확인**

  ```bash
  npm run test:e2e -- --grep "3\."
  ```
  Expected: FAIL — `nextBtn` 가 disabled 이지 않음 (아직 구현 전)

---

## Task 3: Hook — `hasInput` 추가 + dead code 제거

**Files:**
- Modify: `features/quiz/hooks/use-review-session-screen.ts`

- [ ] **Step 1: `UseReviewSessionScreenResult` 타입에 `hasInput` 추가**

  ```ts
  // features/quiz/hooks/use-review-session-screen.ts:15-31
  export type UseReviewSessionScreenResult = {
    task: ReviewTask | null;
    steps: ThinkingStep[];
    currentStepIndex: number;
    stepPhase: StepPhase;
    selectedChoiceIndex: number | null;
    userText: string;
    aiFeedback: string | null;
    isLoadingFeedback: boolean;
    sessionComplete: boolean;
    hasInput: boolean;        // ← 추가
    onSelectChoice: (index: number) => void;
    onChangeText: (text: string) => void;
    onPressNext: () => void;
    onPressContinue: () => void;
    onPressRemember: () => void;
    onPressRetry: () => void;
  };
  ```

- [ ] **Step 2: `onPressNext` 의 dead code 제거**

  `onPressNext` 함수(line 100-136)에서 아래 블록을 삭제:

  ```ts
  // 삭제할 코드 (line 110-113)
  if (!hasChoice && !hasText) {
    setStepPhase('feedback');
    return;
  }
  ```

  삭제 후 `onPressNext` 는 다음과 같아야 한다:

  ```ts
  const onPressNext = async () => {
    if (isFetchingRef.current) return;
    const step = steps[currentStepIndex];
    if (!step || !task) {
      return;
    }

    const hasChoice = selectedChoiceIndex !== null;
    const hasText = userText.trim().length > 0;

    isFetchingRef.current = true;
    setIsLoadingFeedback(true);
    try {
      const selectedChoiceText = hasChoice
        ? (step.choices[selectedChoiceIndex!]?.text ?? null)
        : null;
      const result = await requestReviewFeedback({
        weaknessId: task.weaknessId,
        stepTitle: step.title,
        stepBody: step.body,
        selectedChoiceText,
        userText: hasText ? userText.trim() : null,
      });
      setAiFeedback(result.replyText);
    } catch {
      setAiFeedback(null);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingFeedback(false);
      setStepPhase('feedback');
    }
  };
  ```

- [ ] **Step 3: `hasInput` 계산 및 반환값에 추가**

  `return` 문 직전에 추가:

  ```ts
  const hasInput = selectedChoiceIndex !== null || userText.trim().length > 0;
  ```

  `return` 블록에 `hasInput` 추가:

  ```ts
  return {
    task,
    steps,
    currentStepIndex,
    stepPhase,
    selectedChoiceIndex,
    userText,
    aiFeedback,
    isLoadingFeedback,
    sessionComplete,
    hasInput,          // ← 추가
    onSelectChoice,
    onChangeText,
    onPressNext,
    onPressContinue,
    onPressRemember,
    onPressRetry,
  };
  ```

---

## Task 4: View — AppBar 추가 + 버튼 비활성화

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx`

- [ ] **Step 1: import 추가**

  파일 상단 import 목록에 추가:

  ```ts
  import { router } from 'expo-router';
  import { IconSymbol } from '@/components/ui/icon-symbol';
  ```

  `SafeAreaView` 는 이미 `react-native-safe-area-context` 에서 임포트 중인지 확인. 현재 `useSafeAreaInsets` 만 임포트되어 있으므로 `SafeAreaView` 추가:

  ```ts
  import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
  ```

- [ ] **Step 2: props에 `hasInput` 추가**

  함수 시그니처 구조분해에 `hasInput` 추가:

  ```ts
  export function ReviewSessionScreenView({
    task,
    steps,
    currentStepIndex,
    stepPhase,
    selectedChoiceIndex,
    userText,
    aiFeedback,
    isLoadingFeedback,
    sessionComplete,
    hasInput,          // ← 추가
    onSelectChoice,
    onChangeText,
    onPressNext,
    onPressContinue,
    onPressRemember,
    onPressRetry,
  }: UseReviewSessionScreenResult) {
  ```

- [ ] **Step 3: `appBar` const 선언 추가**

  `insets` 선언 바로 아래에 추가:

  ```tsx
  const appBar = (
    <SafeAreaView edges={['top']} style={styles.appBar}>
      <View style={styles.appBarInner}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button">
          <IconSymbol name="chevron.left" size={24} color={BrandColors.primary} />
        </Pressable>
        <Text style={styles.appBarTitle}>오늘의 복습</Text>
        <View style={styles.appBarSpacer} />
      </View>
    </SafeAreaView>
  );
  ```

- [ ] **Step 4: 로딩 상태 return 교체**

  기존:
  ```tsx
  if (!task) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.loadingText}>복습 데이터를 불러오는 중...</Text>
      </View>
    );
  }
  ```

  교체 후:
  ```tsx
  if (!task) {
    return (
      <View style={styles.screen}>
        {appBar}
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>복습 데이터를 불러오는 중...</Text>
        </View>
      </View>
    );
  }
  ```

- [ ] **Step 5: 완료 화면(sessionComplete, !step) 두 return 교체**

  두 완료 상태(sessionComplete, !step)는 동일한 구조이므로 둘 다 교체한다.

  기존 패턴:
  ```tsx
  return (
    <View style={[styles.screen, styles.doneScreen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      ...
    </View>
  );
  ```

  교체 후 (두 군데 모두):
  ```tsx
  return (
    <View style={styles.screen}>
      {appBar}
      <View style={[styles.doneScreen, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.doneEmoji}>🌿</Text>
        <Text style={styles.doneTitle}>모든 단계 완료!</Text>
        <Text style={styles.doneSub}>{weaknessLabel} 흐름을{'\n'}다시 확인했어요.</Text>

        <View style={styles.scheduleBox}>
          <Text style={styles.scheduleLabel}>다음 복습 일정</Text>
          <Text style={styles.scheduleVal}>
            {task.stage === 'day1' ? '3일 후' :
             task.stage === 'day3' ? '7일 후' :
             task.stage === 'day7' ? '30일 후' : '졸업 🎓'}
          </Text>
        </View>

        <View style={styles.doneButtons}>
          <Pressable style={styles.retryBtn} onPress={onPressRetry}>
            <Text style={styles.retryBtnText}>🤔 다시 볼게요</Text>
          </Pressable>
          <Pressable style={styles.rememberBtn} onPress={onPressRemember}>
            <Text style={styles.rememberBtnText}>✓ 기억났어요!</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
  ```

- [ ] **Step 6: 메인 ScrollView return 교체**

  기존:
  ```tsx
  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled">
      ...
      {/* 버튼 */}
      {stepPhase === 'input' ? (
        <Pressable
          style={[styles.primaryBtn, isLoadingFeedback && styles.primaryBtnDisabled]}
          onPress={onPressNext}
          disabled={isLoadingFeedback}>
          ...
        </Pressable>
      ) : ...}
    </ScrollView>
  );
  ```

  교체 후:
  ```tsx
  return (
    <View style={styles.screen}>
      {appBar}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">

        {/* 진행 바 */}
        <View style={styles.progressBar}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.progressSeg, i <= currentStepIndex && styles.progressSegDone]}
            />
          ))}
        </View>

        {/* 단계 카드 */}
        <View style={styles.stepCard}>
          <View style={styles.stepNumRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNumText}>{currentStepIndex + 1}</Text>
            </View>
            <Text style={styles.stepNumLabel}>{`${currentStepIndex + 1} / ${steps.length} 단계`}</Text>
          </View>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepBody}>{step.body}</Text>
          {step.example ? (
            <View style={styles.stepExampleBox}>
              <Text style={styles.stepExampleText}>{step.example}</Text>
            </View>
          ) : null}
        </View>

        {/* 입력 카드 */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>💭 이 단계, 어떻게 이해했나요?</Text>

          <View style={styles.choices}>
            {step.choices.map((choice, i) => (
              <Pressable
                key={i}
                style={[styles.choiceBtn, selectedChoiceIndex === i && styles.choiceBtnSelected]}
                onPress={() => stepPhase === 'input' && onSelectChoice(i)}>
                <Text
                  style={[
                    styles.choiceBtnText,
                    selectedChoiceIndex === i && styles.choiceBtnTextSelected,
                  ]}>
                  {choice.text}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는 직접 써도 돼요</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.textInput}
            value={userText}
            onChangeText={stepPhase === 'input' ? onChangeText : undefined}
            placeholder="자유롭게 써보세요..."
            placeholderTextColor={BrandColors.disabled}
            multiline
            editable={stepPhase === 'input'}
          />

          {stepPhase === 'feedback' && aiFeedback ? (
            <View style={styles.aiFeedback}>
              <Text style={styles.aiBadge}>✨ AI 피드백</Text>
              <Text style={styles.aiText}>{aiFeedback}</Text>
            </View>
          ) : null}

          {stepPhase === 'input' ? (
            <Pressable
              style={[styles.primaryBtn, (!hasInput || isLoadingFeedback) && styles.primaryBtnDisabled]}
              onPress={onPressNext}
              disabled={!hasInput || isLoadingFeedback}>
              {isLoadingFeedback ? (
                <ActivityIndicator color="#F6F2EA" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>다음으로</Text>
              )}
            </Pressable>
          ) : (
            <Pressable style={styles.primaryBtn} onPress={onPressContinue}>
              <Text style={styles.primaryBtnText}>{continueLabel}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
  ```

- [ ] **Step 7: 스타일 추가/수정**

  `StyleSheet.create` 내에 다음 스타일을 추가:

  ```ts
  appBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
  },
  appBarInner: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    flex: 1,
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: BrandColors.primary,
    textAlign: 'center',
  },
  appBarSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ```

  기존 `doneScreen` 스타일에 `flex: 1` 추가:

  ```ts
  doneScreen: {
    flex: 1,              // ← 추가
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.xl,
    gap: BrandSpacing.sm,
  },
  ```

---

## Task 5: 검증 + 커밋

- [ ] **Step 1: e2e 테스트 실행**

  ```bash
  npm run test:e2e -- --grep "복습 세션 흐름"
  ```

  Expected: 전체 PASS. 테스트 3은 버튼 비활성/활성화 검증, 테스트 4는 AI 피드백 후 완료 화면까지 통과.

- [ ] **Step 2: 커밋**

  ```bash
  git add features/quiz/hooks/use-review-session-screen.ts \
          features/quiz/components/review-session-screen-view.tsx \
          e2e/review-session.spec.ts
  git commit -m "feat: 복습 세션 AppBar 추가 + 입력 없이 다음으로 비활성화"
  ```

- [ ] **Step 3: git push**

  ```bash
  git push origin main
  ```
