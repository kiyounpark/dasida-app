# 오답 자유입력 기반 풀이법 라우팅 1차 구현 계획

## 요약
- 현재의 `오답 진단 2단계 구조`는 유지합니다.
- 변경점은 1단계만입니다. 기존의 `풀이법 버튼 선택` 대신, 사용자가 오답마다 자유 입력으로 “어떤 방식으로 풀었는지” 적고, 시스템이 그 텍스트를 읽어 `SolveMethodId`를 먼저 추정합니다.
- 1차 범위는 `UI + mock 라우터`까지입니다. 실제 OpenAI 호출은 넣지 않되, 나중에 내부 구현만 바꾸면 되도록 라우터 인터페이스를 먼저 고정합니다.
- 진단 시점은 현재와 동일하게 `10문제 풀이 완료 후 diagnosis queue를 순차 처리`로 갑니다.

## 주요 변경 파일
- [`app/(tabs)/quiz/index.tsx`](/Users/baggiyun/Documents/dasida-app/app/(tabs)/quiz/index.tsx)
- [`features/quiz/session.tsx`](/Users/baggiyun/Documents/dasida-app/features/quiz/session.tsx)
- [`features/quiz/types.ts`](/Users/baggiyun/Documents/dasida-app/features/quiz/types.ts)
- [`data/diagnosisTree.ts`](/Users/baggiyun/Documents/dasida-app/data/diagnosisTree.ts)
- 신규: [`features/quiz/diagnosis-router.ts`](/Users/baggiyun/Documents/dasida-app/features/quiz/diagnosis-router.ts)
- 신규: [`data/diagnosis-method-routing.ts`](/Users/baggiyun/Documents/dasida-app/data/diagnosis-method-routing.ts)
- 작업 후 기록: [`docs/PROGRESS.md`](/Users/baggiyun/Documents/dasida-app/docs/PROGRESS.md)

## 사용자 흐름
1. 사용자가 10문제를 모두 풉니다.
2. 오답이 있으면 현재처럼 diagnosis queue가 시작됩니다.
3. 각 오답 문제에서 먼저 자유 입력 질문을 보여줍니다.
4. 질문 문구는 `어떤 방식으로 풀었니?`로 고정하고, 현재 문제의 허용 풀이법(`problem.diagnosisMethods`)에 맞는 예시 힌트를 같이 노출합니다.
5. 사용자가 입력 후 `방향 판단하기`를 누르면 async mock 라우터가 `SolveMethodId` 예측 결과를 반환합니다.
6. 신뢰도가 충분하면 예측된 풀이법을 카드로 보여주고 `이 방식으로 계속` 버튼을 제공합니다.
7. 사용자가 틀렸다고 느끼면 `직접 고를게요`를 눌러 현재의 풀이법 버튼 목록으로 수동 선택할 수 있게 합니다.
8. 신뢰도가 낮거나 `unknown`으로 분류되면 바로 수동 선택 버튼 목록을 노출합니다.
9. 풀이법이 확정되면 기존과 동일하게 `diagnosisTree[methodId]`의 세부 약점 선택 질문을 보여줍니다.
10. 세부 약점을 고르면 현재와 동일하게 `weaknessScores`를 누적하고 다음 오답으로 넘어갑니다.

## 인터페이스/타입 변경
- `QuizAnswer`에 `diagnosisRouting` 필드를 추가합니다.
- 새 타입 `DiagnosisRoutingTrace`를 정의합니다.
- `DiagnosisRoutingTrace` 필드:
  - `rawText: string`
  - `predictedMethodId?: SolveMethodId`
  - `confidence?: number`
  - `reason?: string`
  - `source: 'mock-router' | 'openai-router'`
  - `needsManualSelection: boolean`
  - `candidateMethodIds: SolveMethodId[]`
  - `finalMethodId: SolveMethodId`
  - `finalMethodSource: 'router' | 'manual'`
- 기존 `QuizAnswer.methodId`는 유지합니다. 값은 항상 `diagnosisRouting.finalMethodId`와 동일하게 맞춥니다.
- 세션 액션은 `submitDiagnosis` 1개에서 아래 2개로 분리합니다.
  - `confirmDiagnosisMethod(answerIndex, trace)`
  - `submitDiagnosisWeakness(answerIndex, weaknessId)`
- 라우터 공개 인터페이스는 아래로 고정합니다.
  - `analyzeDiagnosisMethod(input: DiagnosisRouterInput): Promise<DiagnosisRouterResult>`

