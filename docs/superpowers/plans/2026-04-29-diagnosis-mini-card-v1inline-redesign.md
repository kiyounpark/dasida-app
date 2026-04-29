# DiagnosisMiniCard V1Inline 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DiagnosisMiniCard`를 V1Inline 디자인(작은 인라인 배지 + 패턴 카드 메인 + 카드 하단 노트 태그)으로 교체한다.

**Architecture:** 기존 파일을 직접 수정한다. Props 인터페이스는 유지(호출부 영향 0). View 구조는 `badgeRow → patternCard(kicker/title/desc + 구분선 + noteRow) → buttonRow` 3단으로 재구성. 색상은 raw hex(milestone-banner 패턴), 그림자는 RN 0.76+ `boxShadow` CSS 문자열.

**Tech Stack:** React Native (Expo), react-native-svg (이미 dependency), `BrandRadius`/`BrandSpacing`/`FontFamilies` 토큰.

**Spec:** [docs/superpowers/specs/2026-04-29-diagnosis-mini-card-v1inline-redesign-design.md](../specs/2026-04-29-diagnosis-mini-card-v1inline-redesign-design.md)

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `features/quiz/exam/components/diagnosis-mini-card.tsx` | view-only 컴포넌트 | **수정** (전면 교체) |
| `features/quiz/exam/components/note-collection-bar.tsx` | 노트 진행률 바 (다른 화면에서 계속 사용) | **건드리지 않음** |
| `features/quiz/exam/screens/exam-diagnosis-screen.tsx:247` | 호출부 | **건드리지 않음** (props 동일) |
| `features/quiz/exam/diagnosis-mini-card-text.ts` | 텍스트 빌더 | **건드리지 않음** |

**중요**: `NoteCollectionBar`는 [exam-analysis-resume-card.tsx:29](../../features/quiz/exam/components/exam-analysis-resume-card.tsx)에서도 import해 사용한다. 절대 컴포넌트 파일을 삭제하면 안 된다.

---

## Task 1: 기존 컴포넌트 본체를 V1Inline 구조로 교체

**Files:**
- Modify: `features/quiz/exam/components/diagnosis-mini-card.tsx` (전체)

- [ ] **Step 1: 현재 파일 백업 확인 (git status로 변경 추적 가능한지)**

Run:
```bash
git status features/quiz/exam/components/diagnosis-mini-card.tsx
```
Expected: 파일이 깨끗한 상태(또는 git history로 복구 가능). 변경 사항 있으면 커밋부터.

- [ ] **Step 2: 컴포넌트 파일 전체 교체**

`features/quiz/exam/components/diagnosis-mini-card.tsx`의 내용을 전체 교체:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';

import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';

export type DiagnosisMiniCardProps = {
  problemNumber: number;
  patternName: string;
  patternDescription: string;
  noteCount: number;
  totalNotes: number;
  onPause: () => void;
  onNext: () => void;
  isLastProblem?: boolean;
};

