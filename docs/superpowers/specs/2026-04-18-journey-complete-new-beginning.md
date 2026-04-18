# 여정 완주 → 새로운 시작 화면 설계

**날짜**: 2026-04-18  
**상태**: 기획중  
**관련 화면**: `step-complete(practice)`, `QuizHubScreen`, `JourneyBoard`, `app/(tabs)/quiz/index.tsx`

---

## 1. 배경 및 목적

현재 약점 연습(practice) 완료 후 곧바로 홈(QuizHubScreen)으로 이동한다. 사용자 입장에서 "여정을 마쳤다"는 감흥 없이 바로 다음 화면이 뜨는 구조다.

**목표**: 진단 → 분석 → 연습 3단계를 모두 마쳤을 때 "이제 새로운 시작이에요!" 축하 모멘트를 제공하고, 사용자가 직접 버튼을 눌러 실전으로 넘어가도록 한다.

---

## 2. 사용자 흐름

### 시나리오 1 — 버튼을 누르는 경우 (정상 흐름)

```
약점 연습 완료
    │
    ▼
step-complete(practice)
"이제 새로운 시작이에요!"
✓ → ✓ → ✓ → ✦ 애니메이션
    │
    │ [함께 실전 시작하기 →]
    ▼
graduateToPractice() 호출
practiceGraduatedAt Firestore 저장
    │
    ▼
QuizHubScreen
JourneyBoard 영구 숨김 / ReviewHomeCard 유지
```

### 시나리오 2 — X를 눌러 닫는 경우

```
step-complete(practice)
    │
    │ [X] 닫기
    ▼
JourneyBoard (3단계 완료, 미졸업 상태)
"실전 여정으로 떠나기 →" CTA 버튼
    │
    │ 버튼 클릭
    ▼
graduateToPractice() 바로 호출 (축하 화면 재표시 없음)
practiceGraduatedAt Firestore 저장
    │
    ▼
QuizHubScreen
JourneyBoard 영구 숨김 / ReviewHomeCard 유지
```

---

## 3. 변경 상세

### 3-1. step-complete(practice) 화면 교체

**파일**: `features/quiz/components/step-complete-screen-view.tsx`

| 항목 | 기존 | 변경 |
|------|------|------|
| eyebrow | "연습 완료" | "여정 완주" |
| title | "연습 완료!" | "이제 새로운\n시작이에요!" |
| body | (기존 문구) | "진단, 분석, 연습까지 함께했어요.\n이제 실전에서 같이 나아가봐요." |
| nextLabel | "다음으로 →" | "함께 실전 시작하기 →" |
| 자동 전진 | 3초 후 자동 | **없음** — 버튼만 |
| 애니메이션 | 없음 | 진행 점 연쇄 팝인 ✓✓✓ → ✦ |
| 캐릭터 | 기존 | 스파클 선글라스 (`char_sparkle_sunglasses.png`) |

**진행 점 애니메이션**:
- 점 3개가 0.2초 간격으로 순서대로 팝인 (cubic-bezier bounce)
- 완료 점: 녹색(#22c55e) + ✓
- 4번째 점: 골드(#f59e0b) + ✦, 팝인 후 glow-pulse 무한 반복
- React Native Animated API 사용

**자동 전진 제거**:
- `STEP_CONFIG` 각 스텝별 `autoAdvanceSeconds?: number` 필드 추가
- `practice`는 `autoAdvanceSeconds: 0` → 자동 전진 없음
- `diagnostic`, `analysis`는 기존 3초 유지

### 3-2. use-step-complete-screen.ts 로직 변경

**파일**: `features/quiz/hooks/use-step-complete-screen.ts`

`practice` case — `graduateToPractice()` 추가:

```ts
// 변경 후
await graduateToPractice();
resetSession();
router.replace('/(tabs)/quiz');
```

- `graduateToPractice()`는 `useLearnerController()`에서 주입
- 이미 `practiceGraduatedAt` 있으면 중복 저장 안 됨 (함수 내부 처리)

### 3-3. app/(tabs)/quiz/index.tsx 분기 제거

**파일**: `app/(tabs)/quiz/index.tsx`

```tsx
// 기존
if (profile?.practiceGraduatedAt) {
  return <MockExamIntroScreen />;
}
return <QuizHubScreen />;

// 변경 후
return <QuizHubScreen />;
```

`MockExamIntroScreen` import도 함께 제거.

### 3-4. QuizHubScreen JourneyBoard 조건 변경

**파일**: `features/quiz/components/quiz-hub-screen-view.tsx`

- `practiceGraduatedAt` 있으면 JourneyBoard 영구 미표시
- ReviewHomeCard는 기존 조건 그대로 (`nextReviewTask` 있을 때 표시)

### 3-5. JourneyBoard CTA 버튼 변경 (3단계 완료·미졸업 상태)

**파일**: JourneyBoard 관련 컴포넌트

- 조건: 1·2·3단계 완료 + `practiceGraduatedAt` 없음
- CTA 버튼 문구: **"실전 여정으로 떠나기 →"**
- 버튼 동작: `graduateToPractice()` 바로 호출 → `router.replace('/(tabs)/quiz')`

### 3-6. 캐릭터 에셋 추가

- **소스**: `IMG_1846 (1).png` (8192×8192, Downloads)
- **크롭 영역**: x=4400–6100, y=6600–8150
- **출력**: `assets/images/characters/char_sparkle_sunglasses.png` (330×330)
- **특징**: 검정 타원 선글라스, ✦ 4방향 별, 살짝 기운 틸트 포즈

---

## 4. 데이터

| 필드 | 타입 | 변경 시점 | 의미 |
|------|------|-----------|------|
| `practiceGraduatedAt` | `string (ISO)` | 버튼 클릭 또는 JourneyBoard CTA | 여정 완주 시각, JourneyBoard 영구 숨김 트리거 |

신규 필드 없음 — 기존 필드 재활용.

---

## 5. 제거 항목

- `MockExamIntroScreen` — `index.tsx` 분기 삭제 (컴포넌트 파일 추후 정리)
- `step-complete(practice)` 3초 자동 전진 로직

---

## 6. 구현 순서

1. 캐릭터 크롭 저장 (`char_sparkle_sunglasses.png`)
2. `step-complete-screen-view.tsx` — 콘텐츠 + 애니메이션 + 자동전진 제거
3. `use-step-complete-screen.ts` — `graduateToPractice()` 연결
4. `app/(tabs)/quiz/index.tsx` — `MockExamIntroScreen` 분기 제거
5. `quiz-hub-screen-view.tsx` — JourneyBoard 조건 변경
6. JourneyBoard CTA — "실전 여정으로 떠나기 →" + 직접 졸업 처리

---

## 7. 검증 체크리스트

- [ ] 약점 연습 완료 → step-complete(practice) 축하 화면 표시
- [ ] ✓✓✓ → ✦ 애니메이션 정상 동작
- [ ] 3초 자동 전진 없음 (버튼만 동작)
- [ ] "함께 실전 시작하기" → `practiceGraduatedAt` 저장 → QuizHubScreen 이동
- [ ] QuizHubScreen: JourneyBoard 미표시, ReviewHomeCard 정상 표시
- [ ] X 누름 → JourneyBoard 복귀 → "실전 여정으로 떠나기 →" CTA 표시
- [ ] JourneyBoard CTA → 즉시 졸업 처리 → QuizHubScreen 이동
- [ ] `practiceGraduatedAt` 중복 저장 없음
- [ ] Android 뒤로가기로 step-complete 재진입 불가 (replace 사용)
- [ ] iOS/Android 양쪽 렌더링 확인
