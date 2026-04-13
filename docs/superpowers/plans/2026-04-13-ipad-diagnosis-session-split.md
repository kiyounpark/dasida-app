# iPad DiagnosisSession Split Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이패드에서 ExamDiagnosisSessionScreen이 문제 이미지(왼쪽 60%)와 진단 인터랙션(오른쪽 40%)을 동시에 표시하도록 변경한다. 아이폰 동작은 완전히 동일하게 유지.

**Architecture:** `useIsTablet()`(744pt 기준, 기존 훅)으로 분기. `ExamDiagnosisPage` 내부에서 태블릿 레이아웃을 자체 처리(좌: problem-card 엔트리, 우: 나머지 엔트리). `ExamDiagnosisSessionScreen`은 태블릿일 때 FlatList 대신 activeProblemIndex 문제 하나만 렌더링.

**Tech Stack:** React Native, Expo, `useWindowDimensions`, `StyleSheet`

---

## File Map

| 파일 | 변경 유형 | 역할 |
|------|---------|------|
| `features/quiz/exam/screens/exam-diagnosis-screen.tsx` | Modify | 태블릿 시 내부 좌우 분할 레이아웃 |
| `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` | Modify | 태블릿 시 FlatList 없이 단일 문제 렌더링 |

---

### Task 1: ExamDiagnosisPage — 태블릿 분할 레이아웃

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-screen.tsx`

- [ ] **Step 1: `useIsTablet` import 추가**

`exam-diagnosis-screen.tsx` 상단 import 블록에 추가:

```tsx
import { useIsTablet } from '@/hooks/use-is-tablet';
```

기존 import 블록 바로 아래 (다른 `@/` import들과 함께).

- [ ] **Step 2: `ExamDiagnosisPage` 함수 안에 `useIsTablet` 호출 추가**

기존 코드:
```tsx
export function ExamDiagnosisPage({
  examId,
  problemNumber,
  userAnswer,
  width,
  isActive,
  nextProblemNumber,
  onComplete,
  onNext,
  onBackToResult,
}: ExamDiagnosisPageProps) {
  const hook = useExamDiagnosis({ examId, problemNumber, userAnswer, onComplete });
  const scrollRef = useRef<ScrollView>(null);
```

수정 후:
```tsx
export function ExamDiagnosisPage({
  examId,
  problemNumber,
  userAnswer,
  width,
  isActive,
  nextProblemNumber,
  onComplete,
  onNext,
  onBackToResult,
}: ExamDiagnosisPageProps) {
  const hook = useExamDiagnosis({ examId, problemNumber, userAnswer, onComplete });
  const scrollRef = useRef<ScrollView>(null);
  const isTablet = useIsTablet();
```

- [ ] **Step 3: `return` 문 앞에 태블릿 분할 레이아웃 렌더링 추가**

기존 `return (` 바로 위에 삽입:

```tsx
  // 태블릿: 좌우 분할 레이아웃 (문제 이미지 | 진단 인터랙션)
  if (isTablet) {
    const problemEntry = hook.entries.find((e) => e.kind === 'problem-card');
    const interactionEntries = hook.entries.filter((e) => e.kind !== 'problem-card');

    return (
      <View style={styles.tabletPage}>
        {/* 왼쪽: 문제 이미지 패널 */}
        <ScrollView
          style={styles.tabletLeft}
          contentContainerStyle={styles.tabletLeftContent}
          showsVerticalScrollIndicator={false}>
          {problemEntry && (
            <EntryRenderer
              entry={problemEntry}
              hook={hook}
              nextProblemNumber={nextProblemNumber}
              onNext={onNext}
              onBackToResult={onBackToResult}
            />
          )}
        </ScrollView>

        {/* 오른쪽: 진단 인터랙션 패널 */}
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          style={styles.tabletRight}
          contentContainerStyle={styles.tabletRightContent}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {interactionEntries.map((entry) => (
            <Animated.View
              key={entry.id}
              entering={
                entry.kind === 'next-problem'
                  ? undefined
                  : FadeInDown.duration(220).withInitialValues({
                      opacity: 0,
                      transform: [{ translateY: 8 }],
                    })
              }>
              <EntryRenderer
                entry={entry}
                hook={hook}
                nextProblemNumber={nextProblemNumber}
                onNext={onNext}
                onBackToResult={onBackToResult}
              />
            </Animated.View>
          ))}
          {hook.isSaving && (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color={BrandColors.primarySoft} />
              <Text style={styles.savingText}>저장 중...</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
```

- [ ] **Step 4: `styles.StyleSheet.create()` 안에 태블릿 스타일 추가**

기존 `styles` 객체 끝 (`savingText` 뒤) 에 추가:

```tsx
  tabletPage: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: {
    flex: 0.6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(41,59,39,0.15)',
  },
  tabletLeftContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  tabletRight: {
    flex: 0.4,
  },
  tabletRightContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
```

- [ ] **Step 5: 타입 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음. 에러가 있으면 import 경로 또는 타입 불일치 확인 후 수정.

- [ ] **Step 6: Commit**

```bash
git add features/quiz/exam/screens/exam-diagnosis-screen.tsx
git commit -m "feat(exam): ExamDiagnosisPage — 태블릿 좌우 분할 레이아웃 (문제 이미지 | 진단 인터랙션)"
```

---

### Task 2: ExamDiagnosisSessionScreen — 태블릿 모드 (FlatList 없음)

**Files:**
- Modify: `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`

- [ ] **Step 1: `useIsTablet` import 추가**

기존 import 블록에 추가:

```tsx
import { useIsTablet } from '@/hooks/use-is-tablet';
```

기존 `@/` import들 아래.

- [ ] **Step 2: `ExamDiagnosisSessionScreen` 함수 안에 `useIsTablet` 호출 추가**

기존 코드:
```tsx
export function ExamDiagnosisSessionScreen() {
  const params = useLocalSearchParams();
  // ... (파라미터 파싱) ...
  const session = useExamDiagnosisSession({ examId, wrongProblemNumbers, startIndex });
  const insets = useSafeAreaInsets();
  const { width: pageWidth } = useWindowDimensions();
  const { onSwipeEnd } = session;
```

수정 후:
```tsx
export function ExamDiagnosisSessionScreen() {
  const params = useLocalSearchParams();
  // ... (파라미터 파싱) ...
  const session = useExamDiagnosisSession({ examId, wrongProblemNumbers, startIndex });
  const insets = useSafeAreaInsets();
  const { width: pageWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const { onSwipeEnd } = session;
```

- [ ] **Step 3: `return (` 앞에 태블릿 렌더링 브랜치 추가**

기존 `return (` 바로 위에 삽입:

```tsx
  // 태블릿: FlatList 없이 현재 문제 하나만 렌더링
  if (isTablet) {
    const activeProblemNumber = wrongProblemNumbers[session.activeProblemIndex];

    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <DiagnosisDarkHeader
          title={`${activeProblemNumber ?? ''}번`}
          backLabel="← 채점 결과"
          progressLabel={session.progressLabel}
          progressPercent={session.progressPercent}
          totalCount={wrongProblemNumbers.length}
          completedIndices={session.diagnosedIndices}
          activeIndex={session.activeProblemIndex}
          onBack={session.onBackToResult}
          onDotPress={session.onDotPress}
        />
        {activeProblemNumber !== undefined && (
          <ExamDiagnosisPage
            key={activeProblemNumber}
            examId={examId}
            problemNumber={activeProblemNumber}
            userAnswer={session.getUserAnswer(activeProblemNumber)}
            width={pageWidth}
            isActive={true}
            nextProblemNumber={session.getNextProblemNumber(session.activeProblemIndex)}
            onComplete={() => session.onComplete(session.activeProblemIndex)}
            onNext={() => session.onScrollToNext(session.activeProblemIndex)}
            onBackToResult={session.onBackToResult}
          />
        )}
      </View>
    );
  }

  return (
```

`key={activeProblemNumber}` 이유: 문제가 바뀔 때 `useExamDiagnosis` 내부 상태를 초기화해야 함. key가 바뀌면 React가 컴포넌트를 완전히 재마운트.

- [ ] **Step 4: 타입 검증**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/screens/exam-diagnosis-session-screen.tsx
git commit -m "feat(exam): ExamDiagnosisSessionScreen — 태블릿 단일 문제 렌더링 (FlatList 제거)"
```

---

### Task 3: 시뮬레이터 검증

**Files:** 없음 (코드 변경 없음)

- [ ] **Step 1: iOS 앱 빌드 및 실행**

```bash
cd /Users/baggiyun/dev/dasida-app && npx expo run:ios
```

Expected: 빌드 성공, 시뮬레이터에서 앱 실행.

- [ ] **Step 2: iPad Pro 시뮬레이터로 전환**

Xcode → Simulator 메뉴 → File → Open Simulator → iPad Pro (12.9-inch, 6th generation)

또는 터미널:
```bash
xcrun simctl list devices | grep "iPad Pro"
```
목록에서 UUID 확인 후:
```bash
open -a Simulator --args -CurrentDeviceUDID <UUID>
```

- [ ] **Step 3: 아이패드 진단 세션 화면 확인**

앱에서: 시험 응시 → 채점 → 오답 진단 세션 진입

**확인 항목:**
- [ ] 좌측 패널(60%): 문제 이미지 + 정답/오답 번호 원 표시
- [ ] 우측 패널(40%): 진단 인터랙션 채팅 UI
- [ ] 헤더 점(dots): 탭 시 해당 문제로 전환됨
- [ ] 문제 전환 시 우측 패널이 새 문제의 인터랙션으로 초기화됨

- [ ] **Step 4: Split View 테스트**

iPad 시뮬레이터에서 홈 화면으로 나가기 → 다른 앱(예: Safari) → Split View로 DASIDA와 나란히 열기.

**확인 항목:**
- [ ] Split View에서 DASIDA 화면 너비가 744pt 미만이면 아이폰 레이아웃(FlatList 스와이프)으로 자동 전환됨

- [ ] **Step 5: 아이폰 회귀 테스트**

시뮬레이터를 iPhone 15 Pro로 전환하여 동일한 진단 세션 화면 진입.

**확인 항목:**
- [ ] 기존 FlatList 수평 스와이프 동작 정상
- [ ] 헤더 진행 점 탭 동작 정상

- [ ] **Step 6: 최종 커밋 및 푸시**

```bash
cd /Users/baggiyun/dev/dasida-app
npm run notify:done -- "iPad DiagnosisSession 좌우 분할 레이아웃 구현 완료 — ExamDiagnosisPage 태블릿 내부 분할, SessionScreen FlatList 제거"
git push origin main
npm run log:commit
```

---

## 구현 시 주의사항

1. **`key={activeProblemNumber}` 필수**: 태블릿 모드에서 문제가 바뀔 때 `useExamDiagnosis` 내부 entries 상태를 초기화하기 위함. 없으면 이전 문제의 채팅 기록이 다음 문제에 남음.

2. **`pagerRef`는 태블릿에서 null**: `session.onDotPress`가 `pagerRef.current?.scrollToIndex(...)`를 호출하지만 optional chaining `?.`으로 안전하게 no-op. `setActiveProblemIndex(index)`는 정상 실행됨.

3. **`isActive` prop**: 태블릿에서는 항상 `true`. 아이폰에서는 FlatList가 이 값으로 inactive 페이지의 키보드를 dismiss함.

4. **`ExamDiagnosisPage`의 `width` prop**: 태블릿 분할 레이아웃 브랜치에서는 `width` prop을 무시하고 `flex: 1` 기반 레이아웃을 사용. 아이폰 브랜치에서는 기존 `{ width }` style 그대로.

5. **`scrollRef` auto-scroll**: 태블릿 우측 패널 ScrollView에 `ref={scrollRef}`를 부착함으로써, 새 인터랙션 엔트리 추가 시 자동으로 스크롤 내려가는 기존 동작 유지.
