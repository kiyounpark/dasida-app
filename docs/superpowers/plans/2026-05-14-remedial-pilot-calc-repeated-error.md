# Remedial Pilot — calc_repeated_error (Deep Structure) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `calc_repeated_error` 약점 1개에 대해 (1) ThinkingStep을 자동 교정 게이트로 감사하고, (2) deep 구조의 보완 흐름을 작성·검수해, 새 5-게이트 파이프라인이 작동함을 검증한다.

**Architecture:** 시범은 **현장-안전 모드**. 모든 변경은 git 작업 트리에 머무르고, 커밋은 단계별로 쪼개 git revert 1회로 롤백 가능하게 한다. ThinkingStep 자동 교정과 보완 흐름 작성은 Claude가 페르소나를 입어 수행하고, 5 게이트는 동일 Claude가 각 페르소나로 검수한다(자체 게이트 모델).

**Tech Stack:** TypeScript, Expo/React Native, Vitest (data 디렉토리), Jest (features 디렉토리), tsx/Bash, sympy(Python).

**관련 스펙:**
- 부모 스펙: [2026-05-12-review-session-routed-chat-design.md](../specs/2026-05-12-review-session-routed-chat-design.md) §2 결정 변경
- 본 스펙: [2026-05-13-remedial-content-pipeline-design.md](../specs/2026-05-13-remedial-content-pipeline-design.md) §0 분류 정책

**전제 (선결조건):**
- 페르소나 6명 (content-author / math-teacher / struggling-student / appearance-reviewer / thinkingstep-flow-reviewer / remedial-flow-reviewer) 작성 완료
- 부모/본 스펙 패치 완료
- state.json 초기화 완료 (큐 55개)

**비범위 (시범에서 안 하는 것):**
- 나머지 53개 약점
- 키워드 일괄 작성 (시범 1개만)
- 본 스펙 풀-리라이트 (시범 통과 후 별도)
- UI 컴포넌트 디자인 polish (구조 동작만 검증)

---

## File Structure

**신규 생성:**
- `data/remedial-flows/calc_repeated_error.ts` — 시범 보완 흐름 본문
- `features/quiz/components/review-session/remedial-diagnose-card.tsx` — DiagnoseNode UI
- `features/quiz/components/review-session/remedial-summary-card.tsx` — SummaryNode UI
- `scripts/remedial-pipeline/pilot/` — 시범 산출물 보관 (각 게이트 JSON 결과)

**수정:**
- `data/review-remedial-flows.ts` — DiagnoseNode/SummaryNode 타입 정의 + flow 등록
- `data/review-remedial-flows.test.ts` — 신규 노드 종류 무결성 테스트
- `data/review-content-map.ts` — calc_repeated_error 의 오답 choices에 `remedialFlowStartNodeId` 연결 (필요 시 자동 교정 결과 반영)
- `scripts/remedial-pipeline/keywords.ts` — calc_repeated_error 키워드 추가
- `features/quiz/components/review-session/entry-renderer.tsx` — 신규 카드 라우팅
- `features/quiz/components/review-session/review-entries.test.ts` (필요 시)

---

## Task 1: 신규 노드 타입 정의 (DiagnoseNode, SummaryNode)

