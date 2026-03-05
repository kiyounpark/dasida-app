# DASIDA — 앱 구조 정의
> 파일/화면 구조, 네비게이션 흐름
> 마지막 업데이트: 2026.03.05

---

## 네비게이션 구조

혼합형 구조 (Tabs + Stack). 미래 확장성(내 기록 탭 등)을 위해 **가장 바깥은 탭(Tabs) 네비게이션**을 사용하고, **문제 풀이 탭(`quiz`) 안에 스택(Stack) 네비게이션**을 넣어 선형적 흐름을 강제합니다.

### 탭 동작 규칙
- 하단 탭은 `문제 풀기 / 내 기록 / 설정` 3개로 고정
- `문제 풀기` 탭 안에서만 `index → result → practice → feedback` Stack 흐름 사용
- `문제 풀기` 탭 재탭 시 현재 화면 유지 (강제 초기화하지 않음)
- Stack 뒤로가기는 허용

### 폴더 및 화면 구조
```text
app/
├── _layout.tsx           ← 앱 전체 구조 (탭 네비게이션을 로드)
├── (tabs)/               ← 탭 네비게이션 묶음
│   ├── _layout.tsx       ← 탭 바 설정 (Quiz, History, Profile)
│   ├── history.tsx       ← [미래 확장] 내 기록 화면
│   ├── profile.tsx       ← [미래 확장] 설정 화면
│   └── quiz/             ← ⭐️ [핵심] 문제 풀기 탭 (이 안에서만 Stack 작동)
│       ├── _layout.tsx   ← Quiz용 스택 네비게이션 설정
│       ├── index.tsx     ← [화면1] 문제 출제
│       ├── result.tsx    ← [화면2] AI 판정 결과 + 약점 태그
│       ├── practice.tsx  ← [화면3] 연습문제
│       └── feedback.tsx  ← [화면4] 피드백 입력
```

---

## 화면별 역할

### [화면1] index.tsx — 문제 출제
- `problemData`에서 랜덤 1문제 표시
- 객관식 선택 또는 텍스트 직접 입력
- '제출' 버튼 → OpenAI API 호출
- 로딩 중 스피너 표시
- 완료 → `result.tsx`로 이동 (판정 결과 전달)

### [화면2] result.tsx — AI 판정 결과
- `correct` / `partial` / `wrong` 3분기
  - correct: 정답 메시지 + 풀이 스타일 분석
  - partial: 힌트 제공 + 재시도 유도
  - wrong: 약점 태그 표시 + '연습문제 풀어볼게요' 버튼
- wrong일 때만 `practice.tsx`로 이동

### [화면3] practice.tsx — 연습문제
- `practiceMap[약점태그]`에서 해당 문제 표시
- 객관식 5지선다
- 답 선택 → '제출' → 정답 여부 확인
- '다음' 버튼 → `feedback.tsx`로 이동

### [화면4] feedback.tsx — 피드백 입력
- 약점 태그 + 완료 메시지 표시
- 한 줄 텍스트 입력창
- '제출하기' → Firebase Firestore 저장
- 빈 칸 제출 방지 처리

---

## 데이터 파일 구조

```
data/
├── problemData.ts      ← 문제 10개 (고1 공통수학)
├── practiceMap.ts      ← 약점별 연습문제 9개
└── diagnosisMap.ts     ← 약점 태그 정의 (키값 변경 금지)
```

---

## 컴포넌트 구조

```
components/
└── ui/
    ├── Button.tsx          ← 공통 버튼
    ├── ChoiceButton.tsx    ← 객관식 선택 버튼
    └── LoadingSpinner.tsx  ← AI 호출 중 로딩
```

---

## 상태 전달 방식 (expo-router)

화면 간 데이터는 `router.push`의 `params`로 전달.

```ts
// result.tsx로 이동할 때
router.push({
  pathname: '/quiz/result',
  params: {
    nextStep: 'wrong',       // correct | partial | wrong
    message: 'AI 피드백',
    weakTag: '계산 실수 반복'
  }
});

// practice.tsx로 이동할 때
router.push({
  pathname: '/quiz/practice',
  params: {
    weakTag: '계산 실수 반복'
  }
});

// feedback.tsx로 이동할 때
router.push({
  pathname: '/quiz/feedback',
  params: {
    weakTag: '계산 실수 반복'
  }
});
```

---

## 현재 상태 (2026.03.05)

| 화면 | 파일 | 상태 |
|------|------|------|
| 문제 출제 | `app/(tabs)/quiz/index.tsx` | 🟡 뼈대 완료 |
| AI 판정 결과 | `app/(tabs)/quiz/result.tsx` | 🟡 뼈대 완료 |
| 연습문제 | `app/(tabs)/quiz/practice.tsx` | 🟡 뼈대 완료 |
| 피드백 입력 | `app/(tabs)/quiz/feedback.tsx` | 🟡 뼈대 완료 |
| 내 기록 탭 | `app/(tabs)/history.tsx` | 🟡 플레이스홀더 |
| 설정 탭 | `app/(tabs)/profile.tsx` | 🟡 플레이스홀더 |
| 문제 데이터 | `data/problemData.ts` | ⬜ 미작성 |
| 연습문제 데이터 | `data/practiceMap.ts` | ⬜ 미작성 |
| 약점 태그 | `data/diagnosisMap.ts` | ⬜ 미작성 |
