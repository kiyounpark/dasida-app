# DiagnosisIntroScreen 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 퀴즈 완료 후 표시되는 `DiagnosisIntroScreen`(AI 느낌의 캐릭터 이미지 포함)을 제거하여, step-complete 3초 카운트다운 후 약점 분석 화면으로 바로 진입하도록 한다.

**Architecture:** `use-diagnostic-screen.ts` 훅에서 `hasSeenDiagnosisIntro` 상태와 `onStartDiagnosisIntro` 콜백을 제거하고, `diagnostic-screen-view.tsx`에서 인트로 화면 조건 분기를 제거한다. 파일과 이미지 에셋도 함께 삭제한다.

**Tech Stack:** React Native, Expo, TypeScript

---

## 파일 맵

| 파일 | 변경 유형 | 역할 |
|---|---|---|
| `features/quiz/hooks/use-diagnostic-screen.ts` | 수정 | 상태·콜백·타입 제거 |
| `features/quiz/components/diagnostic-screen-view.tsx` | 수정 | import·prop·조건 블록 제거 |
| `features/quiz/components/diagnosis-intro-screen.tsx` | **삭제** | 화면 컴포넌트 |
| `assets/quiz/diagnostic-intro-character-transparent.png` | **삭제** | 캐릭터 이미지 (3MB) |

---

## Task 1: use-diagnostic-screen.ts — 상태·콜백·타입 제거

**Files:**
- Modify: `features/quiz/hooks/use-diagnostic-screen.ts`

### 1-1. TypeScript 현재 상태 확인 (기준선)

- [ ] **Step 1: 타입 에러 없음을 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음 (기준선)

### 1-2. UseDiagnosticScreenResult 타입에서 제거

- [ ] **Step 2: 타입 정의에서 두 필드 제거**

`features/quiz/hooks/use-diagnostic-screen.ts` 의 `UseDiagnosticScreenResult` 타입 (약 54-97번 라인)에서 아래 두 줄을 제거:

```typescript
// 제거할 줄 1 (hasSeenDiagnosisIntro: boolean 줄)
hasSeenDiagnosisIntro: boolean;

// 제거할 줄 2 (onStartDiagnosisIntro: () => void 줄)
onStartDiagnosisIntro: () => void;
```

### 1-3. useState 선언 제거

- [ ] **Step 3: hasSeenDiagnosisIntro useState 제거**

라인 125 근방에서 아래 줄 제거:

```typescript
// 제거
const [hasSeenDiagnosisIntro, setHasSeenDiagnosisIntro] = useState(false);
```

### 1-4. reset useEffect 제거

- [ ] **Step 4: hasStarted 변경 시 reset하는 useEffect 제거**

라인 128-132 근방에서 아래 블록 제거:

```typescript
// 제거
useEffect(() => {
  if (!state.hasStarted) {
    setHasSeenDiagnosisIntro(false);
  }
}, [state.hasStarted]);
```

### 1-5. return 객체에서 제거

- [ ] **Step 5: 반환 객체에서 두 항목 제거**

라인 664, 698 근방에서 아래 두 줄 제거:

```typescript
// 제거할 줄 1 (return 객체 내)
hasSeenDiagnosisIntro,

// 제거할 줄 2 (return 객체 내)
onStartDiagnosisIntro: () => setHasSeenDiagnosisIntro(true),
```

### 1-6. 타입 체크

- [ ] **Step 6: 타입 에러 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -50
```

Expected: `diagnostic-screen-view.tsx`에서 `hasSeenDiagnosisIntro`·`onStartDiagnosisIntro` 관련 에러만 발생 (다음 Task에서 해결)

### 1-7. 커밋

- [ ] **Step 7: 커밋**

```bash
cd /Users/baggiyun/dev/dasida-app && git add features/quiz/hooks/use-diagnostic-screen.ts && git commit -m "refactor(quiz): use-diagnostic-screen에서 hasSeenDiagnosisIntro 제거"
```

---

## Task 2: diagnostic-screen-view.tsx — import·prop·조건 블록 제거

**Files:**
- Modify: `features/quiz/components/diagnostic-screen-view.tsx`

### 2-1. DiagnosisIntroScreen import 제거

- [ ] **Step 1: import 제거**

라인 16을 삭제:

```typescript
// 제거
import { DiagnosisIntroScreen } from '@/features/quiz/components/diagnosis-intro-screen';
```

### 2-2. 구조분해 prop 제거

- [ ] **Step 2: 컴포넌트 props에서 두 항목 제거**

`DiagnosticScreenView` 함수 인자 구조분해 (라인 33, 59)에서 제거:

```typescript
// 제거할 줄 1
hasSeenDiagnosisIntro,

