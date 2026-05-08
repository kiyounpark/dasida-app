# 약점 진단 분석 화면: 선택지 탭 후 자동 스크롤 (앵커 방식)

## 배경

10문제 약점 진단을 마친 후, 틀린 문제마다 대화형 분석(`DiagnosisConversationPage`)이 진행된다. 사용자가 `DiagnosisFlowCard`의 선택지 버튼을 탭하면, 다음 두 항목이 채팅 흐름에 추가된다:

1. 사용자의 선택을 표시하는 user bubble (`DiagnosisChatBubble role='user'`)
2. 다음 AI 노드 (`DiagnosisFlowCard` 또는 다른 카드)

현재 자동 스크롤 로직(`requestDiagnosisAutoScroll` → `shouldAutoScrollToEnd` → `scrollRef.current?.scrollToEnd`)이 존재하지만 두 가지 문제가 있다.

### 문제 1: 타이밍 버그

`requestAnimationFrame` 시점에 새로 추가된 entry의 레이아웃 계산이 끝나지 않아, `scrollToEnd`가 옛 contentSize 기준으로 스크롤된다. 결과: 사용자가 선택지를 눌러도 화면이 거의 움직이지 않는다.

### 문제 2: `scrollToEnd`가 최선의 UX가 아님

새 AI 카드(`DiagnosisFlowCard`)가 화면보다 큰 경우, "맨 아래"로 스크롤하면 카드의 마지막 선택지만 보이고 **카드 타이틀과 본문(사용자가 정작 읽어야 할 부분)이 화면 위로 잘려나간다.**

## 목표

사용자가 선택지를 탭한 직후:

- 본인이 누른 선택을 user bubble로 화면 상단 근처에서 명확히 볼 수 있다.
- 그 아래로 펼쳐지는 새 AI 카드를 **시작부터** 읽을 수 있다.
- ChatGPT/Claude 채팅의 "질문 → 응답" 스크롤 앵커 패턴과 동일한 느낌.

## 비목표

- 페이지 가로 페이저(틀린 문제 간 스와이프) 동작 변경 없음.
- `scrollToEnd` 동작이 필요한 다른 시나리오(예: AI help 응답 도착 시) 정책 변경은 별도 검토.
- 키보드 등장/숨김 시 추가 보정은 이번 범위 밖.

## 설계

### 핵심 아이디어

마지막 **user bubble** entry에 `onLayout`을 부착해 그 y좌표를 캡처하고, auto-scroll 요청이 들어왔을 때 해당 y좌표 - 작은 padding(16px) 위치로 `scrollTo`한다.

### 식별 규칙: 어떤 entry가 앵커인가

`chatEntries` 배열에서 **가장 마지막**으로 등장하는 `kind: 'bubble'` + `role: 'user'` entry가 앵커다. `appendNextNode`는 user bubble을 항상 새 AI 노드보다 먼저 push하므로, "최근 사용자 발화"가 곧 "방금 누른 선택지"가 된다.

### 데이터 흐름

```
사용자가 선택지 탭
  ↓
onChoicePress (use-diagnostic-screen.ts)
  ├─ requestDiagnosisAutoScroll(answerIndex)   ── ref 플래그 set
  └─ appendNextNode(...)                        ── chatEntries에 user bubble + 새 노드 push
  ↓
리렌더 → DiagnosisConversationPage 받음:
  - 새 chatEntries (마지막에 user bubble + 새 노드)
  - shouldAutoScrollToEnd = true
  ↓
앵커 entry id 계산: chatEntries 마지막에서 역순 탐색하여 첫 user bubble의 id
  ↓
해당 entry 래퍼에 onLayout={(e) => anchorYRef.current = e.nativeEvent.layout.y}
  ↓
useEffect ([shouldAutoScrollToEnd]):
  if shouldAutoScrollToEnd && anchorYRef.current != null:
    scrollRef.current?.scrollTo({ y: anchorYRef.current - 16, animated: true })
    onAutoScrollHandled(answerIndex)
```

### 컴포넌트 변경: `diagnosis-conversation-page.tsx`

1. **앵커 entry id 계산** (`useMemo`):
   ```ts
   const anchorEntryId = useMemo(() => {
     for (let i = chatEntries.length - 1; i >= 0; i--) {
       const entry = chatEntries[i];
       if (entry.kind === 'bubble' && entry.role === 'user') {
         return entry.id;
       }
     }
     return null;
   }, [chatEntries]);
   ```

2. **앵커 y좌표 ref**:
   ```ts
   const anchorYRef = useRef<number | null>(null);
   ```
   `chatEntries`가 바뀌어 anchorEntryId가 바뀌면 ref를 리셋한다 (`useEffect` 1줄).

