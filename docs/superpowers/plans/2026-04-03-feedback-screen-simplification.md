# Feedback Screen Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `feedback.tsx`에서 죽은 코드(TextInput, feedback/submitted state)와 중복 버튼을 제거하고, 학습 요약만 보여주는 단순한 완료 화면으로 정리한다.

**Architecture:** 단일 route 파일(`app/(tabs)/quiz/feedback.tsx`) 수정만. 화면 로직이 단순해지므로 hook 분리 불필요. dasida-code-structure 기준상 route 파일이 ~80줄로 줄어들어 기준 내에 들어온다. building-native-ui 기준상 `router.replace`를 사용해 뒤로 가기 스택에서 피드백 화면을 제거한다.

**Tech Stack:** TypeScript, React Native, Expo Router — JS-only 변경, 네이티브 빌드 불필요

**Skills:**
- `dasida-code-structure` — route 파일 책임 범위 확인 (제거 후 80줄 이하, hook 분리 불필요)
- `building-native-ui` — `router.replace` vs `router.push` 선택 기준

---

## File Structure

| 파일 | 변경 종류 | 내용 |
|------|-----------|------|
| `app/(tabs)/quiz/feedback.tsx` | Modify | dead code 제거 + 버튼 단순화 |

---

## Task 1: `feedback.tsx` — 단순화

**Files:**
- Modify: `app/(tabs)/quiz/feedback.tsx`

**dasida-code-structure 참고:**
- 현재 `feedback.tsx`는 175줄 route 파일. hook 분리 기준(80줄 초과)을 충족하나, 이번 변경으로 ~80줄로 줄어든다.
- 제거 후: `useState` 0개, 이벤트 핸들러 1개 → hook 분리 대상 아님.
- route 파일의 책임: 파라미터 파싱 + 세션 조회 + 렌더. 모두 route 레벨에서 처리 적합.

**building-native-ui 참고:**
- `router.replace('/(tabs)/quiz')` — 피드백 화면이 히스토리에서 제거됨. 뒤로 가기 불가. 올바른 선택.

---

- [ ] **Step 1: 현재 파일 확인**

`app/(tabs)/quiz/feedback.tsx`를 읽어 변경 전 상태를 파악한다.

현재 파일 구조:
- line 2: `TextInput` import (react-native에서)
- line 15: `const [feedback, setFeedback] = useState('');`
- line 16: `const [submitted, setSubmitted] = useState(false);`
- line 64: `<Text style={styles.prompt}>이번 학습 경험을 한 줄로 남겨주세요.</Text>`
- line 65-71: `<TextInput .../>`
- line 73-84: "제출하기" BrandButton (submitted 상태 토글)
- line 86-95: "처음부터 다시 시작" BrandButton
- styles: `input`, `prompt`, `buttonGap`

---

- [ ] **Step 2: 파일 전체를 아래로 교체**

`app/(tabs)/quiz/feedback.tsx` 전체를 아래 내용으로 교체한다:

```tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { diagnosisMap, resolveWeaknessId } from '@/data/diagnosisMap';
import { useQuizSession } from '@/features/quiz/session';
import { getSingleParam } from '@/utils/get-single-param';

export default function QuizFeedbackScreen() {
  const { state, resetSession } = useQuizSession();
  const params = useLocalSearchParams();

  const summary = state.result;
  const fallbackWeaknessId = resolveWeaknessId(
    getSingleParam(params.weaknessId) ?? getSingleParam(params.weakTag),
  );

  const mode = getSingleParam(params.mode) ?? (summary?.allCorrect ? 'challenge' : 'weakness');

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}>
        <View style={styles.mainCard}>
          <Text style={styles.title}>학습 피드백</Text>

          {summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>이번 학습 요약</Text>
              <Text style={styles.summaryMetric}>
                정답률: {summary.accuracy}% ({summary.correct}/{summary.total})
              </Text>
              <Text style={styles.cardBody}>연습 모드: {mode === 'challenge' ? '심화 문제' : '약점 연습'}</Text>
              {summary.allCorrect ? (
                <Text style={styles.cardBody}>모든 본문 문제를 정답 처리했습니다.</Text>
              ) : (
                <View style={styles.weaknessList}>
                  {summary.topWeaknesses.map((id, index) => (
                    <Text key={id} style={styles.cardBody}>
                      {index + 1}. {diagnosisMap[id].labelKo}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>호환 모드 요약</Text>
              <Text style={styles.cardBody}>
                약점: {fallbackWeaknessId ? diagnosisMap[fallbackWeaknessId].labelKo : '정보 없음'}
              </Text>
            </View>
          )}

          <BrandButton
            title="홈으로 이동"
            variant="primary"
            onPress={() => {
              resetSession();
              router.replace('/(tabs)/quiz');
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
    paddingBottom: BrandSpacing.xxl,
    gap: BrandSpacing.md,
  },
  mainCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#fff',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: BrandColors.text,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.md,
    padding: 14,
    gap: 8,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.text,
  },
  cardBody: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  summaryMetric: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  weaknessList: {
    gap: 2,
  },
});
```

---

- [ ] **Step 3: TypeScript 타입 오류 확인**

```bash
cd /Users/baggiyun/dev/dasida-app && npx tsc --noEmit 2>&1 | grep feedback
```

Expected: 출력 없음 (오류 없음)

---

- [ ] **Step 4: dasida-code-structure 체크리스트 확인**

변경 후 파일에 대해 확인:
- route 파일이 얇은가? → 약 80줄, 파라미터 파싱 + 세션 조회 + 렌더만 존재 ✅
- 순수 계산이 view에 남아 있지 않은가? → `mode` 파생값은 route 레벨에서 처리 적합 ✅
- 새 파일 이름이 kebab-case인가? → 신규 파일 없음 ✅
- 기존 사용자 기능을 바꾸지 않았는가? → 학습 요약 표시 유지, 홈 이동 동작 유지 ✅

---

- [ ] **Step 5: 커밋**

```bash
git add app/(tabs)/quiz/feedback.tsx
git commit -m "refactor: 피드백 화면 단순화 — TextInput·더미 state 제거, 홈 이동 버튼으로 정리"
```

---

- [ ] **Step 6: 수동 검증**

JS-only 변경이므로 Metro 캐시 클리어 후 확인:

```bash
npx expo start --clear
```

확인 항목:
1. 약점 연습 완료 → 피드백 화면 표시 — 학습 요약 카드 + "홈으로 이동" 버튼만 보임
2. TextInput, "이번 학습 경험..." 텍스트 없음
3. "홈으로 이동" 탭 → `/(tabs)/quiz` 홈으로 이동, 뒤로 가기 불가
4. `state.result`가 없는 케이스(호환 모드): 약점 이름만 표시되는 요약 카드 확인

---

## Self-Review

**Spec coverage:**
- ✅ `feedback` state 제거
- ✅ `submitted` state 제거
- ✅ `TextInput` 제거
- ✅ prompt 텍스트 제거
- ✅ "제출하기" 버튼 제거
- ✅ "처음부터 다시 시작" 버튼 제거
- ✅ `buttonGap` 스타일 제거
- ✅ `input` 스타일 제거
- ✅ `prompt` 스타일 제거
- ✅ "홈으로 이동" 버튼 추가 (`resetSession` + `router.replace('/(tabs)/quiz')`)
- ✅ 학습 요약 섹션 유지

**Placeholder scan:** 없음

**Type consistency:** 단일 파일 수정, 타입 참조 없음
