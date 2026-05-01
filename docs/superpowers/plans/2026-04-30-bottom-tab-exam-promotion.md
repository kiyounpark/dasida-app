# 바텀 탭 4탭화 + 기출 탭 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모의고사/학력평가 진입을 1-depth 탭("기출")으로 승격하고, 기존 "문제 풀기" 탭을 "홈"으로 재라벨링해서 4탭 구조(`홈/기출/기록/설정`)로 만든다.

**Architecture:** `app/(tabs)/exam/` 디렉터리를 신설해 `exam-selection-screen`을 그대로 재사용하고, 기존 `app/(tabs)/quiz/exams.tsx`를 삭제한다. `quiz` 폴더명은 그대로 두어 16곳의 `/(tabs)/quiz` 참조 영향을 0으로 유지하고, 라벨만 "홈"으로 변경한다. 가시성은 기존과 동일하게 `isGraduated === true`일 때만 탭바 노출.

**Tech Stack:** Expo SDK / expo-router 6.0.x / React Native / TypeScript / SF Symbols (iOS) + MaterialIcons fallback (Android/Web)

**관련 문서:**
- Spec: `docs/superpowers/specs/2026-04-30-bottom-tab-exam-promotion-design.md`

---

## File Structure

신설:
- `app/(tabs)/exam/_layout.tsx` — 기출 탭 Stack 레이아웃
- `app/(tabs)/exam/index.tsx` — `exam-selection-screen` re-export

수정:
- `components/ui/icon-symbol.tsx` — `pencil.and.list.clipboard` Android/Web 매핑 추가
- `app/(tabs)/_layout.tsx` — `quiz` 라벨 변경, `exam` 탭 추가
- `app/(tabs)/quiz/_layout.tsx` — `exams` Stack.Screen 항목 제거
- `features/quiz/hooks/use-mock-exam-intro-screen.ts` — 라우트 경로 갱신
- `features/quiz/hooks/use-quiz-hub-screen.ts` — 라우트 경로 갱신

삭제:
- `app/(tabs)/quiz/exams.tsx`

---

## Task 1: IconSymbol 매핑 추가 (Android/Web 폴백)

`pencil.and.list.clipboard`는 iOS에서는 `expo-symbols`를 통해 SF Symbol로 직접 렌더되지만, Android/Web에서는 [icon-symbol.tsx](components/ui/icon-symbol.tsx)의 MaterialIcons MAPPING에 등록되어야 한다. 미등록 시 `IconSymbolName` 타입 에러가 발생한다.

**Files:**
- Modify: `components/ui/icon-symbol.tsx:16-30`

- [ ] **Step 1: MAPPING에 항목 추가**

[components/ui/icon-symbol.tsx](components/ui/icon-symbol.tsx)의 `MAPPING` 객체에 `'doc.text.magnifyingglass'` 줄 다음 위치에 새 줄을 추가한다.

기존:
```tsx
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'book.fill': 'menu-book',
  'doc.text.magnifyingglass': 'find-in-page',
  'clock.fill': 'history',
  'note.text': 'sticky-note-2',
  'person.fill': 'person',
  'gearshape.fill': 'settings',
  xmark: 'close',
  'chevron.left': 'chevron-left',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'checkmark.circle.fill': 'check-circle',
} as IconMapping;
```

수정 후:
```tsx
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'book.fill': 'menu-book',
  'doc.text.magnifyingglass': 'find-in-page',
  'pencil.and.list.clipboard': 'assignment',
  'clock.fill': 'history',
  'note.text': 'sticky-note-2',
  'person.fill': 'person',
  'gearshape.fill': 'settings',
  xmark: 'close',
  'chevron.left': 'chevron-left',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'checkmark.circle.fill': 'check-circle',
} as IconMapping;
```

`assignment`는 MaterialIcons 중 클립보드 + 체크 형태로 "기출/시험" 의미에 가장 가까운 폴백.

- [ ] **Step 2: 타입체크 통과 확인**

Run: `npx tsc --noEmit`
Expected: 변경된 파일 관련 에러 없음 (PASS).

- [ ] **Step 3: 커밋**

```bash
git add components/ui/icon-symbol.tsx
git commit -m "feat(ui): add pencil.and.list.clipboard mapping for tab icon"
```

---

## Task 2: 기출 탭 라우트 신설 (`app/(tabs)/exam/`)

기출 탭에 진입했을 때 보일 화면을 `(tabs)` 그룹 1-depth로 추가한다. 기존 `exam-selection-screen`을 그대로 재사용한다.