**Files:**
- Modify: `data/review-remedial-flows.ts`
- Test: `data/review-remedial-flows.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

`data/review-remedial-flows.test.ts` 끝에 다음 테스트 추가:

```typescript
describe('신규 노드 타입 (deep 구조)', () => {
  it('DiagnoseNode 타입이 export 된다', () => {
    // 타입만 검증 — 런타임 noop
    const node: DiagnoseNode = {
      id: 'test_diag',
      kind: 'diagnose',
      title: '왜 그렇게 골랐어요?',
      body: '어떤 사유에 가까운지 알려주세요.',
      options: [
        { id: 'r1', text: '괄호 안 씀', nextNodeId: 'test_next' },
        { id: 'r2', text: '음수 제곱이 안 보임', nextNodeId: 'test_next2' },
      ],
    };
    expect(node.kind).toBe('diagnose');
  });

  it('SummaryNode 타입이 export 된다', () => {
    const node: SummaryNode = {
      id: 'test_sum',
      kind: 'summary',
      title: '오늘 핵심',
      body: '음수 대입 시 괄호 필수\n항별 계산 후 합산',
      nextNodeId: 'test_exit',
    };
    expect(node.kind).toBe('summary');
  });

  it('RemedialNode 유니언에 diagnose, summary 포함', () => {
    const kinds: RemedialNode['kind'][] = ['explain', 'check', 'exit', 'diagnose', 'summary'];
    expect(kinds.length).toBe(5);
  });
});
```

테스트 파일 상단 import에 `DiagnoseNode`, `SummaryNode` 추가:
```typescript
import {
  getRemedialNode,
  remedialFlows,
  type CheckNode,
  type ExplainNode,
  type ExitNode,
  type RemedialNode,
  type DiagnoseNode,
  type SummaryNode,
} from './review-remedial-flows';
```

- [ ] **Step 2: 테스트 실행, 실패 확인**

```bash
npx vitest run data/review-remedial-flows.test.ts
```

Expected: FAIL — `DiagnoseNode`, `SummaryNode` not exported

- [ ] **Step 3: 타입 정의 추가**

`data/review-remedial-flows.ts` 의 ExitNode 정의 아래에 추가:

```typescript
/**
 * 학생 사유 진단 카드 (deep 보완 흐름 전용, 본 스펙 §0).
 * 정답·오답 개념 없음 — 모든 옵션이 동등하게 다음 노드로 분기.
 */
export type DiagnoseNode = {
  id: string;
  kind: 'diagnose';
  title: string;
  body: string;
  options: ReadonlyArray<{
    id: string;
    text: string;
    nextNodeId: string;
  }>;
};

/**
 * 보완 흐름 정리 카드 (deep 보완 흐름 전용, 본 스펙 §0).
 * "여기까지 왔다"는 성취 신호. nextNodeId 는 보통 exit 노드.
 */
export type SummaryNode = {
  id: string;
  kind: 'summary';
  title: string;
  body: string;
  nextNodeId: string;
};
```

기존 `RemedialNode` 유니언 갱신:
```typescript
export type RemedialNode = ExplainNode | CheckNode | ExitNode | DiagnoseNode | SummaryNode;
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run data/review-remedial-flows.test.ts
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 기존 무결성 테스트가 신규 노드도 검증하도록 보강**

`describe('review-remedial-flows 무결성')` 내 첫 it 블록의 `else if` 체인 끝에 추가:

```typescript
} else if (node.kind === 'diagnose') {
  for (const option of node.options) {
    expect(allIds.has(option.nextNodeId)).toBe(true);
  }
} else if (node.kind === 'summary') {
  expect(allIds.has(node.nextNodeId)).toBe(true);
}
```

테스트 재실행 후 PASS 확인.

- [ ] **Step 6: 커밋**

```bash
git add data/review-remedial-flows.ts data/review-remedial-flows.test.ts
git commit -m "feat(remedial): add DiagnoseNode and SummaryNode types for deep flow

본 스펙 §0 deep 구조 도입에 맞춰 신규 노드 종류 2개 정의:
- DiagnoseNode: 학생 사유 진단 (정답/오답 없음)
- SummaryNode: 보완 흐름 정리 카드

기존 무결성 테스트가 신규 노드의 nextNodeId 참조도 검증."
```

---

## Task 2: DiagnoseNode UI 카드 컴포넌트

**Files:**
- Create: `features/quiz/components/review-session/remedial-diagnose-card.tsx`

- [ ] **Step 1: 카드 컴포넌트 작성**

`features/quiz/components/review-session/remedial-diagnose-card.tsx` 생성:

