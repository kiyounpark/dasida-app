# Plan: 약점 학습 플로우 바텀 네비게이션 제거

## 목표

`app/(tabs)/quiz/` 하위의 플로우 화면들을 루트 Stack(`app/quiz/`)으로 이동하여 탭 네비게이션 없이 렌더링되도록 한다.
허브 화면(`quiz/index`)과 모의고사 목록(`exams`)은 기존 `(tabs)/quiz/`에 그대로 유지한다.

---

## 아키텍처 변경

### Before
```
Root Stack
└── (tabs)              ← 탭바 있음
    └── quiz/ (Stack)   ← QuizSessionProvider 감쌈
        ├── index.tsx           (허브 — 탭바 O)
        ├── exams.tsx           (모의고사 목록 — 탭바 O)
        ├── diagnostic.tsx      (10문제 진단 — 탭바 O ← 문제)
        ├── result.tsx          (판정 결과 — 탭바 O ← 문제)
        ├── practice.tsx        (약점 연습 — 탭바 O ← 문제)
        ├── feedback.tsx        (피드백 — 탭바 O ← 문제)
        ├── review-session.tsx  (복습 세션 — 탭바 O ← 문제)
        ├── step-complete.tsx   (단계 완료 — 탭바 O ← 문제)
        └── exam/
            ├── solve.tsx              (← 문제)
            ├── result.tsx             (← 문제)
            ├── diagnosis.tsx          (← 문제)
            └── diagnosis-session.tsx  (← 문제)
```

### After
```
Root Stack
├── (tabs)              ← 탭바 있음
│   └── quiz/ (Stack)  ← 허브 + 모의고사 목록만
│       ├── index.tsx   (허브 — 탭바 O)
│       └── exams.tsx   (모의고사 목록 — 탭바 O)
└── quiz/ (Stack)       ← QuizSessionProvider, 탭바 없음
    ├── diagnostic.tsx
    ├── result.tsx
    ├── practice.tsx
    ├── feedback.tsx
    ├── review-session.tsx
    ├── step-complete.tsx
    └── exam/
        ├── solve.tsx
        ├── result.tsx
        ├── diagnosis.tsx
        └── diagnosis-session.tsx
```

---

## 파일 변경 목록

### 신규 생성 (2개)

| 파일 | 내용 |
|------|------|
| `app/quiz/_layout.tsx` | QuizSessionProvider + Stack (플로우 화면 등록) |
| `app/quiz/exam/_layout.tsx` | exam 서브플로우 Stack |

### 이동 후 원본 삭제 (10개)

| 원본 | 대상 |
|------|------|
| `app/(tabs)/quiz/diagnostic.tsx` | `app/quiz/diagnostic.tsx` |
| `app/(tabs)/quiz/result.tsx` | `app/quiz/result.tsx` |
| `app/(tabs)/quiz/practice.tsx` | `app/quiz/practice.tsx` |
| `app/(tabs)/quiz/feedback.tsx` | `app/quiz/feedback.tsx` |
| `app/(tabs)/quiz/review-session.tsx` | `app/quiz/review-session.tsx` |
| `app/(tabs)/quiz/step-complete.tsx` | `app/quiz/step-complete.tsx` |
| `app/(tabs)/quiz/exam/solve.tsx` | `app/quiz/exam/solve.tsx` |
| `app/(tabs)/quiz/exam/result.tsx` | `app/quiz/exam/result.tsx` |
| `app/(tabs)/quiz/exam/diagnosis.tsx` | `app/quiz/exam/diagnosis.tsx` |
| `app/(tabs)/quiz/exam/diagnosis-session.tsx` | `app/quiz/exam/diagnosis-session.tsx` |

### 수정 (2개)

| 파일 | 변경 내용 |
|------|-----------|
| `app/_layout.tsx` | Root Stack에 `<Stack.Screen name="quiz" options={{ headerShown: false }} />` 추가 |
| `app/(tabs)/quiz/_layout.tsx` | 이동된 화면들의 Stack.Screen 제거, index + exams + QuizSessionProvider만 유지 |

### 경로 참조 변경 없음

기존 navigation 호출이 이미 `/quiz/...` 형태를 사용하므로 수정 불필요:

- `router.push('/quiz/diagnostic')` → 새 위치 `app/quiz/diagnostic.tsx`로 자동 라우팅
- `router.push('/quiz/practice')` → 새 위치로 자동 라우팅
- `router.replace('/(tabs)/quiz')` → 허브, 기존 위치 유지
- `router.push('/(tabs)/quiz/exams')` → exams 기존 위치 유지
- `router.push('/quiz/review-session')` → 알림 deep-link, 새 위치로 자동 라우팅

---

## 구현 순서

