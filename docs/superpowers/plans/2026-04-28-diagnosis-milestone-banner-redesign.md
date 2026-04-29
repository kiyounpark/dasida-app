# 진단 마일스톤 배너 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `DiagnosisMilestoneBanner` 컴포넌트를 마스코트(char_07) + 큰 분수 + 얇은 진행 바 기반의 새 디자인으로 교체한다.

**Architecture:** 단일 컴포넌트 파일(`features/quiz/exam/components/diagnosis-milestone-banner.tsx`) 교체. Props signature 동일 유지(`fraction`, `noteCount`, `totalNotes`, `onPause`, `onContinue`)로 호출부와 hook 변경 없음. `lastPatternName`/`lastPatternDesc` prop과 약점 카드 블록은 spec 결정에 따라 제외.

**Tech Stack:** TypeScript, React Native, expo-image, Jest

**Spec deviation note:** TDD 단위 테스트는 추가하지 않는다. 컴포넌트는 순수 presentational이며 기존 `diagnosis-milestone-banner.tsx`에도 단위 테스트가 없다. 검증은 TypeScript / Jest / Lint + iOS 시뮬레이터 스모크로 진행.

---

## File Structure

- **Replace** `features/quiz/exam/components/diagnosis-milestone-banner.tsx` — 컴포넌트 본체 교체

영향 없음 (변경 안 함):

- `features/quiz/exam/screens/exam-diagnosis-screen.tsx` — Props signature 동일하므로 호출부 그대로
- `features/quiz/exam/hooks/use-exam-diagnosis.ts` — `milestone-banner` entry 타입 변경 없음
- `features/quiz/exam/diagnosis-milestone.ts` 및 `.test.ts` — 무관
- `features/quiz/exam/components/note-collection-bar.tsx` — 다른 사용처가 있으므로 보존

자산 (이미 저장소에 존재):

- `assets/images/characters/char_07.png` — 76×76 마스코트로 사용

---

### Task 1: 컴포넌트 파일을 새 디자인으로 교체

**Files:**
- Modify: `features/quiz/exam/components/diagnosis-milestone-banner.tsx`

이 task가 작업의 본질이다. 기존 파일을 통째로 새 디자인 코드로 대체한다. Downloads 원본에서 `lastPatternName`/`lastPatternDesc` props와 patternCard 블록을 제거한 형태.

- [ ] **Step 1: 기존 파일 백업 확인 (git에 이미 있음)**

```bash
git log --oneline -3 features/quiz/exam/components/diagnosis-milestone-banner.tsx
```

Expected: 최근 커밋 해시가 출력됨. (롤백 시 참조용. 별도 백업 파일은 만들지 않는다.)

- [ ] **Step 2: 파일 전체를 새 내용으로 교체**

`features/quiz/exam/components/diagnosis-milestone-banner.tsx` 의 전체 내용을 다음 코드로 대체한다:

