# Review Session — Soft Landing 설계

**Date:** 2026-05-09
**Status:** 기획중

---

## Goal

복습 세션의 세 가지 거친 마무리 경험을 다듬는다.

1. AI 2번째 응답 톤이 딱딱하게 끊기는 문제
2. AI 2회 제한 도달 시 입력창이 즉시 사라지며 화면이 점프하는 문제
3. 오답 선택지 피드백 카드가 정/오답 구분 없이 동일 스타일인 문제

---

## 변경 1: AI 마무리 모드 톤 조정

**파일:** `functions/src/review-feedback.ts`

### 기존 `CLOSE_MODE_SUFFIX` (실제 코드 기준)

```
**현재 모드: 마무리 모드 (2차 응답)**
학생이 한 번 더 시도했습니다. 이번이 마지막 응답입니다.
- 학생이 핵심을 잡았으면: 짧게 인정하고 핵심 한 줄을 다시 명확히 짚어주며 마무리하세요.
  예시: "맞아요! 결국 핵심은 [정답 핵심]이에요."
- 학생이 못 잡았으면: 더 이상 떠넘기지 말고 정답을 부드럽게 명시하며 마무리하세요.
  예시: "잘 따라왔어요. 핵심을 정리하면 [정답 명시]예요."
힌트로 끝내지 말고 반드시 닫는 톤으로 작성하세요.
```

기존도 이미 "닫는 톤" 강제 + 분기 구조를 가지고 있으나, "더 이상 떠넘기지 말고" 같은 표현이 학생 입장에서 차가움을 유발할 수 있고, 마지막 한 줄이 정답 단언으로 끝나 다음 단계로의 자연스러운 전환 신호가 없음.

### 변경 후 `CLOSE_MODE_SUFFIX`

```
**현재 모드: 마무리 모드 (2차 응답)**
학생이 한 번 더 시도했습니다. 이번이 마지막 응답입니다.
다음 3비트 구조로 작성하세요:
1. **인정**: 학생이 잘 잡은 부분 한 가지를 짧게 인정 (1문장).
2. **핵심**: 정답의 핵심을 한두 문장으로 분명히 정리 (1-2문장).
3. **클로징**: 학생이 마무리할 수 있도록 따뜻한 한 줄로 닫음 (1문장).
   예시: "이 정도면 충분해요", "여기까지면 다음으로 가도 좋아요", "잘 따라왔어요, 한 번 더 풀 때 자연스럽게 떠오를 거예요".

전체 3-4문장 이내. 힌트로 끝내지 말고 반드시 클로징 한 줄로 닫으세요.
```

### 의도

기존 "더 이상 떠넘기지 말고" 같은 차가운 지시어를 제거하고, 학생 인정으로 시작 → 핵심 → 따뜻한 클로징의 정형 구조로 강제. 마지막 클로징 한 줄이 화면 전환 전에 이미 "여기서 정리되는구나" 신호를 학생에게 줌.

### 테스트 영향

`functions/tests/review-feedback.test.ts`의 close 모드 테스트 토큰 갱신 필요:

```ts
// 기존
assert.ok(prompt.includes('명시'));

// 변경
assert.ok(prompt.includes('인정'));
assert.ok(prompt.includes('클로징'));
```

---

## 변경 2: 입력창 페이드아웃

**파일:** `features/quiz/components/review-session-screen-view.tsx`

### 기존

[`review-session-screen-view.tsx:238`](../../../features/quiz/components/review-session-screen-view.tsx)

```tsx
{aiResponseCount < 2 && (
  <View style={styles.chatInputRow}>
    {/* TextInput + 전송 버튼 */}
  </View>
)}
```

`aiResponseCount === 2` 도달 즉시 unmount → 입력창 자리가 사라지면서 아래 [이해했어요, 다음으로] 버튼이 위로 점프.

### 변경

`Animated.Value` (opacity) 사용:

```tsx
const inputFadeAnim = useRef(new Animated.Value(1)).current;

useEffect(() => {
  if (aiResponseCount >= 2) {
    Animated.timing(inputFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }
}, [aiResponseCount]);

// 렌더 (조건부 mount → 항상 mount + opacity 애니메이션)
<Animated.View
  style={[styles.chatInputRow, { opacity: inputFadeAnim }]}
  pointerEvents={aiResponseCount >= 2 ? 'none' : 'auto'}>
  {/* TextInput + 전송 버튼 */}
</Animated.View>
```

### 레이아웃 트레이드오프

