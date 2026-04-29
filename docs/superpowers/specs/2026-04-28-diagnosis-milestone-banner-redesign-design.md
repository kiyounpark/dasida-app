# Diagnosis Milestone Banner Redesign — Design Spec

**Date:** 2026-04-28
**Status:** Approved

## Goal

진단 퀴즈 33% / 67% 시점에 노출되는 마일스톤 배너의 시각 디자인을 교체한다. 이모지/도트 진행 바 기반의 기존 표현을 마스코트 + 큰 분수 + 얇은 진행 바 기반의 단순한 격려 화면으로 바꾼다.

## Background

`features/quiz/exam/components/diagnosis-milestone-banner.tsx`는 진단 흐름의 중간 점검 모먼트로, "여기까지 잘 왔어요" 메시지와 함께 사용자가 잠시 쉴지 계속할지 선택하게 하는 컴포넌트다.

기존 디자인은 다음 두 가지 약점이 있다.

- 🌱🌿 이모지로 톤을 잡고 있어 다른 화면의 마스코트 일관성과 단절됨
- `NoteCollectionBar`(45개 도트 진행 바)가 시각 노이즈가 크고, 마일스톤 모먼트의 "잠깐 쉬는" 인상에 비해 정보 밀도가 과함

리디자인은 마스코트(char_07)를 도입해 캐릭터 일관성을 확보하고, 진행 표시를 큰 숫자 + 얇은 라인으로 단순화한다. `lastPatternName` 같은 학습 컨텐츠 카드를 함께 두는 안도 검토했으나, 마일스톤 모먼트의 감정적 휴지부 역할을 흐린다는 판단으로 제외한다.

## Scope

변경 파일: `features/quiz/exam/components/diagnosis-milestone-banner.tsx` 단일 파일.

호출부(`features/quiz/exam/screens/exam-diagnosis-screen.tsx`), 데이터 생성부(`features/quiz/exam/hooks/use-exam-diagnosis.ts`)는 prop signature가 동일해 변경하지 않는다.

## Design

### Props (변경 없음)

| prop | 타입 | 비고 |
|------|------|------|
| `fraction` | `MilestoneFraction` (33 \| 67) | 마일스톤 시점 |
| `noteCount` | `number` | 누적 노트 수 |
| `totalNotes` | `number` | 전체 약점 노트 수 |
| `onPause` | `() => void` | "잠시 쉬기" 핸들러 |
| `onContinue` | `() => void` | "계속하기" 핸들러 |

`lastPatternName` / `lastPatternDesc`는 채택하지 않는다.

### 컴포넌트 구조

```
<outer>
  ├── <milestoneCard>            // 흰 카드, 검정 외곽선, 상단 초록 스트라이프
  │     ├── topStripe            // 4px 포레스트 그린 띠
  │     ├── mascot (char_07)     // 76×76, contain
  │     ├── headline             // "벌써 절반 왔어." | "한 문제만 더."
  │     ├── sub                  // "N문제 분석 완료 · 잘 하고 있어"
  │     ├── fractionRow          // 큰 숫자 N / totalNotes
  │     └── barTrack             // 얇은 진행 바 (flex 비율로 채움)
  └── <buttonCol>
        ├── btnPrimary           // "계속하기 →" (진한 초록, boxShadow)
        └── btnGhost             // "잠시 쉬기" (텍스트만)
```

### 헤드라인 / 서브 텍스트

```ts
fraction === 33
  ? { headline: '벌써 절반 왔어.', sub: `${noteCount}문제 분석 완료 · 잘 하고 있어` }
  : { headline: '한 문제만 더.',   sub: `${noteCount}문제 분석 완료 · 거의 다 왔어` }
```

> 카피 검토 메모: "벌써 절반 왔어"는 33% 시점인데 "절반"이라는 표현이 67%로 오해될 여지가 있다. 다만 사용자 체감상 "전체 흐름의 분수령"으로 33%를 절반에 가깝게 느낀다는 디자이너 의도이므로 그대로 채택한다.

### 진행 바 표현

- 트랙: `width: 100%`, `height: 8`, `borderRadius: 999`, 옅은 크림 배경
- 채움: `flex: noteCount / totalNotes`, 나머지 영역 `flex: 1 - pct`
- `totalNotes === 0` 가드: 0으로 나누지 않도록 `pct = totalNotes > 0 ? noteCount / totalNotes : 0`

### 버튼 우선순위 변경

기존: 좌(잠시 쉬기 ghost) + 우(계속하기 primary) 가로 배치 → 두 버튼이 동등한 무게로 보임

새 디자인: 세로 스택, 위가 primary("계속하기 →"), 아래가 ghost("잠시 쉬기"). primary가 명확한 권장 동작이고 휴식은 부수 동작이라는 시각적 위계 부여.

### 색상 / 자산

새 디자인은 의도적으로 기존 `BrandColors`(`examWarmCream`, `examDeepGreen` 등)와 다른 hex 값을 사용한다. 디자이너 의도된 톤이므로 그대로 적용하되, 향후 다른 화면과 톤이 어긋나면 별도 패스에서 통합을 검토한다.

| 역할 | 값 |
|------|-----|
| 카드 배경 | `#FFFCF4` |
| 카드 외곽선 / 본문 텍스트 | `#1A1916` |
| 상단 스트라이프 / 진행 바 채움 | `#5C8C5A` |
| 큰 숫자 / primary 버튼 배경 | `#293B27` |
| 서브 텍스트 | `#6B675E` |
| 진행 바 트랙 | `#F2EDDC` |
| primary 버튼 텍스트 | `#FAF6EC` |

자산: `assets/images/characters/char_07.png` (이미 저장소에 존재함을 확인).

폰트: `FontFamilies` (`extrabold`, `semibold`, `medium`)는 기존 파일과 동일하게 사용.

### 접근성

- primary / ghost 버튼 모두 `accessibilityRole="button"` 부여
- 텍스트는 디바이스 폰트 스케일을 따름 (별도 numberOfLines 제한 없음)

## 제거되는 의존성

| 항목 | 비고 |
|------|------|
| `BrandColors` import | 새 디자인이 hex 직접 사용 |
| `NoteCollectionBar` 사용 | 얇은 진행 바로 대체. 컴포넌트 자체는 다른 곳에서 쓰므로 삭제하지 않음 |

`Image` (from `expo-image`)는 신규 import. 저장소에서 이미 다수 화면이 사용하는 패턴이라 별도 의존성 추가는 없음.

## 추가되는 의존성

없음. `expo-image`는 이미 프로젝트에 설치되어 있다.

## 검증 항목

- 33% / 67% 두 분기 모두 헤드라인과 서브 텍스트가 분기에 맞게 출력되는지
- `totalNotes === 0` 케이스에서 진행 바가 0% 상태로 정상 렌더되는지 (런타임상 발생 가능성은 낮으나 가드 검증)
- iOS / Android에서 `boxShadow`(primary 버튼)와 `borderCurve: 'continuous'`(카드)가 정상 렌더되는지 시각 확인
- 마스코트 이미지가 깨지지 않고 76×76으로 렌더되는지

## Out of Scope

- 헤드라인 / 서브 카피 톤 추가 조정
- `BrandColors` 통합 (새 hex 값들을 토큰화하는 작업)
- `lastPatternName` 카드 도입
- 마스코트 분기별 차등 (33% / 67% 다른 캐릭터 사용 등)
- `NoteCollectionBar` 컴포넌트 자체 삭제 — 다른 사용처 확인 후 별도 정리 작업으로 이관
