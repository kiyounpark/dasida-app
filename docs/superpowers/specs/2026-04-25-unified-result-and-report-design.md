# 통합 결과 화면 및 약점 분석 리포트 설계

- 작성일: 2026-04-25
- 상태: 기획중
- 작성자: 박기윤 / Claude

## 1. 배경

현재 10문제 약점 진단과 모의고사는 서로 다른 결과 화면 패턴을 사용한다.

- 10문제 진단: 점수 결과 화면 → 약점 카드(리포트) 순으로 이동, 각 진단 완료 후 수동 확인 버튼 필요
- 모의고사: 점수 hero + 문제 타일 그리드 → 개별 진단 완료 후 결과 화면 복귀, 분석 리포트 없음

두 흐름을 통일하고, 진단 완료까지의 마찰을 줄이는 것이 목표다.

## 2. 목표

1. 10문제 진단과 모의고사 모두 **"나의 약점 분석 리포트"를 종착점**으로 통일
2. 진단 루프에서 수동 확인 버튼 제거 → 자동 저장 + **3초 자동 이동** (기존 1.5초 → 3초)
3. 10문제 진단: 풀이 후 점수 화면 스킵 → 즉시 진단 루프 진입
4. 리포트 화면: 약점 4개 이상 시 compact row 섹션 추가로 세로 길이 통제

## 3. 비목표

- 약점 연습문제 세션(quiz/practice) 내부 로직 변경
- 진단 플로우 노드 구조(choice/explain/check/final) 변경
- 리포트 화면의 CTA("약점 기반 연습문제 풀러가기") 이후 흐름 변경
- 태블릿 자동 이동 (기존 스펙과 동일하게 태블릿 미적용)

## 4. 최종 플로우

### 4.1 10문제 약점 진단

```
10문제 풀이 완료
  ↓ (점수 결과 화면 SKIP — 기존 quiz-result-screen 미경유)
  isDiagnosing 모드 즉시 진입 (기존 diagnostic-screen의 isDiagnosing 분기)
  ↓
왜 틀렸지? 진단 루프 (틀린 문제 순서대로 페이징)
  - 마지막 노드(final) 도달 → 자동 저장
  - "✓ 이 약점으로 정리되었습니다" 자동 표시
  - 3초 대기 → 다음 문제로 자동 슬라이드
  ↓ (마지막 문제 완료)
나의 약점 분석 리포트 (quiz/result 라우트)
  ↓
약점 기반 연습문제
  ↓
step-complete 화면 (여정 완료 — 기존 유지)
```

### 4.2 모의고사

```
모의고사 풀이 완료
  ↓
모의고사 결과 화면 (점수 hero + 문제 타일 그리드 — 기존 유지)
  타일 탭 → exam-diagnosis-session 진입
    - 마지막 노드 도달 → 자동 저장
    - "✓ 이 약점으로 정리되었습니다" 자동 표시
    - 3초 대기 → 다음 문제 자동 슬라이드
    - 마지막 문제 → 결과 화면 복귀 (타일 ✓로 업데이트)
  ↓ (모든 타일 ✓ 완료 감지)
나의 약점 분석 리포트 (신규: exam용 라우팅 추가)
  ↓
약점 기반 연습문제
  ↓
홈화면 (기존 유지)
```

## 5. 컴포넌트별 변경

### 5.1 진단 자동이동 타이밍: 1.5초 → 3초

**대상 파일**: `features/quiz/exam/hooks/use-exam-diagnosis.ts`

April 14 스펙(`diagnosis-final-auto-complete.md`, `diagnosis-auto-advance.md`)에서 이미 자동 저장 + 1.5초 자동이동이 설계됐다. 해당 구현의 `setTimeout` 딜레이 상수를 `1500` → `3000`으로 변경한다.

```typescript
// before
}, 1500);

// after
}, 3000);
```

### 5.2 10문제 진단 — 확인 버튼 제거, 자동 저장, 아바타 표시

**대상 파일**: `features/quiz/components/diagnostic-screen-view.tsx`, `features/quiz/hooks/use-diagnostic-screen.ts`

현재 `diagnostic-screen-view.tsx`는 `onFinalConfirm={() => onFinalConfirm(item)}`을 `DiagnosisConversationPage`에 전달한다. 이를 제거하고 exam-diagnosis와 동일한 자동 저장 패턴을 적용한다.

변경 사항:
- `DiagnosisConversationPage`에서 `onFinalConfirm` prop 제거
- `use-diagnostic-screen.ts` 훅에 `useEffect` 추가: draft가 final 노드를 가리킬 때 자동 저장 + 3초 후 `onComplete()` 호출
- `onFinalConfirm` 콜백을 `UseDiagnosticScreenResult` 타입에서 제거
- `DiagnosisConversationPage`에 **`showAvatar={true}` 추가**: `exam-diagnosis-screen.tsx`가 이미 `showAvatar={entry.role === 'assistant'}`를 적용해 AI 코치 아바타를 어시스턴트 말풍선 옆에 표시하는 것과 동일하게 10문제 진단 루프에서도 적용

