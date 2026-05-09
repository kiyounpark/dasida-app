# Review Session Soft Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복습 세션의 거친 마무리 경험 3가지(AI 톤, 입력창 사라짐, 오답 신호 부재)를 부드럽게 다듬는다.

**Architecture:**
- AI 변경은 `functions/src/review-feedback.ts`의 `CLOSE_MODE_SUFFIX` 본문 재작성 + 테스트 토큰 갱신으로 끝난다 (배포 함수 측 변경, 클라이언트 영향 없음).
- UI 변경 두 개는 모두 `features/quiz/components/review-session-screen-view.tsx` 내부에 닫힌다 (훅 시그니처 변경 없음). 페이드아웃은 React Native `Animated.Value` opacity, 오답 카드는 `BrandColors.danger` 기반 변형 스타일 한 개 추가.

**Tech Stack:** TypeScript, React Native (Expo), Firebase Functions (Node), `node:test` + zod schema, `Animated` from `react-native`.

**Spec:** [docs/superpowers/specs/2026-05-09-review-session-soft-landing-design.md](../specs/2026-05-09-review-session-soft-landing-design.md)

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `functions/src/review-feedback.ts` | OpenAI 시스템 프롬프트 빌더 | `CLOSE_MODE_SUFFIX` 상수 본문 교체 |
| `functions/tests/review-feedback.test.ts` | 프롬프트 빌더 단위 테스트 | close 모드 토큰 검사 갱신 |
| `features/quiz/components/review-session-screen-view.tsx` | 복습 세션 화면 뷰 | (a) 오답 피드백 카드 분기 스타일, (b) 입력창 페이드아웃 |

훅 (`use-review-session-screen.ts`)은 변경 없음 — `selectedChoiceIndex`로 뷰에서 직접 `correct` 판별 가능.

---

## Task 1: AI 마무리 프롬프트 톤 조정 (TDD)

**Files:**
- Modify: `functions/src/review-feedback.ts:57-65` (`CLOSE_MODE_SUFFIX` 상수)
- Modify: `functions/tests/review-feedback.test.ts:51-55` (close 모드 토큰 테스트)

### - [ ] Step 1: 실패하는 테스트로 갱신

`functions/tests/review-feedback.test.ts:51-55` 의 close 모드 테스트를 다음으로 교체:

```ts
test('buildSystemPrompt(close)에는 마무리 모드 안내가 포함된다', () => {
  const prompt = buildSystemPrompt('close');
  assert.ok(prompt.includes('마무리 모드'));
  assert.ok(prompt.includes('인정'), 'close 모드는 학생 인정 비트를 강제해야 한다');
  assert.ok(prompt.includes('클로징'), 'close 모드는 따뜻한 클로징을 강제해야 한다');
  assert.ok(
    !prompt.includes('더 이상 떠넘기지'),
    '차가운 표현이 제거되어야 한다',
  );
});
```

### - [ ] Step 2: 테스트 실패 확인

`functions/` 디렉토리에서 실행:

```bash
cd functions && npm test -- --grep "마무리 모드 안내"
```

기대 결과: FAIL — 현재 `CLOSE_MODE_SUFFIX`에는 "인정", "클로징" 토큰이 없고 "더 이상 떠넘기지" 가 있음.

(전체 실행해도 됨: `npm test`. 실패하는 단일 테스트만 보이면 OK.)

### - [ ] Step 3: `CLOSE_MODE_SUFFIX` 본문 교체

`functions/src/review-feedback.ts:57-65` 의 `CLOSE_MODE_SUFFIX` 상수 전체를 다음으로 교체:

```ts
export const CLOSE_MODE_SUFFIX = `

**현재 모드: 마무리 모드 (2차 응답)**
학생이 한 번 더 시도했습니다. 이번이 마지막 응답입니다.
다음 3비트 구조로 작성하세요:
1. **인정**: 학생이 잘 잡은 부분 한 가지를 짧게 인정 (1문장).
2. **핵심**: 정답의 핵심을 한두 문장으로 분명히 정리 (1-2문장).
3. **클로징**: 학생이 마무리할 수 있도록 따뜻한 한 줄로 닫음 (1문장).
   예시: "이 정도면 충분해요", "여기까지면 다음으로 가도 좋아요", "잘 따라왔어요, 한 번 더 풀 때 자연스럽게 떠오를 거예요".

