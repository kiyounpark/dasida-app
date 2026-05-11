# 복습 세션: 오답별 보완 학습 흐름 설계

**작성일**: 2026-05-09 (개정 2026-05-11: 노드 그래프 패턴 + AI 도움은 "모르겠어요" 트리거로 통일; 자체 리뷰로 발견된 모순/누락 11건 일괄 패치)
**대상**: `features/quiz/components/review-session/*`, `features/quiz/hooks/use-review-session-screen.ts`, `data/review-content-map.ts`, `data/review-remedial-flows.ts` (신규)
**상태**: 기획중

> 본 spec은 초안 폐기 후 재작성됨. 핵심 메탈모델은 **진단 시스템 (`detailedDiagnosisFlows.ts`, `use-diagnosis-ai-help.ts`)의 노드 그래프 + chatEntries 누적 + AI 보조 패턴을 그대로 복습 보완에 이식**하는 것이다.

---

## 1. 배경과 목적

복습 세션의 `ThinkingStep`에 선택지가 있지만 현재는 어떤 선택을 해도 동일한 `currentStepIndex + 1`로 진행한다. 학습자가 다른 오답을 골라도 같은 화면을 본다.

이 설계는 **각 오답이 진단 시스템과 동일한 패턴으로 자기에게 맞는 노드 그래프로 분기**되도록 만든다. 학습자는 보완 노드를 따라가며 미니 확인 문제로 개념을 점검하고, 통과하면 자동으로 다음 ThinkingStep으로 이동한다. 콘텐츠는 전부 사전 작성되고, AI는 분기 결정이 아닌 학습자의 추가 질문에 한해 보조적으로 호출된다.

---

## 2. 핵심 결정 사항

| 결정 | 내용 |
|---|---|
| 분기 모양 | 오답 → 선택지별 보완 노드 그래프 → 자동으로 본류 ThinkingStep으로 합류 |
| 정답 시 | 메인 챗 진입 없이 **바로 다음 ThinkingStep** (현재 코드와 다름) |
| 콘텐츠 출처 | 사전 작성된 정적 노드 매핑. AI 생성 ❌ |
| 노드 종류 | `ExplainNode`, `CheckNode`, `ExitNode` (진단 시스템 패턴 차용) |
| ExplainNode 액션 | "다음으로" (primary) + "모르겠어요" (secondary) — 진단 시스템과 동일 |
| 자동 진행 | `CheckNode` 정답 도달 시 시스템이 자동으로 `ExitNode` 경유 → 다음 ThinkingStep |
| 표시 방식 | 노드들이 `chatEntries` 패턴으로 카드 누적 (스크롤 대화 형식). 이전 카드는 잠금. |
| AI 도움 진입 | 별도 버튼 X. **"모르겠어요" 클릭이 트리거** — 처음 클릭: AI 입력 카드 자동 노출 / 이후 클릭: fallback 노드로 진행 (진단 시스템 패턴) |
| AI 도움 한도 | 보완 흐름 1회 진입(= 한 ThinkingStep의 한 오답 분기)당 **1회** (진단 시스템과 동일) |

---

## 3. 흐름 다이어그램

```
[ThinkingStep 1: 선택지 A/B/C]
   │
   ├─ B(정답) ──────────────────────────────→ ThinkingStep 2 (자동)
   │
   ├─ A(오답) ──→ remedialFlow.A_start
   │                ↓
   │              ExplainNode_A (설명)
   │                ├─ "다음으로"   → CheckNode_A
   │                └─ "모르겠어요" → (aiHelpUsed=false) AI 입력 카드 노출
   │                                    ↓ 입력 → AI 응답 → actions 카드
   │                                    ├─ "다시 풀어볼게요" → CheckNode_A
   │                                    └─ "여전히 모르겠어요" → secondaryNextNodeId 노드
   │                                  (aiHelpUsed=true) 즉시 secondaryNextNodeId 노드
   │              CheckNode_A (확인 문제)
   │                ├─ 정답 → ExitNode → ThinkingStep 2 (자동)
   │                ├─ 오답 → ExplainNode_A_remedy → CheckNode_A 재진입
   │                └─ "모르겠어요" → 위와 동일한 AI 도움 트리거 (dontKnowNextNodeId)
   │
   └─ C(오답) ──→ remedialFlow.C_start ── (A와 동일 구조, C 맞춤 콘텐츠) → ThinkingStep 2
```