`diagnosis-flow-card.tsx`는 이미 `onFinalConfirm`이 없을 때 "✓ 이 약점으로 정리되었습니다"를 표시하는 분기를 가지고 있어 UI 변경 불필요.

### 5.3 10문제 진단 — 풀이 완료 후 점수 화면 스킵

**대상 파일**: `features/quiz/hooks/use-diagnostic-screen.ts`, `app/quiz/diagnostic.tsx` (또는 라우팅 레이어)

현재 흐름에서 10문제 풀이 완료 시 `router.push('quiz/result')` 또는 동등한 탐색이 발생한다. 이를 변경해 풀이 완료 후 즉시 `isDiagnosing = true`로 전환한다.

구체적 구현 방법은 현재 `use-diagnostic-screen.ts`의 풀이 완료 분기 확인 후 결정. 핵심 원칙: `quiz/result` 라우트를 거치지 않고 `isDiagnosing` 상태로 직접 진입.

**만점(0개 오답) 케이스**: 진단할 문제 없음 → `isDiagnosing` 진입 없이 바로 `quiz/result` 라우트로 이동 (allCorrect 분기 활용).

### 5.4 모의고사 결과 화면 — 모든 타일 완료 후 리포트 이동

**대상 파일**: `features/quiz/exam/hooks/use-exam-result-screen.ts`

현재 모의고사 결과 화면은 `diagnosedCount`와 `wrongCount`를 비교해 약점 분석 진행률을 표시한다. `diagnosedCount === wrongCount`가 되는 순간(마지막 진단 복귀 시) 리포트 화면으로 자동 이동한다.

```typescript
// use-exam-result-screen.ts 내부 useEffect 추가
useEffect(() => {
  if (wrongCount > 0 && diagnosedCount === wrongCount) {
    // 모든 타일 완료 → 리포트 화면으로 이동
    router.push({ pathname: 'quiz/result', params: { source: 'exam', examId } });
  }
}, [diagnosedCount, wrongCount]);
```

`wrongCount === 0` (만점)이면 이 조건이 성립하지 않으므로 별도 처리 불필요.

### 5.5 리포트 화면 — exam 소스 데이터 연결

**대상 파일**: `features/quiz/hooks/use-result-screen.ts`, `features/quiz/components/quiz-result-report-view.tsx`

모의고사에서 리포트로 이동할 때 `source: 'exam'`, `examId`를 파라미터로 전달한다. `use-result-screen.ts`에서 `source === 'exam'`일 때 exam 진단 결과에서 `topWeaknesses`를 조회해 `liveSummary`를 구성한다.

exam의 `topWeaknesses` 산출 로직:
- 각 진단 완료 문제에서 저장된 `weaknessId`를 수집
- 빈도 순 정렬 → 상위 N개 반환
- 기존 `diagnosisMap`으로 라벨/설명 조회 (변경 없음)

`accuracy` 필드는 `ExamResultSummary.accuracy`에서 가져와 리포트 상단 정답률 라인에 표시.

### 5.6 모의고사 결과 화면 — 선생님 아바타 추가 (신규)

**대상 파일**: `features/quiz/exam/screens/exam-result-screen-view.tsx`

현재 모의고사 결과 화면은 점수 hero + 문제 타일 그리드만 있어 톤이 차갑다. 선생님 아바타와 말풍선을 상단에 추가해 "분석을 같이 시작해보자"는 톤을 부여한다.

위치: 점수 hero 아래, 타일 그리드 위.  
컴포넌트: 기존 `QuizResultReportHero` 재사용 (`pointCount` 대신 wrong problem count 전달).  
말풍선 메시지: `"오늘 시험에서 {wrongCount}문제를 분석해 볼게요. 하나씩 같이 살펴봐요!"` (추후 카피 조정 가능)  
크기: `isCompactLayout` prop 동일하게 적용.

모의고사 진단 완료 후 리포트 화면에서도 이미 선생님 아바타가 표시되므로, 두 지점 모두에서 아바타를 볼 수 있다.

### 5.7 리포트 화면 — compact row 섹션 추가

**대상 파일**: `features/quiz/components/quiz-result-report-view.tsx`

현재 `visibleWeaknesses = summary.topWeaknesses.slice(0, 3)`. 이를 변경:

```typescript
const topWeaknesses = summary.topWeaknesses.slice(0, 3);      // 풀카드
const extraWeaknesses = summary.topWeaknesses.slice(3);       // compact row
```

`extraWeaknesses.length > 0`일 때 "그 외 약점 N개" 섹션을 풀카드 아래에 추가.

compact row 구조 (각 행):
- 주제 칩 (`diagnosisMap[id].topicLabel` 또는 `diagnosisMap[id].labelKo` 앞 카테고리)
- 약점 이름 (`diagnosisMap[id].labelKo`)
- 관련 문제 수 (exam: perProblem 집계, 진단: 해당 없으면 생략)

