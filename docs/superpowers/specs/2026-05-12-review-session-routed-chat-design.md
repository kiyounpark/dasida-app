# Review Session — Routed Chat 설계

- 작성일: 2026-05-12
- 상태: 초안 (사용자 리뷰 대기)
- 관련 스펙:
  - [2026-05-09-review-session-remedial-step-design.md](./2026-05-09-review-session-remedial-step-design.md)
  - [2026-05-09-review-session-ai-minimization-design.md](./2026-05-09-review-session-ai-minimization-design.md)

## 1. 배경

복습 세션은 그동안 두 번의 큰 변형을 겪었다.

1. **초기 (2026-04-08 무렵)** — 각 스텝마다 선택지 + 자유 입력 텍스트가 모두 제공되고, AI와 멀티턴 채팅이 가능했다. UX는 풍부했지만 한 세션당 `스텝 수 × (1 + N턴)` 만큼 AI를 호출해 비용이 컸다.
2. **AI 최소화 (2026-05-09)** — 자유 입력을 걷어내고 선택지만 남겼다. 자유 표현 기회는 오답 시 remedial-flow의 "AI에게 물어보기" 1턴으로 좁아졌다.
3. **Remedial-step (2026-05-09)** — 오답에 대해 약점별로 짜놓은 `explain` / `check` 구조화 콘텐츠를 등장시켰다. AI가 아닌 사전 작성된 콘텐츠로 학습을 진행한다.

현 시점에서 사용자가 두 가지를 지적했다.

- "원래 시작할 때 선택지 + 자유 입력이 둘 다 있던 디자인이 예뻤다. 그게 다시 있었으면 좋겠다."
- "오답 시 AI 응답이 어색하고, 흐름이 끊겨 보인다. 진단(모의고사 약점 분석)처럼 아바타가 있고 화면이 새로 갈리지 않고 아래로 쭉 쌓였으면 좋겠다."
- "자유 입력은 항상 가능했으면 좋겠다 — 없으면 사용자가 주도권이 없다고 느낀다."
- "다만 자유 입력에 대해 AI가 무한 자유 응답하는 건 부담스럽다. 가능하면 짜놓은 remedial-flow로 연결해 달라."

본 스펙은 이 네 가지 요구를 한 번에 푸는 설계다.

## 2. 목표 / 비목표

### 목표

- 시작 화면에 **선택지 + 자유 입력**을 함께 노출 (옛 디자인 부활).
- 화면 전환 없이 **단일 ScrollView에 entry들을 누적**해 사용자가 이전 선택·대화 내역을 위로 스크롤해 볼 수 있게 함. 진단 화면의 [diagnosis-conversation-page.tsx](../../features/quiz/components/diagnosis-conversation-page.tsx) 패턴을 미러링한다.
- AI 응답에 **코치 아바타 + 진단 톤의 말풍선** 적용. [DiagnosisChatBubble](../../features/quiz/components/diagnosis-chat-bubble.tsx)를 그대로 재사용한다.
- 자유 입력 제출 시 **AI 라우터가 가능하면 remedial-flow 노드로 연결**, 매칭 실패 시에만 AI가 직접 응답 (폴백 2턴).
- 사용자는 언제나 자유 입력으로 주도권을 가질 수 있다.

### 비목표

- 무한 멀티턴 채팅 — 폴백 챗은 2턴으로 제한한다 (`SYSTEM_PROMPT`의 `explore` / `close` 모드 그대로 활용).
- Remedial-flow 데이터 구조 자체의 변경 — 노드(`explain` / `check` / `exit`)는 유지.
- 진단 화면의 method-selector 같은 분기 카드 도입 — 복습은 약점이 이미 정해져 있어 분기가 단순하다.
- AI 응답 품질 자체의 일반론적 개선 — 본 스펙은 라우팅 인프라와 UI 통합에 집중. 프롬프트 튜닝은 별도 PR에서.

## 3. 사용자 시나리오

한 스텝 내에서 시간 축을 따라 entry들이 쌓이는 모습:

```
[StepCard]                                          ← 항상 상단
[InputArea: 선택지 가/나/다/라 + 자유 입력 박스]    ← 초기 상태
```

이후는 사용자 행동에 따라 분기.

### 시나리오 A — 자유 입력 (라우터 성공)

```
[👤 user-bubble: "분모를 통분해서 더해야 하는데 왜인지 모르겠어요"]
[🌿 routing-bubble: "분모 통분 부분이 헷갈리시는 것 같아요. 같이 짚어볼까요?"]
[explain 카드: 약점 노드 콘텐츠]
[👤 user 선택: "다음으로" / "모르겠어요"]
[check 카드 또는 다음 explain ...]
...
[exit 도달 → done-cta: "이해했어요, 다음으로"]
```