**중요한 invariant:**
- 모든 경로는 반드시 같은 `ExitNode` → 같은 다음 ThinkingStep으로 합류 (skip 없음, 점프 없음)
- 진입 경로(B 정답 / A·C 보완 통과)와 무관하게 다음 ThinkingStep은 동일
- `firstAttemptCorrectRef`는 첫 선택 시점에 기록되며 보완 진행에 영향받지 않음

---

## 4. 데이터 구조

### 4.1 ThinkingStep / Choice 확장

`data/review-content-map.ts`:

```ts
export type Choice = {
  text: string;
  correct: boolean;
  feedback: string;
  remedialFlowStartNodeId?: string;  // 신규: 오답일 때 갈 보완 노드 시작점
};

export type ThinkingStep = {
  id: string;                  // 신규: 고유 키 (예: "formula_understanding.step1")
  title: string;
  body: string;
  example?: string;
  choices: Choice[];
};
```

**규약:**
- 정답 Choice는 `remedialFlowStartNodeId`를 갖지 않는다 (정답 시 바로 다음 step).
- 모든 오답 Choice는 `remedialFlowStartNodeId`를 가져야 한다 (없으면 런타임 fallback으로 다음 step 직행하되 콘솔 경고).

### 4.2 보완 노드 그래프

`data/review-remedial-flows.ts` (신규):

```ts
import type { WeaknessId } from './diagnosisMap';

export type RemedialNode = ExplainNode | CheckNode | ExitNode;

export type ExplainNode = {
  id: string;
  kind: 'explain';
  title: string;
  body: string;
  primaryLabel: '다음으로';
  primaryNextNodeId: string;
  secondaryLabel: '모르겠어요';
  secondaryNextNodeId: string;
};

export type CheckNode = {
  id: string;
  kind: 'check';
  title: string;
  prompt: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    nextNodeId: string;        // 정답이면 ExitNode id, 오답이면 재설명 노드 id
  }[];
  dontKnowNextNodeId: string;  // "모르겠어요" 보조 경로
};

export type ExitNode = {
  id: string;
  kind: 'exit';
  // ExitNode 도달 = 다음 ThinkingStep으로 자동 진행
};

export type RemedialFlow = {
  nodes: Record<string, RemedialNode>;
};

// 약점 → 노드 그래프
export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = {
  formula_understanding: {
    nodes: {
      // Choice A 오답 분기
      'fu_step1_A_explain': { kind: 'explain', /* ... */ },
      'fu_step1_A_check':   { kind: 'check',   /* ... */ },
      'fu_step1_A_remedy':  { kind: 'explain', /* ... */ },
      // Choice C 오답 분기
      'fu_step1_C_explain': { kind: 'explain', /* ... */ },
      'fu_step1_C_check':   { kind: 'check',   /* ... */ },
      'fu_step1_exit':      { kind: 'exit' },
      // ... step2/step3
    },
  },
};

export function getRemedialNode(
  weaknessId: WeaknessId,
  nodeId: string,
): RemedialNode | undefined {
  return remedialFlows[weaknessId]?.nodes[nodeId];
}
```

**설계 근거:**
- 진단 시스템의 `DetailedDiagnosisFlow` 구조를 의도적으로 모방. 이미 학습자가 익숙한 인터랙션 패턴이고 코드 메타포도 공유한다.
- 노드는 약점 단위로 묶임 → 약점별 콘텐츠 PR 분리 가능.
- 모든 정답 경로는 `kind: 'exit'` 노드로 수렴 → 종료 조건이 코드/데이터에서 명시적.