```typescript
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DiagnoseNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';

type Props = {
  node: DiagnoseNode;
  interactive: boolean;
  onPressOption: (optionId: string) => void;
};

export function RemedialDiagnoseCard({ node, interactive, onPressOption }: Props) {
  const [pickedId, setPickedId] = useState<string | null>(null);

  const handlePick = (optionId: string) => {
    if (!interactive) return;
    setPickedId(optionId);
    onPressOption(optionId);
  };

  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>🤔 잠깐, 같이 짚어볼게요</Text>
      </View>
      <Text style={styles.title}>{node.title}</Text>
      <Text style={styles.body}>{node.body}</Text>
      <View style={styles.options}>
        {node.options.map((option) => {
          const isPicked = pickedId === option.id;
          return (
            <Pressable
              key={option.id}
              style={[styles.optionBtn, isPicked && styles.optionBtnPicked]}
              onPress={() => handlePick(option.id)}
              disabled={!interactive}
              accessibilityRole="button">
              <Text style={styles.optionText}>{option.text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.cardBg,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Paper.cardBorder,
  },
  locked: { opacity: 0.6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Paper.badgeBg, borderRadius: 8, marginBottom: 8 },
  badgeText: { fontSize: 12, color: Paper.badgeText },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: Paper.title },
  body: { fontSize: 14, color: Paper.body, marginBottom: 12, lineHeight: 20 },
  options: { gap: 8 },
  optionBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Paper.cardBorder, backgroundColor: Paper.optionBg },
  optionBtnPicked: { borderColor: Paper.optionPickedBorder, backgroundColor: Paper.optionPickedBg },
  optionText: { fontSize: 14, color: Paper.body },
});
```

⚠️ `Paper.optionBg`, `Paper.optionPickedBorder`, `Paper.optionPickedBg`, `Paper.badgeBg`, `Paper.badgeText` 가 paper-tokens.ts 에 없으면 임시로 기존 토큰(`cardBg`, `cardBorder`, `title`, `body`)으로 대체. 시범에서 색상 polish 는 비범위.

- [ ] **Step 2: paper-tokens.ts 확인 후 누락 토큰 추가**

```bash
cat features/quiz/components/review-session/paper-tokens.ts
```

누락된 토큰만 추가하거나, 위 컴포넌트의 누락 토큰을 기존 토큰으로 대체.

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "remedial-diagnose-card" | head
```

Expected: 0건 (에러 없음)

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/review-session/remedial-diagnose-card.tsx features/quiz/components/review-session/paper-tokens.ts
git commit -m "feat(review-session): add RemedialDiagnoseCard UI"
```

---

## Task 3: SummaryNode UI 카드 컴포넌트

**Files:**
- Create: `features/quiz/components/review-session/remedial-summary-card.tsx`

- [ ] **Step 1: 카드 컴포넌트 작성**

`features/quiz/components/review-session/remedial-summary-card.tsx` 생성:

```typescript
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SummaryNode } from '@/data/review-remedial-flows';
import { Paper } from './paper-tokens';

type Props = {
  node: SummaryNode;
  interactive: boolean;
  onPressContinue: () => void;
};

export function RemedialSummaryCard({ node, interactive, onPressContinue }: Props) {
  return (
    <View style={[styles.card, !interactive && styles.locked]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>⭐ 오늘 짚은 것</Text>
      </View>
      <Text style={styles.title}>{node.title}</Text>
      <Text style={styles.body}>{node.body}</Text>
      <Pressable
        style={[styles.btn, !interactive && styles.btnDisabled]}
        onPress={onPressContinue}
        disabled={!interactive}
        accessibilityRole="button">
        <Text style={styles.btnText}>이해됐어요</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Paper.cardBg,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: Paper.cardBorder,
  },
  locked: { opacity: 0.6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8, backgroundColor: Paper.cardBorder },
  badgeText: { fontSize: 12, color: Paper.title },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: Paper.title },
  body: { fontSize: 14, color: Paper.body, marginBottom: 12, lineHeight: 22 },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: Paper.title },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "remedial-summary-card" | head
```

