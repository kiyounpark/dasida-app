# 모의고사 오답 약점 분석 설계 스펙

## 개요

모의고사 완료 후 결과 화면에서 오답/미풀이 문제를 개별 선택해 약점을 분석하고, 기존 복습 큐에 통합하는 기능.

---

## 배경 및 목표

### 현재 상태
- 모의고사 결과는 점수/정답률만 저장되고 약점 데이터가 없음 (`primaryWeaknessId: null`, `topWeaknesses: []`)
- 모의고사 문제 데이터에는 `diagnosisMethods` 필드가 이미 존재하지만 미사용
- 약점 분석은 별도 10문제 진단 퀴즈를 통해서만 이루어짐

### 목표
- 모의고사 결과에서 직접 약점 분석을 시작할 수 있게 함
- 기존 `detailedDiagnosisFlows` 인프라를 재사용해 구현 범위 최소화
- 선생님 아바타 채팅 UI를 모든 진단 화면에 일관성 있게 적용

---

## 화면 설계

### 1. 모의고사 결과 화면 (개편)

**현재**: 점수 + "약점 분석하러 가기" 버튼 (10문제 진단으로 이동)

**변경 후**:

```
┌──────────────────────────────┐
│ 2024년 9월 모의고사 · 기하    │  ← 시험명
│ 68          [도넛링 72%]     │  ← 점수 + 정답률
│ / 100점                      │
│ [정답 18] [오답 7] [미풀이 5] │  ← 배지
├──────────────────────────────┤
│ 약점 분석  ━━━░░░░░  1/7 완료 │  ← 진행률
│                              │
│ 틀린 문제 · 미풀이            │
│ ┌────┐┌────┐┌────┐           │
│ │ 30 ││ 28 ││ 15 │           │  ← 3열 그리드
│ │완료││왜틀││왜틀│           │
│ └────┘└────┘└────┘           │
│ ┌────┐┌────┐┌────┐           │
│ │ 29 ││ 27 ││ 26 │           │
│ │미풀││미풀││미풀│           │
│ └────┘└────┘└────┘           │
│                              │
│ [홈으로 돌아가기]             │
└──────────────────────────────┘
```

**타일 상태 3종**:
- **오답 · 미분석**: 흰 카드, 버튼 그림자, "왜 틀렸지?" 다크 버튼 내장 → 탭 가능
- **오답 · 분석완료**: 연초록 카드, "✓ 완료" → 탭 불가
- **미풀이**: 점선 카드, "미풀이" 흐린 텍스트 → 탭 불가

**진입점 변경**: "약점 분석하러 가기" 버튼 제거 → 타일 개별 탭으로 진입

---

### 2. 오답 약점 진단 화면

기존 10문제 진단과 동일한 채팅 플로우를 재사용. 차이점은 문제 표시 방식(이미지)과 진입 컨텍스트.

```
┌──────────────────────────────┐
│ ← 채점 결과                  │
│ 28번 · 공간벡터              │
│ 오답 분석 2/7 ━━░░░░░░       │
├──────────────────────────────┤
│                              │
│ [문제 이미지 버블]            │
│ "이 문제를 어떻게 풀었는지   │
│  부터 같이 볼게요."           │
│                              │
│ [👩‍🏫] 벡터 풀이에서 어느     │  ← 선생님 아바타 + 말풍선
│       단계가 어려웠나요?      │
│                              │
│ ┌1. 내적 공식 헷갈렸어요 ✓┐  │  ← 선택지
│ └2. 계산 실수했어요        ┘  │
│ └3. 공식을 몰랐어요        ┘  │
│                              │
├──────────────────────────────┤
│ [다음]                       │
└──────────────────────────────┘
```

**재사용**: `detailedDiagnosisFlows`, `DiagnosisChatBubble`, `DiagnosticChoiceCard`

---

### 3. 선생님 아바타 일관성 적용

**현재**: 복습 세션만 아바타 있음, 진단 채팅은 아바타 없음

**변경**: `DiagnosisChatBubble`에 아바타 표시 추가 → 모든 진단 채팅 화면 일관 적용

| 화면 | 현재 | 변경 후 |
|------|------|---------|
| 복습 세션 | 아바타 ✓ | 유지 |
| 10문제 진단 채팅 | 없음 | 아바타 추가 |
| 모의고사 오답 진단 | 신규 | 아바타 포함 |

아바타 소스: `assets/review/ai-coach-avatar.png`

---

## 데이터 흐름

### 약점 추출 및 저장

```
오답 타일 탭
  → ExamDiagnosisSession 생성 (examId, wrongProblems 목록)
  → 문제별 detailedDiagnosisFlow 실행
  → finalWeaknessId 추출
  → recordAttempt() 호출 (source: 'exam', sourceEntityId: examId)
  → 복습 큐에 등록 (기존 ReviewTask 인프라 재사용)
```

### 진행 상태 저장

중단 후 재개를 위해 진행 상태를 로컬 저장:
- 완료된 문제 번호 목록
- 분석 완료된 약점 ID 목록

저장 위치: `LocalLearnerProfileStore` 또는 새 로컬 키

---

## 변경 범위

### 수정 파일
- `features/quiz/exam/screens/exam-result-screen-view.tsx` — 결과 화면 UI 전면 개편
- `features/quiz/exam/hooks/use-exam-result-screen.ts` — 오답/미풀이 목록 추출 로직 추가
- `features/quiz/exam/build-exam-attempt-input.ts` — `primaryWeaknessId`, `topWeaknesses` 채우기
- `features/quiz/components/diagnosis-chat-bubble.tsx` — 아바타 prop 추가

### 신규 파일
- `features/quiz/exam/exam-diagnosis-session.tsx` — 모의고사 오답 진단 세션 컨텍스트
- `features/quiz/exam/hooks/use-exam-diagnosis.ts` — 오답 진단 로직
- `features/quiz/exam/screens/exam-diagnosis-screen.tsx` — 오답 진단 화면

### 재사용 (변경 없음)
- `data/detailedDiagnosisFlows.ts`
- `features/quiz/diagnosis-flow-engine.ts`
- `features/learning/history-repository.ts`

---

## 미결 사항

- 모의고사 문제 이미지를 진단 화면에서 어떻게 표시할지 (현재 `imageKey`로 Firebase Storage 참조)
- 미풀이 문제에 대한 약점 분석 여부 (현재 설계에서는 탭 불가로 처리)
- 진행 상태 저장 위치 결정 (로컬 vs Firestore)
