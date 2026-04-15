# Founding Member 카드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설정 탭 상단에 골드 테두리 Founding Member 카드를 추가해 로그인 유저에게 "현재 기능 영구 무료 + 프리미엄 1년 무료" 혜택을 표시한다.

**Architecture:** `FoundingMemberCard` 컴포넌트를 독립 파일로 생성하고, `profile-screen-view.tsx`의 heroCard 바로 아래에 조건부 렌더링한다. 조건은 `profile?.accountKey.startsWith('user:')` — 로그인 유저에게만 표시. 로직 없음, 정적 UI.

**Tech Stack:** React Native (`StyleSheet`, `View`, `Text`), `BrandRadius` / `BrandSpacing` / `BrandTypography` 디자인 토큰

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `features/profile/components/founding-member-card.tsx` | 신규. 골드 테두리 카드 컴포넌트 단독 export |
| `features/profile/components/profile-screen-view.tsx` | 수정. import 추가 + heroCard 아래 조건부 렌더링 |

---

## Task 1: FoundingMemberCard 컴포넌트 생성

**Files:**
- Create: `features/profile/components/founding-member-card.tsx`

- [ ] **Step 1: 파일 생성**

`features/profile/components/founding-member-card.tsx` 를 아래 내용으로 생성한다.

```tsx
// features/profile/components/founding-member-card.tsx
import { StyleSheet, Text, View } from 'react-native';

import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';

export function FoundingMemberCard() {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.icon}>🥇</Text>
        <Text selectable style={styles.title}>
          Founding Member
        </Text>
      </View>
      <Text selectable style={styles.body}>
        지금 사용하시는 모든 기능은 무료로 유지됩니다. 앞으로 출시될 프리미엄 기능도
        Founding Member에게는 1년간 무료로 제공됩니다.
      </Text>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <Text selectable style={styles.footerLabel}>
          현재 기능 영구 무료
        </Text>
        <Text selectable style={styles.footerLabel}>
          프리미엄 1년 무료
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FFFBEB',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrandSpacing.xs,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    ...BrandTypography.bodyStrong,
    color: '#92400E',
  },
  body: {
    ...BrandTypography.body,
    color: '#78350F',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#FDE68A',
    marginVertical: BrandSpacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLabel: {
    ...BrandTypography.meta,
    color: '#B45309',
  },
});
```

- [ ] **Step 2: TypeScript 타입 확인**

```bash
npx tsc --noEmit
```

에러 없이 통과해야 한다.

- [ ] **Step 3: 커밋**

```bash
git add features/profile/components/founding-member-card.tsx
git commit -m "feat(profile): FoundingMemberCard 컴포넌트 생성 — 골드 테두리 카드"
```

---

## Task 2: profile-screen-view.tsx에 연결

**Files:**
- Modify: `features/profile/components/profile-screen-view.tsx:19` (import 추가), `line 198` (카드 삽입)

- [ ] **Step 1: import 추가**

`features/profile/components/profile-screen-view.tsx` 19번 줄 (`import type { UseProfileScreenResult }` 바로 아래) 에 한 줄 추가:

변경 전:
```tsx
import type { UseProfileScreenResult } from '@/features/profile/hooks/use-profile-screen';
```

변경 후:
```tsx
import type { UseProfileScreenResult } from '@/features/profile/hooks/use-profile-screen';
import { FoundingMemberCard } from '@/features/profile/components/founding-member-card';
```

- [ ] **Step 2: heroCard 아래에 카드 삽입**

`profile-screen-view.tsx` 의 heroCard 닫는 태그(`</View>`) 바로 아래, `{errorMessage ? ...}` 바로 앞에 추가.

변경 전:
```tsx
        </View>

        {errorMessage ? <SecondaryNotice tone="error" message={errorMessage} /> : null}
```

변경 후:
```tsx
        </View>

        {profile?.accountKey.startsWith('user:') ? <FoundingMemberCard /> : null}

        {errorMessage ? <SecondaryNotice tone="error" message={errorMessage} /> : null}
```

`profile` 은 `ProfileScreenView` props에서 이미 전달받은 값이므로 추가 훅 호출 불필요.

- [ ] **Step 3: TypeScript 타입 확인**

```bash
npx tsc --noEmit
```

에러 없이 통과해야 한다.

- [ ] **Step 4: 커밋**

```bash
git add features/profile/components/profile-screen-view.tsx
git commit -m "feat(profile): 설정 탭 heroCard 아래 FoundingMemberCard 조건부 렌더링 추가"
```

---

## Task 3: 수동 검증

- [ ] **Step 1: 앱 실행**

```bash
npx expo run:ios
```

- [ ] **Step 2: 로그인 유저로 설정 탭 확인**

Apple 또는 Google 로그인 상태에서 하단 탭 "설정"을 누른다.
"설정" heroCard 바로 아래에 골드 테두리 카드가 표시되어야 한다:
- 🥇 **Founding Member** 제목 (amber 색상)
- 본문 2줄 텍스트
- 구분선
- "현재 기능 영구 무료" / "프리미엄 1년 무료" 두 레이블

- [ ] **Step 3: 익명 유저 확인 (개발 빌드 전용)**

개발 빌드에서 "개발용 익명으로 계속" 선택 후 설정 탭 확인.
Founding Member 카드가 표시되지 않아야 한다.

- [ ] **Step 4: 기존 카드 레이아웃 이상 없음 확인**

"현재 학습자 상태", "계정 관리", "학년 설정" 등 기존 카드들이 정상 위치에 표시되는지 확인.

- [ ] **Step 5: 최종 푸시**

```bash
git push origin main
npm run notify:done -- "Founding Member 카드: 설정 탭 골드 카드 추가 완료"
```
