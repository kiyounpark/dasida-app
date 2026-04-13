# 진단 채팅 화면 UI 개선 — 다크 헤더 통일 + 모의고사 오답 분석 강화

## 목표

두 진단 채팅 화면(10문제 약점 분석, 모의고사 오답 분석)의 채팅 경험을 통일하고, 모의고사 오답 분석에 문제 이미지·오답 표시·텍스트 입력·스와이프 내비게이션을 추가한다.

---

## 변경 범위

### A. 모의고사 오답 분석 (`ExamDiagnosisScreen` → 구조 개편)

1. **래퍼 스크린 신규 생성**: `ExamDiagnosisSessionScreen`
   - 10문제 `DiagnosticScreenView`와 동일한 역할
   - FlatList (`horizontal`, `pagingEnabled`) 로 오답 문제를 페이지로 관리
   - 다크 헤더 포함 (아래 헤더 시스템 참고)

2. **기존 `ExamDiagnosisScreen` 분리**: `ExamDiagnosisPage`
   - 단일 문제의 채팅 내용만 담당 (문제 이미지 카드 + 채팅 흐름)
   - 내비게이션 로직 제거

3. **라우트 변경**
   - 기존: `router.push('/quiz/exam/diagnosis', { problemNumber })`
   - 변경: `router.push('/quiz/exam/diagnosis-session', { examId, wrongProblemNumbers, startIndex })`
   - `wrongProblemNumbers`: JSON 직렬화된 오답 문제 번호 배열 (예: `"[1,7,15]"`)
   - `startIndex`: 채점 결과에서 탭한 문제의 인덱스

### B. 10문제 약점 분석 헤더 교체 (`DiagnosticScreenView`)

1. **`BrandHeader` 제거**
2. **라이트 세션 바 → 다크 헤더로 교체**
3. 제목: `Q{n}` 형식 (토픽 없음 — 방법 선택 프라이밍 방지)

---

## 공유 헤더 시스템 (두 화면 동일)

```
┌─────────────────────────────────────────┐
│ ← 뒤로/채점 결과           N / M        │  ← 10px, #6BAA72 / rgba(255,255,255,0.55)
│ Q3  /  21번                             │  ← 16px bold, #fff
│ ● ━━ ○ ○ ○ ···                         │  ← 도트 내비게이터
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│  ← 진행률 바 3px, #7FC87A
└─────────────────────────────────────────┘
배경: #1a2a1a
```

**도트 렌더링 규칙**

| 조건 | 렌더링 |
|---|---|
| `wrongCount ≤ 5` | 도트 전체 표시 |
| `wrongCount > 5` | 앞에서 5개 도트 + `···` |
| 완료된 문제 | 초록 원 `●` (`#7FC87A`) |
| 현재 문제 | 흰색 pill (넓은 직사각형) |
| 미완료 문제 | 흐린 흰색 원 (`rgba(255,255,255,0.2)`) |

**헤더 제목 규칙**

| 화면 | 제목 형식 | 예시 |
|---|---|---|
| 10문제 약점 분석 | `Q{answerIndex + 1}` | `Q3` |
| 모의고사 오답 분석 | `{problemNumber}번` | `21번` |

---

## ExamDiagnosisSessionScreen 상세

### 컴포넌트 구조

```
ExamDiagnosisSessionScreen        ← 새 파일
  └─ useExamDiagnosisSession      ← 새 훅 (세션 전체 관리)
  └─ ExamDiagnosisSessionView     ← 뷰 (다크 헤더 + FlatList)
       └─ ExamDiagnosisPage       ← 기존 ExamDiagnosisScreen 분리
            └─ useExamDiagnosis   ← 기존 훅 유지 (단일 문제 상태)
```

### useExamDiagnosisSession 책임

- `wrongProblemNumbers` 배열 관리
- `activeProblemIndex` 상태 (현재 보고 있는 페이지)
- FlatList ref + 도트 탭 시 스크롤
- 각 페이지 완료 여부 추적 (`diagnosedProblems`)
- 완료 후 다음 문제 인덱스 계산

### ExamDiagnosisPage 채팅 흐름

```
[1] ExamProblemCard          ← 신규 컴포넌트
    - 문제 이미지 (imageKey webp)
    - 오답/정답 번호 원 (읽기 전용)

[2] DiagnosisChatBubble      ← 기존 컴포넌트, showAvatar=true 추가
    role: 'assistant'
    text: '어떤 방법으로 풀었나요?'

[3] DiagnosisMethodSelectorCard  ← 기존 컴포넌트 재사용
    kind: 'method-choices' 교체
    버튼 칩 + 직접 텍스트 입력 + 추천받기

[4] DiagnosisFlowCard        ← 기존 그대로
    (방법 선택 후 흐름)

[5] 완료 후: NextProblemCard  ← 신규 컴포넌트
    - "다음 문제 →  {n}번" 버튼
    - 마지막 문제: "🎉 모든 오답 분석 완료!" + 채점 결과로 버튼
```

---

## ExamProblemCard 컴포넌트

```tsx
// features/quiz/exam/components/exam-problem-card.tsx
type ExamProblemCardProps = {
  imageKey: string;   // 'assets/exam/.../problems/5.webp'
  userAnswer: number; // 오답 번호 (빨강)
  correctAnswer: number; // 정답 번호 (초록)
  problemType: 'multiple_choice' | 'short_answer';
};
```

- 이미지: `require()` 로 로드, `width: '100%'`, `resizeMode: 'contain'`
- 번호 원: `problemType === 'multiple_choice'` 일 때만 표시 (주관식은 생략)
- 번호 원 5개 고정 (`①②③④⑤`)
  - `userAnswer` 인덱스 → 빨강 (`#c0392b`)
  - `correctAnswer` 인덱스 → 초록 (`#2e7d32`)
  - 나머지 → 테두리만 (`#D7D4CD`)