**Files:**
- Create: `app/(tabs)/exam/_layout.tsx`
- Create: `app/(tabs)/exam/index.tsx`

- [ ] **Step 1: `app/(tabs)/exam/_layout.tsx` 작성**

기존 [app/(tabs)/quiz/_layout.tsx](app/(tabs)/quiz/_layout.tsx)와 동일한 패턴(단순 Stack)을 따른다.

```tsx
import { Stack } from 'expo-router';

export default function ExamLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '기출', headerShown: false }} />
    </Stack>
  );
}
```

- [ ] **Step 2: `app/(tabs)/exam/index.tsx` 작성**

기존 [app/(tabs)/quiz/exams.tsx](app/(tabs)/quiz/exams.tsx) (`export { default } from '@/features/quiz/screens/exam-selection-screen';`) 패턴을 그대로 가져온다.

```tsx
export { default } from '@/features/quiz/screens/exam-selection-screen';
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS. 새 파일이 정상 인식되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add app/\(tabs\)/exam/_layout.tsx app/\(tabs\)/exam/index.tsx
git commit -m "feat(navigation): add exam tab route under (tabs)"
```

> Note: 이 시점에는 아직 `Tabs.Screen`에 등록되지 않아 탭바에는 노출되지 않는다. Task 4에서 등록한다.

---

## Task 3: 기존 `(tabs)/quiz/exams` 라우트 제거

기출이 1-depth 탭으로 올라오면서 `(tabs)/quiz` 하위에 있던 `exams` 중첩 라우트는 더 이상 필요 없다.

**Files:**
- Delete: `app/(tabs)/quiz/exams.tsx`
- Modify: `app/(tabs)/quiz/_layout.tsx`

- [ ] **Step 1: 기존 `exams.tsx` 삭제**

```bash
rm app/\(tabs\)/quiz/exams.tsx
```

- [ ] **Step 2: `(tabs)/quiz/_layout.tsx`에서 Stack.Screen 항목 제거**

[app/(tabs)/quiz/_layout.tsx](app/(tabs)/quiz/_layout.tsx)를 다음과 같이 수정한다.

기존:
```tsx
import { Stack } from 'expo-router';

export default function QuizLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '문제 풀기', headerShown: false }} />
      <Stack.Screen name="exams" options={{ title: '실전 모의고사', headerShown: false }} />
    </Stack>
  );
}
```

수정 후 (단일 스크린만 남김, 라벨도 "홈"으로 정리):
```tsx
import { Stack } from 'expo-router';

export default function QuizLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '홈', headerShown: false }} />
    </Stack>
  );
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 이 시점에 아직 `use-mock-exam-intro-screen.ts`와 `use-quiz-hub-screen.ts`에 옛 경로 `/(tabs)/quiz/exams`가 남아있다. expo-router 6의 typed routes가 활성화되어 있다면 두 곳에서 타입 에러가 날 수 있다. 발생해도 정상이며 Task 5에서 해결된다. 에러가 없다면 그대로 진행.

- [ ] **Step 4: 커밋**

```bash
git add -u app/\(tabs\)/quiz/_layout.tsx app/\(tabs\)/quiz/exams.tsx
git commit -m "refactor(navigation): remove nested quiz/exams route"
```

---

## Task 4: 탭 바에 4탭 구조 반영

`(tabs)/_layout.tsx`에서 `quiz` 라벨을 "홈"으로 변경하고, `exam` 탭을 `quiz` 다음 위치에 추가한다. 가시성 정책(`isGraduated`)은 기존 `quiz` 탭과 동일하게 적용한다.

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: `quiz` 탭 라벨 변경 + `exam` 탭 추가**

[app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx)의 Tabs 자식 중 `quiz` Tabs.Screen의 `title`을 `'홈'`으로 변경하고, 그 직후에 `exam` Tabs.Screen을 추가한다.

기존:
```tsx
<Tabs.Screen
  name="quiz"
  options={{
    title: '문제 풀기',
    tabBarIcon: ({ color }) => (
      <IconSymbol size={24} name="doc.text.magnifyingglass" color={color} />
    ),
    tabBarStyle: isGraduated ? defaultTabBarStyle : { display: 'none' },
  }}
  listeners={({ navigation, route }) => ({
    tabPress: (event) => {
      const state = navigation.getState();
      const currentRoute = state.routes[state.index];
      if (currentRoute.key === route.key) {
        event.preventDefault();
      }
    },
  })}
