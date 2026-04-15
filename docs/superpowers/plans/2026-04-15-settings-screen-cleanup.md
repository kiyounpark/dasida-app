# 설정 화면 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설정 화면에서 개발 전용 항목 6개를 제거하고, 학년+트랙 변경 시 기록 초기화 확인 모달을 추가한다.

**Architecture:** `use-profile-screen.ts` 훅에서 dev 관련 상태/함수를 제거하고 `onUpdateGradeAndTrack`을 추가한다. `profile-screen-view.tsx`에서 dev 카드 JSX를 삭제하고, 학년 카드에 트랙 선택 UI와 확인 모달을 추가한다.

**Tech Stack:** React Native, Expo Router, TypeScript

---

## 파일 변경 목록

| 파일 | 변경 종류 | 내용 |
|------|----------|------|
| `features/profile/hooks/use-profile-screen.ts` | Modify | dev props 제거, `onUpdateGradeAndTrack` 추가, `gradeOptions`에서 `unknown` 제거 |
| `features/profile/components/profile-screen-view.tsx` | Modify | dev 카드 6개 삭제, 현재 학습자 상태 카드 삭제, subtitle 수정, 학년 카드에 트랙 UI + 확인 모달 추가 |

---

### Task 1: 훅 — dev 관련 코드 제거

**Files:**
- Modify: `features/profile/hooks/use-profile-screen.ts`

- [ ] **Step 1: 불필요한 import 제거**

`use-profile-screen.ts` 상단에서 아래 줄들을 삭제한다:

```typescript
// 삭제할 줄:
import type { PreviewSeedState } from '@/features/learner/types';
import {
  requestNotificationPermission,
  scheduleTestNotification,
} from '@/features/quiz/notifications/review-notification-scheduler';
```

- [ ] **Step 2: `useCurrentLearner` 구조분해에서 dev 전용 항목 제거**

```typescript
// 변경 전 (63-81줄)
const {
  authGateState,
  availableAuthProviders,
  deleteAccount,
  getHistoryMigrationStatus,
  homeState,
  importAnonymousHistory,
  isReady,
  profile,
  pullReviewDueDates,
  refresh,
  resetLocalProfile,
  seedPreview,
  session,
  signIn,
  signOut,
  updateGrade,
} = useCurrentLearner();

// 변경 후
const {
  deleteAccount,
  getHistoryMigrationStatus,
  homeState,
  importAnonymousHistory,
  isReady,
  profile,
  refresh,
  resetLocalProfile,
  session,
  signOut,
  updateOnboardingProfile,
} = useCurrentLearner();
```

- [ ] **Step 3: `gradeOptions`에서 `unknown` 제거, `previewStates` 삭제**

```typescript
// 변경 전
const gradeOptions = [
  { value: 'g1', label: '고1' },
  { value: 'g2', label: '고2' },
  { value: 'g3', label: '고3' },
  { value: 'unknown', label: '미설정' },
] as const;

const previewStates: { value: PreviewSeedState; label: string }[] = [
  // ...9개 항목...
];

// 변경 후 (previewStates 전체 삭제, gradeOptions만 수정)
const gradeOptions = [
  { value: 'g1', label: '고1' },
  { value: 'g2', label: '고2' },
  { value: 'g3', label: '고3' },
] as const;
```

- [ ] **Step 4: dev 상태변수 2개 삭제**

```typescript
// 아래 두 줄 삭제
const isDevBuild = __DEV__;
const isGuestDevSession = authGateState === 'guest-dev';
```

- [ ] **Step 5: dev 전용 함수 삭제 (`handleSignIn` 포함)**

`handleSignIn` 함수 전체 삭제 (129-144줄).

- [ ] **Step 6: 리턴 객체에서 dev 항목 제거, `onUpdateGrade` → `onUpdateGradeAndTrack`으로 교체**

```typescript
// 변경 전 return 객체 (187-290줄) — dev 항목들 제거 후
return {
  busyAction,
  errorMessage,
  gradeOptions,
  homeState,
  isReady,
  manualImportCandidate,
  noticeMessage,
  profile,
  session,
  onDeleteAccount: async () => {
    setBusyAction('delete-account');
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      await deleteAccount();
      router.replace('/sign-in');
    } catch (error) {
      setErrorMessage(`탈퇴에 실패했습니다. ${formatErrorMessage(error)}`);
    } finally {
      setBusyAction(null);
    }
  },
  onImportLocalHistory: handleManualImport,
  onSignOut: handleSignOut,
  onUpdateGradeAndTrack: async (
    grade: 'g1' | 'g2' | 'g3',
    track?: 'calc' | 'stats' | 'geom',
  ) => {
    setBusyAction(`grade:${grade}`);
    setErrorMessage(null);
    try {
      await resetLocalProfile();
      await updateOnboardingProfile(
        profile?.nickname ?? '',
        grade,
        grade === 'g3' ? track : undefined,
      );
    } catch (error) {
      setErrorMessage(formatErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  },
};
```