Expected: 0건

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/components/review-session/remedial-summary-card.tsx
git commit -m "feat(review-session): add RemedialSummaryCard UI"
```

---

## Task 4: entry-renderer.tsx 신규 카드 라우팅

**Files:**
- Modify: `features/quiz/components/review-session/entry-renderer.tsx`
- Modify: `features/quiz/hooks/use-review-session-screen.ts` (props 추가)

- [ ] **Step 1: entry-renderer.tsx 의 `case 'remedial-node'` 안에 diagnose/summary 분기 추가**

기존 case 블록의 `if (node.kind === 'check') { ... }` 다음에 추가:

```typescript
if (node.kind === 'diagnose') {
  return (
    <RemedialDiagnoseCard
      node={node}
      interactive={entry.interactive}
      onPressOption={(opt) => props.onRemedialDiagnoseOption(node.id, opt)}
    />
  );
}
if (node.kind === 'summary') {
  return (
    <RemedialSummaryCard
      node={node}
      interactive={entry.interactive}
      onPressContinue={() => props.onRemedialSummaryContinue(node.id)}
    />
  );
}
```

파일 상단 import 추가:
```typescript
import { RemedialDiagnoseCard } from './remedial-diagnose-card';
import { RemedialSummaryCard } from './remedial-summary-card';
```

props 타입에 핸들러 추가:
```typescript
onRemedialDiagnoseOption: (nodeId: string, optionId: string) => void;
onRemedialSummaryContinue: (nodeId: string) => void;
```

- [ ] **Step 2: use-review-session-screen.ts 에 핸들러 구현**

기존 `onRemedialExplainPrimary` 비슷한 패턴으로 두 핸들러 추가:

```typescript
const onRemedialDiagnoseOption = (nodeId: string, optionId: string) => {
  if (!task) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node || node.kind !== 'diagnose') return;
  const option = node.options.find((o) => o.id === optionId);
  if (!option) return;
  reviewEntries.lockEntry(nodeId);
  const next = getRemedialNode(task.weaknessId, option.nextNodeId);
  if (next && next.kind !== 'exit') {
    reviewEntries.appendEntries([createRemedialNodeEntry(next)]);
  }
};

const onRemedialSummaryContinue = (nodeId: string) => {
  if (!task) return;
  const node = getRemedialNode(task.weaknessId, nodeId);
  if (!node || node.kind !== 'summary') return;
  reviewEntries.lockEntry(nodeId);
  const next = getRemedialNode(task.weaknessId, node.nextNodeId);
  if (next && next.kind !== 'exit') {
    reviewEntries.appendEntries([createRemedialNodeEntry(next)]);
  }
};
```

`lockEntry` 가 review-entries.ts에 없으면 기존 lock 패턴을 따라 추가 (use-review-session-screen.ts 가 이미 쓰는 방식 그대로). 시범에서 안 쓰면 일단 생략 가능 — 핵심은 next 노드 append.

핸들러를 EntryRenderer props로 전달:
```typescript
<EntryRenderer
  entry={entry}
  onRemedialExplainPrimary={onRemedialExplainPrimary}
  onRemedialExplainSecondary={onRemedialExplainSecondary}
  onRemedialCheckOption={onRemedialCheckOption}
  onRemedialCheckDontKnow={onRemedialCheckDontKnow}
  onRemedialDiagnoseOption={onRemedialDiagnoseOption}    // 신규
  onRemedialSummaryContinue={onRemedialSummaryContinue}  // 신규
/>
```

- [ ] **Step 3: TypeScript + 기존 entry-renderer 테스트 통과 확인**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "entry-renderer\|review-session-screen" | head
npx jest features/quiz/components/review-session/entry-renderer.test.tsx
```