```tsx
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import type { MilestoneFraction } from '@/features/quiz/exam/diagnosis-milestone';

const MASCOT_SOURCE = require('../../../../assets/images/characters/char_07.png');

export type DiagnosisMilestoneBannerProps = {
  fraction: MilestoneFraction; // 33 | 67
  noteCount: number;
  totalNotes: number;
  onPause: () => void;
  onContinue: () => void;
};

function getHeadline(fraction: MilestoneFraction): string {
  return fraction === 33 ? '벌써 절반 왔어.' : '한 문제만 더.';
}

function getSub(fraction: MilestoneFraction, noteCount: number): string {
  return fraction === 33
    ? `${noteCount}문제 분석 완료 · 잘 하고 있어`
    : `${noteCount}문제 분석 완료 · 거의 다 왔어`;
}

export function DiagnosisMilestoneBanner({
  fraction,
  noteCount,
  totalNotes,
  onPause,
  onContinue,
}: DiagnosisMilestoneBannerProps) {
  const pct = totalNotes > 0 ? noteCount / totalNotes : 0;

  return (
    <View style={styles.outer}>
      <View style={styles.milestoneCard}>
        <View style={styles.topStripe} />

        <Image
          source={MASCOT_SOURCE}
          contentFit="contain"
          style={styles.mascot}
          transition={0}
        />

        <Text style={styles.headline}>{getHeadline(fraction)}</Text>
        <Text style={styles.sub}>{getSub(fraction, noteCount)}</Text>

        <View style={styles.fractionRow}>
          <Text style={styles.fractionNum}>{noteCount}</Text>
          <Text style={styles.fractionDen}> / {totalNotes}</Text>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { flex: pct }]} />
          <View style={{ flex: 1 - pct }} />
        </View>
      </View>

      <View style={styles.buttonCol}>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
          onPress={onContinue}
          accessibilityRole="button">
          <Text style={styles.btnPrimaryText}>계속하기 →</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnGhost, pressed && styles.btnGhostPressed]}
          onPress={onPause}
          accessibilityRole="button">
          <Text style={styles.btnGhostText}>잠시 쉬기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    gap: BrandSpacing.sm,
  },
  milestoneCard: {
    backgroundColor: '#FFFCF4',
    borderWidth: 2,
    borderColor: '#1A1916',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  topStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#5C8C5A',
  },
  mascot: {
    width: 76,
    height: 76,
  },
  headline: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: '#1A1916',
    textAlign: 'center',
  },
  sub: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B675E',
    textAlign: 'center',
  },
  fractionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  fractionNum: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    color: '#293B27',
  },
  fractionDen: {
    fontFamily: FontFamilies.semibold,
    fontSize: 20,
    color: '#6B675E',
  },
  barTrack: {
    flexDirection: 'row',
    width: '100%',
    height: 8,
    backgroundColor: '#F2EDDC',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ECE4CD',
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: {
    backgroundColor: '#5C8C5A',
    borderRadius: 999,
  },
  buttonCol: {
    gap: 4,
  },
  btnPrimary: {
    backgroundColor: '#293B27',
    borderWidth: 2.5,
    borderColor: '#1A1916',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    paddingVertical: 16,
    alignItems: 'center',
    boxShadow: '0 3px 0 #1A1916',
  },
  btnPrimaryText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 15,
    color: '#FAF6EC',
    letterSpacing: -0.2,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnGhost: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnGhostText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: '#6B675E',
  },
  btnGhostPressed: {
    opacity: 0.6,
  },
});
```

**원본 Downloads 파일과의 차이점 (의도된 변경):**
- 헤더 주석 블록 (1-13행) 제거 — 변경 이력은 git이 갖고 있음
- `lastPatternName?`, `lastPatternDesc?` props 제거
- `patternCard` JSX 블록 제거
- `patternCard`, `patternKicker`, `patternName`, `patternDesc` 스타일 4개 제거
- 마스코트 require 경로는 동일 (`../../../../assets/images/characters/char_07.png`)

- [ ] **Step 3: 자산 경로 검증**

```bash
ls features/quiz/exam/components/../../../../assets/images/characters/char_07.png
```

Expected: `assets/images/characters/char_07.png` 가 출력됨 (경로가 정확함).

- [ ] **Step 4: TypeScript 검사**

```bash
npm run typecheck
```

Expected: 에러 없음. (`exam-diagnosis-screen.tsx`의 `<DiagnosisMilestoneBanner>` 호출은 prop signature 동일이므로 그대로 통과.)

- [ ] **Step 5: Lint 검사**

```bash
npm run lint
```

Expected: 에러/경고 없음.

- [ ] **Step 6: 기존 테스트 회귀 검사**

```bash
npm test -- --testPathPatterns='features/quiz/exam'
```

Expected: 모든 테스트 통과. (이 디렉토리의 테스트는 모두 `.ts` utility 대상이라 컴포넌트 변경에 영향 없음.)

---

### Task 2: iOS 시뮬레이터 시각 검증

**Files:**
- (변경 없음)

UI 컴포넌트 swap이므로 시뮬레이터 검증이 필수다. 33%와 67% 두 시점 모두 확인한다.

- [ ] **Step 1: dev 클라이언트 실행**

```bash
npx expo run:ios
```

Expected: 시뮬레이터가 켜지고 앱이 로드됨. (CLAUDE.md 규칙에 따라 Xcode 직접 Run이 아니라 expo CLI로 실행.)

- [ ] **Step 2: 마일스톤 배너가 등장하는 진단 흐름 진입**

1. 앱에서 모의고사 결과 화면 진입
2. "약점 분석" 시작
3. `MILESTONE_MIN_TOTAL = 10` 이상 오답 케이스가 필요하므로 충분한 노트가 쌓이는 시험을 선택
4. 33% 도달 시점까지 문제를 풀어 마일스톤 배너 노출 확인
5. "계속하기" 누르고 67% 도달까지 진행해 두 번째 배너 노출 확인

- [ ] **Step 3: 시각 체크리스트**