**`nodeId` 명명 컨벤션 (강제):**
- 형식: `<weakness_prefix>_step<N>_<choice>_<role>`
  - `weakness_prefix`: 약점 약어 (예: `fu` = formula_understanding, `dc` = discriminant_calculation)
  - `step<N>`: ThinkingStep 번호 (예: `step1`)
  - `choice`: 분기 시작 선택지 ID (예: `A`, `C`). 공용 노드(`exit` 등)는 생략
  - `role`: 노드 역할 (`explain`, `check`, `remedy`, `easy`, `exit`)
- 예: `fu_step1_A_explain`, `fu_step1_A_check`, `fu_step1_A_remedy`, `fu_step1_exit`
- 같은 weakness 내에서 nodeId가 유일해야 하며, 다른 weakness와는 prefix로 격리.

---

## 5. 화면 컴포넌트 구조

```
features/quiz/components/review-session/
├─ step-card.tsx                 (기존)
├─ input-section.tsx             (기존, 첫 선택지만 받음 — 자유 텍스트 입력 UI는 본 spec에서 제거)
├─ chat-section.tsx              (기존 — 본 spec 범위에서는 사용 안 함, §11 참고)
├─ remedial-flow.tsx             (신규) — 카드 누적 스크롤 컨테이너
├─ remedial-explain-card.tsx     (신규) — ExplainNode 카드 ("다음으로" + "모르겠어요" 버튼)
├─ remedial-check-card.tsx       (신규) — CheckNode 카드 (선택지 + "모르겠어요" 버튼)
├─ remedial-ai-help-card.tsx     (신규) — AI 입력 카드 (진단 시스템 `DiagnosisAiHelpCard` 패턴)
├─ remedial-ai-help-actions.tsx  (신규) — AI 응답 후 후속 액션 카드 (`DiagnosisAiHelpActionsCard` 패턴)
└─ remedial-transition-card.tsx  (신규) — ExitNode 도달 시 짧은 전환 안내
```

**`remedial-flow.tsx` 동작:**
- 진단 시스템의 `chatEntries` 패턴을 그대로 차용.
- `entries: RemedialEntry[]` 상태 보유. 각 entry kind:
  - `'node'` — 보완 노드 카드 (ExplainNode/CheckNode 렌더)
  - `'user-bubble'` — 학습자가 누른 액션이나 입력 텍스트 ("모르겠어요" / AI 입력 텍스트)
  - `'ai-help-input'` — AI 질문 입력 카드 (입력칸 + 전송 버튼)
  - `'ai-bubble'` — AI 응답 텍스트
  - `'ai-help-actions'` — AI 응답 후 후속 액션 카드 ("다시 풀어볼게요" / "여전히 모르겠어요")
  - `'transition'` — ExitNode 도달 시 전환 안내 카드
- 새 노드 추가 시 이전 entry들은 `interactive: false`로 잠금 (시각적으로 흐림, 액션 불가).
- ScrollView로 누적, 새 entry 추가 시 자동 스크롤 to bottom (`requestDiagnosisAutoScroll` 패턴 차용).

**카드 디자인 (paper-tokens 팔레트 사용):**
- ExplainNode: cream/edge 보더, honey 배지 "💡 잠깐 짚고 가요"
- CheckNode: paper 배경, 선택지 버튼 (정답/오답은 클릭 후 forest/rust 보더로 표시)
- AI 버블: forest100 배경, 학습자 버블: rustSoft 배경 (진단 시스템 톤과 일치)
- ExitNode 전환 안내: 짧은 카드 + 페이드 아웃 후 다음 ThinkingStep으로 (카피와 타이밍은 구현 시점에 결정)

---

## 6. 훅 (use-review-session-screen.ts) 변경

### 6.1 phase 정리

```ts
type StepPhase = 'input' | 'remedial';
//                          ^^^^^^^^ 신규. 기존 'chat'은 본 spec에서 사용 안 함.
```

### 6.2 신규 상태

