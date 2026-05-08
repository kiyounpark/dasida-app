# 약점 진단 분석 화면: 선택지 탭 후 자동 스크롤 (앵커 방식) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 진단 분석 화면(`DiagnosisConversationPage`)에서 사용자가 선택지를 탭한 직후, 본인이 누른 user bubble을 화면 상단 근처에 위치시키고 그 아래로 새 AI 카드가 시작부터 보이도록 자동 스크롤한다.

**Architecture:** 마지막 user bubble entry의 id를 `useMemo`로 식별 → 해당 entry wrapper에 `onLayout` 부착해 y좌표를 ref에 저장 → `shouldAutoScrollToEnd`가 true가 되면 `scrollTo({ y: anchorY - 16 })` 실행. 첫 호출 시 anchorY가 아직 측정 전이면 `pendingScrollRef`로 마킹하고 `onContentSizeChange`에서 재시도.

**Tech Stack:** React Native (Expo), TypeScript, ScrollView ref, useMemo/useRef/useEffect.

**Spec:** [docs/superpowers/specs/2026-05-09-diagnosis-choice-auto-scroll-design.md](../specs/2026-05-09-diagnosis-choice-auto-scroll-design.md)

**Note on TDD:** 이 변경은 ScrollView ref와 native layout 이벤트에 의존하므로 단위 테스트로 검증이 어렵다. 단계별로 작은 커밋을 만들고 마지막에 시뮬레이터 수동 검증으로 확정한다. Jest 환경에서 native scroll/layout이 발생하지 않아 spec의 핵심 동작을 의미 있게 테스트할 수 없다.

---

## File Structure

**수정 파일 (1개):**
- `features/quiz/components/diagnosis-conversation-page.tsx` — 앵커 식별 + onLayout + scrollTo 로직 추가

**변경 없음:**
- `features/quiz/hooks/use-diagnostic-screen.ts` — 기존 `requestDiagnosisAutoScroll` 호출 그대로 사용
- `features/quiz/hooks/use-diagnosis-pager.ts` — 기존 ref 플래그/핸들러 유지
- `features/quiz/components/diagnostic-screen-view.tsx` — props 시그니처 변경 없음

---

## Task 1: 앵커 entry id 계산 추가

**Files:**
- Modify: `features/quiz/components/diagnosis-conversation-page.tsx`

**Context:** `chatEntries`의 마지막 `kind: 'bubble' && role: 'user'` entry id를 `useMemo`로 계산한다. `appendNextNode`가 user bubble을 항상 새 AI 노드보다 먼저 push하므로, 이 id가 "방금 누른 선택지" 앵커가 된다.

- [ ] **Step 1: import에 `useMemo` 추가**

`features/quiz/components/diagnosis-conversation-page.tsx` 1번 줄을 다음과 같이 수정:

```tsx
import { useEffect, useMemo, useRef } from 'react';
```

- [ ] **Step 2: 컴포넌트 본문 상단에 `anchorEntryId` useMemo 추가**

기존 `const scrollRef = useRef<ScrollView | null>(null);` 줄(147번 줄 근처) **바로 뒤**에 다음 블록을 추가:

```tsx
  const anchorEntryId = useMemo(() => {
    for (let i = chatEntries.length - 1; i >= 0; i -= 1) {
      const entry = chatEntries[i];
      if (entry.kind === 'bubble' && entry.role === 'user') {
        return entry.id;
      }
    }
    return null;
  }, [chatEntries]);
```

- [ ] **Step 3: 타입 체크 통과 확인**

Run: `npx tsc --noEmit`
Expected: 신규 에러 없음 (기존 에러는 그대로 둔다).

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/diagnosis-conversation-page.tsx
git commit -m "$(cat <<'EOF'
feat(diagnosis): compute anchor entry id for last user bubble

분석 채팅에서 가장 최근 user bubble entry의 id를 useMemo로 식별.
다음 단계에서 이 id를 onLayout 앵커로 사용해 선택지 탭 후 자동 스크롤 위치를 잡는다.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: anchorYRef와 pendingScrollRef 선언

**Files:**
- Modify: `features/quiz/components/diagnosis-conversation-page.tsx`

**Context:** 앵커 entry의 y좌표를 저장할 ref와 "anchorY가 아직 측정 안 됨 → onContentSizeChange에서 재시도" 플래그 ref를 추가한다.

- [ ] **Step 1: anchorEntryId useMemo 바로 뒤에 두 개의 ref 추가**

Task 1에서 추가한 `anchorEntryId` useMemo 블록 **바로 뒤**에 다음 블록을 추가:

```tsx
  const anchorYRef = useRef<number | null>(null);
  const pendingScrollRef = useRef(false);

  useEffect(() => {
    anchorYRef.current = null;
  }, [anchorEntryId]);
```