/>
<Tabs.Screen
  name="history"
  options={{
    title: '내 기록',
    tabBarIcon: ({ color }) => <IconSymbol size={24} name="note.text" color={color} />,
  }}
/>
```

수정 후:
```tsx
<Tabs.Screen
  name="quiz"
  options={{
    title: '홈',
    tabBarIcon: ({ color }) => (
      <IconSymbol size={24} name="doc.text.magnifyingglass" color={color} />
    ),
    tabBarStyle: isGraduated ? defaultTabBarStyle : { display: 'none' },
  }}
  listeners={({ navigation, route }) => ({
    tabPress: (event) => {
      const state = navigation.getState();
      const currentRoute = state.routes[state.index];
      if (currentRoute.key === route.key) {
        event.preventDefault();
      }
    },
  })}
/>
<Tabs.Screen
  name="exam"
  options={{
    title: '기출',
    tabBarIcon: ({ color }) => (
      <IconSymbol size={24} name="pencil.and.list.clipboard" color={color} />
    ),
    tabBarStyle: isGraduated ? defaultTabBarStyle : { display: 'none' },
  }}
/>
<Tabs.Screen
  name="history"
  options={{
    title: '내 기록',
    tabBarIcon: ({ color }) => <IconSymbol size={24} name="note.text" color={color} />,
  }}
/>
```

> 주의: `exam` 탭에는 `tabPress` listener를 추가하지 않는다. 기출 탭은 단일 화면이라 같은 탭 재탭 시 stack reset 충돌 우려가 없으며, expo-router 기본 동작(스크롤 top 등)을 그대로 사용한다.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 이 시점에서도 Task 3과 마찬가지로 옛 경로 참조 2곳에서 타입 에러가 날 수 있음. Task 5에서 해결.

- [ ] **Step 3: 커밋**

```bash
git add app/\(tabs\)/_layout.tsx
git commit -m "feat(navigation): promote exam to top-level tab and rename quiz tab to 홈"
```

---

## Task 5: 라우트 참조 갱신

`/(tabs)/quiz/exams`로 직접 푸시하던 2곳을 새 경로 `/(tabs)/exam`으로 바꾼다.

**Files:**
- Modify: `features/quiz/hooks/use-mock-exam-intro-screen.ts:9`
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts:190`

- [ ] **Step 1: `use-mock-exam-intro-screen.ts` 수정**

[features/quiz/hooks/use-mock-exam-intro-screen.ts:9](features/quiz/hooks/use-mock-exam-intro-screen.ts:9)에서 다음 한 줄을 변경한다.

기존:
```tsx
router.push('/(tabs)/quiz/exams');
```

수정 후:
```tsx
router.push('/(tabs)/exam');
```

- [ ] **Step 2: `use-quiz-hub-screen.ts` 수정**

[features/quiz/hooks/use-quiz-hub-screen.ts:190](features/quiz/hooks/use-quiz-hub-screen.ts:190)에서 `onPressExam` 핸들러 본문을 변경한다.

기존:
```tsx
const onPressExam = () => {
  router.push('/(tabs)/quiz/exams');
};
```

수정 후:
```tsx
const onPressExam = () => {
  router.push('/(tabs)/exam');
};
```

- [ ] **Step 3: 잔여 참조 검색으로 누락 확인**

Run: `grep -rn "(tabs)/quiz/exams" /Users/baggiyun/dev/dasida-app --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v "\.claude/worktrees"`
Expected: 결과 없음 (모두 정리됨).

- [ ] **Step 4: 타입체크 통과 확인**