```ts
const [remedialFlowState, setRemedialFlowState] = useState<{
  weaknessId: WeaknessId;
  currentNodeId: string;
  entries: RemedialEntry[];
  aiHelpUsed: boolean;                                           // 진단 시스템 패턴 (카운터 X)
  aiHelpState: { nodeId: string; input: string; isLoading: boolean } | null;
} | null>(null);
```

### 6.3 핸들러 변경/추가

- **`onPressNext`** (현재 정답·오답 모두 AI 호출하던 함수) → 분기 재작성:
  ```
  if (choice.correct) → onPressContinue() 즉시 호출 (다음 ThinkingStep)
  else if (choice.remedialFlowStartNodeId) → setStepPhase('remedial') + entries 초기화
  else → onPressContinue() fallback (콘솔 경고)
  ```
- **`onPressRemedialChoice(nodeId, optionId)`** (신규): CheckNode 옵션 클릭. 선택한 option의 `nextNodeId`가 ExitNode면 `onPressContinue()` 호출. 아니면 다음 노드 entry 추가.
- **`onPressRemedialPrimary(nodeId)`** (신규): ExplainNode "다음으로" 버튼. `primaryNextNodeId` 노드 entry 추가.
- **`onPressRemedialSecondary(nodeId)`** (신규): "모르겠어요" 클릭. 진단 패턴:
  - `aiHelpUsed === false` → user-bubble("모르겠어요") + ai-help-input entry 추가, `aiHelpUsed = true`
  - `aiHelpUsed === true` → 즉시 `secondaryNextNodeId`/`dontKnowNextNodeId` 노드 entry 추가 (fallback)
- **`onChangeRemedialAiHelpInput(text)`** (신규): AI 입력 카드의 입력값 변경.
- **`onSendRemedialAiHelp()`** (신규): `requestReviewFeedback` 호출 (노드 컨텍스트 + 학습자 질문). 응답을 user-bubble + ai-bubble + ai-help-actions entry로 추가.
- **`onPressRemedialAiHelpAction(action)`** (신규): actions 카드 선택. `'continue'` → 원래 흐름의 다음 노드, `'fallback'` → secondary 경로.
- **`onPressContinue`** (다음 step 이동): index 기반 → `id` 기반으로 변경되지만 동작은 동일. 보완 상태 전체 리셋.
- **`onSelectChoice`** (기존): 동작 유지. 단, 첫 선택 시점에 `firstAttemptCorrectRef[currentStepIndex]`(기존)와 `firstAttemptChoiceIndexRef[currentStepIndex] = index`(신규)를 함께 기록.

**미사용 처리(메인 챗 관련):**
- `onSendChatMessage`, `onChangeChatText`, `chatMessages`, `chatText`, `aiResponseCount` 등은 메인 챗 제거에 따라 본 spec 범위에서 사용 안 함. 즉시 삭제하지 않고 §11 정책에 따라 cleanup PR에서 정리.

**에러 처리 (진단 패턴 차용):**
- `requestReviewFeedback` 호출 실패 시 `aiHelpState.error` 설정 + 입력 카드에 에러 메시지 표시 ("응답이 조금 늦고 있어요. 다시 시도하거나 더 쉬운 설명으로 이어갈 수 있어요." 톤).
- 실패 시 `aiHelpUsed`는 false 유지 → 학습자가 재시도 가능.
- 사용자가 명시적으로 재시도 포기하고 다시 "모르겠어요" 누르면 fallback 노드로 진행.

### 6.4 리셋 정책

다음 ThinkingStep 이동 시:
- `remedialFlowState = null` (entries, aiHelpUsed 포함 전체 폐기)

---

## 7. AI 도움 통합 (진단 시스템 패턴 차용)

### 7.1 진입 트리거 — 별도 버튼 없음

**"AI 도움" 버튼을 따로 만들지 않는다.** 진단 시스템과 동일하게 노드의 **"모르겠어요" 버튼이 컨텍스트에 따라 두 가지 일을 한다**:

- `aiHelpUsed === false`인 상태에서 "모르겠어요" 클릭:
  → "모르겠어요" 텍스트 user-bubble entry 추가
  → AI 입력 카드 entry 추가 (입력칸 + 전송 버튼)
  → `aiHelpUsed = true` 마킹