`anchorEntryId`가 바뀌면 (= 새 user bubble이 생기면) 이전 측정값을 무효화한다. 새 entry의 onLayout이 호출되면 새 값으로 채워진다.

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 신규 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/diagnosis-conversation-page.tsx
git commit -m "$(cat <<'EOF'
feat(diagnosis): add anchorY and pendingScroll refs

앵커 entry의 y좌표를 캡처할 ref와 콘텐츠 크기 변경 시 재시도용 플래그 추가.
anchorEntryId가 바뀌면 anchorY를 무효화한다.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 앵커 entry wrapper에 onLayout 부착

**Files:**
- Modify: `features/quiz/components/diagnosis-conversation-page.tsx`

**Context:** `chatEntries.map` 안의 `entry.kind === 'bubble'` 분기에서, 해당 entry가 앵커일 때만 wrapper `Animated.View`에 `onLayout`을 부착한다.

현재 bubble 렌더링 부분(파일 210~224번 줄):

```tsx
            if (entry.kind === 'bubble') {
              return (
                <Animated.View
                  key={entry.id}
                  entering={getEntryAnimation(entry)}
                  style={isAfterProblemPrompt ? styles.promptEntry : null}>
                  <DiagnosisChatBubble
                    role={entry.role}
                    text={entry.text}
                    tone={entry.tone}
                    showAvatar={showAvatar && entry.role === 'assistant'}
                  />
                </Animated.View>
              );
            }
```

- [ ] **Step 1: bubble 분기를 anchor onLayout 포함하도록 수정**

위 블록을 다음으로 교체:

```tsx
            if (entry.kind === 'bubble') {
              const isAnchor = entry.id === anchorEntryId;
              return (
                <Animated.View
                  key={entry.id}
                  entering={getEntryAnimation(entry)}
                  onLayout={
                    isAnchor
                      ? (event) => {
                          anchorYRef.current = event.nativeEvent.layout.y;
                        }
                      : undefined
                  }
                  style={isAfterProblemPrompt ? styles.promptEntry : null}>
                  <DiagnosisChatBubble
                    role={entry.role}
                    text={entry.text}
                    tone={entry.tone}
                    showAvatar={showAvatar && entry.role === 'assistant'}
                  />
                </Animated.View>
              );
            }
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 신규 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/diagnosis-conversation-page.tsx
git commit -m "$(cat <<'EOF'
feat(diagnosis): capture anchor y via onLayout on last user bubble

채팅 entry가 앵커(=가장 최근 user bubble)일 때만 wrapper에 onLayout을 달아
anchorYRef에 y좌표를 저장한다.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: auto-scroll useEffect 교체 (앵커 기반)

**Files:**
- Modify: `features/quiz/components/diagnosis-conversation-page.tsx`

**Context:** 기존 `scrollToEnd` 호출을 앵커 y - 16px 위치로 가는 `scrollTo` 호출로 바꾼다. anchorY가 아직 측정 안 됐으면 `pendingScrollRef = true`로 마킹해 다음 단계에서 `onContentSizeChange`가 재시도하도록 한다.

현재 두 번째 useEffect(파일 163~172번 줄):

```tsx
  useEffect(() => {
    if (!isActive || !shouldAutoScrollToEnd) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      onAutoScrollHandled(answerIndex);
    });
  }, [answerIndex, isActive, onAutoScrollHandled, shouldAutoScrollToEnd]);
```

- [ ] **Step 1: 위 useEffect 블록을 다음으로 교체**

```tsx
  useEffect(() => {
    if (!isActive || !shouldAutoScrollToEnd) {
      return;
    }

    const targetY = anchorYRef.current;
    if (targetY != null) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(targetY - 16, 0),
          animated: true,
        });
        onAutoScrollHandled(answerIndex);
      });
      return;
    }

    pendingScrollRef.current = true;
  }, [answerIndex, isActive, onAutoScrollHandled, shouldAutoScrollToEnd]);
```

핵심 차이:
- `scrollToEnd` → `scrollTo({ y: anchorY - 16 })`
- anchorY가 아직 없으면 `pendingScrollRef.current = true`만 set하고 종료 (Task 5에서 재시도)

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 신규 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/diagnosis-conversation-page.tsx
git commit -m "$(cat <<'EOF'
feat(diagnosis): scroll to anchor instead of scrollToEnd on choice

선택지 탭 시 새 user bubble의 y좌표 - 16px 위치로 스크롤한다.
anchorY가 아직 측정 안 됐으면 pendingScrollRef로 마킹하고 종료.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: ScrollView에 onContentSizeChange 폴백 추가

**Files:**
- Modify: `features/quiz/components/diagnosis-conversation-page.tsx`

**Context:** Task 4의 useEffect에서 anchorY가 아직 없을 때 `pendingScrollRef = true`로 마킹된다. 이 폴백은 콘텐츠 사이즈가 변경되어 anchor onLayout이 호출된 직후 트리거된다.

현재 ScrollView 선언(파일 179~191번 줄):

```tsx
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          directionalLockEnabled
          contentContainerStyle={styles.content}
          scrollEventThrottle={16}
          onScroll={(event) => {
            onScrollOffsetChange(answerIndex, event.nativeEvent.contentOffset.y);
          }}>