export function DiagnosisMiniCard({
  problemNumber,
  patternName,
  patternDescription,
  noteCount,
  totalNotes,
  onPause,
  onNext,
  isLastProblem = false,
}: DiagnosisMiniCardProps) {
  return (
    <View style={styles.outer}>
      {/* badgeRow — 작은 인라인 배지 */}
      <View style={styles.badgeRow}>
        <View style={styles.badgeCircle}>
          <Text style={styles.badgeCheck}>✓</Text>
        </View>
        <Text style={styles.badgeLabel}>{problemNumber}번 분석 완료</Text>
      </View>

      {/* patternCard — 메인 시각 요소 */}
      <View style={styles.patternCard}>
        <Text style={styles.patternKicker}>오답 패턴</Text>
        <Text style={styles.patternName}>{patternName}</Text>
        <Text style={styles.patternDesc}>{patternDescription}</Text>

        {/* 구분선 + noteRow */}
        <View style={styles.noteDivider} />
        <View style={styles.noteRow}>
          <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
            <Path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke="#5C8C5A"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points="14,2 14,8 20,8"
              stroke="#5C8C5A"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Line x1="16" y1="13" x2="8" y2="13" stroke="#5C8C5A" strokeWidth={2.5} strokeLinecap="round" />
            <Line x1="16" y1="17" x2="8" y2="17" stroke="#5C8C5A" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
          <Text style={styles.noteLabel}>약점 노트로 정리됨</Text>
          <View style={styles.notePill}>
            <Text style={styles.notePillText}>
              {noteCount} / {totalNotes}
            </Text>
          </View>
        </View>
      </View>

      {/* buttonRow — Ghost + Primary */}
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
          onPress={onPause}
          accessibilityRole="button">
          <Text style={styles.btnGhostText}>잠시 쉬기</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
          onPress={onNext}
          accessibilityRole="button">
          <Text style={styles.btnPrimaryText}>{isLastProblem ? '리포트 보기 →' : '다음 문제 →'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    gap: BrandSpacing.sm,
  },

  // ── badgeRow
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  badgeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5C8C5A',
    borderWidth: 1.5,
    borderColor: '#1A1916',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCheck: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 11,
    lineHeight: 13,
    color: '#FAF6EC',
  },
  badgeLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 12.5,
    color: '#355135',
    letterSpacing: -0.1,
  },

  // ── patternCard
  patternCard: {
    backgroundColor: '#FFFCF4',
    borderWidth: 2,
    borderColor: '#1A1916',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    padding: BrandSpacing.md,
    paddingBottom: 14,
    boxShadow: '3px 3px 0 #1A1916',
  },
  patternKicker: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 10,
    lineHeight: 14,
    color: '#355135',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  patternName: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 20,
    lineHeight: 26,
    color: '#1A1916',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  patternDesc: {
    fontFamily: FontFamilies.medium,
    fontSize: 13.5,
    lineHeight: 22,
    color: '#3A3833',
  },
  noteDivider: {
    height: 1,
    backgroundColor: '#ECE4CD',
    marginTop: 12,
    marginBottom: 9,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteLabel: {
    fontFamily: FontFamilies.semibold,
    fontSize: 11.5,
    color: '#355135',
    flex: 1,
  },
  notePill: {
    backgroundColor: '#E5EFE0',
    borderWidth: 1,
    borderColor: '#C9DEC5',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  notePillText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    color: '#355135',
  },

  // ── buttonRow
  buttonRow: {
    flexDirection: 'row',
    gap: BrandSpacing.xs,
    marginTop: 4,
  },
  btnGhost: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#ECE4CD',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    fontFamily: FontFamilies.semibold,
    fontSize: 13,
    color: '#6B675E',
  },
  btnGhostPressed: {
    opacity: 0.6,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#293B27',
    borderWidth: 2.5,
    borderColor: '#1A1916',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 0 #1A1916',
  },
  btnPrimaryText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 15,
    color: '#FAF6EC',
    letterSpacing: -0.1,
  },
  btnPrimaryPressed: {
    opacity: 0.85,
  },
});
```

이전 파일에 있던 `NoteCollectionBar` import와 사용은 모두 제거된다. `BrandColors` import도 제거(raw hex 사용).

- [ ] **Step 3: TypeScript 타입 체크**

Run:
```bash
npx tsc --noEmit
```
Expected: 에러 0건. 만약 `boxShadow` 관련 타입 에러가 나면 React Native 0.76+ 타입 정의 미반영 가능성 → milestone-banner와 동일하므로 거기서 통과했다면 통과한다.

- [ ] **Step 4: 호출부 props 호환성 확인**

Run:
```bash
grep -A 10 "DiagnosisMiniCard" features/quiz/exam/screens/exam-diagnosis-screen.tsx | head -15
```
Expected: 기존 props(`problemNumber`, `patternName`, `patternDescription`, `noteCount`, `totalNotes`, `onPause`, `onNext`, `isLastProblem`) 그대로 사용 → 컴포넌트 인터페이스와 일치.

- [ ] **Step 5: 기존 텍스트 빌더 테스트가 영향 없는지 확인**

Run:
```bash
npx jest features/quiz/exam/diagnosis-mini-card-text.test.ts
```
Expected: PASS. (텍스트 빌더는 컴포넌트와 독립적이므로 영향 없어야 한다.)

- [ ] **Step 6: 진단 흐름 hook 테스트 영향 없는지 확인**

Run:
```bash
npx jest features/quiz/exam/hooks/use-exam-diagnosis-retry.test.ts
```
Expected: PASS. (mini-card text builder를 mock하는 테스트라 영향 없어야 한다.)

---

## Task 2: iOS 시각 검증

**Files:**
- 검증 대상: 모의고사 진단 흐름 화면

- [ ] **Step 1: 시뮬레이터 실행**

Run:
```bash
npx expo run:ios
```
Expected: 빌드 성공, 시뮬레이터에서 앱 실행. **Xcode Run 금지** (CLAUDE.md 규칙).

- [ ] **Step 2: 모의고사 진단 흐름 진입**

수동:
1. 홈에서 모의고사 입장
2. 한 문제 풀고 채점
3. 진단 결과로 진입 (3초 타이머 후)
4. 첫 mini-card 화면이 노출되는지 확인

- [ ] **Step 3: 일반 mini-card 시각 체크리스트**

확인 항목:
- [ ] 좌측 상단에 작은 초록 서클(22px) + "N번 분석 완료" 텍스트가 가로로 배치
- [ ] 그 아래 패턴 카드: 굵은 검정 테두리(2px), 우하단 offset shadow(3px 3px) 보임
- [ ] 카드 내부: "오답 패턴" 우퍼케이스 라벨 → 큰 패턴명(20px) → 설명문
- [ ] 카드 하단에 가로 구분선
- [ ] 구분선 아래 작은 노트 아이콘 + "약점 노트로 정리됨" + 우측 끝 `N / M` pill
- [ ] 버튼 영역: "잠시 쉬기"(투명) + "다음 문제 →"(짙은 forest, offset shadow)
- [ ] 큰 초록 블록과 큰 체크서클(44px)이 사라졌는지
- [ ] `NoteCollectionBar`(가로 진행률 바)가 사라졌는지

- [ ] **Step 4: 마지막 문제 케이스**

수동: 모의고사 마지막 문제(예: 6번)를 풀고 mini-card에 진입.

확인:
- [ ] Primary 버튼 라벨이 "리포트 보기 →"로 표시
- [ ] 나머지 시각 요소는 동일

- [ ] **Step 5: 노트 카운트 경계값 확인**

수동: 두 케이스 확인.
- 노트가 0개인 경우: pill에 "0 / N" 표시
- 노트가 모두 채워진 경우: pill에 "N / N" 표시 (정확히 일치)

- [ ] **Step 6: 긴 텍스트 줄바꿈 확인**

수동: 패턴명이 긴 케이스 (예: "이차함수의 그래프와 직선의 교점") 또는 설명이 80자 근처인 케이스.

확인:
- [ ] 패턴명이 두 줄로 줄바꿈돼도 카드 레이아웃 깨지지 않음
- [ ] 설명 텍스트가 lineHeight 22로 자연스럽게 표시
- [ ] 카드 그림자가 잘리지 않음 (`overflow: 'hidden'` 없으니 기본 OK)

---

## Task 3: Android 시각 검증

**Files:**
- 검증 대상: Android 에뮬레이터에서 동일 흐름

- [ ] **Step 1: 안드로이드 빌드 실행**

Run:
```bash
npx expo run:android
```
Expected: 빌드 성공, 에뮬레이터에서 앱 실행.

(설치된 에뮬레이터가 없으면 이 Task는 스킵하고 사용자에게 보고.)

- [ ] **Step 2: 동일 시각 체크리스트 (Task 2 Step 3-6) 반복**

특히 중점:
- [ ] **`boxShadow`가 Android에서 렌더링되는지** — milestone-banner에서 검증됐으나 디바이스별 실측이 필요. 만약 안 보이면 elevation fallback 추가 검토(Task 4 참고).
- [ ] 폰트(SUIT)가 정상 로드되는지
- [ ] 노트 아이콘 SVG가 정상 표시되는지

---

## Task 4: (조건부) Android boxShadow fallback

**조건:** Task 3 Step 2에서 Android `boxShadow`가 렌더링되지 않을 때만 실행. 그 외에는 스킵.

**Files:**
- Modify: `features/quiz/exam/components/diagnosis-mini-card.tsx` (styles 수정)

- [ ] **Step 1: Platform.select로 elevation fallback 추가**

`patternCard`와 `btnPrimary`의 그림자 처리를 다음과 같이 변경:

```ts
import { Platform, ... } from 'react-native';