> `isImporting`, `isGuestDevSession`, `isDevBuild`, `previewStates`, `supportedAuthProviders`, `onResetLocalProfile`, `onPullReviewDueDates`, `onSeedPreview`, `onTestNotification`, `onGoToOnboarding`, `onGoToDevHub`, `onSignIn`, `onUpdateGrade` 은 리턴에서 모두 삭제한다.

- [ ] **Step 7: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음 (또는 view 쪽 타입 에러만 — 다음 Task에서 해결)

- [ ] **Step 8: 커밋**

```bash
git add features/profile/hooks/use-profile-screen.ts
git commit -m "refactor(profile): 설정 훅에서 dev 전용 코드 제거, onUpdateGradeAndTrack 추가"
```

---

### Task 2: 뷰 — dev 카드 및 현재 학습자 상태 카드 제거

**Files:**
- Modify: `features/profile/components/profile-screen-view.tsx`

- [ ] **Step 1: Props 인터페이스 정리 — dev 전용 prop 제거**

`ProfileScreenView` 함수의 구조분해 파라미터에서 아래 항목들을 제거한다:

```typescript
// 제거할 props:
isDevBuild,
isGuestDevSession,
onGoToDevHub,
onGoToOnboarding,
onTestNotification,
onSeedPreview,
onPullReviewDueDates,
onResetLocalProfile,
previewStates,
supportedAuthProviders,
onSignIn,
```

- [ ] **Step 2: subtitle 문구 수정**

```typescript
// 변경 전 (193-197줄)
<Text selectable style={styles.subtitle}>
  {isGuestDevSession
    ? '개발용 익명 세션에서 로컬 학습 상태와 로그인 전환을 확인합니다.'
    : '연결된 계정, 학년 설정, 이 기기 기록 가져오기를 관리합니다.'}
</Text>

// 변경 후
<Text selectable style={styles.subtitle}>
  계정과 학습 환경을 설정합니다.
</Text>
```

- [ ] **Step 3: 현재 학습자 상태 카드 삭제**

아래 블록 전체 삭제 (205-234줄):

```typescript
// 삭제 대상
<View style={styles.card}>
  <Text selectable style={styles.cardTitle}>
    현재 학습자 상태
  </Text>
  {isReady && session && profile ? (
    // ...세션 정보 표시...
  ) : (
    <Text selectable style={styles.body}>
      학습자 상태를 불러오는 중입니다.
    </Text>
  )}
</View>
```

- [ ] **Step 4: dev 카드 5개 삭제**

아래 블록들 전체 삭제:
- 소셜 로그인 테스트 카드: `{isDevBuild ? (<View style={styles.card}>...</View>) : null}` (336-381줄)
- 온보딩 카드: `{isDevBuild ? (<View style={styles.card}>...</View>) : null}` (383-396줄)
- 개발용 알림 테스트 카드: `{isDevBuild ? (<View style={[styles.card, styles.devCard]}>...</View>) : null}` (398-413줄)
- 개발 허브 카드: `{isDevBuild ? (<View style={[styles.card, styles.devCard]}>...</View>) : null}` (415-429줄)
- 개발용 상태 미리보기 카드: `{isDevBuild ? (<View style={[styles.card, styles.devCard]}>...</View>) : null}` (431-482줄)

- [ ] **Step 5: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add features/profile/components/profile-screen-view.tsx
git commit -m "refactor(profile): 설정 화면에서 dev 카드 제거, subtitle 수정"
```

---

### Task 3: 뷰 — 학년+트랙 선택 UI 및 확인 모달 추가

**Files:**
- Modify: `features/profile/components/profile-screen-view.tsx`

- [ ] **Step 1: `LearnerTrack` 타입 import 추가**

파일 상단 import에 추가:

```typescript
import type { LearnerTrack } from '@/features/learner/types';
```

- [ ] **Step 2: `onUpdateGrade` → `onUpdateGradeAndTrack` prop 반영, 로컬 상태 추가**

`ProfileScreenView` 함수 파라미터에서:
```typescript
// 변경 전
onUpdateGrade,