라우터 호출 1회. 이후 짜놓은 콘텐츠가 진행, 추가 AI 호출 없음.

### 시나리오 B — 자유 입력 (라우터 실패 → 폴백 챗)

```
[👤 user-bubble: "그냥 잘 모르겠어요"]
[🌿 ai-bubble (explore 모드, 1턴)]
[입력 영역 재활성: "한 번 더 이야기해볼래요?"]
[👤 user-bubble: ...]
[🌿 ai-bubble (close 모드, 2턴, 마무리 포함)]
[done-cta]
```

confidence < threshold 또는 라우터가 `unknown` 반환 시 진입. 폴백 챗은 2턴 후 닫힘.

### 시나리오 C — 정답 선택

```
[👤 choice-bubble: "보기 다: ..."]
[정답 피드백 배너]
[done-cta: "이해했어요, 다음으로"]
```

AI 호출 없음.

### 시나리오 D — 오답 선택 (기존 remedial-flow 진입)

```
[👤 choice-bubble: "보기 가: ..."]
[오답 피드백 배너]
[해당 약점의 remedial-flow 첫 노드부터 시작]
```

오답 선택지 → 노드 매핑은 기존처럼 `selectedChoiceFeedback` 로직과 약점별 진입 노드 ID로 결정.

### 시나리오 E — Remedial 도중 자유 입력

Remedial-flow 진행 중 `explain` 노드의 "모르겠어요" 또는 `check` 노드의 "모르겠어요" 누름 시:

```
[입력 영역 활성화 (entry로 inline 등장)]
[👤 user-bubble]
[다시 라우터 호출 — 같은 약점의 노드 중 매칭 시도]
  ├─ 성공 → 다른 remedial 노드로 점프
  └─ 실패 → 폴백 챗 2턴
```

기존의 `RemedialAiHelpCard` / `RemedialAiHelpActions` 한 쌍을 자유 입력 + 라우터로 대체한다.

## 4. 아키텍처

### 4.1 entry-driven 모델

복습 세션 화면은 진단 화면과 동일하게 **entry 배열을 누적**하는 모델로 통일한다.

```ts
export type ReviewEntry =
  | { kind: 'step-card'; stepIndex: number }
  | { kind: 'input-area'; stepIndex: number; interactive: boolean }
  | { kind: 'choice-bubble'; choiceIndex: number; correct: boolean }
  | { kind: 'feedback-banner'; correct: boolean; text: string }
  | { kind: 'user-bubble'; text: string }
  | { kind: 'ai-bubble'; text: string; tone?: 'neutral' | 'positive' | 'warning' | 'info' }
  | { kind: 'remedial-node'; nodeId: string; node: RemedialNode; interactive: boolean }
  | { kind: 'router-loading' }
  | { kind: 'fallback-input'; turn: 1 | 2; interactive: boolean }
  | { kind: 'done-cta'; label: string };
```

화면 전환은 없다. 새 스텝으로 넘어갈 때는 entry 배열을 비우고 새 `step-card` + `input-area` 부터 시작한다 (현재 동작과 동일).

### 4.2 컴포넌트 매핑

| Entry kind | 렌더링 컴포넌트 | 신규/재사용 |
|---|---|---|
| `step-card` | `StepCard` ([step-card.tsx](../../features/quiz/components/review-session/step-card.tsx)) | 재사용 |
| `input-area` | `InputArea` (신규) — 선택지 + 자유입력을 하나로 묶음 | 신규 |
| `choice-bubble` | `DiagnosisChatBubble` `role="user"` | 재사용 |
| `feedback-banner` | 기존 InputSection 내부의 `feedbackBox` 추출 → 독립 컴포넌트 | 일부 추출 |
| `user-bubble` | `DiagnosisChatBubble` `role="user"` | 재사용 |
| `ai-bubble` | `DiagnosisChatBubble` `role="assistant" showAvatar` | 재사용 |
| `remedial-node` | `RemedialExplainCard` / `RemedialCheckCard` | 재사용 |
| `router-loading` | 작은 typing-dots 아바타 줄 | 신규 (작음) |
| `fallback-input` | `FallbackInputCard` — 자유입력 박스 + 전송 | 신규 |
| `done-cta` | 기존 primary 버튼 | 재사용 |

기존 `RemedialAiHelpCard` / `RemedialAiHelpActions` / `chat-section.tsx`는 본 PR에서 제거 대상이다.

### 4.3 ScrollView 구조

```
<ScrollView
  contentInsetAdjustmentBehavior="automatic"
  ref={scrollRef}
  onContentSizeChange={autoScrollIfFlag}
>
  {entries.map(renderEntry)}
</ScrollView>
```

