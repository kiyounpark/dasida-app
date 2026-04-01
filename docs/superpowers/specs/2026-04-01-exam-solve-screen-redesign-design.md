# 기출 풀기 화면 리디자인

> 작성일: 2026-04-01
> 대상 화면: `features/quiz/exam/screens/exam-solve-screen.tsx` 및 관련 컴포넌트

---

## 배경 및 목적

기출 풀기 화면(`ExamSolveScreen`)에서 문제 이미지가 짧을 때 이미지 아래 영역이 빈 배경으로 남아 허전하게 보이는 문제가 있다. 이를 해결하기 위해 빈 공간에 시험 진행 현황을 표시하는 도트 그리드 패널을 추가하고, 헤더도 함께 개선한다.

---

## 변경 범위

### 1. 헤더 (`ExamSolveHeader`)

**현재:**
- 왼쪽: 나가기
- 가운데: 문제 번호 + 답변 진행(N/30)
- 오른쪽: 실시간 누적 점수(N점)

**변경:**
- 왼쪽: 나가기
- 가운데: 문제 번호 + 답변 진행(N/30)
- 오른쪽: **북마크 아이콘 버튼** (점수 표시 제거)

**점수 제거 이유:** 실전 모의고사 맥락에서 풀이 중 실시간 점수는 심리적 부담을 줄 수 있고, 결과 화면에서 최종 점수를 확인하는 것이 더 자연스럽다.

**북마크 아이콘 스타일:** 노란 배경(`#FFF8EC`) + 노란 테두리(`#F5DFA0`), 둥근 모서리 버튼. 북마크 활성 상태는 아이콘 색으로 구분.

---

### 2. 바디 레이아웃 (`ExamSolveScreen` + `QuizSolveLayout`)

**현재:** 이미지 영역이 `flex: 1`로 남은 공간 전체를 차지. 이미지가 짧으면 빈 공간 발생.

**변경:** 바디 전체를 `ScrollView`로 감싸고, 이미지 아래에 그리드 패널을 배치.

```
[헤더 - 고정]
[스크롤 바디]
  ├─ 문제 이미지 (width: 100%, height: intrinsic / contentFit: contain)
  └─ 그리드 패널 (항상 이미지 아래)
[하단 패널 - 고정: 보기 1~5 + 이전/다음]
```

- 이미지가 짧으면 그리드 패널이 바로 아래 보인다.
- 이미지가 길면 스크롤해서 그리드 패널을 확인한다.
- 하단 패널(보기 선택 + 이전/다음)은 고정 유지.

---

### 3. 그리드 패널 (신규 컴포넌트: `ExamProgressPanel`)

위치: `features/quiz/exam/components/exam-progress-panel.tsx`

**구성:**
- 진행바: 전체 문제 수 대비 답변 완료 비율 (예: 18/30)
- 도트 그리드: 10열 × 3행(30문제 기준), 각 도트는 문제 하나에 대응
- 범례: 답변(초록) / 북마크(노란) / 현재(다크) / 미응답(회색)

**도트 상태별 색상:**

| 상태 | 배경색 | 설명 |
|------|--------|------|
| 답변 완료 | `#4A7C59` | 보기를 선택한 문제 |
| 북마크 | `#F5DFA0` | 북마크 표시한 문제 |
| 현재 | `#1E2F20` + 초록 outline | 지금 보고 있는 문제 |
| 미응답 | `#E0DDD7` | 아직 답변 안 한 문제 |

**패널 배경:** `#F6F2EA` (앱 배경색), 둥근 모서리 카드 형태.

**Props:**
```ts
type ExamProgressPanelProps = {
  totalCount: number;
  currentIndex: number;       // 0-based
  answeredIndices: number[];  // 답변 완료한 문제 인덱스 목록
  bookmarkedIndices: number[]; // 북마크한 문제 인덱스 목록
};
```

---

### 4. 북마크 상태 관리

북마크는 현재 시험 세션 내 로컬 상태로 관리한다 (Firebase 저장 없음, 세션 종료 시 휘발).

`useExamSolveScreen` 훅에 추가:
- `bookmarkedIndices: number[]` — 북마크된 문제 인덱스 목록
- `isCurrentBookmarked: boolean` — 현재 문제 북마크 여부
- `onToggleBookmark: () => void` — 현재 문제 북마크 토글

---

### 5. 다음 버튼 비율 조정

현재 이전/다음 버튼이 `flex: 1`로 동일 너비. 다음 버튼을 `flex: 2`로 조정해 더 강조.

---

## 변경하지 않는 것

- 단답형 패널(`ExamShortAnswerPanel`) — 구조 변경 없음
- 결과 화면(`ExamResultScreenView`) — 이번 범위 아님
- 시험 선택 화면(`ExamSelectionScreenView`) — 이번 범위 아님
- Firebase 연동 / 점수 계산 로직 — 헤더에서 점수 표시만 제거, 계산 자체는 유지

---

## 영향 받는 파일

| 파일 | 변경 유형 |
|------|-----------|
| `features/quiz/exam/components/exam-solve-header.tsx` | 수정: 점수 제거, 북마크 버튼 추가 |
| `features/quiz/exam/components/exam-progress-panel.tsx` | 신규 생성 |
| `features/quiz/exam/screens/exam-solve-screen.tsx` | 수정: 바디 ScrollView 전환, 그리드 패널 삽입 |
| `features/quiz/exam/hooks/use-exam-solve-screen.ts` | 수정: 북마크 상태 추가 |
| `features/quiz/components/quiz-solve-layout.tsx` | 변경 없음: 이미 body를 ScrollView로 감쌈. `bodyContentContainerStyle`에서 `flexGrow: 1` 제거만 필요 |