// patternCard 안에서:
patternCard: {
  // ...
  ...Platform.select({
    ios: { boxShadow: '3px 3px 0 #1A1916' },
    android: {
      // Android는 0-blur offset shadow가 없으므로 elevation으로 대체
      elevation: 4,
      shadowColor: '#1A1916',
    },
    default: { boxShadow: '3px 3px 0 #1A1916' },
  }),
},
```

**주의:** Android에서는 시각이 살짝 달라진다(blur 있는 그림자 vs 단단한 offset). 사용자가 수용 가능한 차이인지 확인 후 진행.

- [ ] **Step 2: Android 재빌드 및 시각 확인**

```bash
npx expo run:android
```

대안 방안(만약 fallback도 만족스럽지 않다면):
- View 두 개 겹치기로 fake offset shadow 만들기 (별도 작업으로 분리)

---

## Task 5: 커밋 및 검증 보고

- [ ] **Step 1: 변경 사항 확인**

Run:
```bash
git status features/quiz/exam/components/
git diff features/quiz/exam/components/diagnosis-mini-card.tsx | head -100
```
Expected: `diagnosis-mini-card.tsx`만 변경. 다른 파일 영향 없음.

- [ ] **Step 2: 커밋**

Run:
```bash
git add features/quiz/exam/components/diagnosis-mini-card.tsx docs/superpowers/specs/2026-04-29-diagnosis-mini-card-v1inline-redesign-design.md docs/superpowers/plans/2026-04-29-diagnosis-mini-card-v1inline-redesign.md
git commit -m "$(cat <<'EOF'
feat(quiz): DiagnosisMiniCard V1Inline 리디자인 적용

