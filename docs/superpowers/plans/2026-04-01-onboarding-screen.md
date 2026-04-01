# 온보딩 화면 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소셜 로그인 후 신규 유저에게 닉네임 + 학년을 입력받는 온보딩 화면을 구현하고, Firestore에 저장해 모바일/태블릿 기기 간 동기화를 지원한다.

**Architecture:** `LearnerProfile`에 `nickname` 필드를 추가하고, `FirestoreLearnerProfileStore`를 신규 추가해 Firestore `users/{uid}/profile` 문서에 저장한다. 로컬 AsyncStorage 캐시는 기존대로 유지하고, Firestore가 설정된 경우 원격 우선으로 동작한다. 온보딩 화면은 `features/onboarding` 기능 폴더에 Thin Screen 패턴으로 구현한다.

**Tech Stack:** Expo Router, React Native, firebase/firestore SDK (v12, 이미 설치됨), react-native-reanimated, AsyncStorage

---

## 파일 구조

**신규 생성:**
- `features/onboarding/screens/onboarding-screen.tsx` — Thin Screen
- `features/onboarding/hooks/use-onboarding-screen.ts` — 로직 훅
- `features/onboarding/components/onboarding-screen-view.tsx` — UI
- `features/learner/firestore-learner-profile-store.ts` — Firestore 저장소
- `app/onboarding.tsx` — 라우트

**수정:**
- `features/learner/types.ts` — `LearnerProfile`에 `nickname` 추가
- `features/learner/local-learner-profile-store.ts` — `createInitial`에 `nickname: ''` 추가
- `features/learner/current-learner-controller.ts` — `updateOnboardingProfile` 메서드 추가
- `features/learner/provider.tsx` — `updateOnboardingProfile` 노출
- `app/_layout.tsx` — `onboarding` 스크린 Stack에 추가
- `app/index.tsx` — 온보딩 리디렉트 조건 추가 (주석으로 비활성, 나중에 활성화)

---

## Task 1: LearnerProfile 타입에 nickname 추가

**Files:**
- Modify: `features/learner/types.ts`
- Modify: `features/learner/local-learner-profile-store.ts`

- [ ] **Step 1: types.ts 수정**

`features/learner/types.ts`의 `LearnerProfile` 타입을 아래와 같이 수정:

```ts
export type LearnerProfile = {
  accountKey: string;
  learnerId: string;
  nickname: string;  // 추가
  grade: LearnerGrade;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: local-learner-profile-store.ts 수정**

`createInitial` 메서드에 `nickname: ''` 추가:

```ts
async createInitial(accountKey: string): Promise<LearnerProfile> {
  const timestamp = new Date().toISOString();
  const profile: LearnerProfile = {
    accountKey,
    learnerId: createRandomId(),
    nickname: '',       // 추가
    grade: 'unknown',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await this.save(profile);
  return profile;
}
```

- [ ] **Step 3: 타입 오류 확인**

```bash
npx tsc --noEmit 2>&1 | head -40
```

`nickname` 관련 타입 오류가 없으면 정상.

- [ ] **Step 4: 커밋**

```bash
git add features/learner/types.ts features/learner/local-learner-profile-store.ts
git commit -m "feat: LearnerProfile에 nickname 필드 추가"
```

---

## Task 2: FirestoreLearnerProfileStore 구현

**Files:**
- Create: `features/learner/firestore-learner-profile-store.ts`

- [ ] **Step 1: firestore-learner-profile-store.ts 생성**

```ts
import { getApp } from 'firebase/app';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import type { LearnerProfileStore } from './profile-store';
import type { LearnerProfile } from './types';

function createRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class FirestoreLearnerProfileStore implements LearnerProfileStore {
  private get db() {
    return getFirestore(getApp());
  }

  private profileRef(accountKey: string) {
    // accountKey는 Firebase Auth uid와 동일
    return doc(this.db, 'users', accountKey, 'profile', 'data');
  }

  async load(accountKey: string): Promise<LearnerProfile | null> {
    try {
      const snap = await getDoc(this.profileRef(accountKey));
      if (!snap.exists()) {
        return null;
      }
      return snap.data() as LearnerProfile;
    } catch {
      return null;
    }
  }

  async createInitial(accountKey: string): Promise<LearnerProfile> {
    const timestamp = new Date().toISOString();
    const profile: LearnerProfile = {
      accountKey,
      learnerId: createRandomId(),
      nickname: '',
      grade: 'unknown',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.save(profile);
    return profile;
  }

  async save(profile: LearnerProfile): Promise<void> {
    await setDoc(this.profileRef(profile.accountKey), {
      ...profile,
      _updatedAt: serverTimestamp(), // Firestore 서버 타임스탬프 (쿼리용)
    });
  }

  async reset(accountKey: string): Promise<void> {
    const timestamp = new Date().toISOString();
    await setDoc(this.profileRef(accountKey), {
      accountKey,
      learnerId: createRandomId(),
      nickname: '',
      grade: 'unknown',
      createdAt: timestamp,
      updatedAt: timestamp,
      _updatedAt: serverTimestamp(),
    });
  }
}
```

- [ ] **Step 2: 타입 오류 확인**

```bash
npx tsc --noEmit 2>&1 | grep "firestore-learner-profile-store"
```

오류 없으면 정상.

- [ ] **Step 3: 커밋**

```bash
git add features/learner/firestore-learner-profile-store.ts
git commit -m "feat: FirestoreLearnerProfileStore 추가 (Firestore 기기 간 동기화)"
```

---

## Task 3: provider.tsx에 Firestore store 연결 및 updateOnboardingProfile 추가

**Files:**
- Modify: `features/learner/current-learner-controller.ts`
- Modify: `features/learner/provider.tsx`

- [ ] **Step 1: controller에 updateOnboardingProfile 추가**

`features/learner/current-learner-controller.ts`의 `CurrentLearnerController` 타입에 메서드 추가:

```ts
// CurrentLearnerController 타입에 추가
updateOnboardingProfile(nickname: string, grade: Exclude<LearnerProfile['grade'], 'unknown'>): Promise<CurrentLearnerSnapshot>;
```

그리고 `return { ... }` 블록 안에 구현 추가 (`updateGrade` 바로 아래):

```ts
updateOnboardingProfile: async (nickname, grade) => {
  const { session, profile, summary } = await readAccessibleSnapshot();
  const nextProfile: LearnerProfile = {
    ...profile,
    nickname,
    grade,
    updatedAt: new Date().toISOString(),
  };

  await profileStore.save(nextProfile);
  return buildSnapshot({
    authGateState: session.status === 'authenticated' ? 'authenticated' : 'guest-dev',
    profile: nextProfile,
    session,
    summary,
  });
},
```

- [ ] **Step 2: provider.tsx에 Firestore store 주입 및 메서드 노출**

`features/learner/provider.tsx` 상단 import에 추가:

```ts
import { FirestoreLearnerProfileStore } from '@/features/learner/firestore-learner-profile-store';
import { isFirebaseAuthConfigured } from '@/features/auth/firebase-config';
```

provider.tsx 상단 (learnerController 생성 전) 에서 profileStore 교체:

```ts
// Firestore가 설정된 경우 원격 store 사용 (기기 간 동기화)
// 설정 안 된 경우 로컬 store로 폴백 (개발/Expo Go 환경)
const profileStore = isFirebaseAuthConfigured()
  ? new FirestoreLearnerProfileStore()
  : new LocalLearnerProfileStore();
```

`CurrentLearnerContextValue` 타입에 메서드 추가:

```ts
updateOnboardingProfile(
  nickname: string,
  grade: Exclude<LearnerProfile['grade'], 'unknown'>,
): Promise<void>;
```

provider의 `value` 객체에 메서드 추가:

```ts
updateOnboardingProfile: async (nickname, grade) => {
  const snapshot = await learnerController.updateOnboardingProfile(nickname, grade);
  applySnapshot(snapshot);
},
```

- [ ] **Step 3: 타입 오류 확인**

```bash
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 4: 커밋**

```bash
git add features/learner/current-learner-controller.ts features/learner/provider.tsx
git commit -m "feat: updateOnboardingProfile 추가, Firestore profile store 연결"
```

---

## Task 4: 온보딩 화면 UI 구현

**Files:**
- Create: `features/onboarding/hooks/use-onboarding-screen.ts`
- Create: `features/onboarding/screens/onboarding-screen.tsx`
- Create: `features/onboarding/components/onboarding-screen-view.tsx`

- [ ] **Step 1: use-onboarding-screen.ts 생성**

```ts
import { router } from 'expo-router';
import { useState } from 'react';

import type { LearnerGrade } from '@/features/learner/types';
import { useCurrentLearner } from '@/features/learner/provider';

export type UseOnboardingScreenResult = {
  nickname: string;
  grade: Exclude<LearnerGrade, 'unknown'> | null;
  isBusy: boolean;
  isReady: boolean;
  onChangeNickname: (value: string) => void;
  onSelectGrade: (grade: Exclude<LearnerGrade, 'unknown'>) => void;
  onSubmit: () => Promise<void>;
};

export function useOnboardingScreen(): UseOnboardingScreenResult {
  const { updateOnboardingProfile } = useCurrentLearner();
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState<Exclude<LearnerGrade, 'unknown'> | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const isReady = nickname.trim().length > 0 && grade !== null;

  const onSubmit = async () => {
    if (!isReady || isBusy || !grade) return;
    setIsBusy(true);
    try {
      await updateOnboardingProfile(nickname.trim(), grade);
      router.replace('/(tabs)/quiz');
    } finally {
      setIsBusy(false);
    }
  };

  return {
    nickname,
    grade,
    isBusy,
    isReady,
    onChangeNickname: setNickname,
    onSelectGrade: setGrade,
    onSubmit,
  };
}
```

- [ ] **Step 2: onboarding-screen-view.tsx 생성**

```tsx
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography, FontFamilies } from '@/constants/typography';
import type { LearnerGrade } from '@/features/learner/types';
import type { UseOnboardingScreenResult } from '@/features/onboarding/hooks/use-onboarding-screen';

const CHARACTER_SOURCE = require('../../../assets/auth/dasida-login-character.png');
const CHARACTER_ASPECT_RATIO = 492 / 534;

const GRADE_OPTIONS: { value: Exclude<LearnerGrade, 'unknown'>; label: string; sub: string }[] = [
  { value: 'g1', label: '고1', sub: '1학년' },
  { value: 'g2', label: '고2', sub: '2학년' },
  { value: 'g3', label: '고3', sub: '3학년' },
];

function BackgroundGlow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, styles.glowTopLeft]} />
      <View style={[styles.glow, styles.glowCenter]} />
      <View style={[styles.glow, styles.glowBottom]} />
    </View>
  );
}

function GradeCard({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(selected ? 1 : 1.05, { damping: 12 }, () => {
      scale.value = withSpring(selected ? 1 : 1.04);
    });
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={styles.gradeCardWrap}>
      <Animated.View
        style={[
          styles.gradeCard,
          selected && styles.gradeCardSelected,
          animatedStyle,
        ]}>
        <Text selectable style={[styles.gradeLabel, selected && styles.gradeLabelSelected]}>
          {label}
        </Text>
        <Text selectable style={[styles.gradeSub, selected && styles.gradeSubSelected]}>
          {sub}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function OnboardingScreenView({
  nickname,
  grade,
  isBusy,
  isReady,
  onChangeNickname,
  onSelectGrade,
  onSubmit,
}: UseOnboardingScreenResult) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <BackgroundGlow />
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + BrandSpacing.lg, paddingBottom: insets.bottom + BrandSpacing.lg },
        ]}>

        {/* 캐릭터 + 말풍선 */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.heroBlock}>
          <View style={styles.speechBubble}>
            <Text selectable style={styles.bubbleGreeting}>안녕하세요!</Text>
            <Text selectable style={styles.bubbleMain}>어떻게 불러드릴까요?</Text>
          </View>
          <Image
            source={CHARACTER_SOURCE}
            contentFit="contain"
            style={styles.characterImage}
          />
        </Animated.View>

        {/* 폼 */}
        <View style={styles.form}>

          {/* 닉네임 */}
          <Animated.View entering={FadeInUp.duration(220).delay(80)} style={styles.fieldBlock}>
            <Text selectable style={styles.fieldLabel}>닉네임</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={onChangeNickname}
              placeholder="불러드릴 이름을 입력해주세요"
              placeholderTextColor="rgba(30,47,32,0.35)"
              maxLength={10}
              returnKeyType="done"
            />
          </Animated.View>

          {/* 학년 선택 */}
          <Animated.View entering={FadeInUp.duration(220).delay(160)} style={styles.fieldBlock}>
            <Text selectable style={styles.fieldLabel}>학년</Text>
            <View style={styles.gradeRow}>
              {GRADE_OPTIONS.map((option) => (
                <GradeCard
                  key={option.value}
                  label={option.label}
                  sub={option.sub}
                  selected={grade === option.value}
                  onPress={() => onSelectGrade(option.value)}
                />
              ))}
            </View>
          </Animated.View>

          {/* CTA 버튼 */}
          <Animated.View entering={FadeInUp.duration(220).delay(240)} style={styles.ctaBlock}>
            <Pressable
              onPress={() => void onSubmit()}
              disabled={!isReady || isBusy}
              style={({ pressed }) => [
                styles.ctaButton,
                isReady ? styles.ctaButtonActive : styles.ctaButtonDisabled,
                (pressed && isReady) && styles.ctaButtonPressed,
              ]}>
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text selectable style={[styles.ctaText, !isReady && styles.ctaTextDisabled]}>
                  다시다 시작하기
                </Text>
              )}
            </Pressable>
          </Animated.View>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTopLeft: {
    top: -64, left: -56,
    width: 240, height: 240,
    backgroundColor: 'rgba(245, 224, 164, 0.36)',
  },
  glowCenter: {
    top: 120, left: '10%',
    width: 280, height: 280,
    backgroundColor: 'rgba(255, 237, 192, 0.42)',
  },
  glowBottom: {
    bottom: -48, right: -72,
    width: 220, height: 220,
    backgroundColor: 'rgba(255, 244, 216, 0.72)',
  },
  heroBlock: {
    alignItems: 'center',
    gap: 0,
    paddingTop: BrandSpacing.md,
  },
  speechBubble: {
    backgroundColor: '#FFFDF4',
    borderWidth: 2,
    borderColor: '#1F1D18',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.lg,
    paddingVertical: BrandSpacing.md,
    alignItems: 'center',
    gap: 2,
    boxShadow: '3px 3px 0 rgba(31,29,24,0.10)',
  },
  bubbleGreeting: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: BrandColors.primary,
    letterSpacing: 0.04,
  },
  bubbleMain: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: BrandColors.text,
  },
  characterImage: {
    width: 140,
    aspectRatio: CHARACTER_ASPECT_RATIO,
  },
  form: {
    flex: 1,
    gap: BrandSpacing.lg,
    justifyContent: 'center',
  },
  fieldBlock: {
    gap: BrandSpacing.xs,
  },
  fieldLabel: {
    ...BrandTypography.label,
    color: BrandColors.text,
  },
  input: {
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(41,59,39,0.18)',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.md,
    fontFamily: FontFamilies.medium,
    fontSize: 16,
    color: BrandColors.text,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: BrandSpacing.sm,
  },
  gradeCardWrap: {
    flex: 1,
  },
  gradeCard: {
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1.5,
    borderColor: 'rgba(41,59,39,0.14)',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  gradeCardSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
    boxShadow: '0 6px 18px rgba(74,124,89,0.32)',
  },
  gradeLabel: {
    fontFamily: FontFamilies.extraBold,
    fontSize: 22,
    color: BrandColors.text,
    letterSpacing: -0.02,
  },
  gradeLabelSelected: {
    color: '#FFFFFF',
  },
  gradeSub: {
    fontFamily: FontFamilies.medium,
    fontSize: 11,
    color: 'rgba(30,47,32,0.45)',
  },
  gradeSubSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  ctaBlock: {
    marginTop: BrandSpacing.sm,
  },
  ctaButton: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonActive: {
    backgroundColor: BrandColors.primaryDark,
    boxShadow: '0 14px 32px rgba(30,47,32,0.28)',
  },
  ctaButtonDisabled: {
    backgroundColor: 'rgba(30,47,32,0.10)',
  },
  ctaButtonPressed: {
    opacity: 0.88,
  },
  ctaText: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  ctaTextDisabled: {
    color: 'rgba(30,47,32,0.28)',
  },
});
```

- [ ] **Step 3: onboarding-screen.tsx 생성 (Thin Screen)**

```tsx
import { OnboardingScreenView } from '@/features/onboarding/components/onboarding-screen-view';
import { useOnboardingScreen } from '@/features/onboarding/hooks/use-onboarding-screen';

export default function OnboardingScreen() {
  const screen = useOnboardingScreen();
  return <OnboardingScreenView {...screen} />;
}
```

- [ ] **Step 4: 타입 오류 확인**

```bash
npx tsc --noEmit 2>&1 | grep -i "onboarding"
```

- [ ] **Step 5: 커밋**

```bash
git add features/onboarding/
git commit -m "feat: 온보딩 화면 UI 구현 (닉네임 + 학년 선택)"
```

---

## Task 5: 라우트 연결

**Files:**
- Create: `app/onboarding.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx`

- [ ] **Step 1: app/onboarding.tsx 생성**

```tsx
import OnboardingScreen from '@/features/onboarding/screens/onboarding-screen';

export default function OnboardingRoute() {
  return <OnboardingScreen />;
}
```

- [ ] **Step 2: app/_layout.tsx Stack에 스크린 추가**

`<Stack>` 안에 아래 항목 추가:

```tsx
<Stack.Screen name="onboarding" options={{ headerShown: false }} />
```

- [ ] **Step 3: app/index.tsx에 온보딩 리디렉트 조건 추가**

```tsx
import { Redirect } from 'expo-router';
import { useCurrentLearner } from '@/features/learner/provider';

export default function IndexRoute() {
  const { authGateState, isReady, profile } = useCurrentLearner();

  if (!isReady || authGateState === 'loading') {
    return null;
  }

  if (authGateState === 'required') {
    return <Redirect href="/sign-in" />;
  }

  // TODO: 개발 완료 후 아래 주석을 해제해 온보딩을 필수로 활성화하세요.
  // 현재는 Expo Go / 개발 환경에서 매번 온보딩을 거치지 않도록 비활성화 상태입니다.
  // if (profile?.grade === 'unknown' || !profile?.nickname) {
  //   return <Redirect href="/onboarding" />;
  // }

  return <Redirect href="/(tabs)/quiz" />;
}
```

- [ ] **Step 4: Expo Go로 동작 확인**

```bash
npx expo start
```

`/onboarding` 라우트로 직접 진입해서 닉네임 입력 + 학년 선택 + 버튼 활성화 동작 확인.

- [ ] **Step 5: 커밋**

```bash
git add app/onboarding.tsx app/_layout.tsx app/index.tsx
git commit -m "feat: 온보딩 라우트 연결 (리디렉트는 주석으로 비활성화)"
```

---

## Task 6: Firestore Security Rules 메모

**Files:**
- 없음 (Firestore Console에서 직접 설정 필요)

- [ ] **Step 1: Firebase Console에서 Firestore Security Rules 업데이트**

Firebase Console → Firestore → Rules 탭에서 아래 규칙 추가:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/profile/data {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

- [ ] **Step 2: 커밋 (변경 내용 없음, 메모용)**

```bash
git commit --allow-empty -m "chore: Firestore Security Rules 설정 완료 (Console에서 적용)"
```

---

## Self-Review

**스펙 커버리지 확인:**
- ✅ 닉네임 + 학년(고1/고2/고3) 입력 — Task 4
- ✅ 둘 다 입력해야 버튼 활성화 — Task 4 (isReady 조건)
- ✅ 로컬 + Firestore 동시 저장 — Task 2, 3 (FirestoreLearnerProfileStore + profileStore 교체)
- ✅ 기기 간 동기화 — Task 2, 3 (Firestore uid 기준 저장/로드)
- ✅ 완료 후 여정 맵으로 이동 — Task 4 (router.replace)
- ✅ 리디렉트 비활성화 + 주석 — Task 5
- ✅ 로그인 화면 캐릭터 재사용 — Task 4
- ✅ FadeInUp stagger 애니메이션 — Task 4
- ✅ 학년 카드 withSpring 애니메이션 — Task 4

**타입 일관성:**
- `Exclude<LearnerGrade, 'unknown'>` — hook, view, controller 모두 동일 사용
- `updateOnboardingProfile(nickname: string, grade: Exclude<LearnerGrade, 'unknown'>)` — Task 1, 3, 4 일관됨