// 변경 후
onUpdateGradeAndTrack,
```

함수 본문 상단 `useState` 선언부에 추가:
```typescript
const [gradeChangeRequest, setGradeChangeRequest] = useState<{
  grade: 'g1' | 'g2' | 'g3';
  track?: LearnerTrack;
} | null>(null);
const [gradeConfirmVisible, setGradeConfirmVisible] = useState(false);
```

- [ ] **Step 3: 학년 카드 교체 — 트랙 선택 포함**

기존 학년 카드 (302-321줄)를 아래로 교체:

```typescript
<View style={styles.card}>
  <Text selectable style={styles.cardTitle}>
    학년 설정
  </Text>
  <View style={styles.chipWrap}>
    {gradeOptions.map((option) => {
      const isSelected =
        gradeChangeRequest !== null
          ? gradeChangeRequest.grade === option.value
          : profile?.grade === option.value;
      return (
        <Pressable
          key={option.value}
          style={[styles.chip, isSelected && styles.chipSelected]}
          onPress={() => {
            setGradeChangeRequest({ grade: option.value, track: undefined });
          }}>
          <Text selectable style={[styles.chipText, isSelected && styles.chipTextSelected]}>
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>

  {gradeChangeRequest?.grade === 'g3' ? (
    <>
      <Text selectable style={[styles.body, { marginTop: 12, marginBottom: 6 }]}>
        선택과목
      </Text>
      <View style={styles.chipWrap}>
        {(
          [
            { value: 'calc', label: '미적분' },
            { value: 'stats', label: '확률과통계' },
            { value: 'geom', label: '기하' },
          ] as { value: LearnerTrack; label: string }[]
        ).map((track) => {
          const isSelected = gradeChangeRequest.track === track.value;
          return (
            <Pressable
              key={track.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => {
                setGradeChangeRequest((prev) =>
                  prev ? { ...prev, track: track.value } : prev,
                );
              }}>
              <Text selectable style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {track.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  ) : null}

  {gradeChangeRequest !== null &&
  (gradeChangeRequest.grade !== 'g3' || gradeChangeRequest.track !== undefined) ? (
    <ActionButton
      label={busyAction?.startsWith('grade:') ? '저장 중...' : '변경 저장'}
      disabled={busyAction !== null}
      onPress={() => setGradeConfirmVisible(true)}
    />
  ) : null}

  {gradeChangeRequest !== null ? (
    <ActionButton
      label="취소"
      subtle
      disabled={busyAction !== null}
      onPress={() => setGradeChangeRequest(null)}
    />
  ) : null}
</View>
```

- [ ] **Step 4: 확인 모달 추가**

`DeleteAccountConfirmModal` 바로 아래에 학년 변경 확인 모달 추가:

```typescript
<Modal
  visible={gradeConfirmVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setGradeConfirmVisible(false)}>
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text selectable style={styles.modalTitle}>
        학년을 변경할까요?
      </Text>
      <Text selectable style={styles.modalBody}>
        학년을 변경하면 기존 진단 및 복습 기록이 초기화됩니다. 계속하시겠어요?
      </Text>
      <ActionButton
        label="확인"
        disabled={busyAction !== null}
        onPress={async () => {
          if (!gradeChangeRequest) return;
          setGradeConfirmVisible(false);
          await onUpdateGradeAndTrack(gradeChangeRequest.grade, gradeChangeRequest.track);
          setGradeChangeRequest(null);
        }}
      />
      <ActionButton
        label="취소"
        subtle
        onPress={() => setGradeConfirmVisible(false)}
      />
    </View>
  </View>
</Modal>
```

`Modal`은 `react-native`에서 import한다:
```typescript
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
```

- [ ] **Step 5: 모달 스타일 추가**

`StyleSheet.create` 안에 아래 스타일 추가:

```typescript
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 24,
},
modalBox: {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 24,
  width: '100%',
  maxWidth: 360,
  gap: 12,
},
modalTitle: {
  fontSize: 17,
  fontFamily: 'SUIT-SemiBold',
  color: '#111111',
  marginBottom: 4,
},
modalBody: {
  fontSize: 14,
  fontFamily: 'SUIT-Regular',
  color: '#555555',
  lineHeight: 20,
  marginBottom: 8,
},
```

- [ ] **Step 6: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 7: 사용하지 않는 styles 정리**

`devCard`, `devLabel`, `devHintCard`, `devHintTitle` 스타일이 더 이상 참조되지 않으면 삭제한다.

```bash
npx tsc --noEmit
```

- [ ] **Step 8: 커밋**

```bash
git add features/profile/components/profile-screen-view.tsx
git commit -m "feat(profile): 설정 화면 학년+트랙 변경 UI, 기록 초기화 확인 모달 추가"
```

---

### Task 4: 완료 알림

- [ ] **Step 1: 완료 알림 전송**

```bash
npm run notify:done -- "설정 화면 정리 완료 — dev 카드 제거, 학년+트랙 변경 모달 추가"
```