- 큰 초록 completionBlock과 44px checkCircle 제거
- 작은 인라인 배지(22px 서클 + 텍스트)로 "분석 완료" 조용히 처리
- 패턴 카드를 메인 시각 요소로 (굵은 테두리 + offset shadow)
- NoteCollectionBar import 제거, 카드 하단 노트 태그(pill)로 통합
- DiagnosisMilestoneBanner와 동일 디자인 언어(raw hex, boxShadow CSS)
- Props 인터페이스 동일, 호출부 영향 없음

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: 푸시**

Run:
```bash
git push origin $(git branch --show-current)
```

- [ ] **Step 4: PROGRESS.md에 로그**

Run:
```bash
npm run log:commit
```

- [ ] **Step 5: Notion 페이지 업데이트**

[DASIDA 개발 기록 페이지](https://www.notion.so/35173f86260481c89522f6a1c8553617)에서:
1. 상태 → `구현완료`
2. 구현완료일 → 2026-04-29 (또는 실제 완료일)
3. Spec, Plan 필드 → GitHub permalink (커밋 해시 포함)로 업데이트
4. 본문에 `## 완료 메모` 추가 (Android boxShadow fallback 적용 여부 등 특이사항)

- [ ] **Step 6: 종료 알림**

Run:
```bash
npm run notify:done -- "DiagnosisMiniCard V1Inline 리디자인 완료 — 인라인 배지 + 패턴 카드 메인 + 노트 태그 통합"
```

---

## Self-Review

**Spec coverage:**
- ✅ Props 인터페이스 유지 → Task 1 Step 2에 동일 시그니처 명시
- ✅ View 구조 (badgeRow → patternCard → buttonRow) → Task 1 Step 2 코드 블록
- ✅ `completionBlock`/`checkCircle`/`NoteCollectionBar` 제거 → Task 1 Step 2 (전체 교체)
- ✅ 노트 태그(B안: 구분선 + 아이콘 + 라벨 + pill) → Task 1 Step 2 코드 블록의 `noteRow`
- ✅ Raw hex 색상 → 코드 블록에 직접 명시
- ✅ `boxShadow` CSS 문자열 → `patternCard`와 `btnPrimary`에 명시
- ✅ 회귀 위험: `NoteCollectionBar` 다른 호출부 → File Structure 표와 Task 1 안내에 명시
- ✅ 검증: iOS/Android 시뮬레이터 → Task 2/3
- ✅ 노트 카운트 경계값/긴 텍스트 → Task 2 Step 5/6

**Placeholder scan:** TBD/TODO 없음. 모든 코드와 명령이 구체적으로 명시됨. Task 4는 "조건부"임을 명확히 했음.

**Type consistency:** Task 1 코드의 함수 시그니처와 props가 spec 및 호출부와 일치. `boxShadow` 사용은 milestone-banner의 검증된 패턴과 동일.
