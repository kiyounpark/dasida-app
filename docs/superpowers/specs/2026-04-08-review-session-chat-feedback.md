# Review Session: AI 피드백 채팅 전환

**날짜:** 2026-04-08
**상태:** 기획중

---

## 배경

현재 복습 세션에서 AI는 학생 입력에 한 번만 응답하고 끝난다. 학생이 "그러게요" 같은 모호한 답변을 입력하면 AI가 구체적인 설명을 유도하지만, 학생이 다시 답변할 방법이 없다. 대화가 이어져야 실질적인 학습이 가능하다.

---

## 범위

### 핵심 변화

**input phase** (기존과 동일):
- 선택지 버튼 + 자유 텍스트 입력 + "다음으로" 버튼
- 선택지 또는 텍스트 없으면 버튼 비활성 (기존 동일)

**chat phase** (신규 — 첫 "다음으로" 누른 후):
- 선택지와 기존 입력 카드 사라짐
- 학생의 첫 입력(선택지 텍스트 또는 직접 입력)이 첫 번째 초록 버블로 표시
- AI 응답이 왼쪽 연두 버블로 표시
- 하단: 텍스트 입력창 + 전송 버튼
- 하단: "이해했어요, 다음 단계로" 버튼 항상 노출 (chat 시작부터)
- 학생이 추가 입력 → 전송 → AI 응답 → 반복
- "이해했어요" → 기존 `onPressContinue` 호출 (다음 단계 또는 완료)

**채팅 버블 스타일:**
- 학생 메시지: 오른쪽 정렬, 초록(`BrandColors.primary`) 배경, 흰 텍스트
- AI 메시지: 왼쪽 정렬, 연두(`#F0FDF4`) 배경, ✨ 아이콘, 어두운 텍스트

---

## 상태 변화

| 기존 | 변경 후 |
|---|---|
| `aiFeedback: string \| null` | `chatMessages: Array<{role: 'user' \| 'ai', text: string}>` |
| `stepPhase: 'input' \| 'feedback'` | `stepPhase: 'input' \| 'chat'` |
| `onPressNext` | `onPressNext` (첫 전송 + chat 전환) |
| 없음 | `onSendChatMessage(text: string)` (후속 전송) |
| `isLoadingFeedback: boolean` | 유지 (chat 중 로딩도 동일하게 처리) |

`onPressNext`는 'input' phase에서만 호출됨.  
`onSendChatMessage`는 'chat' phase 하단 입력에서 호출됨.

---

## Firebase 함수 변경

### 요청 페이로드

기존:
```ts
{
  weaknessId, stepTitle, stepBody,
  selectedChoiceText: string | null,
  userText: string | null
}
```

변경 후:
```ts
{
  weaknessId, stepTitle, stepBody,
  messages: Array<{ role: 'user' | 'assistant', content: string }>
}
```

`selectedChoiceText`와 `userText`는 제거하고, 첫 번째 user 메시지를 클라이언트에서 조합해서 `messages[0]`으로 전달한다:
- 선택지 선택: `"선택: [선택지 텍스트]"`
- 직접 입력: 입력 텍스트 그대로
- 둘 다: `"선택: [선택지 텍스트]\n직접 쓴 내용: [텍스트]"`

### 시스템 프롬프트 변경

기존 프롬프트에 두 가지 추가:

1. **단계 범위 제약:** "오직 현재 단계의 개념만 다루세요. 다른 단계 내용이나 다음 개념을 먼저 언급하지 마세요."
2. **대화 연속성:** OpenAI `messages` 배열로 전달하여 이전 대화 맥락을 AI가 인식하도록 함

### OpenAI 호출 변경

기존: `userContent` 문자열 단일 메시지  
변경: `messages` 배열 전체를 OpenAI chat completion messages로 전달 (system prompt + messages)

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `features/quiz/hooks/use-review-session-screen.ts` | `chatMessages` 상태, `onSendChatMessage` 핸들러, `stepPhase` 타입 변경 |
| `features/quiz/components/review-session-screen-view.tsx` | chat phase UI (버블 목록 + 하단 입력 + 이해했어요 버튼) |
| `features/quiz/review-feedback.ts` | 요청 타입을 `messages` 배열로 변경 |
| `functions/src/review-feedback.ts` | `messages` 배열 수신, OpenAI multi-turn 호출, 프롬프트 강화 |

---

## 비범위

- 채팅 메시지 서버 저장 (대화 내역은 세션 중에만 유지)
- 채팅 턴 수 제한 (강제하지 않음, 학생이 자유롭게)
- 선택지 버튼의 chat phase 재활성화
- 타이핑 인디케이터 (AI 응답 로딩 중 애니메이션)

---

## 성공 기준

- "다음으로" 누른 후 입력 카드가 채팅 UI로 전환된다
- 학생 메시지가 오른쪽 초록 버블, AI 메시지가 왼쪽 연두 버블로 표시된다
- 하단 입력창에 텍스트를 쓰고 전송하면 AI가 이전 대화 맥락을 인식해 응답한다
- AI가 다음 단계 내용을 먼저 언급하지 않는다
- "이해했어요, 다음 단계로" 버튼을 누르면 다음 단계로 이동한다
- "그러게요" 같은 모호한 입력 → AI가 설명 유도 → 학생이 다시 입력 → AI가 맥락 인식해 응답하는 흐름이 동작한다