- `aiHelpUsed === true`인 상태에서 "모르겠어요" 클릭:
  → AI 안 띄움, 즉시 노드의 `secondaryNextNodeId`(ExplainNode) 또는 `dontKnowNextNodeId`(CheckNode)로 fallback 진행

이로써 학습자에게는 **인터페이스가 "모르겠어요" 하나로 통일**되고, 시스템이 알아서 "처음엔 AI에게 물어볼 기회 / 이후엔 더 쉬운 경로"를 결정한다.

### 7.2 한도

- 보완 흐름 1회 진입(= 한 ThinkingStep의 한 오답 분기)당 **1회** AI 응답 (진단 시스템과 동일)
- 한도는 `aiHelpUsed: boolean`으로 추적 (카운터 아님)
- ExitNode 도달 또는 다음 ThinkingStep 이동 시 `aiHelpUsed = false`로 리셋

### 7.3 호출 인터페이스

기존 `features/quiz/review-feedback.ts`의 `requestReviewFeedback`을 재사용하되 노드 컨텍스트 옵션 필드 확장:

```ts
{
  weaknessId,
  stepTitle, stepBody,
  selectedChoiceText, selectedChoiceCorrect,
  messages,
  remedialContext?: {                       // 신규
    nodeId: string;
    nodeKind: 'explain' | 'check';
    nodeTitle: string;
    nodeBody?: string;
    nodePrompt?: string;
    nodeOptions?: string[];
  };
}
```

### 7.4 응답 누적 및 후속 액션

진단 시스템의 `createBubbleEntry` / `createAiHelpEntry` / `createAiHelpActionsEntry` 패턴을 보완용으로 유사 헬퍼 작성.

```
entries: [
  { kind: 'node',           interactive: false, payload: ExplainNode_A },     // 잠금
  { kind: 'user-bubble',    text: '모르겠어요' },                              // "모르겠어요" 클릭 트리거
  { kind: 'ai-help-input',  interactive: false, /* 전송 후 비활성 */ },        // AI 입력 카드 (제출 전)
  { kind: 'user-bubble',    text: 'b/2가 왜 절반인지 모르겠어요' },             // 학습자 입력
  { kind: 'ai-bubble',      text: '... AI 응답 ...' },
  { kind: 'ai-help-actions', interactive: true,
    options: ['다시 풀어볼게요', '여전히 모르겠어요'] },                          // 후속 액션 카드
]
```

**actions 카드 옵션 동작:**
- "다시 풀어볼게요"
  - ExplainNode 컨텍스트에서 띄운 AI 도움이라면 → `primaryNextNodeId` 노드로 진행 (예: CheckNode)
  - CheckNode 컨텍스트에서 띄운 AI 도움이라면 → 같은 CheckNode를 다시 활성화해 학습자가 답을 다시 시도
- "여전히 모르겠어요" → `secondaryNextNodeId`(ExplainNode 컨텍스트) / `dontKnowNextNodeId`(CheckNode 컨텍스트) 노드로 fallback

진단 시스템의 `aiHelpUsed: true` + actions 카드 패턴을 그대로 차용하므로 UI/인터랙션 학습 비용이 낮다.

---

## 8. 약점 분석 데이터 캡처

기존 모의고사 스키마(`features/learning/types.ts`)와 동일한 그릇에 데이터를 붓는다. 새 컬럼 추가 없음.

- **`firstSelectedIndex`** (현재 미사용): 신규 채움. 첫 시도에 고른 choice index — "어떤 오답을 자주 고르는지" 신호.
- **`isCorrect`** (`firstAttemptCorrectRef` → 매핑): 기존 그대로.
- **`usedAiHelp`** (기존): step별 `aiHelpUsed` 값을 누적해 매핑. 보완 흐름에서 AI 도움이 한 번이라도 활성화되면 true. (메인 챗은 본 spec 범위에서 사용 안 함, §11)
- **`wrongAttempts`** (현재 미사용): 보완 흐름 안 CheckNode 오답 클릭 횟수를 step별로 누적. 약점 강도 신호.