- 입력창은 opacity 0 후에도 **공간을 그대로 차지함** → [이해했어요] 버튼은 점프 없음.
- 대신 화면 하단에 빈 박스가 남는 형태가 됨. 이는 의도된 트레이드오프 (점프 vs 빈 공간 중 빈 공간 선택).
- AI 클로징 한 줄이 이미 전환 신호를 주므로 빈 공간이 어색하지 않음 (학생 시선이 이미 [이해했어요]로 이동).
- 캡션, 안내 문구 추가 없음 (Y안 결정).

---

## 변경 3: 오답 피드백 카드 — 연한 빨강

**파일:** `features/quiz/components/review-session-screen-view.tsx`

### 기존 정답 카드 (실제 코드)

[`review-session-screen-view.tsx:522-535`](../../../features/quiz/components/review-session-screen-view.tsx)

```ts
choiceFeedbackCard: {
  marginTop: BrandSpacing.sm,
  padding: BrandSpacing.md,
  backgroundColor: '#F0FDF4',           // 연한 mint
  borderRadius: BrandRadius.md,
  borderLeftWidth: 3,
  borderLeftColor: BrandColors.primary, // 진한 브랜드 그린
},
choiceFeedbackText: {
  fontFamily: FontFamilies.regular,
  fontSize: 14,
  lineHeight: 20,
  color: BrandColors.primary,
},
```

현재는 정/오답 구분 없이 **모두 그린 톤**으로 표시되고 있음.

### 변경

**정답 카드: 그대로 유지** (브랜드 그린 활용 — 사용자 결정).

**오답 카드: 연한 빨강 변형 추가.**

```ts
// 추가
choiceFeedbackCardWrong: {
  backgroundColor: '#FBEAEA',       // 연한 빨강 (BrandColors.danger 파생, 향후 dangerSoft 토큰화 검토)
  borderLeftColor: BrandColors.danger, // '#D64545'
},
```

뷰 분기:

```tsx
{selectedChoiceIndex !== null && selectedChoiceFeedback ? (
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

### 디자인 결정

- **본문 텍스트 색은 유지** (`BrandColors.primary` 유지) — 가독성 우선. 카드 배경 + 좌측 보더만으로 정/오답 신호 충분.
- **아이콘 추가 없음**.
- 빨강 톤은 `BrandColors.danger`(`#D64545`)를 좌측 보더에, 그 파생 연한 톤을 배경에 사용. 향후 디자인 시스템에 `dangerSoft` 추가 가치 있음 (별도 작업).

### 훅 변경 없음

기존 스펙에서 `selectedChoiceFeedback: { text, correct } | null` 으로 타입 변경을 제안했으나, **뷰가 이미 `selectedChoiceIndex` + `step.choices`를 갖고 있어 한 줄로 분기 가능** → 훅 시그니처 변경 불필요. Surgical change 원칙에 따라 훅은 그대로 둔다.

---

## 변경 파일 요약

| 파일 | 변경 내용 |
|---|---|
| `functions/src/review-feedback.ts` | `CLOSE_MODE_SUFFIX` 본문을 "인정 → 핵심 → 클로징" 3비트 구조로 재작성 |
| `functions/tests/review-feedback.test.ts` | close 모드 테스트 토큰 갱신 (`'명시'` → `'인정'` + `'클로징'`) |
| `features/quiz/components/review-session-screen-view.tsx` | 입력창 페이드아웃(150ms) + 오답 피드백 카드 빨강 변형 |

---

## Out of Scope

- 정답 카드 색상 변경 (현재 그린 톤 그대로 활용)
- 본문 텍스트 색 변경
- AI 1차(탐색) 모드 프롬프트 변경
- 페이드 외 다른 모션 (슬라이드, height 애니메이션 등)
- 빨강 카드 아이콘
- 캡션/안내 문구 추가
- `BrandColors.dangerSoft` 토큰 추가 (향후 디자인 시스템 정리 시)
- 훅 시그니처 변경

---

## Success Criteria

1. AI 2번째 응답이 "인정 → 핵심 → 따뜻한 클로징" 3비트로 일관되게 나오며, "더 이상 떠넘기지 말고" 같은 차가운 표현이 사라진다.
2. `aiResponseCount === 2` 도달 시 입력창이 150ms opacity 페이드아웃으로 사라지고, [이해했어요, 다음으로] 버튼은 점프하지 않는다.
3. 정답 선택지 탭 시 인라인 피드백 카드가 기존 그린 톤으로 표시된다.
4. 오답 선택지 탭 시 인라인 피드백 카드가 연한 빨강 배경 + `BrandColors.danger` 좌측 보더로 표시된다.
5. `functions/tests/review-feedback.test.ts` 가 모두 통과한다.
6. 실기기(iPhone + iPad) 양쪽에서 페이드 후 빈 공간이 시각적으로 어색하지 않다.