Expected: 0건 + 기존 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add features/quiz/components/review-session/entry-renderer.tsx features/quiz/hooks/use-review-session-screen.ts
git commit -m "feat(review-session): wire DiagnoseNode and SummaryNode into renderer"
```

---

## Task 5: ThinkingStep 감사 (calc_repeated_error)

**Files:**
- Read: `data/review-content-map.ts` (calc_repeated_error 엔트리)
- Create: `scripts/remedial-pipeline/pilot/thinkingstep-review-result.json` (검수 결과 보관)
- Modify (자동 교정 발동 시): `data/review-content-map.ts` 의 calc_repeated_error 엔트리

- [ ] **Step 1: pilot 디렉토리 생성**

```bash
mkdir -p scripts/remedial-pipeline/pilot
```

- [ ] **Step 2: ThinkingStep 검수자 페르소나로 검수 실행**

Claude가 [thinkingstep-flow-reviewer.md](../../scripts/remedial-pipeline/prompts/thinkingstep-flow-reviewer.md) 페르소나를 입고 calc_repeated_error 의 다음 데이터를 검수:
- heroPrompt
- 3개 thinkingSteps (각 title/body/example/choices/feedback)

검수 결과를 페르소나 출력 형식 그대로 JSON으로 작성:

```bash
# 결과를 다음 파일에 저장
scripts/remedial-pipeline/pilot/thinkingstep-review-result.json
```

JSON 구조 (페르소나 출력 형식 그대로):
```json
{
  "verdict": "approve" | "reject",
  "weaknessId": "calc_repeated_error",
  "studentJourney": "...",
  "issues": [...]
}
```

- [ ] **Step 3: 결과 분기**

**3-a. verdict = "approve" 또는 issues에 blocker 0개:**
- ThinkingStep 자동 교정 없이 통과
- Task 6으로 넘어감

**3-b. verdict = "reject" (blocker ≥ 1):**
- 거절 사유 모아 content-author 페르소나(모드 2)로 ThinkingStep 재작성
- `data/review-content-map.ts` 의 calc_repeated_error 엔트리 자동 수정
- 보존 필드: `id`, `choices[].correct`, `choices[].remedialFlowStartNodeId`, `choices[].weaknessId`
- 수정 가능: `heroPrompt`, `title`, `body`, `example`, `feedback` 텍스트
- 재검수 → 통과까지 반복 (3회 상한)
- 3회 실패 시 STOP. 슬랙으로 보고 (`npm run notify:fail -- "..."`)

- [ ] **Step 4: 변경 시 커밋, 또는 검수 결과만 커밋**

자동 교정 발동 시:
```bash
git add data/review-content-map.ts scripts/remedial-pipeline/pilot/thinkingstep-review-result.json
git commit -m "fix(thinkingstep): auto-correct calc_repeated_error per gate review

검수자 거절 사유 N건 반영. 보존된 필드: id, correct, remedialFlowStartNodeId, weaknessId.
검수 결과 보관: scripts/remedial-pipeline/pilot/thinkingstep-review-result.json"
```

자동 교정 없이 통과 시:
```bash
git add scripts/remedial-pipeline/pilot/thinkingstep-review-result.json
git commit -m "test(thinkingstep): audit calc_repeated_error — approved without edits"
```

---

## Task 6: 키워드 + 매핑 (calc_repeated_error)

**Files:**
- Modify: `scripts/remedial-pipeline/keywords.ts`
- Run: `scripts/remedial-pipeline/map-intent-to-weakness.ts`
- Output: `scripts/remedial-pipeline/intent-weakness-map.json`

- [ ] **Step 1: keywords.ts 에 calc_repeated_error 키워드 추가**

`scripts/remedial-pipeline/keywords.ts` 의 `weaknessKeywords` 객체에 추가:

```typescript
calc_repeated_error: [
  '대입',
  '음수 대입',
  '괄호',
  '부호 실수',
  '계산 실수',
  '항별 계산',
  '음수 제곱',
  '재계산',
],
```

⚠️ 정확한 키워드는 calc_repeated_error 의 약점 정의(`diagnosisMap.desc`: "개념은 알고 있지만 부호/사칙연산에서 반복 실수가 발생했습니다.")와 ThinkingStep 본문에서 도출. 위 8개는 후보 — 매핑 결과 보고 조정.

- [ ] **Step 2: 매핑 실행**

```bash
tsx scripts/remedial-pipeline/map-intent-to-weakness.ts
```

Expected: 콘솔에 `calc_repeated_error: N건` 출력. `intent-weakness-map.json` 갱신.

- [ ] **Step 3: 매핑 결과 검토**

```bash
jq '.calc_repeated_error | length, .calc_repeated_error[0:3]' scripts/remedial-pipeline/intent-weakness-map.json
```

검토 기준:
- 매핑 사례 ≥ 5건 → 진행
- 0~4건 → 키워드 추가/조정 후 재실행 (3회 상한)
- 5건 이상 매핑돼도 intent 텍스트가 약점과 무관하면 키워드 정밀화

- [ ] **Step 4: 커밋**

```bash
git add scripts/remedial-pipeline/keywords.ts scripts/remedial-pipeline/intent-weakness-map.json
git commit -m "feat(remedial): add calc_repeated_error keywords + mapping