훅 내부 임시 메모리 ref (`recordAttempt` 호출 시점에 위 스키마로 변환):
- `firstAttemptChoiceIndexRef: number[]` (신규) — `onSelectChoice`에서 첫 선택 시점에 기록
- `aiHelpUsedPerStepRef: boolean[]` (신규) — step별 AI 도움 사용 여부 누적
- `wrongAttemptsPerStepRef: number[]` (신규) — step별 CheckNode 오답 클릭 누적

---

## 9. 콘텐츠 작성

### 9.1 규모

약점 7개 × step 평균 3개 = 21개 ThinkingStep. 각 step의 오답 선택지 평균 2개. 오답별 보완 그래프 = ExplainNode 1~2 + CheckNode 1 + (오답 재설명용) ExplainNode 0~1 + 공용 ExitNode 1.

작성 분량(약점 1개 기준):
- step 3개 × 오답 2개 × 노드 ~3개 = **약 18 노드 × 약점 7개 = ~126 노드**

직관적으로 크지만 노드 1개의 텍스트 분량은 진단 시스템 수준(짧은 title + 1~3문장 body)이라 현실적이다.

### 9.2 작성 순서

1. 데이터 구조 / 코드는 한 번에 작성하되 콘텐츠는 약점 단위로 진행
2. 시범 약점: `formula_understanding` 먼저 (가장 콘텐츠가 잘 정비된 약점)
3. 시범 약점 UX 검증 → 나머지 약점 일괄 작성

### 9.3 작성 템플릿

```ts
// 약점 단위 콘텐츠 파일 (예: data/remedial-flows/formula_understanding.ts)
export const formula_understanding_flow: RemedialFlow = {
  nodes: {
    'fu_step1_A_explain': {
      kind: 'explain',
      title: '...',           // 1줄 요약
      body: '...',            // 1~3문장 설명
      primaryLabel: '다음으로',
      primaryNextNodeId: 'fu_step1_A_check',
      secondaryLabel: '모르겠어요',
      secondaryNextNodeId: 'fu_step1_A_easy',
    },
    'fu_step1_A_check': {
      kind: 'check',
      title: '확인 문제',
      prompt: '...',
      options: [
        { id: 'correct', text: '...', isCorrect: true, nextNodeId: 'fu_step1_exit' },
        { id: 'wrong1',  text: '...', isCorrect: false, nextNodeId: 'fu_step1_A_remedy' },
      ],
      dontKnowNextNodeId: 'fu_step1_A_easy',
    },
    // ...
  },
};
```

---

## 10. 회귀 위험 / 검증

### 10.1 회귀 위험

- **현재 메인 챗을 통과하던 경로가 사라짐** — 현재는 정답·오답 모두 `onPressNext` → AI → chat phase로 가는데, 이 흐름이 완전히 없어진다. `chat-section.tsx`, 관련 hook 상태(`chatMessages`, `aiResponseCount`)는 본 spec 범위에서 사용 안 함 (§11에서 별도 다룸).
- **`firstAttemptCorrectRef`** 기록 시점은 `onSelectChoice` 그대로 유지. 보완 진행과 무관해야 함.
- **`recordAttempt`의 `selectedIndex` 등 필드**가 null → 실제 값으로 채워지면서 기존 통계 화면이 변경된 입력에 잘 반응하는지 점검.

### 10.2 테스트

**단위:**
- `getRemedialNode(weaknessId, nodeId)`가 정의된 노드를 반환
- ExplainNode primary/secondary 분기, CheckNode 정답/오답 분기