## 라우터 설계
- 신규 데이터 파일에 `SolveMethodId`별 라우팅 메타데이터를 둡니다.
- 각 메서드 브랜치는 `labelKo`, `summary`, `keywords`, `exampleUtterances`, `followupLabel`을 가집니다.
- mock 라우터는 데모 HTML과 같은 방식으로 `keyword score + top gap + confidence` 규칙을 사용합니다.
- 후보 브랜치는 항상 현재 문제의 `problem.diagnosisMethods`로 제한합니다.
- `unknown`은 escape hatch로 유지합니다. 현재 문제에 없더라도 내부 후보군 마지막에 추가합니다.
- 수동 선택이 발생하면 `finalMethodSource`를 `manual`로 기록합니다.
- 실제 OpenAI 도입 시에는 `analyzeDiagnosisMethod` 내부 구현만 교체하고, 화면/세션/타입 계약은 유지합니다.

## UI 변경 상세
- 진단 화면의 1단계 카드에서 기존 `풀이법 버튼 목록`을 바로 보여주지 않습니다.
- 대신 `TextInput + helper examples + 방향 판단하기 버튼 + 로딩 상태`를 먼저 보여줍니다.
- 입력이 바뀌면 직전 라우팅 결과는 무효화합니다.
- high-confidence 조건은 `predictedMethodId !== 'unknown'` 이고 `confidence >= 0.74`이며 top score gap이 2 이상일 때로 고정합니다.
- low-confidence면 `확신이 낮아요. 직접 골라주세요.` 문구와 함께 기존 풀이법 버튼 목록을 표시합니다.
- 풀이법 확정 후에만 기존 2단계 약점 버튼들이 렌더링됩니다.
- 결과 화면, 연습 화면, 피드백 화면의 동작은 바꾸지 않습니다.

## 구현 단계
1. `features/quiz/types.ts`에 `DiagnosisRoutingTrace`와 `QuizAnswer.diagnosisRouting`를 추가합니다.
2. `features/quiz/session.tsx` reducer를 `confirmDiagnosisMethod`와 `submitDiagnosisWeakness` 구조로 분리합니다.
3. `data/diagnosis-method-routing.ts`에 메서드별 시나리오 카탈로그를 정의합니다.
4. `features/quiz/diagnosis-router.ts`에 mock scoring 기반 async 라우터를 구현합니다.
5. `app/(tabs)/quiz/index.tsx`에서 진단 1단계 UI를 자유 입력 기반으로 교체하고, 고신뢰/저신뢰 분기와 수동 override 흐름을 연결합니다.
6. 기존 `diagnosisTree` 기반 2단계 약점 선택은 그대로 재사용합니다.
7. 작업 완료 후 `docs/PROGRESS.md`에 변경 내용과 검증 결과를 기록합니다.
8. 구현 시작/완료 시 저장소 규약대로 Slack 알림 절차를 실행합니다.

## 테스트 시나리오
- `q9`에서 `꼭짓점 공식으로 x=3 찾았어요` 입력 시 `vertex`가 high-confidence로 잡혀 바로 2단계 질문이 열려야 합니다.
- `q9`에서 `미분해서 f'(x)=0 만들었어요` 입력 시 `diff`가 high-confidence로 잡혀야 합니다.
- `q1`에서 `루트 계산하다가 분모 유리화에서 헷갈렸어요` 입력 시 `radical` 후보가 최상위여야 합니다.
- `뭔가 해보긴 했는데 중간부터 막혔어요` 같은 모호한 입력은 자동 확정되지 않고 수동 선택 버튼이 보여야 합니다.
- high-confidence 예측 후 사용자가 `직접 고를게요`를 누르면 최종 method는 수동 선택값으로 덮어써지고 trace에 `manual`이 기록되어야 합니다.
- 풀이법 확정 후 표시되는 세부 약점 선택지는 반드시 `diagnosisTree[finalMethodId]`와 일치해야 합니다.
- 세부 약점 선택 완료 후 `weaknessScores`, 결과 화면, 약점 연습 흐름은 기존과 동일해야 합니다.
- 입력 텍스트를 수정하면 이전 예측 결과가 무효화되어 재분석 전까지 확정 버튼이 사라져야 합니다.

## 가정 및 기본값
- 이번 단계에서는 실제 OpenAI API 호출, Firebase 저장, 결과/피드백 화면에서의 trace 노출은 범위에서 제외합니다.
- 라우팅 대상은 `SolveMethodId`까지만입니다. `WeaknessId` 최종 분류는 기존 2단계 선택을 유지합니다.
- 브랜치 허용 범위의 소스오브트루스는 계속 `problemData[].diagnosisMethods`입니다.
- 텍스트 입력은 오답당 1회 분석을 기본으로 하고, 수정 시 재분석이 필요합니다.
- 테스트 인프라가 없으면 최소 검증은 수동 시나리오 + `expo lint` 기준으로 마감합니다.
