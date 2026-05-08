# Review Session — AI 사용 최소화 설계

**Date:** 2026-05-09
**Status:** 기획중

---

## Goal

복습 세션의 AI 사용을 약점분석 흐름과 동일한 철학("필요할 때만 AI 사용")으로 정리한다. 선택지는 결정적 데이터로 처리하고, 자유 텍스트 입력에 한해서만 AI를 호출하되 최대 2회로 제한한다.

---

## Background

### 현재 상태

- 복습 세션은 사용자가 입력(선택지 또는 텍스트)을 하면 항상 OpenAI를 호출한다.
- 선택지에는 `correct: boolean` 정보가 이미 있지만, 미리 작성된 피드백 텍스트는 없어서 AI가 그 자리를 메우고 있다.
- 사용자가 "이해했어요" 버튼을 누르기 전까지 AI와 무한 채팅이 가능하다 (멀티턴 대화).
- 결과적으로 한 복습 세션당 AI 호출이 `스텝 수 × (1 + N턴 채팅)` 만큼 발생한다.

### 약점분석 흐름과의 비교

약점분석은 "메서드 식별"이라는 명확한 분류 작업에만 AI를 1회 호출하고, 그 이후 진단 플로우는 결정적 트리(선택지 분기)로 진행한다. 복습은 같은 프로젝트 안에 있으면서 AI 사용 철학이 다르다.

### 원본 설계 의도

`docs/superpowers/specs/2026-04-03-ebbinghaus-review-design.md`에 명시된 원칙:
> **"입력이 없으면 AI 호출 없이 건너뜀"**

이후 추가된 스펙(2026-04-08)에서 선택지 + 멀티턴 채팅이 도입되면서 AI 호출이 과도해졌다.

---

## 핵심 설계 원칙

1. **선택지는 결정적 데이터** — AI 없이 미리 작성된 피드백으로 처리.
2. **자유 텍스트만 AI 트리거** — 사용자가 자기 말로 풀어쓰는 순간이 AI의 가치가 있는 자리.
3. **AI 응답 횟수 제한** — 한 스텝당 최대 2회 (1차 탐색 + 2차 마무리).
4. **모드 명확화** — 선택지 모드와 텍스트 모드는 화면에서 분리.

---

## 데이터 구조 변경

### `data/review-content-map.ts`

`Choice` 타입에 `feedback` 필드를 추가한다.

```ts
export type Choice = {
  text: string;
  correct: boolean;
  feedback: string;  // ← 신규
};

export type ThinkingStep = {
  title: string;
  body: string;
  example?: string;
  choices: Choice[];
};
```

### 피드백 작성 가이드

- **정답 선택지**: 짧은 확인 + 핵심 한 줄 보강
  - 예: "맞아요! 부호 하나로 판별식 결과가 완전히 뒤바뀌니까요."
- **오답 선택지**: 자연스럽게 짚어주는 부드러운 톤 (틀렸다고 단정 X)
  - 예: "계산 실수도 있겠지만, 더 본질적인 이유가 있어요. 부호에 주목해봐요."

### 작성 범위

- 고1 약점 23개 (현재 콘텐츠가 작성된 범위)
- 각 약점의 모든 `thinkingSteps` × 모든 `choices`
- 일회성 작업

---

## UI 흐름

### 초기 상태 (Input 영역)

```
┌─────────────────────────┐
│ 💭 이 단계, 어떻게 이해했나요?│
│                         │
│ [선택지 1]              │
│ [선택지 2]              │
│ [선택지 3]              │
│                         │
│ ── 또는 직접 써도 돼요 ──│
│ [텍스트 입력창]         │
│                         │
│ [이해했어요, 다음으로]   │  (비활성)
└─────────────────────────┘
```

### 길 A: 선택지 모드

```
사용자가 선택지 탭
    ↓ (즉시, AI 호출 없음)
선택한 선택지 강조 표시
선택지 아래 인라인 피드백 카드 등장
[이해했어요, 다음으로] 활성화
    ↓
다른 선택지 탭하면 → 피드백 교체
    ↓
[이해했어요, 다음으로] 누름 → 다음 스텝
```