```

- [ ] **Step 1: `onContentSizeChange` prop 추가**

위 블록의 `onScroll` prop **뒤**(닫는 `>` 직전)에 다음을 추가:

```tsx
          onContentSizeChange={() => {
            if (!pendingScrollRef.current) {
              return;
            }
            const targetY = anchorYRef.current;
            if (targetY == null) {
              return;
            }
            pendingScrollRef.current = false;
            scrollRef.current?.scrollTo({
              y: Math.max(targetY - 16, 0),
              animated: true,
            });
            onAutoScrollHandled(answerIndex);
          }}
```

전체 ScrollView 블록은 다음과 같이 보여야 한다:

```tsx
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          directionalLockEnabled
          contentContainerStyle={styles.content}
          scrollEventThrottle={16}
          onScroll={(event) => {
            onScrollOffsetChange(answerIndex, event.nativeEvent.contentOffset.y);
          }}
          onContentSizeChange={() => {
            if (!pendingScrollRef.current) {
              return;
            }
            const targetY = anchorYRef.current;
            if (targetY == null) {
              return;
            }
            pendingScrollRef.current = false;
            scrollRef.current?.scrollTo({
              y: Math.max(targetY - 16, 0),
              animated: true,
            });
            onAutoScrollHandled(answerIndex);
          }}>
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 신규 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/diagnosis-conversation-page.tsx
git commit -m "$(cat <<'EOF'
feat(diagnosis): retry anchor scroll on content size change

useEffect 시점에 anchorY가 아직 없을 때 pendingScrollRef로 마킹하고,
ScrollView의 onContentSizeChange에서 anchorY가 채워지면 재시도한다.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 시뮬레이터 수동 검증

**Files:** (수정 없음 — 검증 단계)

**Context:** Spec의 "검증" 섹션에 정의된 시나리오를 시뮬레이터에서 수동으로 확인한다.

- [ ] **Step 1: iOS 시뮬레이터 실행**

Run: `npx expo run:ios`
Expected: 앱이 시뮬레이터에서 정상 실행됨.

- [ ] **Step 2: 시나리오 1 — 짧은 AI 카드**

1. 약점 진단 시작 → 일부러 1~2문제 틀린다.
2. 분석 화면 진입 → `DiagnosisFlowCard`의 선택지 버튼을 탭한다.
3. **확인:** user bubble이 화면 상단 근처(약 16px 아래)에 위치한다. 그 아래로 새 AI 카드가 처음부터 보인다.

- [ ] **Step 3: 시나리오 2 — 긴 AI 카드**

1. 분석을 진행해 큰 카드(많은 선택지가 있는 `kind: choice`)가 등장하는 단계까지 간다.
2. 카드 안의 선택지를 탭한다.
3. **확인:** user bubble 상단 + 새 AI 카드의 타이틀/본문이 자연스럽게 노출된다. 선택지 버튼은 화면 아래로 흐르되 스크롤로 도달 가능.

- [ ] **Step 4: 시나리오 3 — 가로 페이저 회귀 점검**

1. 분석 페이지를 가로로 스와이프해 다른 문제로 이동.
2. 다시 가로 스와이프해 처음 문제로 돌아옴.
3. **확인:** 이전 스크롤 위치가 복원된다 (`restoreOffset` 흐름이 영향받지 않음).

- [ ] **Step 5: 시나리오 4 — 키보드/AI Help 회귀 점검**

1. AI help 카드(`DiagnosisAiHelpCard`)가 등장하는 단계로 진행.
2. 입력창 탭 → 키보드 등장 → 입력 → 전송.
3. **확인:** 키보드 동작과 입력 흐름이 기존과 동일.

- [ ] **Step 6: 패딩 16px 시각 확인**

- 너무 빡빡하면 `Math.max(targetY - 24, 0)`으로 변경 후 재커밋.
- 적절하면 그대로 둔다.

- [ ] **Step 7: 종료 알림**

Run: `npm run notify:done -- "약점 진단 분석: 선택지 탭 시 anchor 기반 자동 스크롤 적용"`
Expected: Slack 알림 전송됨.

---

## Self-Review Notes

- ✅ Spec coverage: 4가지 핵심 변경(anchor id, refs, onLayout, useEffect 교체, onContentSizeChange 폴백) 모두 Task 1~5에 매핑됨.
- ✅ Placeholder 없음: 모든 코드 블록 완성형.
- ✅ Type 일관성: `anchorYRef`, `pendingScrollRef`, `anchorEntryId` 이름이 모든 task에서 일치.
- ✅ Spec의 검증 섹션 4개 시나리오 모두 Task 6에 포함.
- ✅ 회귀 위험(가로 페이저, restoreOffset, 키보드)이 Task 6에서 명시적으로 점검됨.