- [ ] 마스코트(char_07)가 76×76으로 카드 상단에 깨짐 없이 렌더
- [ ] 상단 4px 초록 스트라이프(`#5C8C5A`)가 카드 위쪽 끝에 보임
- [ ] 33% 분기: 헤드라인 "벌써 절반 왔어." / 서브 "N문제 분석 완료 · 잘 하고 있어"
- [ ] 67% 분기: 헤드라인 "한 문제만 더." / 서브 "N문제 분석 완료 · 거의 다 왔어"
- [ ] 큰 분수 숫자(`noteCount`)가 진한 초록(`#293B27`)으로 표시
- [ ] 얇은 진행 바가 비율대로 채워짐 (33% 시점은 약 1/3, 67% 시점은 약 2/3)
- [ ] "계속하기 →" primary 버튼이 진한 초록 + 검정 외곽선 + 아래쪽 그림자
- [ ] "잠시 쉬기" ghost 버튼이 텍스트만 (배경/테두리 없음)
- [ ] 버튼이 세로 스택 (primary 위, ghost 아래)
- [ ] "잠시 쉬기" 누르면 일시정지 동작 정상
- [ ] "계속하기 →" 누르면 다음 문제로 정상 진행

- [ ] **Step 4: 시뮬레이터 종료 (검증 완료 후)**

수동 종료. 다음 task에서 dev server 재시작 불필요.

---

### Task 3: 변경 커밋

**Files:**
- Commit: `features/quiz/exam/components/diagnosis-milestone-banner.tsx`

- [ ] **Step 1: 시작 알림 (CLAUDE.md 규약)**

```bash
npm run notify:start -- "진단 마일스톤 배너 리디자인 적용 (마스코트 + 큰 분수 + 얇은 진행 바)"
```

> 주의: 이 알림은 이미 작업 시작 시점에 보냈을 수 있다. 중복 발송 시 별 부작용 없으나, 해당 단계가 끝났다면 이 step은 skip 가능.

- [ ] **Step 2: 변경 사항 확인**

```bash
git status
git diff features/quiz/exam/components/diagnosis-milestone-banner.tsx
```

Expected: 단일 파일만 수정됨. diff에서 이모지/NoteCollectionBar/fracPill 제거, 마스코트/headline/fractionRow/barTrack 추가가 보여야 함.

- [ ] **Step 3: 커밋**

```bash
git add features/quiz/exam/components/diagnosis-milestone-banner.tsx
git commit -m "$(cat <<'EOF'
feat(quiz): 진단 마일스톤 배너 리디자인 적용

- 이모지/NoteCollectionBar 제거, char_07 마스코트 + 큰 분수 + 얇은 진행 바로 교체
- 헤드라인 "벌써 절반 왔어." / "한 문제만 더." 로 변경
- 버튼 세로 스택 (primary 위, ghost 아래)
- Props signature 변경 없음 (호출부/hook 영향 없음)

Spec: docs/superpowers/specs/2026-04-28-diagnosis-milestone-banner-redesign-design.md
Plan: docs/superpowers/plans/2026-04-28-diagnosis-milestone-banner-redesign.md

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: 원격 push 및 로그 기록**

```bash
git push origin $(git branch --show-current)
npm run log:commit
```

Expected: push 성공, `docs/PROGRESS.md`에 항목 자동 추가.

- [ ] **Step 5: 완료 알림**

```bash
npm run notify:done -- "진단 마일스톤 배너 리디자인 — 마스코트/큰 분수/세로 버튼 스택 적용, 시뮬레이터 33%/67% 두 시점 검증 완료"
```

- [ ] **Step 6: Notion 페이지 업데이트 (CLAUDE.md 규약)**

CLAUDE.md "8. 종료 절차"에 따라:

1. `notion-update-page` 로 [기존 초안 페이지](https://www.notion.so/35073f862604810ab631e08111e6809d) 업데이트:
   - 상태: `구현완료`
   - 구현완료일: `2026-04-28`
   - Spec: 커밋 해시 포함 GitHub permalink (예: `https://github.com/<org>/<repo>/blob/<sha>/docs/superpowers/specs/2026-04-28-diagnosis-milestone-banner-redesign-design.md`)
   - Plan: 동일 형식의 plan permalink
2. 본문 `## 완료 메모` 섹션에 특이사항이 있으면 추가 (시뮬레이터 검증 시 발견한 시각 이슈, BrandColors 통합 후속 작업 등). 없으면 생략.