- 자동 스크롤은 기존 `autoScrollFlagRef` 패턴 유지 ([remedial-flow](../../features/quiz/components/review-session/remedial-flow.tsx)와 동일 컨벤션).
- 키보드 인터랙션은 `KeyboardAvoidingView`로 감싸 입력 영역이 가려지지 않도록.

### 4.4 태블릿 레이아웃

기존 `review-session-screen-view.tsx`의 `isTablet` 분기는 유지. 다만 양쪽 컬럼 모두 동일한 `entries`를 공유하고, 왼쪽은 step-card / 오른쪽은 인터랙션 entry들이라는 기존 분배를 따른다. 분배 로직은 `entry.kind` 기준으로 단순 필터링.

## 5. AI 라우터 — `review-router`

진단의 [diagnosis-router.ts](../../features/quiz/diagnosis-router.ts)를 그대로 미러링한다.

### 5.1 API 형태

```ts
export type ReviewRouterInput = {
  weaknessId: WeaknessId;
  stepTitle: string;
  stepBody: string;
  selectedChoiceText?: string;
  selectedChoiceCorrect?: boolean;
  userText: string;
  candidateNodes: ReadonlyArray<{
    id: string;
    summary: string;       // 노드의 학습 요지 (스펙 작성 시 함께 작성)
    triggers: string[];    // 라우팅 유도 예시 발화
  }>;
};

export type ReviewRouterResult = {
  predictedNodeId: string | 'fallback';
  confidence: number;
  reason: string;
  candidateNodeIds: string[];
  source: 'remote' | 'mock';
};

const HIGH_CONFIDENCE_THRESHOLD = 0.65;
```

- `summary` / `triggers`는 각 remedial 노드 데이터에 신규 필드로 추가한다 ([review-remedial-flows.ts](../../data/review-remedial-flows.ts)). 기존 노드의 데이터를 확장만 하므로 후방 호환.
- `confidence < 0.65` 또는 `predictedNodeId === 'fallback'` 이면 폴백 챗으로 넘긴다.

### 5.2 백엔드

신규 Cloud Function `reviewRouter` (region `asia-northeast3`). 시스템 프롬프트:

```
당신은 학생이 자유롭게 적은 이해 표현을 보고
미리 준비된 보완 학습 노드 중 어느 것이 가장 잘 맞는지 분류하는 라우터입니다.

규칙:
- 후보 노드의 id만 반환하세요. 자유 설명은 짧은 reason 필드에만.
- 매칭이 명확하지 않으면 predictedNodeId="fallback" 으로 반환.
- confidence는 0.0–1.0 사이.
```

오프라인/네트워크 실패 시 `analyzeReviewMethodWithMock` — 키워드 기반 휴리스틱으로 대체. 진단 mock 패턴과 동일하게 운영.

### 5.3 비용

- 라우터 1회 호출: 분류 task이므로 짧은 응답, 토큰 적음 (≈ 진단 라우터와 동일 수준).
- 폴백 챗 진입 시: 기존 `review-feedback` 백엔드 (`explore` 1회 + `close` 1회) 재활용. 변경 없음.

평균 한 스텝당 AI 호출 횟수:
- 정답 선택 → 0회
- 오답 선택 → 0회 (라우터 안 탐, remedial-flow 직접 진입). 단, remedial 도중 "모르겠어요"를 누르면 라우터 1회 추가.
- 자유 입력 (라우팅 성공) → 1회
- 자유 입력 (라우팅 실패) → 1 + 1 + 1 = 3회 (라우터 + 챗 2턴)
- Remedial 도중 "모르겠어요" → +1 (라우터). 라우터 실패 시 추가로 폴백 챗 2턴 가능 (+2).

현재 설계(스텝당 최대 1회) 대비 최악의 경우(라우터 실패) 3배지만, 라우터 성공률을 75% 이상 노리면 평균 1.2회 수준.

## 6. 데이터 & 훅 변경

### 6.1 `use-review-session-screen.ts`

기존 상태:
- `stepPhase: 'input' | 'remedial'`
- `selectedChoiceIndex`, `selectedChoiceFeedback`
- `chatMessages`, `chatText`, `aiResponseCount` (deprecated chat-section용)
- `remedialFlowState` (entries, aiHelpState 등 포함)

신규 상태로 통합:
- `entries: ReviewEntry[]` (스텝당 누적, 스텝 이동 시 리셋)
- `inputState: { freeText: string; isRouting: boolean; selectedChoiceIndex: number | null; }`
- `fallbackState: { turn: 0 | 1 | 2; isLoading: boolean; messages: ChatMessage[]; } | null`
- `currentRemedialNodeId: string | null`

`stepPhase`는 entries로부터 파생되므로 제거. 대신 `lastInteractiveEntryKind` 같은 derived selector를 둔다.