- 범례: "● 내 답 ③" + "● 정답 ④"

---

## NextProblemCard 컴포넌트

```tsx
// features/quiz/exam/components/next-problem-card.tsx
type NextProblemCardProps = {
  nextProblemNumber: number | null; // null이면 마지막 문제
  onNext: () => void;
  onBackToResult: () => void;
};
```

- `nextProblemNumber !== null`: "다음 문제 분석하기 · {n}번 →" 버튼 (진한 초록)
- `nextProblemNumber === null`: "🎉 모든 오답 분석 완료!" + "채점 결과로 돌아가기" 버튼
- `FadeInDown` 애니메이션으로 등장

---

## 라우트 변경 상세

### 신규 라우트

```
app/quiz/exam/diagnosis-session.tsx  ← 신규
```

### 기존 라우트 처리

```
app/quiz/exam/diagnosis.tsx  ← 삭제 또는 리다이렉트
```

### `use-exam-result-screen.ts` 변경

```ts
// 기존
onAnalyzeProblem: (problemNumber: number) => {
  router.push({ pathname: '/quiz/exam/diagnosis', params: { problemNumber } });
}

// 변경
onAnalyzeProblem: (problemNumber: number) => {
  const wrongProblemNumbers = result.perProblem
    .filter(p => !p.isCorrect && p.userAnswer !== null)
    .map(p => p.number);
  const startIndex = wrongProblemNumbers.indexOf(problemNumber);
  router.push({
    pathname: '/quiz/exam/diagnosis-session',
    params: {
      examId: result.examId,
      wrongProblemNumbers: JSON.stringify(wrongProblemNumbers),
      startIndex: String(startIndex),
    },
  });
}
```

---

## DiagnosticScreenView 헤더 변경 상세

### 제거

- `BrandHeader` import 및 렌더링 제거
- 라이트 세션 바 (`diagnosisSessionBar`, `diagnosisHeader`, `diagnosisHeaderTitle` 등) 제거

### 추가

- 다크 헤더 컴포넌트: `DiagnosisDarkHeader` 신규 생성 (두 화면 공유)
  - props: `title`, `backLabel`, `progressLabel`, `progressPercent`, `pages[]`, `activePage`, `onBack`, `onDotPress`

### 헤더 제목 데이터

- `diagnosisPages[activeDiagnosisPageIndex]`의 `answerIndex` + 1 → `Q{n}`
- 예: `answerIndex === 2` → `"Q3"`

---

## 공유 컴포넌트: DiagnosisDarkHeader

```
features/quiz/components/diagnosis-dark-header.tsx
```

두 화면이 동일한 다크 헤더를 쓰므로 공유 컴포넌트로 추출.

```tsx
type DiagnosisDarkHeaderProps = {
  title: string;           // "Q3" | "21번"
  backLabel: string;       // "← 뒤로" | "← 채점 결과"
  progressLabel: string;   // "1 / 5"
  progressPercent: number; // 0~100
  totalCount: number;      // 전체 오답 수 (도트 계산용)
  completedIndices: number[]; // 완료된 페이지 인덱스
  activeIndex: number;     // 현재 페이지 인덱스
  onBack: () => void;
  onDotPress: (index: number) => void;
};
```

---

## 범위 밖 (이번 스펙 제외)

- 모의고사 오답 분석에 AI help card 추가
- 주관식 문제 텍스트 입력 (주관식은 번호 원 미표시로만 처리)
- 채팅 플로우 노드 변경
- 10문제 진단 채팅 내용 변경 (말풍선, 방법 선택 등 그대로)

---

## 파일 목록

### 신규 생성

| 파일 | 설명 |
|---|---|
| `app/quiz/exam/diagnosis-session.tsx` | 신규 라우트 |
| `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx` | 래퍼 스크린 |
| `features/quiz/exam/hooks/use-exam-diagnosis-session.ts` | 세션 훅 |
| `features/quiz/exam/components/exam-problem-card.tsx` | 문제 이미지 + 번호 원 |
| `features/quiz/exam/components/next-problem-card.tsx` | 완료 후 다음 문제 버튼 |
| `features/quiz/components/diagnosis-dark-header.tsx` | 공유 다크 헤더 |

### 수정

| 파일 | 변경 내용 |
|---|---|
| `features/quiz/exam/screens/exam-diagnosis-screen.tsx` | → `ExamDiagnosisPage`로 분리, 내비게이션 제거, 아바타/카드 추가 |
| `features/quiz/exam/hooks/use-exam-diagnosis.ts` | method-choices → DiagnosisMethodSelectorCard 연결 |
| `features/quiz/exam/hooks/use-exam-result-screen.ts` | `onAnalyzeProblem` 라우트 변경 |
| `features/quiz/components/diagnostic-screen-view.tsx` | BrandHeader 제거, DiagnosisDarkHeader 교체 |
| `app/quiz/exam/diagnosis.tsx` | 리다이렉트 또는 삭제 |

---

## 개발 검증 포인트

- [ ] 도트 5개 초과 시 `···` 렌더링 확인 (10개 오답 케이스)
- [ ] 주관식 문제(`type: 'short_answer'`) 시 번호 원 미표시 확인
- [ ] 마지막 문제 완료 시 "모든 오답 분석 완료" 표시 확인
- [ ] `startIndex` 탭한 문제부터 시작 확인
- [ ] 스와이프로 미완료 문제 이동 가능 확인
- [ ] `DiagnosisDarkHeader` iOS/Android 안전 영역(SafeAreaView) 확인
