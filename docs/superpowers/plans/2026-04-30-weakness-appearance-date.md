# 약점 등장 기록 날짜 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 약점 상세 화면의 "등장 기록" 섹션에서 각 항목 오른쪽 끝에 날짜를 표시한다.

**Architecture:** `WeaknessAppearance.attemptedAt` 필드(이미 존재)를 KST 기준 날짜 문자열로 변환하는 순수 함수를 추가하고, `WeaknessDetailAppearances` 컴포넌트의 row 렌더링에 날짜 텍스트를 추가한다. 타입·데이터 레이어 변경 없음.

**Tech Stack:** React Native (StyleSheet), Jest, TypeScript

---

### Task 1: `formatAppearanceDateKst` 헬퍼 추가 + 테스트

**Files:**
- Modify: `features/quiz/components/weakness-detail-appearances.tsx` (함수 추가, export)
- Create: `features/quiz/components/__tests__/weakness-detail-appearances.test.ts`

- [ ] **Step 1: 테스트 파일 생성**

`features/quiz/components/__tests__/weakness-detail-appearances.test.ts` 를 아래 내용으로 생성한다.

```ts
import { formatAppearanceDateKst } from '../weakness-detail-appearances';

describe('formatAppearanceDateKst', () => {
  const CURRENT_YEAR = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear();

  it('올해 날짜는 "M월 D일" 형식', () => {
    const iso = `${CURRENT_YEAR}-03-02T10:00:00.000Z`;
    expect(formatAppearanceDateKst(iso)).toBe('3월 2일');
  });

  it('작년 날짜는 "YYYY년 M월 D일" 형식', () => {
    const pastYear = CURRENT_YEAR - 1;
    const iso = `${pastYear}-11-14T00:00:00.000Z`;
    expect(formatAppearanceDateKst(iso)).toBe(`${pastYear}년 11월 14일`);
  });

  it('UTC 자정이 KST 09:00이므로 날짜 변환이 KST 기준', () => {
    // UTC 2026-03-01T23:00:00Z = KST 2026-03-02T08:00:00+09:00
    const iso = `${CURRENT_YEAR}-03-01T23:00:00.000Z`;
    expect(formatAppearanceDateKst(iso)).toBe('3월 2일');
  });
});
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npx jest features/quiz/components/__tests__/weakness-detail-appearances.test.ts --no-coverage
```

Expected: `Cannot find module '../weakness-detail-appearances'` 또는 `formatAppearanceDateKst is not exported`

- [ ] **Step 3: `weakness-detail-appearances.tsx` 상단에 함수 추가 및 export**

`features/quiz/components/weakness-detail-appearances.tsx` 의 import 블록 바로 아래에 추가한다.

```ts
export function formatAppearanceDateKst(iso: string): string {
  const kstMs = new Date(iso).getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const nowKstMs = Date.now() + 9 * 60 * 60 * 1000;
  const currentYear = new Date(nowKstMs).getUTCFullYear();
  if (year === currentYear) return `${month}월 ${day}일`;
  return `${year}년 ${month}월 ${day}일`;
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
npx jest features/quiz/components/__tests__/weakness-detail-appearances.test.ts --no-coverage
```

Expected: 3 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/weakness-detail-appearances.tsx \
        features/quiz/components/__tests__/weakness-detail-appearances.test.ts
git commit -m "feat(weakness): formatAppearanceDateKst 헬퍼 추가"
```

---

### Task 2: UI에 날짜 표시 추가

**Files:**
- Modify: `features/quiz/components/weakness-detail-appearances.tsx` (row 렌더링 + styles)

- [ ] **Step 1: row 렌더링에 날짜 텍스트 추가**

현재 코드:

```tsx
appearances.map((a) => (
  <View key={a.attemptId} style={styles.row}>
    <Text style={styles.bullet}>·</Text>
    <Text style={styles.label}>{a.sourceLabel}</Text>
  </View>
))
```

아래와 같이 수정한다:

```tsx
appearances.map((a) => (
  <View key={a.attemptId} style={styles.row}>
    <Text style={styles.bullet}>·</Text>
    <Text style={styles.label}>{a.sourceLabel}</Text>
    <Text style={styles.date}>{formatAppearanceDateKst(a.attemptedAt)}</Text>
  </View>
))
```

- [ ] **Step 2: styles 수정**

`styles.row` 에 `justifyContent: 'space-between'` 을 추가하고, `date` 스타일을 추가한다.

현재:
```ts
row: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 6,
},
```

변경 후:
```ts
row: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  justifyContent: 'space-between',
},
date: {
  fontFamily: FontFamilies.medium,
  fontSize: 11,
  color: 'rgba(72,67,58,0.5)',
  flexShrink: 0,
},
```

> 참고: `alignItems` 를 `flex-start` 에서 `center` 로 변경한다. 레이블이 한 줄이면 날짜와 수직 정렬이 맞아야 하기 때문이다.

- [ ] **Step 3: 타입 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 전체 테스트 실행**

```bash
npx jest --no-coverage
```

Expected: 전체 PASS (새로 추가된 3개 포함)

- [ ] **Step 5: 커밋**

```bash
git add features/quiz/components/weakness-detail-appearances.tsx
git commit -m "feat(weakness): 등장 기록에 날짜 표시 추가"
```