### 6.2 분석 이벤트

기존 `analytics`의 review session 관련 이벤트 키는 유지. 신규 추가:
- `review_router_called` — `weaknessId`, `stepIndex`, `source`
- `review_router_succeeded` — `predictedNodeId`, `confidence`
- `review_router_fallback` — `reason`
- `review_fallback_chat_completed` — `turnCount`

## 7. 마이그레이션

본 PR은 한 번에 다 바꾸지 않는다. 단계별:

1. **Phase 1**: `entries` 모델 도입 + 진단 스타일 ScrollView로 화면 재구성. AI 라우터는 아직 없음. 자유 입력은 기존 `review-feedback` 만 호출 (`explore`/`close` 2턴) → 사실상 옛 chat-section 부활.
2. **Phase 2**: `review-router` 백엔드와 클라이언트 추가. 라우터 성공 시 remedial-flow 노드로 점프하는 분기 추가.
3. **Phase 3**: Remedial 도중 "모르겠어요" → 라우터로 다시 통과시키는 D-3 동작 적용.
4. **Phase 4**: 기존 `chat-section.tsx` 및 `RemedialAiHelpCard` / `RemedialAiHelpActions` 제거.

각 phase는 독립 PR로 분리해 회귀 위험을 좁힌다. 본 spec은 Phase 1–2 까지를 다룬다. Phase 3–4는 별도 spec/plan.

## 8. 테스트

### 8.1 단위 테스트
- `review-router`: predict / confidence / fallback 분기. mock 패턴 진단 라우터와 동일.
- `use-review-session-screen`: entries 누적, 자유 입력 → 라우터 성공/실패 분기, 폴백 챗 2턴 종료, remedial 진입.

### 8.2 통합 테스트
- 시나리오 A–E 각각의 entries 시퀀스를 jest snapshot으로 고정.
- 자동 스크롤 동작은 진단 화면의 기존 테스트 패턴 차용.

### 8.3 수동 QA
- iOS / iPad / Android 모두에서 키보드 띄움 시 입력창 가림 없음.
- 라우터 confidence 경계값 부근(0.6 / 0.65 / 0.70) 시나리오 — 발화 샘플 6개 이상 준비.
- 네트워크 끊김 시 mock 폴백 동작.

## 9. 위험과 미해결 질문

### 위험
- **라우터 confidence 튜닝**: 진단과 달리 복습 약점은 단계가 세분돼 후보 노드가 더 많을 수 있다. threshold 0.65가 너무 빡빡하거나 헐거울 수 있어 dogfooding 기간이 필요.
- **노드 메타데이터 작성 비용**: 각 remedial 노드에 `summary` / `triggers` 추가는 사람 손이 든다. 약점이 늘어날수록 부담. → 첫 약점(formula_understanding) 기준 6–10 노드 × 3 trigger 정도로 빠르게 검증.
- **태블릿 분배 로직**: entries가 한 줄로 누적되면서 양쪽 컬럼 배분이 부자연스러울 수 있다 → Phase 1에서 모바일만 먼저 적용, 태블릿은 Phase 2에서 검증.

### 미해결 질문
- Q1. 자유 입력에 사용자가 매우 짧게 ("음", "잘 모르겠어요" 등) 답한 경우 라우터를 호출할 가치가 있나? 또는 클라이언트 사이드 휴리스틱으로 폴백 챗 바로 진입? → 작성자 의견: 5자 미만은 라우터 스킵 + 폴백 챗 바로 진입.
- Q2. Remedial-flow 진행 도중 사용자가 위로 스크롤해 초반 입력 영역으로 돌아가 다시 자유 입력을 보낼 수 있어야 하나? → 작성자 의견: 첫 입력 후 `input-area`의 `interactive`를 false로 잠그고, "다시 묻고 싶으면" 어딘가에 새 `fallback-input`을 띄우는 식.
- Q3. 라우터 호출 중 사용자가 추가 입력을 시도하면? → 작성자 의견: `isRouting === true` 동안 입력 잠금 + typing-dots 표시.

## 10. 참고 자료

- 진단 라우터 구현: [features/quiz/diagnosis-router.ts](../../features/quiz/diagnosis-router.ts)
- 진단 채팅 페이지: [features/quiz/components/diagnosis-conversation-page.tsx](../../features/quiz/components/diagnosis-conversation-page.tsx)
- 코치 아바타: `assets/review/ai-coach-avatar.png`
- 기존 review-feedback 백엔드: [functions/src/review-feedback.ts](../../functions/src/review-feedback.ts)
- Remedial-flow 데이터 구조: [data/review-remedial-flows.ts](../../data/review-remedial-flows.ts)