**디테일:**
- 선택지 변경은 자유로움 (피드백도 새로 고른 선택지에 맞게 교체)
- 첫 탭이 정답이었는지는 `firstAttemptCorrectRef`에 기록 (기존 로직 유지)
- 피드백은 모달이 아닌 **인라인** 카드 (선택지 영역 바로 아래)

### 길 B: 텍스트 모드

```
사용자가 텍스트 입력창에 한 글자라도 입력
    ↓
선택지 영역 사라짐
고른 선택지가 있었으면 → 작은 칩으로 상단에 남음 (피드백 텍스트도 유지)
입력창 + 전송 버튼 + [이해했어요, 다음으로] 노출
    ↓
사용자가 전송 버튼 누름
    ↓
AI 1차 응답 (탐색 모드 프롬프트)
    ↓
입력창 다시 활성화 → 사용자가 추가 입력 가능
    ↓
사용자가 다시 전송
    ↓
AI 2차 응답 (마무리 모드 프롬프트, 정답 명시)
    ↓
입력창 사라짐 → [이해했어요, 다음으로]만 남음
    ↓
누르면 다음 스텝
```

**디테일:**
- **텍스트를 모두 지우면(0글자) 선택지 영역이 다시 나타난다.** (모드 복귀)
- [이해했어요, 다음으로]는 **AI 응답 도중에도 항상 노출** (사용자가 1차 응답 보고 "아하"하면 즉시 종료 가능)
- 선택지 칩은 시각적 컨텍스트 + AI 페이로드의 컨텍스트 양쪽 역할

### 화면 전환 ([이해했어요, 다음으로] 누른 뒤)

길 A/B 동일:
1. ✓ 체크 표시 + 프로그레스 바 다음 세그먼트 채움 (약 0.5초)
2. 다음 스텝 카드 슬라이드 인
3. 입력 영역 초기 상태로 리셋

마지막 스텝일 경우 → 완료 화면 (`기억났어요/다시 볼게요`, 이번 스펙에서 변경 없음).

---

## AI 호출 규칙

| 상황 | AI 호출 |
|---|---|
| 선택지만 (텍스트 0글자) | ❌ 호출 없음 |
| 텍스트 입력 후 첫 전송 | ✅ 1차 응답 (탐색 모드) |
| 추가 입력 후 두 번째 전송 | ✅ 2차 응답 (마무리 모드) |
| 2차 응답 후 | ❌ 입력창 사라짐, 더 이상 호출 불가 |

### 페이로드 변경 (`features/quiz/review-feedback.ts`)

기존 페이로드 유지 + 선택 컨텍스트 추가:

```ts
export type ReviewFeedbackInput = {
  weaknessId: string;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText?: string;     // ← 신규: 사용자가 선택했던 칩 텍스트 (있으면)
  selectedChoiceCorrect?: boolean; // ← 신규: 그 선택지가 정답이었는지
  messages: ChatMessage[];
};
```

서버에서 `selectedChoiceText`가 있으면 system prompt에 컨텍스트로 주입:
> "사용자는 먼저 다음 선택지를 골랐습니다: '{text}' (정답 여부: {correct}). 이 맥락을 고려해 응답하세요."

### 시스템 프롬프트 분기 (`functions/src/review-feedback.ts`)

`messages` 중 `role: 'assistant'` 메시지 개수로 모드 판별:

**탐색 모드 (assistant 응답 0개):**
> 학생이 자기 말로 표현한 답을 보고, 좋은 부분은 인정하되 핵심 포인트를 직접 알려주지 마세요. 한 발짝만 더 갈 수 있도록 부드러운 힌트나 질문을 던지세요. 2-3문장 이내.

**마무리 모드 (assistant 응답 1개 이상):**
> 학생이 한 번 더 시도했습니다. 더 이상 떠넘기지 말고 명확하게 핵심을 짚어주세요. 학생이 핵심을 잡았으면 인정하고 마무리, 못 잡았으면 정답을 부드럽게 설명하며 마무리하세요. 2-3문장 이내.

기존 "수학 내용 유무 판단 원칙"은 양 모드 모두에 유지 (수학 내용 없는 답변엔 칭찬 X).