N건 매핑됨. 시범 1개에 한정. 나머지 53개 키워드는 본 배치 단계에서 일괄 작성."
```

---

## Task 7: 보완 흐름 작성 (calc_repeated_error, deep)

**Files:**
- Create: `data/remedial-flows/calc_repeated_error.ts`

- [ ] **Step 1: 콘텐츠 작성자 페르소나로 deep 보완 흐름 작성**

Claude가 [content-author.md](../../scripts/remedial-pipeline/prompts/content-author.md) 페르소나를 입고 다음 입력으로 작성:

**입력:**
1. 약점 ID: `calc_repeated_error`
2. 보완 깊이: `deep`
3. 매핑된 시험 풀이 사례 (Task 6 결과)
4. 참고 패턴: `data/remedial-flows/formula_understanding.ts` (구조), 단 deep 확장
5. ThinkingStep 정의 (Task 5 통과한 최종 상태)

**출력 파일:** `data/remedial-flows/calc_repeated_error.ts`

구조 (deep, content-author.md §B 따름):
```
약점에는 step 3개 × 오답 2개씩 = 6개 진입점
각 진입점:
  → diagnose (사유 2~3개)
  → 사유별 explain
  → check
  → (정답) summary → exit
  → (오답) diagnose 2 → explain (핀포인트) → check 재시도
   
   prefix: 'calc'
   총 노드 수: 30~50 추정
```

명명 규칙:
- 진입점 explain: `calc_step1_A_diagnose` (오답 A로 들어왔을 때 진단)
- 사유별 explain: `calc_step1_A_r1_explain`, `calc_step1_A_r2_explain`
- check: `calc_step1_A_r1_check`
- summary: `calc_step1_summary` 또는 `calc_summary`
- exit: `calc_step1_exit`

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "calc_repeated_error" | head
```

Expected: 0건

- [ ] **Step 3: 커밋 (검수 전 초안)**

```bash
git add data/remedial-flows/calc_repeated_error.ts
git commit -m "feat(remedial): draft calc_repeated_error deep flow (pre-gates)

deep 구조 시범. 다음 단계에서 5 게이트 통과해야 등록 가능."
```

---

## Task 8: 5 게이트 검수 (보완 흐름)

**Files:**
- Read: `data/remedial-flows/calc_repeated_error.ts`
- Create: `scripts/remedial-pipeline/pilot/gate-results/` 디렉토리에 각 게이트 결과 JSON

- [ ] **Step 1: 5 게이트 순차 실행**

각 게이트 페르소나로 검수해 결과를 다음 파일에 저장:

```
scripts/remedial-pipeline/pilot/gate-results/
  math-teacher.json
  struggling-student.json
  sympy.json
  appearance-reviewer.json
  remedial-flow-reviewer.json   ← 신규 후보 A
```