3. **렌더링 분기**: `chatEntries.map` 안에서 `entry.kind === 'bubble' && entry.role === 'user' && entry.id === anchorEntryId`인 entry의 wrapper `Animated.View`에 `onLayout` 부착.
   ```tsx
   onLayout={
     entry.id === anchorEntryId
       ? (e) => { anchorYRef.current = e.nativeEvent.layout.y; }
       : undefined
   }
   ```

4. **auto-scroll useEffect 교체**:
   기존 `scrollToEnd` 호출을 앵커 기반 `scrollTo`로 변경. 단, anchorYRef가 아직 set되지 않은 가능성을 위해 `onContentSizeChange` 폴백을 둔다.

   ```ts
   useEffect(() => {
     if (!isActive || !shouldAutoScrollToEnd) return;
     const tryScroll = () => {
       if (anchorYRef.current != null) {
         scrollRef.current?.scrollTo({
           y: Math.max(anchorYRef.current - 16, 0),
           animated: true,
         });
         onAutoScrollHandled(answerIndex);
         return true;
       }
       return false;
     };
     if (!tryScroll()) {
       // anchorY가 아직 측정 안 됨 → onContentSizeChange에서 재시도
       pendingScrollRef.current = true;
     }
   }, [answerIndex, isActive, onAutoScrollHandled, shouldAutoScrollToEnd, anchorEntryId]);
   ```

5. **ScrollView에 `onContentSizeChange` 추가**:
   ```tsx
   onContentSizeChange={() => {
     if (pendingScrollRef.current && anchorYRef.current != null) {
       scrollRef.current?.scrollTo({
         y: Math.max(anchorYRef.current - 16, 0),
         animated: true,
       });
       pendingScrollRef.current = false;
       onAutoScrollHandled(answerIndex);
     }
   }}
   ```

### 엣지 케이스

| 케이스 | 동작 |
|---|---|
| user bubble이 아직 없는 첫 진입 | `anchorEntryId === null` → effect early return. 기존 `restoreOffset` 흐름은 그대로 동작. |
| `appendNextNode` 직후 anchorY가 아직 0 | `pendingScrollRef = true` → `onContentSizeChange`에서 재시도. |
| 가로 페이저로 다른 문제로 스와이프 후 돌아옴 | `restoreOffset` 흐름이 우선 적용 (기존 로직 유지). 그 후 새 선택지를 누르면 앵커 흐름. |
| 키보드가 열려 있을 때 | 이번 범위 밖. 기존 `KeyboardAvoidingView`가 처리. |
| 같은 노드를 다시 답하는 경우 | `requestDiagnosisAutoScroll` 호출 → 새 user bubble id가 anchorEntryId가 됨 → 정상 동작. |

### 수정 파일

- `features/quiz/components/diagnosis-conversation-page.tsx` (단일 파일)

훅(`use-diagnostic-screen.ts`, `use-diagnosis-pager.ts`) 변경 없음. 기존 ref 플래그(`diagnosisPendingAutoScrollRef`)와 핸들러(`onAutoScrollHandled`) 시그니처 유지.

## 검증

수동 테스트(시뮬레이터 + 실기기):

1. 10문제 약점 진단을 시작 → 일부러 1~2문제 틀린다.
2. 분석 화면 진입 후, `DiagnosisFlowCard`의 선택지 버튼을 탭한다.
3. **기대 결과**: 본인이 누른 선택 텍스트가 화면 상단 근처에 보이고, 그 아래로 새 AI 카드의 타이틀이 자연스럽게 노출된다.
4. 새 AI 카드가 짧을 경우(전체가 한 화면에 들어올 때), user bubble이 상단, 새 AI 카드가 그 아래에 모두 보인다.
5. 새 AI 카드가 길 경우, user bubble이 상단, AI 카드의 시작 부분(타이틀+본문)이 노출되고, 선택지/버튼은 자연스럽게 스크롤로 도달 가능하다.
6. 가로로 스와이프해 다른 문제로 이동했다가 돌아왔을 때, 이전 스크롤 위치가 복원되는 기존 동작이 유지된다.

회귀 위험 점검:

- 가로 페이저 스와이프 동작 (`FlatList horizontal pagingEnabled`).
- 키보드 등장 시 입력창(`DiagnosisAiHelpCard`) 동작.
- `restoreOffset` 기반 스크롤 위치 복원.
- iOS Haptics 호출 타이밍 (변경 없음).

## 오픈 이슈

- 패딩 16px이 적절한지 시뮬레이터에서 시각 확인 필요. 너무 빡빡하면 24px로 조정 가능.
- `animated: true`로 자연스러운지, 너무 느리면 `animated: false`로도 검토.
