# Last Problem Mini-Card — "잠시 쉬기" 숨기기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 분석 마지막 문제 미니카드에서 "잠시 쉬기" 버튼을 숨겨, 리포트로 돌아갈 방법이 없는 데드엔드를 제거한다.

**Architecture:** `DiagnosisMiniCard`의 `buttonRow`에서 ghost 버튼("잠시 쉬기")을 `!isLastProblem` 조건으로 감싸 마지막 문제일 때 렌더링하지 않는다. primary 버튼은 `flex: 1` 덕분에 자동으로 full-width 확장된다. 이 컴포넌트는 props 인터페이스 변경이 없으므로 호출부 수정 불필요.

**Tech Stack:** TypeScript, React Native, Expo Router, Jest (`jest-expo` preset), `@testing-library/react-native` v13.

---

## File Structure

**Create**

- `features/quiz/exam/components/__tests__/diagnosis-mini-card.test.tsx` — 컴포넌트 렌더 단위 테스트 3 케이스.

**Modify**

- `features/quiz/exam/components/diagnosis-mini-card.tsx:87-94` — "잠시 쉬기" Pressable을 `{!isLastProblem && (...)}` 조건으로 감싸기.

분리 근거: 본 변경은 단일 컴포넌트의 렌더 분기를 추가하는 작업이며, 테스트는 컴포넌트와 함께 위치(`__tests__/`)시키는 게 코드베이스 표준이다 (`features/quiz/exam/__tests__/build-resume-analysis-queue.test.ts` 등 동일 패턴).

**참고:** 코드베이스에 첫 번째 `.test.tsx` 파일이지만, jest 설정(`testMatch: ['**/*.test.ts', '**/*.test.tsx']`)과 `@testing-library/react-native@^13.3.3`이 이미 설치되어 있어 추가 설정 없이 동작한다.

---

### Task 1: `DiagnosisMiniCard` — 실패하는 테스트

**Files:**

- Test: `features/quiz/exam/components/__tests__/diagnosis-mini-card.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `features/quiz/exam/components/__tests__/diagnosis-mini-card.test.tsx` with exactly this content:

```tsx
import { render, screen } from '@testing-library/react-native';

import { DiagnosisMiniCard } from '../diagnosis-mini-card';

const defaultProps = {
  problemNumber: 5,
  patternName: '계산 실수',
  patternDescription: '부호를 잘못 옮겼다',
  noteCount: 5,
  totalNotes: 5,
  onPause: jest.fn(),
  onNext: jest.fn(),
};