게이트 순서:
1. **수학 교사** ([math-teacher.md](../../scripts/remedial-pipeline/prompts/math-teacher.md)) — 수식·논리 정확성. blocker 0개 + approve
2. **수포자 학생** ([struggling-student.md](../../scripts/remedial-pipeline/prompts/struggling-student.md)) — 노드별 이해 평가. confused 0개 + approve
3. **sympy** — 1번 결과의 `equationsToVerify` 추출해 [verify-formulas.py](../../scripts/remedial-pipeline/verify-formulas.py) 실행. 모든 식 ok=true
4. **외형 검수자** ([appearance-reviewer.md](../../scripts/remedial-pipeline/prompts/appearance-reviewer.md)) — 분량·구조·톤 (depth=deep). issues=[] + approve
5. **보완 흐름 검수자** ([remedial-flow-reviewer.md](../../scripts/remedial-pipeline/prompts/remedial-flow-reviewer.md)) — 그래프 전체 시뮬레이션. issues=[] + approve

- [ ] **Step 2: 결과 분기**

**2-a. 5개 다 통과:**
- Task 9로 진행

**2-b. 하나라도 reject:**
- 모든 거절 사유 모음
- content-author 페르소나(모드 1)로 보완 흐름 재작성. 통과한 노드는 건드리지 않음
- 5 게이트 재실행
- 3회 재시도 상한 — 도달 시 STOP, 슬랙 알림 (`npm run notify:fail`)

- [ ] **Step 3: 통과 시 게이트 결과 커밋**

```bash
git add scripts/remedial-pipeline/pilot/gate-results/
git commit -m "test(remedial): gate results for calc_repeated_error — all 5 approved

수학 교사 / 수포자 학생 / sympy / 외형 검수자 / 보완 흐름 검수자 모두 approve."
```

재작성 발동 시 매 시도마다 커밋:
```bash
git add data/remedial-flows/calc_repeated_error.ts scripts/remedial-pipeline/pilot/gate-results/
git commit -m "fix(remedial): retry N — apply gate feedback for calc_repeated_error"
```

---

## Task 9: 보완 흐름 등록 + 무결성 테스트

**Files:**
- Modify: `data/review-remedial-flows.ts` (registry에 등록)
- Modify: `data/review-content-map.ts` (calc_repeated_error 오답 choices에 remedialFlowStartNodeId 연결)
- Test: `data/review-remedial-flows.test.ts`

- [ ] **Step 1: registry에 등록**

`data/review-remedial-flows.ts` 의 import + remedialFlows 객체에 추가:

```typescript
import { calc_repeated_error_flow } from './remedial-flows/calc_repeated_error';

export const remedialFlows: Partial<Record<WeaknessId, RemedialFlow>> = {
  formula_understanding: formula_understanding_flow,
  discriminant_calculation: discriminant_calculation_flow,
  calc_repeated_error: calc_repeated_error_flow,
};
```

- [ ] **Step 2: review-content-map의 calc_repeated_error 오답 choices에 진입점 연결**

각 step 의 오답 choice 에 `remedialFlowStartNodeId` 와 `weaknessId` 추가. 예 (step1, "값을 바로 대입하면 된다" 오답):

```typescript
{
  text: '값을 바로 대입하면 된다',
  correct: false,
  feedback: '...',
  remedialFlowStartNodeId: 'calc_step1_A_diagnose',
  weaknessId: 'calc_repeated_error',
},
```

3개 step × 2개 오답 = 6곳 연결.

⚠️ 진입점 노드 ID는 Task 7 에서 작성한 실제 노드 이름과 일치해야 함.

- [ ] **Step 3: 무결성 테스트 통과 확인**

```bash
npx vitest run data/review-remedial-flows.test.ts
```

Expected: 모든 테스트 PASS. 특히 다음이 통과:
- 모든 노드의 nextNodeId 가 실제 노드를 가리킴
- DiagnoseNode/SummaryNode 의 옵션·nextNodeId 도 검증

