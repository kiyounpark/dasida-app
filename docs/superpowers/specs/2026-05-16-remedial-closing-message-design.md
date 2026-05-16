# 보충 흐름 종료 시 부드러운 마무리 한마디 — 설계

- 날짜: 2026-05-16
- 상태: 기획중
- 범위: 복습 세션(review-session) 보충(remedial) 흐름 종료 UX

## 문제

확인문제(CheckNode)에서 정답을 맞히거나 보충 설명을 끝까지 본 뒤,
보충 흐름이 끝나면 **아무 칭찬·마무리 멘트 없이** 곧바로
`[이해했어요, 다음으로]` 버튼만 등장한다. 흐름이 뚝 끊기는 느낌이고,
약점마다 `SummaryNode` 유무에 따라 마무리 경험이 들쭉날쭉하다.

목표: 앱 전체의 부드러운 톤을 **일관되게** 유지하도록, 보충 흐름이
끝날 때 따뜻한 마무리 한마디를 항상 보여준다.

## 현재 동작 (코드 근거)

- `onRemedialCheckOption` (`features/quiz/hooks/use-review-session-screen.ts:472-481`)
  → `advanceRemedialToNode(opt.nextNodeId)` 호출
- `advanceRemedialToNode` (`use-review-session-screen.ts:421-436`)
  - 다음 노드가 `exit`이거나 없음 → `createDoneCtaEntry(...)`만 append
  - 즉, 확인문제 정답을 포함한 **모든 보충 흐름 종료가 이 분기로 수렴**
- 일반 스텝 정답(`onSelectChoice`, `:211-215`)은 이미
  `createFeedbackBannerEntry(true, feedback)`가 떠서 끊김이 덜하다.

## 설계

### 변경 위치 (단일 병목)

`advanceRemedialToNode`의 종료 분기 한 곳
(`use-review-session-screen.ts:425-430`). 다음 노드가 `exit`이거나
없을 때, 기존 `createDoneCtaEntry` **직전에** 고정 마무리 `ai-bubble`
entry 1개를 append 한다.

```
종료 감지 → [ai-bubble: 고정 마무리 문구] → [done-cta]
```

`ai-bubble`은 선생님 말풍선으로, 현재 `COACH_PROMPT_FOR_DETAIL`에
쓰이는 것과 동일한 entry 종류(`createAiBubbleEntry`,
`review-entries.ts`)이며 entry-renderer가 이미 렌더링한다.

### 마무리 문구 (고정 1줄)

> "잘 따라오셨어요. 이 부분은 이제 한결 편하게 느껴질 거예요."

상수로 분리(예: `REMEDIAL_CLOSING_MESSAGE`)하여 한 곳에서 관리.

### 범위 제외 (YAGNI)

- 일반 스텝 정답(`onSelectChoice`): 이미 feedback 배너 존재 → 변경 없음
- AI 챗 2턴 마무리: 스펙 §3.1에서 의도적으로 "중립 문구" → 변경 없음

### 결정 사항

- 일부 약점은 종료 직전 `SummaryNode`(정리 카드)가 먼저 표시된다.
  그 경우 **정리 카드 → 마무리 한마디 → done-cta** 순서가 된다.
  정리(내용 요약)와 마무리(따뜻한 사인오프)는 역할이 달라
  중복으로 보지 않으며, 별도 dedupe 로직을 두지 않는다.

## 테스트

`features/quiz/hooks/use-review-session-screen.test.ts`에 케이스 추가:

- 확인문제(CheckNode) 정답 선택 → 다음 노드가 `exit`인 흐름에서,
  entries에 `ai-bubble`(고정 마무리 문구)이 `done-cta` **앞에**
  존재하는지 검증.

## Expo / React Native 영향

- 순수 JS/데이터 변경. 네이티브 의존성·빌드 설정 변경 없음.
- `npx expo prebuild` / 네이티브 재빌드 **불필요**.
- 새 컴포넌트 없음 (`ai-bubble` 렌더 경로 재사용). 회귀 위험 낮음.

## 영향 파일

- `features/quiz/hooks/use-review-session-screen.ts` — 종료 분기에
  마무리 ai-bubble append (+ 상수 정의)
- `features/quiz/hooks/use-review-session-screen.test.ts` — 테스트 1케이스