**훅:**
- 정답 선택 → 즉시 다음 step (보완 진입 안 함, `entries` 비어 있음)
- 오답 선택 + remedial 정의됨 → `remedial` phase, entries에 시작 노드 추가
- 오답 선택 + remedial 미정의 → fallback 다음 step (콘솔 경고)
- CheckNode 정답 → ExitNode 경유 → 다음 step + 보완 상태 리셋
- CheckNode 오답 → `nextNodeId` 노드 entry 추가
- "모르겠어요" → `dontKnowNextNodeId` / `secondaryNextNodeId` 노드 추가
- `aiHelpUsed === false`에서 "모르겠어요" → user-bubble + ai-help-input entry 추가, `aiHelpUsed = true`
- `aiHelpUsed === true`에서 "모르겠어요" → fallback 노드로 즉시 진행 (AI 입력 카드 안 띄움)
- AI 응답 후 actions 카드 노출, "다시 풀어볼게요"/"여전히 모르겠어요" 분기
- 다음 step 이동 시 `aiHelpUsed = false`, `entries = []`

**e2e (`formula_understanding`):**
- 정답만으로 종주 (모든 step 정답 → 끝까지 진행, 보완 진입 0)
- A 오답 → 보완 → CheckNode 정답 → 다음 step
- A 오답 → 보완 → CheckNode 오답 → 재설명 → 재시도 정답 → 다음 step
- A 오답 → 보완 → ExplainNode에서 "모르겠어요" → AI 입력 카드 → 질문 입력 → AI 답변 → "여전히 모르겠어요" → fallback 노드(`secondaryNextNodeId`) → CheckNode → 통과
- A 오답 → 보완 → "모르겠어요" → AI 답변 받음 → "다시 풀어볼게요" → CheckNode → 통과
- A 오답 → 보완 → AI 1회 사용 후 다른 노드에서 또 "모르겠어요" 클릭 → AI 안 뜸, 즉시 fallback 노드로 진행 (aiHelpUsed=true 가드 동작 확인)

---

## 11. 메인 챗(`chat-section.tsx`) 처리

본 spec에서는 보완 흐름이 모든 사용자 인터랙션을 책임지므로 메인 챗 진입 경로(`onPressNext` → `requestReviewFeedback` → chat phase)는 **본 spec 범위에서 사용되지 않는다**. 단, 다음 처리:

- **`chat-section.tsx` 컴포넌트는 즉시 삭제하지 않음** — 한동안 dead code로 보존하고, 모든 약점의 보완 콘텐츠가 완성된 시점에 정리(별도 cleanup PR).
- **`requestReviewFeedback`은 보완 흐름의 AI 도움이 재사용** — 시그니처를 §7.3처럼 확장만.
- **메인 챗의 `aiResponseCount` 상태와 enoughCard UI는 본 spec에서 사용 안 함** — 보완 흐름의 한도 처리는 `aiHelpUsed: boolean` + fallback 노드 진행 방식이라 enoughCard 패턴을 재활용하지 않는다. 메인 챗을 제거하는 cleanup PR에서 같이 정리.
- **훅의 `onSendChatMessage`, `chatMessages`, `aiResponseCount` 등 상태/핸들러는 본 spec에서 사용 안 함** — 외부 export 인터페이스에서 제거하거나 deprecated 표시 (cleanup PR에서 결정).

---

## 12. 범위 밖 (Non-goals)

- 보완 흐름 안 노드의 동적 생성 (전부 사전 작성)
- 학습자가 보완 흐름을 임의로 종료(skip)하는 UI — CheckNode 통과만이 정상 종료
- 정답 시 심화 step 점프 (선형 본류 유지)
- 메인 챗(`chat-section.tsx`) 즉시 삭제 (§11)

---

## 13. 미해결 항목

- **ExitNode 도달 시 전환 안내 카드의 카피와 표시 시간** — 즉시 전환 vs 1초 정도 안내 카드 노출 후 전환. 구현 시점에 UX 시연으로 결정.
- **"모르겠어요" 보조 경로의 콘텐츠 작성 정책** — 모든 ExplainNode가 `secondaryNextNodeId`를 가져야 하는지, 일부는 더 쉬운 ExplainNode를 공유해도 되는지. 콘텐츠 작성 단계에서 결정.
- **`wrongAttempts` 매핑 여부** — 보완 흐름 안 CheckNode 오답 누적을 실제로 저장할지, 통계 가치를 평가 후 결정.