테스트 fail 시 누락된 노드 ID 추적해 보완 흐름 또는 ID 컨벤션 수정.

- [ ] **Step 4: 커밋**

```bash
git add data/review-remedial-flows.ts data/review-content-map.ts
git commit -m "feat(remedial): register calc_repeated_error deep flow

review-content-map 의 6개 오답 choice 에 remedialFlowStartNodeId 연결.
무결성 테스트 모두 통과."
```

---

## Task 10: 시범 종합 검토 + 의사결정

**Files:**
- Create: `scripts/remedial-pipeline/pilot/pilot-summary.md`

- [ ] **Step 1: pilot-summary.md 작성**

다음 내용 포함:

```markdown
# Remedial Pilot — calc_repeated_error 결과

## 처리 요약
- ThinkingStep 자동 교정: N회 (또는 0회, 통과)
- 보완 흐름 작성 → 게이트 재시도: N회
- 최종 노드 수: M개 (depth=deep, 예상 30~70 범위 검증)
- 토큰 누적: ~XK

## 게이트별 코멘트 요약
- 수학 교사: ...
- 수포자 학생: ...
- sympy: ...
- 외형 검수자: ...
- 보완 흐름 검수자: ...

## 발견된 시스템 이슈
- (자동 교정 결과 어색했던 부분, 게이트가 못 잡은 부분 등)

## §0 분류 정책 검증
- calc_repeated_error 분류: shallow / deep 중 어떤 게 맞았나
- 추정 기준 (`diagnosisMap.desc` 키워드 매칭) 정확했나
- 본 배치 분류 가이드 갱신 필요사항

## 다음 단계 결정
- (a) 그대로 본 배치 진입 (53개)
- (b) 구조 손본 후 시범 1개 추가
- (c) 기존 시범 2개 (formula_understanding, discriminant_calculation) 재작성 여부

## 토큰 추정 갱신 (본 스펙 §7.6)
- 실측 deep 토큰: ~XK/약점
- 53개 추정: ~YM
- Claude Code 한도 도달 횟수 추정
```

- [ ] **Step 2: 슬랙 알림**

```bash
npm run notify:done -- "calc_repeated_error 시범 완료. 결과 검토 대기. scripts/remedial-pipeline/pilot/pilot-summary.md 참조."
```

- [ ] **Step 3: 커밋**

```bash
git add scripts/remedial-pipeline/pilot/pilot-summary.md
git commit -m "docs(remedial): pilot summary for calc_repeated_error"
```

- [ ] **Step 4: 사용자 검토 대기**

여기서 멈추고 사용자와 검토. 시범 결과에 따라 본 배치 / 추가 시범 / 구조 손봄 결정.

---

## 토큰 예산 & 정지점

각 Task의 누적 토큰을 추적. 추정:
- Task 1~4 (코드): ~50K
- Task 5 (ThinkingStep 감사 + 자동 교정 N회): ~200~500K
- Task 6 (키워드 매핑): ~5K
- Task 7 (deep 보완 흐름 작성, 1차): ~150K
- Task 8 (5 게이트, 1차): ~250K
- Task 8 재시도(있는 경우): ×N회 누적
- Task 9~10: ~50K

**1회 retry 가정 누적 추정: ~1.0~1.5M 토큰**

Claude Code 한도 도달 시:
- state.json + pilot/ 디렉토리 보존
- `npm run notify:fail -- "한도 도달. 현 시점 Task N에서 정지. 재개는 사용자 새 세션에서."`
- 자연 정지

---

## 롤백 절차

문제 발생 시:
1. 커밋 단위로 git revert 가능 (모든 Task 가 커밋 분리됨)
2. 가장 보수적: `git revert` 로 시범 전체 되돌림
3. ThinkingStep 자동 교정 단독 되돌림: Task 5 커밋만 revert
4. 보완 흐름 단독 되돌림: Task 9 (등록) + Task 7 (초안) revert
5. UI 변경 단독 되돌림: Task 2~4 revert