---

## 상태 모델

### Hook 상태 변화 (`use-review-session-screen.ts`)

```ts
type StepPhase = 'input' | 'chat';  // 기존과 동일

// 신규 / 변경
type ReviewSessionState = {
  // 기존 유지
  task, steps, currentStepIndex, stepPhase,
  selectedChoiceIndex, userText, chatMessages,
  chatText, isLoadingFeedback, sessionComplete,

  // 의미 변경 / 신규
  selectedChoiceFeedback: string | null;  // ← 신규: 인라인 피드백 텍스트
  aiResponseCount: number;                 // ← 신규: 0, 1, 2 (2이면 입력창 숨김)
};
```

### 모드 전환 로직

```
selectedChoiceIndex !== null && userText === ''
  → 선택지 모드: 선택지 + 피드백 표시

userText.length > 0
  → 텍스트 모드: 선택지 숨김, 칩 표시 (selectedChoiceIndex가 있을 때)

userText === '' (다시 비워짐)
  → 선택지 모드로 복귀
```

### AI 호출 게이팅

```ts
function canSendMessage(): boolean {
  return aiResponseCount < 2 && chatText.trim().length > 0 && !isLoadingFeedback;
}
```

`aiResponseCount === 2` 이상이면 입력창 자체를 렌더링하지 않음.

---

## 변경 파일

| 파일 | 변경 종류 | 내용 |
|---|---|---|
| `data/review-content-map.ts` | Modify | `Choice` 타입에 `feedback` 필드 추가, 고1 약점 23개 모든 선택지에 피드백 텍스트 작성 |
| `features/quiz/hooks/use-review-session-screen.ts` | Modify | 모드 전환 로직, AI 호출 횟수 제한, `selectedChoiceFeedback`/`aiResponseCount` 상태 추가 |
| `features/quiz/components/review-session-screen-view.tsx` | Modify | 인라인 피드백 카드 UI, 선택지 칩 UI, 텍스트 입력 시 선택지 숨김, 입력창 조건부 렌더링 |
| `features/quiz/review-feedback.ts` | Modify | 페이로드에 `selectedChoiceText`/`selectedChoiceCorrect` 추가 |
| `functions/src/review-feedback.ts` | Modify | 시스템 프롬프트 탐색/마무리 모드 분기, 선택 컨텍스트 주입 |

---

## Out of Scope

- 완료 화면 (`기억났어요`/`다시 볼게요`) UI/로직 변경
- 첫 시도 기록(`firstAttemptCorrectRef`)의 활용 로직 (다음 복습 간격 자동 조절 등)
- 복습 알림 스케줄링
- 홈 카드(`review-home-card`) 디자인
- 고3 약점 콘텐츠 추가
- 채팅 메시지 서버 저장
- 선택지 피드백의 다국어 지원

---

## Future

- 첫 시도 정답률 기반 복습 간격 자동 조절
- 약점별 정답률 통계 대시보드
- 사용자 맞춤형 AI 응답 (학년/수준 기반)

---

## Success Criteria

1. 선택지만 탭하고 [이해했어요, 다음으로]까지 누르는 흐름에서 AI 호출이 발생하지 않는다.
2. 텍스트 입력을 시작하면 선택지 영역이 사라지고, 이미 고른 선택지가 있었다면 칩으로 상단에 표시된다.
3. 텍스트를 모두 지우면 선택지 영역이 다시 나타난다.
4. AI는 한 스텝당 최대 2회만 응답하며, 2차 응답 후 입력창이 사라진다.
5. AI 1차 응답은 힌트/유도 톤, 2차 응답은 명확한 정답 설명 톤으로 동작한다 (시스템 프롬프트 분기 검증).
6. AI 페이로드에 사용자가 골랐던 선택지 정보가 포함된다.
7. 길 A(선택지)와 길 B(텍스트) 모두 [이해했어요, 다음으로] 한 버튼으로 통일되며, 동일한 전환 효과(체크 + 프로그레스 채움)가 발생한다.
8. 한 복습 세션당 평균 AI 호출 횟수가 기존 대비 50% 이상 감소한다 (선택지 모드 사용 비율에 따라).
