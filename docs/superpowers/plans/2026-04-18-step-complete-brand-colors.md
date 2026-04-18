# StepCompleteScreenView 브랜드 컬러 교체 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `step-complete-screen-view.tsx` 안의 모든 raw hex 컬러를 `BrandColors` 상수로 교체해 DASIDA 브랜드 언어를 일관되게 적용한다.

**Architecture:** 단 하나의 파일만 수정. STEP_CONFIG의 accentColor/backgroundColor 6개 값과 StyleSheet 텍스트 컬러 3개를 BrandColors 상수로 교체한다. 로직·타입·네비게이션 변경 없음.

**Tech Stack:** React Native StyleSheet, `@/constants/brand` (BrandColors)

---

### Task 1: BrandColors import 추가 및 STEP_CONFIG 컬러 교체

**Files:**
- Modify: `features/quiz/components/step-complete-screen-view.tsx`

현재 파일 상단:
```tsx
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { FontFamilies } from '@/constants/typography';
```

- [ ] **Step 1: BrandColors import 추가**

`FontFamilies` import 아래에 한 줄 추가:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { BrandColors } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
```

- [ ] **Step 2: STEP_CONFIG diagnostic 컬러 교체**

현재:
```tsx
  diagnostic: {
    charImage: require('../../../assets/images/characters/char_04.png'),
    title: '진단 완료!',
    body: '10문제로 약점을 찾았어요.\n이제 약점을 분석할게요.',
    nextLabel: '약점 분석 시작하기',
    accentColor: '#6366f1',
    backgroundColor: '#f5f3ff',
    autoAdvanceSeconds: 3,
  },
```

교체 후:
```tsx
  diagnostic: {
    charImage: require('../../../assets/images/characters/char_04.png'),
    title: '진단 완료!',
    body: '10문제로 약점을 찾았어요.\n이제 약점을 분석할게요.',
    nextLabel: '약점 분석 시작하기',
    accentColor: BrandColors.warning,
    backgroundColor: BrandColors.background,
    autoAdvanceSeconds: 3,
  },
```

- [ ] **Step 3: STEP_CONFIG analysis 컬러 교체**

현재:
```tsx
  analysis: {
    charImage: require('../../../assets/images/characters/char_07.png'),
    title: '분석 완료!',
    body: '약점 분석이 끝났어요.\n결과를 확인하고 연습해볼게요.',
    nextLabel: '결과 확인하기',
    accentColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    autoAdvanceSeconds: 3,
  },
```

교체 후:
```tsx
  analysis: {
    charImage: require('../../../assets/images/characters/char_07.png'),
    title: '분석 완료!',
    body: '약점 분석이 끝났어요.\n결과를 확인하고 연습해볼게요.',
    nextLabel: '결과 확인하기',
    accentColor: BrandColors.primarySoft,
    backgroundColor: BrandColors.background,
    autoAdvanceSeconds: 3,
  },
```

- [ ] **Step 4: STEP_CONFIG practice 컬러 교체**

현재:
```tsx
  practice: {
    charImage: require('../../../assets/images/characters/char_sparkle_sunglasses.png'),
    title: '이제 새로운\n시작이에요!',
    body: '진단, 분석, 연습까지 함께했어요.\n이제 실전에서 같이 나아가봐요.',
    nextLabel: '함께 실전 시작하기 →',
    accentColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    autoAdvanceSeconds: 0,
  },
```

교체 후:
```tsx
  practice: {
    charImage: require('../../../assets/images/characters/char_sparkle_sunglasses.png'),
    title: '이제 새로운\n시작이에요!',
    body: '진단, 분석, 연습까지 함께했어요.\n이제 실전에서 같이 나아가봐요.',
    nextLabel: '함께 실전 시작하기 →',
    accentColor: BrandColors.primary,
    backgroundColor: BrandColors.background,
    autoAdvanceSeconds: 0,
  },
```

- [ ] **Step 5: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | grep step-complete
```

Expected: 출력 없음 (에러 없음)

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/step-complete-screen-view.tsx
git commit -m "feat(step-complete): STEP_CONFIG 컬러 → BrandColors 교체"
```

---

### Task 2: StyleSheet 텍스트 컬러 교체

**Files:**
- Modify: `features/quiz/components/step-complete-screen-view.tsx`

- [ ] **Step 1: title 컬러 교체**

현재:
```tsx
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
    color: '#1a1a1a',
    textAlign: 'center',
  },
```

교체 후:
```tsx
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
    color: BrandColors.text,
    textAlign: 'center',
  },
```

- [ ] **Step 2: body 컬러 교체**

현재:
```tsx
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 16,
    lineHeight: 26,
    color: '#555',
    textAlign: 'center',
  },
```

교체 후:
```tsx
  body: {
    fontFamily: FontFamilies.regular,
    fontSize: 16,
    lineHeight: 26,
    color: BrandColors.mutedText,
    textAlign: 'center',
  },
```

- [ ] **Step 3: countdown 컬러 교체**

현재:
```tsx
  countdown: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: '#888',
  },
```

교체 후:
```tsx
  countdown: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.mutedText,
  },
```

- [ ] **Step 4: raw hex 잔존 여부 확인**

```bash
grep -n "#[0-9a-fA-F]\{3,6\}" features/quiz/components/step-complete-screen-view.tsx
```

Expected: `color: '#ffffff'` 한 줄만 남아있어야 함 (버튼 텍스트 흰색 — 의도적 유지)

- [ ] **Step 5: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit 2>&1 | grep step-complete
```

Expected: 출력 없음 (에러 없음)

- [ ] **Step 6: 커밋**

```bash
git add features/quiz/components/step-complete-screen-view.tsx
git commit -m "feat(step-complete): StyleSheet 텍스트 컬러 → BrandColors 교체"
```

---

### Task 3: 시각 검증

**Files:**
- Read-only: `features/quiz/components/step-complete-screen-view.tsx`

- [ ] **Step 1: 개발 서버 실행**

```bash
npx expo start --ios
```

- [ ] **Step 2: 진단 완료 화면 확인**

진단 퀴즈 완료 후 나타나는 화면에서:
- 배경: DASIDA 크림(`#F6F2EA`) 확인
- 버튼: 앰버(`#D98E04`) 확인
- 3초 카운트다운 후 자동 전진 동작 확인

- [ ] **Step 3: 분석 완료 화면 확인**

분석 단계 완료 후 나타나는 화면에서:
- 배경: DASIDA 크림(`#F6F2EA`) 확인
- 버튼: 미디엄 그린(`#4A7C59`) 확인
- 3초 카운트다운 후 자동 전진 동작 확인

- [ ] **Step 4: 연습 졸업 화면 확인**

연습 완료(practice) 화면에서:
- 배경: DASIDA 크림(`#F6F2EA`) 확인
- 버튼: 다크 그린(`#293B27`) 확인
- 자동 전진 없음, 버튼 탭 → 홈 이동 확인
- isGraduating 중 버튼 비활성화(opacity 0.6, "처리 중..." 텍스트) 확인

- [ ] **Step 5: 최종 커밋 (변경 없으면 생략)**

시각 확인 중 수정이 생긴 경우에만:
```bash
git add features/quiz/components/step-complete-screen-view.tsx
git commit -m "fix(step-complete): 시각 검증 후 컬러 미세 조정"
```
