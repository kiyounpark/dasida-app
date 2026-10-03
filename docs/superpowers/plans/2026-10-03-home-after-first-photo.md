# 첫 사진 뒤 홈 · 1.0.11 빌드 24 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 첫 사진을 올린 학생의 홈이 "방금 만든 노트"와 "내일 다시 열 이유"를 보여주게 하고, 1.0.11의 새 기기 입구·날짜·옛 차트 구멍을 막아 빌드 24로 낸다.

**Architecture:** 화면만 바꾼다(서버·Firestore·저장 모양 0). 홈 훅이 이미 읽는 기기 노트 목록에서 최신 1장을 꺼내 홈 뷰로 내리고, 「복습 없는 날」 카드는 사진에서 온 과제일 때 모의고사 추천 대신 「내일 첫 복습」을 그린다. 날짜 세기는 과제를 만들 때와 같은 기기 날짜로 맞춘다.

**Tech Stack:** Expo SDK / React Native / expo-router / jest + @testing-library/react-native / TypeScript

**설계 원문:** Claude Docs 「첫 사진 뒤 홈 화면 — 기획」(https://claude.ai/code/artifact/352f5eff-bee4-4e3d-8452-600d38b8db24) · astra 답 `scratchpad/astra-out3.md` · Fable 2차 최종(작은 노트 카드) — 2026-10-03

## Global Constraints

- 서버(`functions/`)·Firestore 문서·`PhotoNote`/`ReviewTask` 저장 모양은 **안 바꾼다**. 바뀌면 이 계획 밖이다.
- 사진 0장 학생의 첫 화면(`HomeFirstRun`)은 그대로 (기윤 10.03).
- 「내일」이라는 글자는 **저장된 복습 과제(`today.nextTask`)가 있고 그 날짜가 기기 날짜로 내일일 때만** 쓴다.
- "3분" 같은 잰 적 없는 숫자, "안 열면 …" 같은 조건문은 쓰지 않는다.
- 문구(아래 그대로 쓴다):
  - 다음 복습 카드: 작은 글 `내일 · 10/4(일)`(사흘 뒤면 `10/6(화) · D-3`, 오늘·지난 날짜면 `10/3(토)`만) / 제목 `{약점명} · DAY 1`(단계 표기, 「첫」은 안 쓴다 — 연체로 day1에 내려온 학생에게 거짓. Fable 최종 10.03) / 본문 `내일 홈에 떠요. 짧게 다시 보면 돼요.`(내일이 아니면 `10/6 홈에 떠요. 짧게 다시 보면 돼요.`)
  - 지난 오답노트 화면, 기기 0장 + 서버 조회 실패: 제목 `노트를 못 불러왔어` / 본문 `인터넷을 확인하고 다시 시도해 줘.` / 버튼 `다시 시도`
  - 이름 안 붙은 노트(과제 0): 제목 `오답노트 {N}장 있어요` / 본문 `복습 날짜는 안 잡혔어요 — 약점 이름이 안 붙은 노트라서요.` (최신 노트에 `primaryWeaknessId`가 있는데 과제가 없으면 `복습 날짜가 아직 안 잡혔어요.`)
  - 노트 카드: 머리 `오답노트 · {dateLabel}` / 줄 `다음엔` + `note.fix`(2줄까지) / 버튼 `노트 펼쳐 보기 ›`
  - 사진 줄(노트가 있을 때): `+ 틀린 문제 하나 더 올리기`
  - 사진 화면 입구: 0장이면 `지난 오답노트 보기`, N장이면 `지난 오답노트 N장 보기`
- 테스트는 `rtk proxy ./node_modules/.bin/jest <경로>`로 돌린다(rtk가 실패 줄을 숨긴다). 타입은 `./node_modules/.bin/tsc --noEmit`.
- main에서 바로 작업한다. 각 Task 끝에 커밋. 푸시는 Task 8.

## File Structure

| 파일 | 할 일 |
|---|---|
| `features/photo/components/photo-upload-view.tsx` | 수정 — 지난 노트 입구를 0장이어도 낸다 |
| `features/learning/review-scheduler.ts` | 수정 — `daysUntilScheduled()` 추가(기기 날짜) |
| `features/quiz/home-weakness-visibility.ts` | 새로 — 약점 차트를 띄울지 정하는 순수 함수 |
| `features/quiz/components/no-review-day-card.tsx` | 수정 — 사진 과제면 「내일 첫 복습」, 날짜는 새 함수로 |
| `features/quiz/home-notes-heading.ts` | 새로 — 과제 0 + 노트 있음일 때 제목·본문 |
| `features/quiz/components/home-latest-note.tsx` | 새로 — 최신 노트 카드 + 사진 줄 |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | 수정 — `latestPhotoNote`·`photoNoteCount`·`onPressNotes` 반환, 날짜·차트 조건 교체 |
| `features/quiz/components/quiz-hub-screen-view.tsx` | 수정 — 「그 외」 분기에 노트 블록과 새 제목 |
| `app/(tabs)/_layout.tsx` | 수정 — 탭 글자 lineHeight (Task 6) · 탭 이름 (Task 7) |
| `app/(tabs)/history.tsx` | 수정 — 오답노트 목록으로 (Task 7, 기윤 확인 뒤) |

---

### Task 1: 새 기기에서도 「지난 오답노트」 입구가 보인다

**Files:**
- Modify: `features/photo/components/photo-upload-view.tsx:49-58`
- Test: `features/photo/screens/__tests__/photo-flow-screen.test.tsx:218-223`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (화면만)

- [ ] **Step 1: 테스트를 뒤집는다** — `photo-flow-screen.test.tsx:218-223`을 아래로 교체

```tsx
  it('지난 노트가 기기에 0장이어도 입구를 낸다 — 새 기기에선 서버에만 노트가 있다(1.0.11)', async () => {
    render(<PhotoFlowScreen accountKey="user:abc" />);

    await waitFor(() => expect(mockReadNotes).toHaveBeenCalledWith('user:abc'));
    expect(screen.getByText('지난 오답노트 보기')).toBeTruthy();
  });
```

- [ ] **Step 2: 실패 확인** — `rtk proxy ./node_modules/.bin/jest features/photo/screens/__tests__/photo-flow-screen.test.tsx` → 새 테스트 FAIL(텍스트 없음)

- [ ] **Step 3: 구현** — `photo-upload-view.tsx:49-58`을 교체

```tsx
      {/* 기기에 0장이어도 낸다 — 1.0.11부터 노트가 서버에도 있어서, 새 기기·재설치 학생은
          여기서 목록에 들어가야 서버 노트를 내려받는다(remote-note-store loadRemotePhotoNotes). */}
      {onOpenNotes && (
        <Pressable
          accessibilityRole="button"
          onPress={onOpenNotes}
          style={({ pressed }) => [styles.notesLink, pressed && styles.notesLinkPressed]}>
          <Text style={styles.notesLinkText}>
            {savedNoteCount > 0 ? `지난 오답노트 ${savedNoteCount}장 보기` : '지난 오답노트 보기'}
          </Text>
        </Pressable>
      )}
```

- [ ] **Step 4: 통과 확인** — 같은 명령 → 전부 PASS (`:225-231` 「3장 보기」도 그대로 통과)

- [ ] **Step 5: 커밋** — `git add features/photo && git commit -m "fix(photo): 새 기기에서도 지난 오답노트 입구를 낸다"`

---

### Task 1b: 새 기기에서 서버를 못 읽으면 「아직 노트가 없어」라고 하지 않는다

Task 1이 새 기기 입구를 열면서 처음 닿는 거짓(astra 검토 5, Fable 최종 수용). 지금 `remote-note-store.ts:194-196`이 오류를 삼키고 `photo-notes-screen.tsx:59-70`이 기기 0장이면 「아직 노트가 없어」를 띄운다. **기기 노트가 있으면 지금처럼 띠 없음**(기존 테스트 `photo-notes-screen.test.tsx:207-218`).

**Files:**
- Modify: `features/photo/cloud/remote-note-store.ts:140-197`
- Modify: `features/photo/hooks/use-photo-notes-screen.ts:27-79, 133-140`
- Modify: `features/photo/screens/photo-notes-screen.tsx:41-70`
- Test: `features/photo/screens/__tests__/photo-notes-screen.test.tsx` (케이스 추가)

**Interfaces:**
- Produces: `loadRemotePhotoNotes` options에 `onRemoteError?: () => void` · `usePhotoNotesScreen` 반환에 `remoteFailed: boolean`, `reload: () => void`

- [ ] **Step 1: 실패하는 테스트** — `photo-notes-screen.test.tsx`의 「서버 실패·오프라인이면 기기 노트만」 아래에 추가

```tsx
  it('기기 0장 + 서버 실패면 「없어」 대신 다시 시도 — 새 기기에서 노트가 있는데 없다고 하지 않는다', async () => {
    mockRead.mockResolvedValue([]);
    mockServer
      .mockRejectedValueOnce(
        new LearningHistoryApiError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.', 0, 'NETWORK_ERROR'),
      )
      .mockResolvedValueOnce({ notes: [serverDoc()], nextBefore: null });

    render(<PhotoNotesScreen accountKey="user:abc" getRemoteAuthHeaders={getRemoteAuthHeaders} />);

    await waitFor(() => expect(screen.getByText('노트를 못 불러왔어')).toBeTruthy());
    expect(screen.queryByText('아직 노트가 없어')).toBeNull();

    fireEvent.press(screen.getByText('다시 시도'));
    await waitFor(() => expect(screen.getByText('노트 1장')).toBeTruthy());
  });
```

- [ ] **Step 2: 실패 확인** — `rtk proxy ./node_modules/.bin/jest features/photo/screens/__tests__/photo-notes-screen.test.tsx` → 새 케이스 FAIL

- [ ] **Step 3: 구현**
  - `remote-note-store.ts` options 타입에 `/** 서버 목록을 못 읽었을 때 한 번 — 「없음」과 「못 읽음」을 가른다 */ onRemoteError?: () => void;`, 구조분해에 `onRemoteError`, catch 안 `console.warn` 다음 줄에 `if (!isCancelled()) onRemoteError?.();`
  - `use-photo-notes-screen.ts`: `const [remoteFailed, setRemoteFailed] = useState(false);` · `const [reloadKey, setReloadKey] = useState(0);` · effect 안 `setRemote(null);` 다음에 `setRemoteFailed(false);` · `loadRemotePhotoNotes` options에 `onRemoteError: () => { if (!cancelled) setRemoteFailed(true); },` · deps를 `[accountKey, getRemoteAuthHeaders, reloadKey]` · `const reload = useCallback(() => setReloadKey((k) => k + 1), []);` · return에 `remoteFailed, reload`
  - `photo-notes-screen.tsx`: 구조분해에 `remoteFailed, reload`, `remotePending` 스피너 분기 다음·「아직 노트가 없어」 앞에:

```tsx
  // 새 기기에서 서버를 못 읽었다 — 노트가 서버에 있을 수 있으니 「없어」라고 하지 않는다
  if (notes.length === 0 && remoteFailed) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>노트를 못 불러왔어</Text>
          <Text style={styles.emptyBody}>인터넷을 확인하고 다시 시도해 줘.</Text>
          <Pressable accessibilityRole="button" onPress={reload} style={styles.upload}>
            <Text style={styles.uploadLabel}>다시 시도</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
```

  (`styles.upload`·`uploadLabel`은 같은 파일 「계정에 저장하기」 버튼 스타일 — `photo-notes-screen.tsx:81-82`, 10.03 확인.)

- [ ] **Step 4: 통과 확인** — `rtk proxy ./node_modules/.bin/jest features/photo` → 전부 PASS(「서버 실패·오프라인이면 기기 노트만 — 오류 띠는 없다」 포함)

- [ ] **Step 5: 커밋** — `git add features/photo && git commit -m "fix(photo): 새 기기에서 서버를 못 읽으면 다시 시도를 낸다"`

---

### Task 2: D-N을 기기 날짜로 센다

지금 `no-review-day-card.tsx:8-14`와 `use-quiz-hub-screen.ts:260-268`이 `toISOString()`(UTC 날짜)로 오늘을 센다. 과제 날짜는 `addDaysToToday`(`review-scheduler.ts:17-22`, 기기 날짜)로 만든다. 한국 00:00~09:00엔 하루가 어긋나 D-1이 D-2로 뜬다.

**Files:**
- Modify: `features/learning/review-scheduler.ts` (함수 추가)
- Test: `features/learning/review-scheduler.test.ts` (케이스 추가)

**Interfaces:**
- Produces: `export function daysUntilScheduled(scheduledFor: string, now?: Date): number` — 기기 날짜 기준 오늘→scheduledFor 앞 10글자 날짜까지 일수. **막지 않는다**(오늘 0, 어제 -1). 「내일」 판정은 `=== 1`, pill만 `Math.max(1, …)`. Task 4·5가 쓴다.

- [ ] **Step 1: 실패하는 테스트** — `review-scheduler.test.ts` 끝에 추가

```ts
import { daysUntilScheduled } from './review-scheduler';

describe('daysUntilScheduled — 기기 날짜로 센다', () => {
  it('한국 아침 8시에 내일 과제면 1이다 (UTC로 세면 2가 나오던 자리)', () => {
    const now = new Date(2026, 9, 3, 8, 0); // 기기 시각 10/3 08:00
    expect(daysUntilScheduled('2026-10-04T00:00:00.000Z', now)).toBe(1);
  });

  it('사흘 뒤면 3이다', () => {
    const now = new Date(2026, 9, 3, 23, 30);
    expect(daysUntilScheduled('2026-10-06T00:00:00.000Z', now)).toBe(3);
  });

  it('오늘·지난 날짜는 0·음수 그대로 — 막으면 오늘 과제가 「내일」로 둔갑한다', () => {
    const now = new Date(2026, 9, 3, 12, 0);
    expect(daysUntilScheduled('2026-10-03T00:00:00.000Z', now)).toBe(0);
    expect(daysUntilScheduled('2026-10-01T00:00:00.000Z', now)).toBe(-2);
  });
});
```

- [ ] **Step 2: 실패 확인** — `rtk proxy ./node_modules/.bin/jest features/learning/review-scheduler.test.ts` → FAIL(export 없음)

- [ ] **Step 3: 구현** — `review-scheduler.ts`의 `addDaysToToday` 아래에 추가

```ts
/**
 * 오늘부터 scheduledFor 날짜까지 며칠인지. 과제 날짜는 기기 날짜로 만들어지니(addDaysToToday)
 * 오늘도 기기 날짜로 센다 — toISOString()(UTC)으로 세면 한국 00~09시에 하루가 더 나온다.
 * 막지 않는다(오늘 0, 어제 -1) — 홈을 켜 둔 채 자정이 지나면 resting 과제가 오늘이 될 수 있고,
 * 그때 1로 막으면 「내일」이 거짓이 된다. D-N 표시는 부르는 쪽이 Math.max(1, …).
 */
export function daysUntilScheduled(scheduledFor: string, now: Date = new Date()): number {
  const [y, m, d] = scheduledFor.slice(0, 10).split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}
```

- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS

- [ ] **Step 5: 커밋** — `git commit -am "fix(review): D-N을 기기 날짜로 센다"`

---

### Task 3: 약점 차트는 복습을 한 번 끝낸 뒤에만

기윤 10.03 결정. 지금은 미완료 과제 하나만 있어도 뜬다(`use-quiz-hub-screen.ts:277-278`, `home-state.ts:198-209`). 차트는 이미 「복습 한 번이면 바로 채워져요」라고 약속한다(`weakness-growth-chart.tsx` `hasAnyReview`).

**Files:**
- Create: `features/quiz/home-weakness-visibility.ts`
- Test: `features/quiz/home-weakness-visibility.test.ts`

**Interfaces:**
- Consumes: `WeaknessProgressItem` (`features/learning/types.ts:130` `reviewAccuracyByStage`)
- Produces: `export function shouldShowWeaknessSection(items: WeaknessProgressItem[] | undefined, isAnalysisInProgress: boolean): boolean` — Task 5가 훅에서 쓴다.

- [ ] **Step 1: 실패하는 테스트**

```ts
import type { WeaknessProgressItem } from '@/features/learning/types';

import { shouldShowWeaknessSection } from './home-weakness-visibility';

const item = (reviewAccuracyByStage: WeaknessProgressItem['reviewAccuracyByStage']) =>
  ({ reviewAccuracyByStage }) as WeaknessProgressItem;

describe('shouldShowWeaknessSection', () => {
  it('복습을 한 번도 안 끝냈으면 안 띄운다 — 사진 1장 학생에게 빈 차트', () => {
    expect(shouldShowWeaknessSection([item({})], false)).toBe(false);
  });

  it('복습을 한 번 끝냈으면 띄운다', () => {
    expect(shouldShowWeaknessSection([item({}), item({ day1: 67 })], false)).toBe(true);
  });

  it('실모 분석 중이면 안 띄운다(지금 동작 유지)', () => {
    expect(shouldShowWeaknessSection([item({ day1: 67 })], true)).toBe(false);
  });

  it('항목이 없으면 안 띄운다', () => {
    expect(shouldShowWeaknessSection(undefined, false)).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인** — `rtk proxy ./node_modules/.bin/jest features/quiz/home-weakness-visibility.test.ts` → FAIL

- [ ] **Step 3: 구현** — `features/quiz/home-weakness-visibility.ts`

```ts
import type { WeaknessProgressItem } from '@/features/learning/types';

/**
 * 홈 「내 약점 · 복습 정답률」을 띄울지. 복습을 한 번이라도 끝내 막대가 하나 생긴 뒤부터(기윤 10.03).
 * 그 전엔 빈 차트라 첫 사진 학생의 홈을 한 칸 더 허전하게 만든다.
 */
export function shouldShowWeaknessSection(
  items: WeaknessProgressItem[] | undefined,
  isAnalysisInProgress: boolean,
): boolean {
  if (isAnalysisInProgress || !items) return false;
  return items.some((item) => Object.keys(item.reviewAccuracyByStage).length > 0);
}
```

- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS

- [ ] **Step 5: 커밋** — `git add features/quiz/home-weakness-visibility* && git commit -m "feat(home): 약점 차트는 복습 한 번 뒤부터"`

---

### Task 4: 사진 과제면 모의고사 추천 대신 다음 복습 카드

**Files:**
- Modify: `features/quiz/components/no-review-day-card.tsx`
- Test: Create `features/quiz/components/__tests__/no-review-day-card.test.tsx`

**Interfaces:**
- Consumes: `daysUntilScheduled` (Task 2) · `resolveWeaknessLabel` (`data/diagnosisMap.ts:587`) · `formatReviewStageLabel` (`features/learning/review-stage.ts:12`)
- Produces: `NoReviewDayCard` props 그대로 (`nextTask`, `onPressExam`). 사진 과제(`nextTask.source === 'photo'`)일 때 모의고사 블록이 사라진다.

- [ ] **Step 1: 실패하는 테스트**

```tsx
import { render, screen } from '@testing-library/react-native';

import { resolveWeaknessLabel } from '@/data/diagnosisMap';

import { NoReviewDayCard } from '../no-review-day-card';

jest.mock('@/hooks/use-is-tablet', () => ({ useIsTablet: () => false }));

const task = (over: Record<string, unknown>) =>
  ({
    id: 't1',
    weaknessId: 'discriminant_calculation',
    stage: 'day1',
    scheduledFor: '2026-10-04T00:00:00.000Z',
    source: 'photo',
    sourceId: 'n1',
    ...over,
  }) as any;

describe('NoReviewDayCard', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 3, 8, 0)); // 기기 10/3 08:00
  });
  afterEach(() => jest.useRealTimers());

  it('사진 과제가 내일이면 「내일」 카드를 그리고 모의고사는 안 권한다', () => {
    render(<NoReviewDayCard nextTask={task({})} onPressExam={jest.fn()} />);
    const label = resolveWeaknessLabel('discriminant_calculation');

    expect(screen.getByText('오늘은 복습 없는 날이에요 · 다음 복습 D-1')).toBeTruthy();
    expect(screen.getByText('내일 · 10/4(일)')).toBeTruthy();
    expect(screen.getByText(`${label} · DAY 1`)).toBeTruthy();
    expect(screen.getByText('내일 홈에 떠요. 짧게 다시 보면 돼요.')).toBeTruthy();
    expect(screen.queryByText('모의고사 시작하기')).toBeNull();
    // 연체로 day1에 내려온 학생도 같은 카드를 본다 — 「첫」은 거짓이 될 수 있어 안 쓴다
    expect(screen.queryByText(/첫 복습/)).toBeNull();
  });

  it('홈을 켜 둔 채 자정이 지나 과제가 오늘·어제가 돼도 「내일」이라고 안 한다', () => {
    render(<NoReviewDayCard nextTask={task({ scheduledFor: '2026-10-03T00:00:00.000Z' })} onPressExam={jest.fn()} />);
    expect(screen.queryByText(/내일/)).toBeNull();
    expect(screen.getByText('10/3(토)')).toBeTruthy();
    // pill은 D-0을 안 쓴다
    expect(screen.getByText('오늘은 복습 없는 날이에요 · 다음 복습 D-1')).toBeTruthy();
  });

  it('사진 과제가 사흘 뒤 DAY 3이면 날짜와 단계를 그대로 적는다 — 「내일」이라고 안 한다', () => {
    render(
      <NoReviewDayCard
        nextTask={task({ stage: 'day3', scheduledFor: '2026-10-06T00:00:00.000Z' })}
        onPressExam={jest.fn()}
      />,
    );
    const label = resolveWeaknessLabel('discriminant_calculation');

    expect(screen.getByText('10/6(화) · D-3')).toBeTruthy();
    expect(screen.getByText(`${label} · DAY 3`)).toBeTruthy();
    expect(screen.getByText('10/6 홈에 떠요. 짧게 다시 보면 돼요.')).toBeTruthy();
    expect(screen.queryByText(/내일/)).toBeNull();
  });

  it('사진이 아닌 과제는 지금처럼 모의고사 카드를 낸다', () => {
    render(<NoReviewDayCard nextTask={task({ source: 'weakness-practice' })} onPressExam={jest.fn()} />);

    expect(screen.getByText('모의고사 시작하기')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 실패 확인** — `rtk proxy ./node_modules/.bin/jest features/quiz/components/__tests__/no-review-day-card.test.tsx` → FAIL

- [ ] **Step 3: 구현** — `no-review-day-card.tsx`
  - `getDaysUntil`(8-14줄)을 지우고 `import { daysUntilScheduled } from '@/features/learning/review-scheduler';` 로 바꾼다.
  - 아래 함수 둘과 분기를 넣는다.

```tsx
import { resolveWeaknessLabel } from '@/data/diagnosisMap';
import { formatReviewStageLabel } from '@/features/learning/review-stage';
import { daysUntilScheduled } from '@/features/learning/review-scheduler';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** '2026-10-04T…' → { md: '10/4', mdw: '10/4(일)' }. 날짜 글자만 읽는다(시간대 무관). */
function formatScheduledDay(scheduledFor: string) {
  const [y, m, d] = scheduledFor.slice(0, 10).split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { md: `${m}/${d}`, mdw: `${m}/${d}(${weekday})` };
}

export function NoReviewDayCard({ nextTask, onPressExam }: Props) {
  const isTablet = useIsTablet();
  const daysUntil = daysUntilScheduled(nextTask.scheduledFor);
  const pillText = `오늘은 복습 없는 날이에요 · 다음 복습 D-${Math.max(1, daysUntil)}`;

  return (
    <View style={[styles.wrap, isTablet && { maxWidth: undefined }]}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{pillText}</Text>
      </View>
      {nextTask.source === 'photo' ? (
        <NextReviewBody nextTask={nextTask} daysUntil={daysUntil} />
      ) : (
        /* 기존 examCard 블록 그대로 (31-39줄) */
      )}
    </View>
  );
}

/** 사진에서 온 복습 — 내일 다시 열 이유를 날짜·약점 이름으로 말한다. 저장된 과제가 있을 때만 이 카드가 뜬다. */
function NextReviewBody({ nextTask, daysUntil }: { nextTask: ActiveReviewTaskSummary; daysUntil: number }) {
  const { md, mdw } = formatScheduledDay(nextTask.scheduledFor);
  const isTomorrow = daysUntil === 1;
  // 「첫」은 안 쓴다 — 연체된 day3이 day1로 내려오면(review-scheduler.ts:89) 이미 복습한 학생이다. Fable 최종 10.03
  const title = `${resolveWeaknessLabel(nextTask.weaknessId)} · ${formatReviewStageLabel(nextTask.stage)}`;
  const tag = isTomorrow ? `내일 · ${mdw}` : daysUntil > 1 ? `${mdw} · D-${daysUntil}` : mdw;

  return (
    <View testID="home-next-review" style={styles.examCard}>
      <Text style={styles.examTag}>{tag}</Text>
      <Text style={styles.examTitle}>{title}</Text>
      <Text style={styles.examBody}>{`${isTomorrow ? '내일' : md} 홈에 떠요. 짧게 다시 보면 돼요.`}</Text>
    </View>
  );
}
```

  (`/* 기존 examCard 블록 그대로 */` 자리에는 지금 31-39줄의 `<View style={styles.examCard}>…</View>`를 그대로 옮긴다. 스타일은 examCard·examTag·examTitle·examBody를 재사용한다.)

- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS. 이어서 `rtk proxy ./node_modules/.bin/jest features/quiz/components/__tests__/home-today-modes.test.tsx` → PASS(그 테스트의 과제는 `weakness-practice`라 모의고사 카드 그대로)

- [ ] **Step 5: 커밋** — `git add features/quiz/components && git commit -m "feat(home): 사진 복습은 모의고사 추천 대신 다음 복습 카드"`

---

### Task 5: 홈에 최신 노트 카드 + 과제 0일 때 정직한 제목

**Files:**
- Create: `features/quiz/home-notes-heading.ts`, `features/quiz/home-notes-heading.test.ts`
- Create: `features/quiz/components/home-latest-note.tsx`
- Modify: `features/quiz/hooks/use-quiz-hub-screen.ts:30-51, 73, 164-179, 257-283, 285-308`
- Modify: `features/quiz/components/quiz-hub-screen-view.tsx:88-108, 201-222`
- Test: `features/quiz/components/__tests__/home-today-modes.test.tsx` (케이스 추가)

**Interfaces:**
- Consumes: `PhotoNote` (`features/photo/types.ts`) · `readPhotoNotes`(최신순, `note-store.ts:68-70`) · `shouldShowWeaknessSection` (Task 3) · `daysUntilScheduled` (Task 2)
- Produces:
  - `UseQuizHubScreenResult`에 `latestPhotoNote: PhotoNote | null`, `photoNoteCount: number`, `onPressNotes: () => void`
  - `export function buildNotesHeading(note: PhotoNote, count: number): { title: string; body: string }`
  - `export function HomeLatestNote(props: { note: PhotoNote; onPressNotes: () => void; onPressPhoto: () => void })`

- [ ] **Step 1: 제목 함수 테스트** — `features/quiz/home-notes-heading.test.ts`

```ts
import type { PhotoNote } from '@/features/photo/types';

import { buildNotesHeading } from './home-notes-heading';

const note = (primaryWeaknessId: string | null) => ({ primaryWeaknessId }) as PhotoNote;

describe('buildNotesHeading — 노트는 있는데 복습이 0일 때', () => {
  it('약점 이름이 안 붙은 노트면 이유까지 말한다', () => {
    expect(buildNotesHeading(note(null), 1)).toEqual({
      title: '오답노트 1장 있어요',
      body: '복습 날짜는 안 잡혔어요 — 약점 이름이 안 붙은 노트라서요.',
    });
  });

  it('이름이 붙었는데 과제가 없으면(저장 실패 등) 이유를 단정하지 않는다', () => {
    expect(buildNotesHeading(note('discriminant_calculation'), 3)).toEqual({
      title: '오답노트 3장 있어요',
      body: '복습 날짜가 아직 안 잡혔어요.',
    });
  });
});
```

- [ ] **Step 2: 실패 확인** — `rtk proxy ./node_modules/.bin/jest features/quiz/home-notes-heading.test.ts` → FAIL

- [ ] **Step 3: 제목 함수 구현** — `features/quiz/home-notes-heading.ts`

```ts
import type { PhotoNote } from '@/features/photo/types';

/**
 * 노트는 있는데 복습 과제가 0일 때 홈 제목. 「아직 복습할 게 없어요 / 찍어서 올리면 쌓여요」는
 * 이미 올린 학생에게 거짓이다(기윤 10.03 실측). 과제는 약점 이름이 하나로 정해진 노트만 생긴다
 * (use-photo-flow.ts:250) — 이름이 있는데 과제가 없으면 저장 실패일 수 있어 이유를 단정하지 않는다.
 */
export function buildNotesHeading(note: PhotoNote, count: number): { title: string; body: string } {
  return {
    title: `오답노트 ${count}장 있어요`,
    body:
      note.primaryWeaknessId == null
        ? '복습 날짜는 안 잡혔어요 — 약점 이름이 안 붙은 노트라서요.'
        : '복습 날짜가 아직 안 잡혔어요.',
  };
}
```

- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS

- [ ] **Step 5: 노트 카드 컴포넌트** — `features/quiz/components/home-latest-note.tsx`

```tsx
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { PhotoNote } from '@/features/photo/types';
import { useIsTablet } from '@/hooks/use-is-tablet';

/**
 * 첫 사진 뒤 홈 — 방금 만든 노트가 남아 있다는 걸 보여준다(기윤 10.03 「허전하다」).
 * 작은 판(astra 안, Fable 2차 최종): 사진 작게 + 다음엔 한 줄. 갈라진 지점·왜는 10초 전에 읽었으니
 * 「노트 펼쳐 보기」로 목록에서 본다. 목록은 최신순이라 첫 장이 이 노트다.
 * 아래 사진 줄은 HomeReviewList의 photoRow와 같은 모양 — 노트가 있으면 큰 사진 카드 대신 이걸 쓴다.
 */
export function HomeLatestNote({
  note,
  onPressNotes,
  onPressPhoto,
}: {
  note: PhotoNote;
  onPressNotes: () => void;
  onPressPhoto: () => void;
}) {
  const isTablet = useIsTablet();
  return (
    <View testID="home-latest-note" style={[styles.wrap, isTablet && { maxWidth: undefined }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="노트 펼쳐 보기"
        onPress={onPressNotes}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <Text style={styles.head}>{`오답노트 · ${note.dateLabel}`}</Text>
        <View style={styles.row}>
          {note.photoUri ? (
            <Image source={{ uri: note.photoUri }} style={styles.thumb} contentFit="cover" />
          ) : null}
          <View style={styles.fixCol}>
            <Text style={styles.fixLabel}>다음엔</Text>
            <Text style={styles.fixText} numberOfLines={2}>
              {note.fix}
            </Text>
          </View>
        </View>
        <Text style={styles.more}>노트 펼쳐 보기 ›</Text>
      </Pressable>
      <Pressable style={styles.photoRow} onPress={onPressPhoto} accessibilityLabel="사진 추가하기">
        <Text style={styles.photoRowText}>+ 틀린 문제 하나 더 올리기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 430, gap: BrandSpacing.xs },
  card: {
    backgroundColor: '#FFFCF7',
    borderRadius: BrandRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.12)',
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
  },
  pressed: { opacity: 0.85 },
  head: { fontFamily: FontFamilies.medium, fontSize: 13, color: BrandColors.mutedText },
  row: { flexDirection: 'row', gap: BrandSpacing.sm, alignItems: 'flex-start' },
  thumb: { width: 72, height: 72, borderRadius: BrandRadius.md, backgroundColor: '#ECE6D6' },
  fixCol: { flex: 1, gap: 2 },
  fixLabel: { fontFamily: FontFamilies.bold, fontSize: 13, color: BrandColors.text },
  fixText: { fontFamily: FontFamilies.regular, fontSize: 14, lineHeight: 20, color: BrandColors.text },
  more: { alignSelf: 'flex-end', fontFamily: FontFamilies.medium, fontSize: 13, color: BrandColors.primary },
  photoRow: {
    borderRadius: BrandRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.16)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoRowText: { fontFamily: FontFamilies.medium, fontSize: 14, color: BrandColors.primary },
});
```

  (`BrandColors.primary/text/mutedText`·`BrandRadius.md/lg`·`BrandSpacing.xs/sm/md`는 `constants/brand.ts`에 있다 — 10.03 확인.)

- [ ] **Step 6: 훅** — `use-quiz-hub-screen.ts`
  - import 추가: `import type { PhotoNote } from '@/features/photo/types';` · `import { daysUntilScheduled } from '@/features/learning/review-scheduler';` · `import { shouldShowWeaknessSection as decideWeaknessSection } from '@/features/quiz/home-weakness-visibility';`
  - 타입(30-51)에 추가: `latestPhotoNote: PhotoNote | null;` · `onPressNotes: () => void;` · `photoNoteCount: number;`
  - 73줄 아래 `const [latestPhotoNote, setLatestPhotoNote] = useState<PhotoNote | null>(null);`
  - 170-173줄: `setPhotoNoteCount(notes.length);` 다음 줄에 `setLatestPhotoNote(notes[0] ?? null);`
  - `onPressPhoto` 아래: `const onPressNotes = () => { router.push('/photo-notes'); };`
  - 260-268줄 `noReviewDaysUntil`을 `const noReviewDaysUntil = today?.nextTask?.scheduledFor ? Math.max(1, daysUntilScheduled(today.nextTask.scheduledFor)) : 1;` (GA 값이라 지금처럼 1 이상)
  - 277-278줄을 `const showWeaknessSection = decideWeaknessSection(homeState?.weaknessProgressItems, isAnalysisInProgress);`
  - return에 `latestPhotoNote,` · `onPressNotes,` · `photoNoteCount: photoNoteCount ?? 0,`

- [ ] **Step 7: 뷰 테스트 추가** — `home-today-modes.test.tsx`의 `baseProps`에 `latestPhotoNote: null, onPressNotes: jest.fn(), photoNoteCount: 0,`를 넣고, 파일 위에 `jest.mock('expo-image', () => ({ Image: () => null }));`, 아래 케이스 추가

```tsx
  const photoNote = {
    id: 'n1',
    dateLabel: '10/3',
    photoUri: null,
    fix: '음수 대입은 부호를 한 번 더 봐',
    primaryWeaknessId: null,
  };

  it('노트는 있는데 복습이 0이면 정직한 제목 + 노트 카드 + 작은 사진 줄', () => {
    render(
      <QuizHubScreenView
        {...baseProps}
        latestPhotoNote={photoNote as any}
        photoNoteCount={1}
      />,
    );

    expect(screen.getByText('오답노트 1장 있어요')).toBeTruthy();
    expect(screen.getByText('복습 날짜는 안 잡혔어요 — 약점 이름이 안 붙은 노트라서요.')).toBeTruthy();
    expect(screen.getByText('오답노트 · 10/3')).toBeTruthy();
    expect(screen.getByText('음수 대입은 부호를 한 번 더 봐')).toBeTruthy();
    expect(screen.getByText('+ 틀린 문제 하나 더 올리기')).toBeTruthy();
    // 이미 올린 학생에게 「찍어서 올리면 쌓여요」·큰 사진 카드를 다시 내지 않는다
    expect(screen.queryByText('아직 복습할 게 없어요')).toBeNull();
    expect(screen.queryByText('틀린 문제, 찍기만 하면 돼요')).toBeNull();
  });

  it('노트 카드를 누르면 지난 오답노트로 간다', () => {
    const onPressNotes = jest.fn();
    render(
      <QuizHubScreenView
        {...baseProps}
        latestPhotoNote={photoNote as any}
        photoNoteCount={1}
        onPressNotes={onPressNotes}
      />,
    );
    fireEvent.press(screen.getByLabelText('노트 펼쳐 보기'));
    expect(onPressNotes).toHaveBeenCalled();
  });

  // 이 계획이 만드는 바로 그 화면 — 사진 과제가 내일 + 노트 있음 (Fable 검토 10.03)
  it('사진 복습이 내일이면 다음 복습 카드 + 노트 카드, 큰 사진 카드는 없다', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 3, 9, 0));
    render(
      <QuizHubScreenView
        {...baseProps}
        showNoReviewDayCard
        latestPhotoNote={{ ...photoNote, primaryWeaknessId: 'discriminant_calculation' } as any}
        photoNoteCount={1}
        today={
          {
            mode: 'resting',
            dueTasks: [],
            nextTask: { ...makeTask('next'), source: 'photo', scheduledFor: '2026-10-04T00:00:00.000Z' },
            title: '오늘은 복습 없는 날이에요',
            body: '새로 틀린 문제를 찍어두면 다음 복습이 늘어나요.',
          } as unknown as UseQuizHubScreenResult['today']
        }
      />,
    );
    jest.useRealTimers();

    expect(screen.getByTestId('home-next-review')).toBeTruthy();
    expect(screen.getByTestId('home-latest-note')).toBeTruthy();
    expect(screen.queryByTestId('home-today-heading')).toBeNull();
    expect(screen.queryByText('틀린 문제, 찍기만 하면 돼요')).toBeNull();
  });

  it('오늘 복습이 있으면 노트가 있어도 리스트가 주인이다 — 노트 카드를 안 끼운다', () => {
    render(
      <QuizHubScreenView
        {...baseProps}
        latestPhotoNote={photoNote as any}
        photoNoteCount={3}
        today={
          {
            mode: 'review',
            dueTasks: [makeTask('a')],
            nextTask: makeTask('a'),
            title: '오늘 복습할 게 1개 있어요',
            body: '하나만 짧게 다시 보면 돼요.',
          } as unknown as UseQuizHubScreenResult['today']
        }
      />,
    );

    expect(screen.getByTestId('home-review-list')).toBeTruthy();
    expect(screen.queryByTestId('home-latest-note')).toBeNull();
  });
```

  (`fireEvent`를 import에 추가.)

- [ ] **Step 8: 실패 확인** — `rtk proxy ./node_modules/.bin/jest features/quiz/components/__tests__/home-today-modes.test.tsx` → 새 두 케이스 FAIL

- [ ] **Step 9: 뷰 구현** — `quiz-hub-screen-view.tsx`
  - import: `import { HomeLatestNote } from '@/features/quiz/components/home-latest-note';` · `import { buildNotesHeading } from '@/features/quiz/home-notes-heading';`
  - 구조분해(88-108)에 `latestPhotoNote, onPressNotes, photoNoteCount` 추가
  - 201-222줄 「그 외」 분기를 교체:

```tsx
          ) : (
            <>
              {showNoReviewDayCard && today.nextTask ? (
                <NoReviewDayCard nextTask={today.nextTask} onPressExam={onPressExam} />
              ) : (
                (() => {
                  // 노트가 있는데 복습이 0이면 「찍어서 올리면 쌓여요」 대신 있는 그대로 말한다
                  const heading =
                    today.mode === 'empty' && latestPhotoNote
                      ? buildNotesHeading(latestPhotoNote, photoNoteCount)
                      : { title: today.title, body: today.body };
                  return (
                    <View
                      testID="home-today-heading"
                      style={[styles.todayHeading, isTablet && { maxWidth: undefined }]}>
                      <Text selectable style={styles.todayTitle}>
                        {heading.title}
                      </Text>
                      <Text selectable style={styles.todayBody}>
                        {heading.body}
                      </Text>
                    </View>
                  );
                })()
              )}
              {latestPhotoNote ? (
                <HomeLatestNote
                  note={latestPhotoNote}
                  onPressNotes={onPressNotes}
                  onPressPhoto={onPressPhoto}
                />
              ) : (
                <PhotoEntryCard onPress={onPressPhoto} />
              )}
            </>
          )}
```

- [ ] **Step 10: 통과 확인** — `rtk proxy ./node_modules/.bin/jest features/quiz` → 전부 PASS. `quiz-hub-screen-view.test.tsx`·`photo-entry-card-on-home.test.tsx`가 baseProps 타입 때문에 깨지면 같은 세 칸(`latestPhotoNote: null, onPressNotes: jest.fn(), photoNoteCount: 0`)을 넣는다.

- [ ] **Step 11: 타입** — `./node_modules/.bin/tsc --noEmit` → 0 (`.expo/types/router.d.ts`에 `/photo-notes`가 없으면 `./node_modules/.bin/expo start` 한 번으로 다시 생긴다)

- [ ] **Step 12: 커밋** — `git add features/quiz && git commit -m "feat(home): 첫 사진 뒤 홈에 최신 노트 카드와 정직한 제목"`

---

### Task 6: 아래 탭 글자 잘림

원인은 코드로 못 잡았다(Fable 짐작: 커스텀 글꼴에 lineHeight가 없어 아래가 잘림). 기윤 스크린샷으로 어느 탭·어떻게 잘리는지 확인한 뒤 진행한다. 스크린샷이 「아래가 잘림」이면 아래 고침, 「뒤가 …로 잘림」이면 이 Task를 멈추고 다시 본다.

**Files:**
- Modify: `app/(tabs)/_layout.tsx:35-38`

- [ ] **Step 1: 구현**

```tsx
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontFamily: FontFamilies.medium,
        },
```

- [ ] **Step 2: 확인** — 시뮬레이터에서 탭 네 글자(홈·기출·내 기록·설정)가 다 보이는지 스크린샷. 테스트 없음(스타일 한 줄).
- [ ] **Step 3: 커밋** — `git commit -am "fix(tabs): 탭 글자 아래 잘림"`

---

### ~~Task 7: 「내 기록」 탭 → 오답노트~~ — **이번 판에서 뺀다 (astra 권고 · Fable 최종 10.03) → 1.0.12**

빼는 이유: 탭 화면은 마운트가 유지돼 새 노트를 못 본다(`use-photo-notes-screen.ts:44-79` deps가 안 바뀜) · `jest.setup.js` expo-router mock에 `useFocusEffect` 없음 · `use-screen-tracking.ts:20`이 `'history'`로 찍어 옛 화면 수치에 섞임 · 지난 시험 결과로 가는 유일한 문(`use-history-screen-handlers.ts:18`)이 사라짐. 아래는 1.0.12 때 참고용 초안이다 — 이번엔 실행하지 않는다.

**(참고) 선행 조건**: 기윤이 「내 기록 탭을 누르면 지난 오답노트 목록이 바로 뜨고, 학평·모의고사 기록은 빠져도 된다」에 OK.

**Files:**
- Modify: `app/(tabs)/history.tsx`
- Modify: `app/(tabs)/_layout.tsx:68-74` (title)
- Modify: `features/photo/screens/photo-notes-screen.tsx` (탭 안에서 위 여백·제목)

**Interfaces:**
- Produces: `PhotoNotesScreen`에 `inTab?: boolean` — true면 `SafeAreaView edges={['top','bottom']}`이고 목록 위에 제목 `오답노트`를 그린다. 기본 false(지금 동작 그대로).

- [ ] **Step 1: 테스트** — `features/photo/screens/__tests__/photo-notes-screen.test.tsx`에 추가

```tsx
  it('탭 안에서는 제목을 직접 그린다 — 탭엔 헤더가 없다', async () => {
    mockReadNotes.mockResolvedValue([]);
    render(<PhotoNotesScreen accountKey="user:abc" inTab />);
    await waitFor(() => expect(screen.getByText('오답노트')).toBeTruthy());
  });
```

  (`mockReadNotes` 이름은 그 파일의 기존 mock 이름을 쓴다.)

- [ ] **Step 2: 구현** — `PhotoNotesScreen` props에 `inTab = false`, 모든 `SafeAreaView`의 `edges`를 `inTab ? ['top', 'bottom'] : ['bottom']`로, 각 return 맨 위에 `{inTab ? <Text style={styles.tabTitle}>오답노트</Text> : null}` (스타일: `fontFamily: FontFamilies.bold, fontSize: 22, paddingHorizontal: 20, paddingTop: 12`). `app/(tabs)/history.tsx`:

```tsx
import { useCurrentLearner } from '@/features/learner/provider';
import { PhotoNotesScreen } from '@/features/photo/screens/photo-notes-screen';

// 「내 기록」 자리 = 지난 오답노트 (기윤 10.03). 옛 학평·모의고사 기록 화면(features/history)은 지우지 않고 둔다.
export default function HistoryScreen() {
  const { session, getRemoteAuthHeaders } = useCurrentLearner();
  return (
    <PhotoNotesScreen
      accountKey={session?.accountKey ?? null}
      getRemoteAuthHeaders={getRemoteAuthHeaders}
      inTab
    />
  );
}
```

  `_layout.tsx` history 탭 `title: '오답노트'`.

- [ ] **Step 3: 통과 확인** — `rtk proxy ./node_modules/.bin/jest features/photo` → PASS · `tsc` 0
- [ ] **Step 4: 커밋** — `git commit -am "feat(tabs): 내 기록 자리에 오답노트"`

---

### Task 8: 전체 확인 → 리뷰 → 빌드 24

- [ ] **Step 1: 전체 테스트·타입** — `rtk proxy ./node_modules/.bin/jest` (앱 전체) 0 failed · `./node_modules/.bin/tsc --noEmit` 0
- [ ] **Step 2: 시뮬레이터 한 바퀴** (`./node_modules/.bin/expo run:ios`) — ① 새 계정 → 첫 화면 그대로 ② 사진 1장(약점 이름 붙는 사진) → 홈: D-1 pill · 「내일 · M/D(요일)」 카드 · 노트 카드 · 「+ 틀린 문제 하나 더 올리기」 · 약점 차트 없음 ③ 노트 카드 → 지난 오답노트 ④ 이름 안 붙는 사진 계정이면 「오답노트 1장 있어요」 ⑤ 사진 화면 입구 문구 ⑥ 탭 글자. 각 화면 스크린샷.
- [ ] **Step 3: 코드 리뷰** — astra·Fable 둘에게 같은 질문으로 `git diff <시작 커밋>..HEAD` 리뷰(거짓 「내일」이 뜨는 길 · 옛 판 섞임 · 테스트 빠진 자리). 갈리면 Fable 최종. 반드시 고칠 것만 고친다.
- [ ] **Step 4: 푸시·빌드** — `git push origin main` → 버전은 1.0.11 그대로, `eas build --platform all --profile production --auto-submit` (iOS 빌드 24 → TestFlight · 안드 코드 12 → 내부 테스트)
- [ ] **Step 5: 기윤 폰 확인** (TestFlight 24) → 애플 1.0.11 제출(심사 메모 한 줄) · 안드 1.0.11 프로덕션

## 이 계획에 안 넣은 것 (1.0.12)

- 복습 날을 하루 놓치면 과제가 다시 「내일」로 밀린다 (`review-scheduler.ts:85-97`)
- 사진만 올린 학생에게 알림 허락을 묻는 자리가 없다 (`use-result-screen.ts:102`만)
- 새 기기 홈이 서버 노트를 몰라 첫 화면(`HomeFirstRun`)을 띄운다 (`use-quiz-hub-screen.ts:282-283`)
- 기기 노트가 있을 때의 서버 조회 실패 표시 (기기 0장일 때만 Task 1b로 막았다)
- Task 7 「내 기록」 → 오답노트 (위 이유 넷)
- 사진 흐름이 저장을 기다리지 않아, 저장 전에 홈에 오면 「복습 날짜가 아직 안 잡혔어요」가 남음 — 다음 포커스에서 고쳐짐 (`use-photo-flow.ts:234-256`, astra 4)
- 홈을 켜 둔 채 자정·앱 복귀 때 다시 세기, 서버 KST와 기기 날짜 통일 (astra 2 — 거짓 「내일」은 Task 2·4로 막음)
- 계정 전환 중 이전 계정 노트가 잠깐 보일 수 있음 [짐작]
- 옛 진단 학생도 복습 0회면 약점 차트가 숨는다(Task 3) — 진단 정답률 막대가 사라짐. 알고 감
- 약점 차트 안 「지금 바로 연습하기」 옛 연습 화면 문 · 범례 「진단」
- 대기 카드 ↑ 화살표 꺾임 (`photo-analyzing-view.tsx:137`)