Run: `npx tsc --noEmit`
Expected: PASS (옛 경로 잔여 에러 모두 해소).

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/hooks/use-mock-exam-intro-screen.ts features/quiz/hooks/use-quiz-hub-screen.ts
git commit -m "fix(quiz): point exam push targets to /(tabs)/exam"
```

---

## Task 6: 종합 검증 (lint + typecheck + 시뮬레이터 스모크 테스트)

코드 변경이 끝났으므로 종합 검증을 수행한다. 네이티브 의존성 변경은 없어서 prebuild는 불필요하다.

**Files:** (검증 전용, 변경 없음)

- [ ] **Step 1: 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS. 에러가 있으면 수정 후 다시 실행.

- [ ] **Step 2: lint**

Run: `npm run lint`
Expected: 본 작업이 새로 도입한 lint 경고/에러 없음 (기존 경고는 무시).

- [ ] **Step 3: iOS 시뮬레이터 실행**

> 패키지/네이티브 의존성 변경이 없으므로 `prebuild --clean`은 생략. 단, 캐시 이슈 의심 시 한 번 정리 가능.

Run: `npx expo run:ios`
Expected: iOS 시뮬레이터에서 앱 정상 빌드 및 실행. 검정화면 없음.

- [ ] **Step 4: 졸업 후 사용자 시나리오 스모크 테스트**

테스트 계정 또는 dev 화면을 활용해 `isGraduated === true` 상태에서 다음을 직접 확인한다.

1. 바텀 탭바에 4탭(`홈 / 기출 / 기록 / 설정`)이 노출되는지.
2. `홈` 탭 라벨, `doc.text.magnifyingglass` 아이콘 정상.
3. `기출` 탭 라벨, `pencil.and.list.clipboard` 아이콘 정상.
4. 임의의 탭(예: `기록`)에서 `기출` 탭을 누르면 즉시 `exam-selection-screen` 으로 진입.
5. 모의고사 / 학력평가 토글 필터가 기출 화면에서 정상 동작.
6. 기출 화면에서 회차 선택 → 풀이 시작 → 결과 → 진단 → 홈 복귀 전체 흐름 정상.
7. 홈(`quiz-hub-screen`)의 "모의고사 시작" CTA 클릭 시 새 라우트(`/(tabs)/exam`)로 이동.
8. `mock-exam-intro-screen`의 "모의고사 시작" 버튼도 새 라우트로 이동.

- [ ] **Step 5: 졸업 전 사용자 시나리오 스모크 테스트**

`isGraduated === false` 상태(예: 신규 가입 + 학습 여정 진행 중)를 재현하여 확인한다.

1. 바텀 탭바 자체가 hidden인지 (기존 정책 유지).
2. 기존 학습 여정 화면 진입 / 진단 / 풀이 흐름이 정상 동작.

> 졸업 상태 토글 방법은 기존 dev 도구 또는 `practiceGraduatedAt` 필드 임시 조작으로 진행 (구체적인 방법은 팀 합의에 따름).

- [ ] **Step 6: 푸시 알림 진입 회귀 확인**

`app/_layout.tsx`의 `addNotificationResponseReceivedListener`가 `/quiz/review-session`(루트 스택)으로 이동하므로 본 변경의 영향을 받지 않지만, 안전을 위해 한 번 확인한다.

알림으로 `taskId` 포함 페이로드를 발송 → 앱 탭 시 복습 세션이 정상 열리는지 확인.

- [ ] **Step 7: 종합 검증 결과 푸시**

검증이 모두 통과되었다면 현재 브랜치를 origin에 푸시.

```bash
git push origin <현재 브랜치>
npm run log:commit
```

---

## Self-Review (Plan 작성 직후 점검)

**Spec coverage check:**
- ✅ 4탭 재편 (홈/기출/기록/설정) — Task 4
- ✅ `quiz` 라벨만 변경, 폴더 유지 — Task 4 + Task 3 (Stack title도 정리)
- ✅ `(tabs)/exam` 신설 + `exam-selection-screen` 재사용 — Task 2
- ✅ `(tabs)/quiz/exams` 제거 + `_layout.tsx` 항목 제거 — Task 3
- ✅ `pencil.and.list.clipboard` 아이콘 (iOS + Android/Web fallback) — Task 1 + Task 4
- ✅ `isGraduated` 가시성 정책 유지 — Task 4 (exam 탭에도 동일 `tabBarStyle` 적용)
- ✅ 라우트 참조 2곳 갱신 — Task 5
- ✅ 탭바 시각 디자인 톤 그대로 — 별도 변경 없음
- ✅ 풀이/결과/진단 화면 무영향 — `app/quiz/exam/*` 손대지 않음
- ✅ 검증 항목(8개 시나리오) — Task 6의 Step 4

**Placeholder scan:** TBD/TODO/"적절히 처리" 등 없음. 모든 코드 블록은 실제 적용할 코드.

**Type/Path consistency:**
- `(tabs)/exam` 폴더 경로와 라우트 푸시 경로 `/(tabs)/exam` 일치 ✅
- IconSymbol name `pencil.and.list.clipboard` Task 1, Task 4에서 동일 ✅
- `Tabs.Screen name="exam"` 폴더명과 일치 ✅

이상 없음.
