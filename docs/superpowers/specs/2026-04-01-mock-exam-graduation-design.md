# 모의고사 졸업 전환 설계

**날짜:** 2026-04-01  
**범위:** 약점 연습 완료 후 홈 허브 → 모의고사 인트로 화면 전환

---

## 배경

현재 학습 여정은 `진단 → 분석 → 복습(약점 연습) → 실전 적용(모의고사)` 4단계로 구성된다. 홈 허브는 이 여정을 항상 보여주는데, 약점 연습을 마친 사용자에게는 여정 보드가 더 이상 필요하지 않다. 대신 "준비가 끝났다, 이제 진짜 시험이다"는 **졸업 느낌**의 전환이 필요하다.

에빙하우스 망각곡선 기반 복습 시스템은 이후 단계에서 이 화면에 통합할 계획이며, 이번 설계는 그 확장을 염두에 두고 구조를 잡는다.

---

## 목표

1. 약점 연습 완료 버튼을 누른 순간부터 홈 허브가 보이지 않게 한다.
2. 퀴즈 탭 루트에서 모의고사 인트로 화면이 영구적으로 대체한다.
3. 결과 화면의 모의고사 단축경로를 제거해 졸업 경로만 남긴다.

---

## 사용자 흐름

```
약점 연습 화면
  └→ "약점 연습 완료하기" 버튼 (1문제 이상 풀면 활성화)
       └→ practiceGraduatedAt 저장 (Firestore LearnerProfile)
            └→ 퀴즈 탭 루트
                 └→ MockExamIntroScreen
                      └→ "모의고사 풀기" CTA → /quiz/exams
```

---

## 상태 설계

### LearnerProfile 변경

```ts
export type LearnerProfile = {
  // 기존 필드 유지
  accountKey: string;
  learnerId: string;
  nickname: string;
  grade: LearnerGrade;
  createdAt: string;
  updatedAt: string;

  // 신규
  practiceGraduatedAt?: string; // ISO 타임스탬프. 약점 연습 완료 버튼을 처음 누른 시각.
};
```

- 파생값이 아닌 명시적 사용자 의도를 기록한다.
- 한 번 설정되면 초기화하지 않는다 (졸업은 되돌리지 않음).
- Firestore에 저장되므로 앱 재시작 후에도 유지된다.

---

## 화면 분기

**`app/(tabs)/quiz/index.tsx`**

```
profile.practiceGraduatedAt 없음  →  QuizHubScreen (기존 홈 허브)
profile.practiceGraduatedAt 있음  →  MockExamIntroScreen (새 화면)
```

---

## 변경 파일 목록

### 1. `features/learner/types.ts`
- `LearnerProfile`에 `practiceGraduatedAt?: string` 추가

### 2. `features/learner/firestore-learner-profile-store.ts` (또는 해당 store)
- `updateLearnerProfile`이 `practiceGraduatedAt`을 Firestore에 저장하도록 확인/반영

### 3. `app/(tabs)/quiz/index.tsx`
- `useCurrentLearner()`에서 `profile` 읽어 `practiceGraduatedAt` 유무로 분기
- 로딩 중엔 기존 화면 유지 (깜빡임 방지)

### 4. `features/quiz/hooks/use-practice-screen.ts`
- `solvedCount` 추적 (1문제 이상 풀면 버튼 활성화)
- `onGraduateToPractice` 핸들러 추가:
  1. `updateLearnerProfile({ practiceGraduatedAt: new Date().toISOString() })`
  2. `router.replace('/(tabs)/quiz')`

### 5. `features/quiz/components/quiz-practice-screen-view.tsx`
- 하단에 "약점 연습 완료하기" 버튼 추가
- `solvedCount === 0`이면 비활성화(disabled)

### 6. `features/quiz/screens/mock-exam-intro-screen.tsx` (신규)
- Thin Screen — `useMockExamIntroScreen` 훅 연결

### 7. `features/quiz/hooks/use-mock-exam-intro-screen.ts` (신규)
- `onStartExam`: `router.push('/quiz/exams')`

### 8. `features/quiz/components/mock-exam-intro-screen-view.tsx` (신규)
- 캐릭터(다시) + 말풍선: "드디어 실전이에요!"
- 제목: "약점 정리까지 마쳤어요"
- 부제: "이제 모의고사에서 실전 감각을 확인해보세요"
- CTA: "모의고사 풀기"
- **확장 자리:** 에빙하우스 복습 카운트 섹션 (현재는 빈 슬롯)

### 9. `features/quiz/components/quiz-result-screen-view.tsx`
- "대표 모의고사 다시 풀기" 버튼 2곳 제거

### 10. `features/quiz/components/quiz-result-report-view.tsx`
- "대표 모의고사 다시 풀기" 버튼 있으면 제거

---

## 미래 확장 (이번 범위 외)

- `MockExamIntroScreen`에 에빙하우스 망각곡선 기반 복습 카운트 섹션 추가
  - 모의고사 틀린 문제를 스케줄링해 "오늘 복습 N개" 표시
  - 복습 있으면 복습 먼저 권장, 없으면 모의고사 바로 진입
- `practiceGraduatedAt` 이후 학습 기록을 복습 스케줄 기준점으로 활용

---

## 검증 체크리스트

- [ ] 약점 연습 0문제 상태에서 "약점 연습 완료하기" 버튼 비활성화 확인
- [ ] 1문제 이상 풀면 버튼 활성화 확인
- [ ] 버튼 누른 후 퀴즈 탭 루트가 MockExamIntroScreen으로 전환되는지 확인
- [ ] 앱 재시작 후에도 MockExamIntroScreen이 유지되는지 확인 (Firestore 저장 확인)
- [ ] 결과 화면에 "대표 모의고사 다시 풀기" 버튼이 없는지 확인
- [ ] "모의고사 풀기" CTA → /quiz/exams 정상 이동 확인
- [ ] `npm run typecheck`, `npm run lint` 통과