스타일: `home-weakness-section`의 `WeaknessProgressItem` 컴포넌트 스타일 재사용 또는 유사하게 구성. 진도 dots는 표시하지 않음.

## 6. 오픈 이슈 (구현 단계 확인)

1. **April 14 스펙 구현 여부**: `use-exam-diagnosis.ts`에 자동 저장 useEffect가 이미 적용됐는지 확인 필요. 미적용 시 해당 스펙 먼저 구현 후 진행.
2. **`diagnosisMap` 토픽 필드**: compact row에 주제 칩을 표시하려면 `diagnosisMap[id].topicLabel` 또는 동등 필드가 있어야 함. 없으면 `labelKo` 첫 단어로 대체하거나 칩 생략.
3. **exam `topWeaknesses` 조회 API**: Firebase에서 exam 진단 결과를 `weaknessId`별로 집계하는 쿼리가 없을 수 있음. 기존 `perProblem` 배열이 `weaknessId`를 포함하는지 확인.
4. **`diagnostic-screen` 진단 루프 완료 후 라우팅**: 현재 `onExitDiagnosis`와 완료 시 라우팅이 어떻게 분기되는지 확인 후 리포트 이동 삽입 위치 결정.
5. **태블릿 자동이동**: 기존 스펙과 동일하게 태블릿에서는 자동이동 미적용 유지.

## 7. 에러 / 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 만점 (오답 0개) — 진단 | isDiagnosing 스킵 → 리포트로 직행 (allCorrect 분기) |
| 만점 (오답 0개) — 모의고사 | wrongCount=0이므로 리포트 자동이동 조건 미성립 → 기존 결과 화면 유지 |
| 진단 저장 실패 | isDone=false 롤백, isSaving=false, 조용히 실패 (재시도 가능) |
| 3초 자동이동 중 앱 백그라운드 | setTimeout은 백그라운드에서 지연될 수 있음 — 기존 1.5초 구현 방식 그대로 적용 |
| exam topWeaknesses 조회 실패 | liveSummary=null → quiz-result-screen의 snapshotSummary 폴백으로 표시 |
| 약점 3개 이하 — 리포트 | extraWeaknesses=[] → compact row 섹션 미표시, 기존과 동일 |

## 8. 변경 파일 요약

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | 수정 | setTimeout 1500 → 3000 |
| `features/quiz/hooks/use-diagnostic-screen.ts` | 수정 | onFinalConfirm 제거, 자동저장 useEffect 추가, 풀이 완료 후 isDiagnosing 직접 진입 |
| `features/quiz/components/diagnostic-screen-view.tsx` | 수정 | onFinalConfirm prop 제거, showAvatar={true} 추가 |
| `features/quiz/exam/screens/exam-result-screen-view.tsx` | 수정 | 선생님 아바타 + 말풍선 추가 |
| `features/quiz/exam/hooks/use-exam-result-screen.ts` | 수정 | 모든 타일 완료 시 리포트 이동 useEffect 추가 |
| `features/quiz/hooks/use-result-screen.ts` | 수정 | source=exam 시 exam 진단 데이터로 topWeaknesses 구성 |
| `features/quiz/components/quiz-result-report-view.tsx` | 수정 | compact row 섹션 추가 (slice(3..N)) |

## 9. 검증 기준

- [ ] 10문제 진단: 풀이 완료 후 점수 화면 없이 즉시 진단 루프 진입
- [ ] 10문제 진단: 마지막 노드 도달 시 "✓ 이 약점으로 정리되었습니다" 자동 표시, 버튼 미표시
- [ ] 10문제 진단: 3초 후 자동으로 다음 문제로 슬라이드
- [ ] 10문제 진단: 마지막 문제 완료 → "나의 약점 분석 리포트" 이동
- [ ] 모의고사: 진단 완료 딜레이 1.5초 → 3초로 늘어남
- [ ] 모의고사: 모든 타일 ✓ → 리포트 화면 자동 이동
- [ ] 리포트: 약점 4개 이상 시 compact row 섹션 표시
- [ ] 리포트: 약점 3개 이하 시 compact row 섹션 미표시 (기존과 동일)
- [ ] 만점 케이스: 진단 루프 없이 리포트 직행
- [ ] 10문제 진단 루프: 어시스턴트 말풍선 옆에 AI 코치 아바타 표시 (모의고사 진단과 동일)
- [ ] 모의고사 결과 화면: 선생님 아바타 + 말풍선 표시
- [ ] `npx tsc --noEmit` 통과

## 10. 릴리스 체크

- 컴포넌트 추가/삭제 없음 (기존 파일 수정만) → `npx expo prebuild --clean` 불필요
- 개발 검증: `npx expo run:ios`로 10문제 진단 / 모의고사 두 흐름 모두 end-to-end 확인