// 제거할 줄 2
onStartDiagnosisIntro,
```

### 2-3. 조건 블록 제거

- [ ] **Step 3: isDiagnosing 내부의 인트로 조건 블록 제거**

현재 라인 75-78:

```typescript
// 현재 코드
if (isDiagnosing) {
  if (!hasSeenDiagnosisIntro) {
    return <DiagnosisIntroScreen onStartDiagnosis={onStartDiagnosisIntro} />;
  }
  // ... 분석 화면 코드
}
```

변경 후:

```typescript
// 변경 후 — inner if 블록만 제거, isDiagnosing 블록은 유지
if (isDiagnosing) {
  // 바로 분석 화면 코드로 진행
```

즉, `if (!hasSeenDiagnosisIntro) { return <DiagnosisIntroScreen ... />; }` 세 줄만 삭제한다.

### 2-4. 타입 체크

- [ ] **Step 4: 타입 에러 없음 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

### 2-5. 커밋

- [ ] **Step 5: 커밋**

```bash
cd /Users/baggiyun/dev/dasida-app && git add features/quiz/components/diagnostic-screen-view.tsx && git commit -m "refactor(quiz): diagnostic-screen-view에서 DiagnosisIntroScreen 분기 제거"
```

---

## Task 3: 파일 삭제

**Files:**
- Delete: `features/quiz/components/diagnosis-intro-screen.tsx`
- Delete: `assets/quiz/diagnostic-intro-character-transparent.png`

### 3-1. 컴포넌트 파일 삭제

- [ ] **Step 1: 다른 곳에서 import되지 않음을 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && grep -r "diagnosis-intro-screen" --include="*.ts" --include="*.tsx" .
```

Expected: 결과 없음 (Task 2에서 이미 제거했으므로)

- [ ] **Step 2: 컴포넌트 파일 삭제**

```bash
rm /Users/baggiyun/dev/dasida-app/features/quiz/components/diagnosis-intro-screen.tsx
```

### 3-2. 이미지 에셋 삭제

- [ ] **Step 3: 이미지가 다른 곳에서 사용되지 않음을 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && grep -r "diagnostic-intro-character" --include="*.ts" --include="*.tsx" .
```

Expected: 결과 없음

- [ ] **Step 4: 이미지 파일 삭제**

```bash
rm /Users/baggiyun/dev/dasida-app/assets/quiz/diagnostic-intro-character-transparent.png
```

### 3-3. 타입 체크 최종 확인

- [ ] **Step 5: 타입 에러 없음 최종 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

### 3-4. 커밋

- [ ] **Step 6: 커밋**

```bash
cd /Users/baggiyun/dev/dasida-app && git add -A && git commit -m "chore(quiz): DiagnosisIntroScreen 파일 및 캐릭터 이미지 삭제"
```

---

## Task 4: 수동 검증

**검증 방법:** 시뮬레이터에서 전체 플로우 확인

- [ ] **Step 1: 앱 실행**

```bash
cd /Users/baggiyun/dev/dasida-app && npx expo run:ios
```

- [ ] **Step 2: 퀴즈 10문제 완료 → step-complete 화면 확인**

  - "진단 완료!" 화면 표시
  - "N초 후 자동으로 넘어가요" 카운트다운 표시
  - 3초 후 자동 전환

- [ ] **Step 3: 약점 분석 화면 즉시 진입 확인**

  - `DiagnosisIntroScreen` (인트로 화면) 표시되지 않음
  - `DiagnosisConversationPage` (분석 화면)이 바로 표시됨

- [ ] **Step 4: 분석 완료 → result 화면 이동 확인**

  - 분석 완료 후 step-complete ("분석 완료!") 표시
  - result 화면 정상 이동

- [ ] **Step 5: 분석 중 뒤로가기(exit modal) 동작 확인**

  - "← 뒤로" 버튼 누르면 exit confirm modal 표시
  - 확인 시 정상 종료

- [ ] **Step 6: 완료 커밋 및 push**

```bash
cd /Users/baggiyun/dev/dasida-app && git push origin main
```