### Step 1: `app/quiz/_layout.tsx` 생성
```tsx
import { Stack } from 'expo-router';
import { QuizSessionProvider } from '@/features/quiz/session';

export default function QuizFlowLayout() {
  return (
    <QuizSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="diagnostic" />
        <Stack.Screen name="result" />
        <Stack.Screen name="practice" />
        <Stack.Screen name="feedback" />
        <Stack.Screen name="review-session" />
        <Stack.Screen name="step-complete" />
        <Stack.Screen name="exam" />
      </Stack>
    </QuizSessionProvider>
  );
}
```

### Step 2: `app/quiz/exam/_layout.tsx` 생성
기존 `app/(tabs)/quiz/exam/_layout.tsx` 내용 그대로 복사.

### Step 3: 플로우 파일 10개 이동
`app/(tabs)/quiz/` → `app/quiz/`로 각 파일 복사 후 원본 삭제.

### Step 4: `app/_layout.tsx` 수정
Root Stack에 아래 라인 추가 (기존 `(tabs)` Screen 아래):
```tsx
<Stack.Screen name="quiz" options={{ headerShown: false }} />
```

### Step 5: `app/(tabs)/quiz/_layout.tsx` 정리
이동된 화면들의 `<Stack.Screen>` 제거, 아래만 유지:
```tsx
<Stack>
  <Stack.Screen name="index" options={{ headerShown: false }} />
  <Stack.Screen name="exams" options={{ title: '실전 모의고사', headerShown: false }} />
</Stack>
```
QuizSessionProvider는 `exams` 화면 불필요 시 제거, 필요 시 유지.

---

## 검증 체크리스트 (빡세게)

### A. 탭바 표시/숨김
- [ ] `/quiz` (허브): 탭바 보임, 3개 탭 정상
- [ ] `/quiz/diagnostic`: 탭바 없음
- [ ] `/quiz/result`: 탭바 없음
- [ ] `/quiz/practice`: 탭바 없음
- [ ] `/quiz/feedback`: 탭바 없음
- [ ] `/quiz/review-session`: 탭바 없음
- [ ] `/quiz/step-complete`: 탭바 없음
- [ ] `/quiz/exam/solve`: 탭바 없음
- [ ] `/quiz/exam/result`: 탭바 없음
- [ ] `/quiz/exam/diagnosis-session`: 탭바 없음

### B. 네비게이션 흐름
- [ ] 허브 → diagnostic 진입 (탭바 사라짐)
- [ ] diagnostic → step-complete(diagnostic) → step-complete(analysis) → result 흐름
- [ ] result → practice (challenge 모드) 진입
- [ ] result → practice (weakness 모드) 진입
- [ ] practice → feedback 진입
- [ ] feedback → `/(tabs)/quiz` 복귀 (탭바 다시 나타남)
- [ ] practice → `/(tabs)/quiz` 복귀 (review 모드)
- [ ] step-complete → `/(tabs)/quiz` 복귀 (졸업 성공/실패)
- [ ] exams → `exam/solve` 진입 (탭바 없음)
- [ ] exam/solve → exam/result → exam/diagnosis-session 흐름
- [ ] exam/result → `/(tabs)/quiz` 복귀

### C. 알림 deep-link
- [ ] Cold-start 알림 탭 → `/quiz/review-session` 진입 (탭바 없음)
- [ ] Foreground 알림 탭 → `/quiz/review-session` 진입 (탭바 없음)
- [ ] review-session → `/(tabs)/quiz` 복귀

### D. QuizSessionProvider 컨텍스트
- [ ] diagnostic 화면: 세션 컨텍스트 접근 가능, 크래시 없음
- [ ] practice 화면: 세션 컨텍스트 접근 가능
- [ ] result 화면: 세션 컨텍스트 접근 가능

### E. 타 탭 회귀
- [ ] History 탭 (`/(tabs)/history`): 탭바 정상, 기능 정상
- [ ] Profile 탭 (`/(tabs)/profile`): 탭바 정상, 기능 정상
- [ ] 플로우 진행 중 History/Profile 탭 접근 불가(탭바 없음) → 정상

---

## 위험 요소

### HIGH: QuizSessionProvider 컨텍스트 단절
- **현황**: 기존 `(tabs)/quiz/_layout.tsx`의 단일 Provider가 허브 + 플로우 전체를 감쌌음
- **변경 후**: `quiz/_layout.tsx`의 새 Provider가 플로우만 감쌈 (허브 진입 시 초기화됨)
- **검증**: 허브에서 diagnostic 진입 → 플로우 내 상태 정상 초기화 여부 확인

### MEDIUM: `/quiz` 경로 해석
- `router.replace('/quiz')` 가 `app/(tabs)/quiz/index.tsx`를 가리키는지 확인
- `(tabs)` 그룹은 URL에 포함되지 않으므로 이론상 `/quiz` = `app/(tabs)/quiz/index` 맞음

### LOW: `unstable_settings = { anchor: '(tabs)' }` 영향
- 플로우 화면에서 시스템 뒤로가기 → `(tabs)` 앵커로 복귀하는 동작 확인 필요