describe('DiagnosisMiniCard', () => {
  it('isLastProblem=false (기본값) 이면 "잠시 쉬기" 버튼이 렌더링된다', () => {
    render(<DiagnosisMiniCard {...defaultProps} />);
    expect(screen.queryByText('잠시 쉬기')).not.toBeNull();
    expect(screen.queryByText('다음 문제 →')).not.toBeNull();
  });

  it('isLastProblem=true 이면 "잠시 쉬기" 버튼이 렌더링되지 않는다', () => {
    render(<DiagnosisMiniCard {...defaultProps} isLastProblem />);
    expect(screen.queryByText('잠시 쉬기')).toBeNull();
  });

  it('isLastProblem=true 이면 primary 버튼이 "리포트 보기 →"로 표시된다', () => {
    render(<DiagnosisMiniCard {...defaultProps} isLastProblem />);
    expect(screen.queryByText('리포트 보기 →')).not.toBeNull();
    expect(screen.queryByText('다음 문제 →')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest features/quiz/exam/components/__tests__/diagnosis-mini-card.test.tsx`

Expected: 첫 번째 테스트는 PASS (현재 코드는 항상 "잠시 쉬기" 렌더링), 두 번째 테스트는 **FAIL**(`isLastProblem=true` 일 때도 "잠시 쉬기"가 렌더링되어 `queryByText('잠시 쉬기')`가 null이 아님). 세 번째 테스트는 PASS (현재도 isLastProblem로 텍스트만 분기).

이 FAIL이 TDD red 상태다.

---

### Task 2: `DiagnosisMiniCard` — 구현

**Files:**

- Modify: `features/quiz/exam/components/diagnosis-mini-card.tsx:87-94`

- [ ] **Step 1: Wrap "잠시 쉬기" Pressable with isLastProblem guard**

`features/quiz/exam/components/diagnosis-mini-card.tsx` 의 line 87-94 (`buttonRow` 내부)에서 다음 블록을 찾는다:

```tsx
      {/* buttonRow — Ghost + Primary */}
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
          onPress={onPause}
          accessibilityRole="button"
          accessibilityLabel="잠시 쉬기">
          <Text style={styles.btnGhostText}>잠시 쉬기</Text>
        </Pressable>
        <Pressable
```

이를 다음으로 교체한다:

```tsx
      {/* buttonRow — Ghost + Primary */}
      <View style={styles.buttonRow}>
        {!isLastProblem && (
          <Pressable
            style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
            onPress={onPause}
            accessibilityRole="button"
            accessibilityLabel="잠시 쉬기">
            <Text style={styles.btnGhostText}>잠시 쉬기</Text>
          </Pressable>
        )}
        <Pressable
```

변경 요점:
- "잠시 쉬기" Pressable 전체를 `{!isLastProblem && (...)}` 조건부 렌더링으로 감쌈.
- primary "리포트 보기 →" 버튼은 `flex: 1` 스타일을 가지고 있어 ghost 버튼이 사라지면 자동으로 full-width 확장됨 (스타일 변경 불필요).
- props 시그니처 변경 없음.

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx jest features/quiz/exam/components/__tests__/diagnosis-mini-card.test.tsx`

Expected: PASS — 3 tests passed.

- [ ] **Step 3: TypeScript 컴파일 확인**

Run: `npx tsc --noEmit`

Expected: 에러 없음.

- [ ] **Step 4: 전체 테스트 회귀 확인**

Run: `npm test`

Expected: 모든 테스트 통과 (Task 1에서 추가한 3개 + 기존 168개). 회귀 없음.

- [ ] **Step 5: Commit**

```bash
git add features/quiz/exam/components/diagnosis-mini-card.tsx \
        features/quiz/exam/components/__tests__/diagnosis-mini-card.test.tsx
git commit -m "fix(quiz): 마지막 문제 미니카드에서 \"잠시 쉬기\" 버튼 숨기기

마지막 문제 진단 후 \"잠시 쉬기\"를 누르면 홈으로 가지만 모든 문제가
이미 진단되어 \"이어서 분석하기\" 카드가 안 떠 리포트로 돌아갈 경로가
사라지는 데드엔드를 제거.

isLastProblem=true 이면 ghost 버튼을 렌더링하지 않음. primary 버튼
\"리포트 보기 →\"가 flex: 1로 full-width 자동 확장."
```

---

### Task 3: 수동 검증

**Files:** 없음 (런타임 검증).

- [ ] **Step 1: 개발 빌드 실행**

Run: `npx expo run:ios`

Expected: 시뮬레이터에서 앱 실행.

- [ ] **Step 2: 시나리오 A — 마지막 문제 미니카드 확인 (핵심 케이스)**

1. 모의고사 응시 (오답이 있는 시험 선택). 또는 이미 응시한 회차의 결과 화면으로 진입.
2. 결과 화면에서 첫 번째 문제 타일 클릭 → 진단 세션 진입.
3. **마지막 문제까지** 모두 진단을 진행한다.
4. 마지막 문제 진단 완료 → 미니카드 등장.
5. **확인 1:** 미니카드 하단에 **"잠시 쉬기" 버튼이 보이지 않는다**.
6. **확인 2:** "리포트 보기 →" 버튼이 **full-width로 표시된다**.
7. "리포트 보기 →" 탭 → 결과 화면 → 리포트 화면 자동 진입 확인.

Expected: 마지막 미니카드에 "잠시 쉬기" 없음, "리포트 보기"만 full-width로 표시, 탭 시 리포트 진입.

- [ ] **Step 3: 시나리오 B — 일반 문제 미니카드 회귀 확인**

1. 새 회차 진단 또는 다른 회차의 첫 번째 문제부터 진단 시작.
2. **마지막이 아닌 문제(예: 1/5번째)** 진단 완료 → 미니카드 등장.
3. **확인 1:** 미니카드에 **"잠시 쉬기" 버튼이 정상 표시된다**.
4. **확인 2:** primary 버튼 텍스트가 **"다음 문제 →"** 다 ("리포트 보기 →" 아님).
5. "잠시 쉬기" 탭 → 홈으로 이동, "이어서 분석하기" 카드 노출 확인 (회귀 없음).
6. "이어서 분석하기" → 다음 문제 정상 진행 확인.

Expected: 일반 문제는 두 버튼 모두 표시, 잠시 쉬기 흐름 정상 동작.

- [ ] **Step 4: 검증 완료 보고**

수동 검증 결과를 사용자에게 보고하고, 회귀나 누락이 없으면 PR 작성 단계로 진행.

---

## Self-Review Notes

- **Spec 커버리지**: spec의 Goal/Background/Approach/Scope/Verification 모든 항목이 Task 1~3으로 커버됨.
- **Placeholder 없음**: 모든 step에 실제 코드/명령/검증 항목 포함.
- **Type 일관성**: `DiagnosisMiniCardProps` 인터페이스는 변경 없음. `isLastProblem?: boolean` 기존 prop을 그대로 활용.
- **DRY**: 단일 조건부 렌더링 추가, 별도 헬퍼 함수 불필요.
- **YAGNI**: 별도 prop이나 새 컴포넌트, props 시그니처 변경 없이 기존 prop만 활용.
- **TDD**: Task 1 (red — 새 케이스 FAIL) → Task 2 (green) → Task 3 (런타임 검증). 커밋 단위는 Task 1+2 한 커밋(테스트와 구현을 같이 묶음 — 이전 작업 패턴과 동일).
- **테스트 환경**: 코드베이스 첫 `.test.tsx`이지만 jest config와 RNTL 의존성이 모두 갖춰져 있어 추가 설정 불필요.