전체 3-4문장 이내. 힌트로 끝내지 말고 반드시 클로징 한 줄로 닫으세요.`;
```

### - [ ] Step 4: 테스트 통과 확인

```bash
cd functions && npm test
```

기대 결과: 모든 테스트 PASS. 특히:
- `buildSystemPrompt(close)에는 마무리 모드 안내가 포함된다` PASS
- 다른 테스트(`buildSystemPrompt에 selectedChoice가 있으면 컨텍스트가 주입된다` 등) 회귀 없음

### - [ ] Step 5: 커밋

```bash
git add functions/src/review-feedback.ts functions/tests/review-feedback.test.ts
git commit -m "feat(review-feedback): 마무리 모드 프롬프트를 인정/핵심/클로징 3비트로 재작성"
```

---

## Task 2: 오답 피드백 카드 — 연한 빨강 변형

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx:153-157` (선택지 모드 피드백 카드)
- Modify: `features/quiz/components/review-session-screen-view.tsx:176-180` (텍스트 모드 칩 아래 피드백 카드)
- Modify: `features/quiz/components/review-session-screen-view.tsx:522-535` (스타일)

### - [ ] Step 1: 오답 카드 스타일 추가

`features/quiz/components/review-session-screen-view.tsx`의 styles 객체에서 `choiceFeedbackCard` 정의 바로 아래(현재 `522-529` 블록 다음)에 추가:

```ts
choiceFeedbackCardWrong: {
  backgroundColor: '#FBEAEA',
  borderLeftColor: BrandColors.danger,
},
```

`choiceFeedbackText`는 변경하지 않음 (텍스트 색은 가독성을 위해 `BrandColors.primary` 유지).

### - [ ] Step 2: 선택지 모드 카드 분기 적용

`features/quiz/components/review-session-screen-view.tsx:153-157` 을 다음으로 교체:

```tsx
{selectedChoiceFeedback && selectedChoiceIndex !== null ? (
  <View
    style={[
      styles.choiceFeedbackCard,
      step.choices[selectedChoiceIndex]?.correct === false &&
        styles.choiceFeedbackCardWrong,
    ]}>
    <Text style={styles.choiceFeedbackText}>{selectedChoiceFeedback}</Text>
  </View>
) : null}
```

(가드를 `selectedChoiceFeedback ? ...`에서 `selectedChoiceFeedback && selectedChoiceIndex !== null ? ...` 로 바꾼 점에 주의 — `step.choices[selectedChoiceIndex]` 안전 접근을 위해 필요. 의미 차이는 없음, `selectedChoiceFeedback`이 있으면 `selectedChoiceIndex`도 항상 not null임.)

### - [ ] Step 3: 텍스트 모드 카드 분기 적용

`features/quiz/components/review-session-screen-view.tsx:176-180` 을 다음으로 교체:

```tsx
{selectedChoiceFeedback && selectedChoiceIndex !== null ? (
  <View
    style={[
      styles.choiceFeedbackCard,
      step.choices[selectedChoiceIndex]?.correct === false &&
        styles.choiceFeedbackCardWrong,
    ]}>
    <Text style={styles.choiceFeedbackText}>{selectedChoiceFeedback}</Text>
  </View>
) : null}
```

(선택지 모드와 동일 코드 — 두 분기에서 같은 카드를 그리고 있음. DRY 추출은 별도 리팩터링 작업으로 미룸.)

### - [ ] Step 4: 시각적 확인 (실기기 또는 시뮬레이터)

`__mock__` 태스크로 복습 세션을 띄워 확인:

```
앱 실행 → 복습 세션 진입 (mock taskId 사용)
1. 정답 선택지 탭 → 카드가 기존 그린 톤(연한 mint 배경 + 진한 그린 좌측 보더)으로 표시되는가
2. 오답 선택지 탭 → 카드가 연한 빨강 배경(#FBEAEA) + 진한 빨강 좌측 보더(#D64545)로 표시되는가
3. 다른 선택지로 바꾸면 카드 색이 즉시 갱신되는가 (정→오, 오→정 모두)
4. 텍스트 모드 (텍스트 입력 시작)에서도 칩 아래 카드 색이 같은 규칙으로 표시되는가
5. 본문 텍스트는 양쪽 모두 가독성 유지 (변경 없음)
```

회귀 위험: `selectedChoiceFeedback`이 있는데 `selectedChoiceIndex`가 null인 케이스. 훅 코드상 불가능하지만 가드를 추가했으므로 안전.

### - [ ] Step 5: 커밋

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(review-view): 오답 선택지 피드백 카드 연한 빨강 변형"
```

---

## Task 3: 입력창 페이드아웃 (150ms)

**Files:**
- Modify: `features/quiz/components/review-session-screen-view.tsx:1-14` (imports)
- Modify: `features/quiz/components/review-session-screen-view.tsx:50-64` (refs/effects)
- Modify: `features/quiz/components/review-session-screen-view.tsx:238-261` (chatInputRow 렌더)

### - [ ] Step 1: `Animated` import 추가

`features/quiz/components/review-session-screen-view.tsx:4-13` 의 `react-native` import 블록을 다음으로 교체:

```ts
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
```

### - [ ] Step 2: opacity ref + effect 추가

`features/quiz/components/review-session-screen-view.tsx:51` (`tabletInputScrollRef` 선언 다음 줄)에 추가:

```ts
const inputFadeAnim = useRef(new Animated.Value(1)).current;
```

그리고 `features/quiz/components/review-session-screen-view.tsx:64` (기존 `chatMessages.length` useEffect 다음)에 추가:

```ts
useEffect(() => {
  if (aiResponseCount >= 2) {
    Animated.timing(inputFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  } else {
    inputFadeAnim.setValue(1);
  }
}, [aiResponseCount, inputFadeAnim]);
```

(`else` 분기는 다음 스텝으로 넘어가 새 카드가 입력 단계로 돌아왔을 때 opacity가 1로 즉시 리셋되도록 보장. resetStepState 호출 후에도 다음 스텝에서 입력창이 처음부터 1로 보여야 함.)

### - [ ] Step 3: chatInputRow를 `Animated.View` 로 교체

`features/quiz/components/review-session-screen-view.tsx:238-261` 의 다음 블록:

```tsx
{aiResponseCount < 2 && (
  <View style={styles.chatInputRow}>
    <TextInput
      style={styles.chatInput}
      value={chatText}
      onChangeText={onChangeChatText}
      onFocus={scrollToBottom}
      placeholder="계속 써보세요..."
      placeholderTextColor={BrandColors.disabled}
      editable={!isLoadingFeedback}
      returnKeyType="send"
      onSubmitEditing={onSendChatMessage}
    />
    <Pressable
      style={[
        styles.sendBtn,
        (!chatText.trim() || isLoadingFeedback) && styles.sendBtnDisabled,
      ]}
      onPress={onSendChatMessage}
      disabled={!chatText.trim() || isLoadingFeedback}>
      <Text style={styles.sendBtnText}>↑</Text>
    </Pressable>
  </View>
)}
```

을 다음으로 교체:

```tsx
<Animated.View
  style={[styles.chatInputRow, { opacity: inputFadeAnim }]}
  pointerEvents={aiResponseCount >= 2 ? 'none' : 'auto'}>
  <TextInput
    style={styles.chatInput}
    value={chatText}
    onChangeText={onChangeChatText}
    onFocus={scrollToBottom}
    placeholder="계속 써보세요..."
    placeholderTextColor={BrandColors.disabled}
    editable={!isLoadingFeedback && aiResponseCount < 2}
    returnKeyType="send"
    onSubmitEditing={onSendChatMessage}
  />
  <Pressable
    style={[
      styles.sendBtn,
      (!chatText.trim() || isLoadingFeedback || aiResponseCount >= 2) &&
        styles.sendBtnDisabled,
    ]}
    onPress={onSendChatMessage}
    disabled={!chatText.trim() || isLoadingFeedback || aiResponseCount >= 2}>
    <Text style={styles.sendBtnText}>↑</Text>
  </Pressable>
</Animated.View>
```

변경 포인트:
- 조건부 mount(`{aiResponseCount < 2 && ...}`) 제거 → 항상 mount.
- `View` → `Animated.View`, opacity 바인딩.
- `pointerEvents` 로 페이드아웃 후 터치 차단.
- `editable` / `disabled`에 `aiResponseCount < 2` / `>= 2` 가드 추가 — 페이드 도중 100ms 짧은 순간에도 입력/전송 차단되도록 (애니메이션 진행 중 사용자 탭 방지).

### - [ ] Step 4: 시각적 확인 (실기기 또는 시뮬레이터)

`__mock__` 태스크로 복습 세션을 띄워 확인:

```
1. 텍스트 입력 → AI 1차 응답 → 입력창에 다시 입력 → 전송 → AI 2차 응답
2. AI 2차 응답 직후 입력창이 150ms에 걸쳐 부드럽게 사라지는가
3. [이해했어요, 다음으로] 버튼이 위로 점프하지 않고 그대로 있는가 (입력창 자리는 빈 공간)
4. 페이드 도중 입력창을 탭해도 입력/전송이 안 되는가
5. [이해했어요, 다음으로] 누르고 다음 스텝으로 가면 입력창이 처음부터 opacity 1로 즉시 보이는가
6. 마지막 스텝 완료 후 완료 화면 정상
```

### - [ ] Step 5: 커밋

```bash
git add features/quiz/components/review-session-screen-view.tsx
git commit -m "feat(review-view): AI 응답 2회 도달 시 입력창 150ms 페이드아웃"
```

---

## Task 4: 통합 검증

### - [ ] Step 1: 타입 체크

```bash
npx tsc --noEmit
```

기대 결과: 에러 없음.

### - [ ] Step 2: Functions 테스트 전체 실행

```bash
cd functions && npm test
```

기대 결과: 모든 테스트 PASS.

### - [ ] Step 3: 시뮬레이터 end-to-end 시나리오

`__mock__` 태스크로 복습 세션 진입 후:

```
시나리오 A (선택지만 사용 — AI 호출 0회):
- 정답 선택지 탭 → 그린 카드
- 오답 선택지 탭 → 빨강 카드
- 다시 정답 → 그린 카드
- [이해했어요, 다음으로] → 다음 스텝 / 입력창 opacity 1 시작 / 카드 사라짐

시나리오 B (텍스트 모드 → 2회 AI):
- 오답 선택지 탭 → 빨강 카드
- 텍스트 입력 시작 → 선택지 영역 사라짐, 칩 + 빨강 카드 유지
- 텍스트 [이해했어요, 다음으로] (or 전송 버튼) → AI 1차 응답
  - AI 응답이 인정 → 핵심 → 따뜻한 클로징 톤인지 확인 (실제 OpenAI 호출 시)
- 추가 입력 → 전송 → AI 2차 응답
  - 입력창이 150ms에 걸쳐 페이드아웃
  - 버튼 점프 없음
- [이해했어요, 다음으로] → 다음 스텝
```

(AI 호출은 실제 functions 배포 후에만 실제 새 프롬프트로 응답함. 로컬 mock으로는 톤 검증 불가, 시각/UX만 검증.)

### - [ ] Step 4: 종료 알림 + 로그

```bash
npm run notify:done -- "복습 세션 soft landing 구현 완료 (마무리 톤 + 페이드아웃 + 오답 빨강 카드)"
```

푸시 + push origin + log:commit 필요 시 별도 진행.

---

## Out of Scope (이 플랜에서 다루지 않음)

- 정답 카드 색 변경 (그대로 유지)
- AI 1차 탐색 모드 프롬프트 변경
- 카드 분기 로직 DRY 추출 (선택지/텍스트 모드 두 곳에 중복) — 별도 리팩터링
- `BrandColors.dangerSoft` 토큰 추가
- 페이드아웃 외 모션 (slide, height collapse 등)
- 빈 공간 collapse 애니메이션 (opacity만 사용)

---

## Success Criteria 매핑

| Spec Success Criterion | 검증 Task |
|---|---|
| 1. AI 2번째 응답이 인정/핵심/클로징 3비트 | Task 1 (테스트) + Task 4 Step 3 (실제 OpenAI 응답 톤 확인) |
| 2. 입력창 150ms 페이드, 버튼 점프 없음 | Task 3 Step 4 |
| 3. 정답 선택지 탭 시 그린 톤 유지 | Task 2 Step 4 |
| 4. 오답 선택지 탭 시 연한 빨강 + danger 보더 | Task 2 Step 4 |
| 5. functions 테스트 모두 통과 | Task 1 Step 4, Task 4 Step 2 |
| 6. iPhone + iPad 양쪽 페이드 어색하지 않음 | Task 3 Step 4 (양 기기에서 반복) |
