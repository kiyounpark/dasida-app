# 약점 누적 집계 뷰 + 상세 화면 (Phase 2)

작성일: 2026-04-29
브랜치: main
상태: DRAFT (사용자 검토 대기)

선행 스펙: [2026-04-27-exam-diagnosis-to-review-design.md](./2026-04-27-exam-diagnosis-to-review-design.md) (Phase 1)

---

## 배경

Phase 1 에서 모의고사 진단 결과가 학습 이력과 ReviewTask 에 제대로 연결되도록 만들었다. 그러나 사용자 입장에서 두 가지 한계가 남아 있다.

### 한계 1. "내가 무엇을 자주 틀리는지" 가 안 보인다
홈 하단의 "내 약점" 카드는 **복습 진도 (day1 → day3 → day7 → day30)** 만 보여준다. 이건 "이 약점을 얼마나 복습했나" 의 정보이지, "이 약점을 얼마나 자주 틀리나" 의 정보가 아니다. 모의고사 여러 회차에 걸쳐 같은 약점이 반복 등장해도 사용자는 그 패턴을 인지할 길이 없다.

### 한계 2. 약점에 진입하는 길이 "복습 일정 잡힌 날" 뿐이다
현재 구조는 day1 / day3 / day7 / day30 알림이 뜬 날에만 그 약점을 풀 수 있다. 학생이 "오늘 갑자기 함수의 극한을 한번 더 다지고 싶다" 라고 해도, 일정이 안 잡힌 날에는 그 약점에 들어갈 입구 자체가 없다. **"맨날 못하는 구조"** 다.

---

## 목표 (Phase 2)

1. **홈에서 "자주 틀리는 약점" 을 한눈에 인지할 수 있게 한다** — 누적 집계 뷰
2. **언제든 약점에 진입해서 연습할 수 있는 새 경로를 만든다** — 약점 상세 화면 + 카드 탭 진입
3. **기존 복습 일정 시스템은 손대지 않는다** — 망각곡선 스케줄러는 백그라운드에서 그대로 작동

### 비목표

- 정답률 추이 그래프의 **신규 디자인** (기존 `WeaknessAccuracyChart` 재사용만 허용, 룰은 후술)
- 회차별 틀린 문제 목록 / 차트 인터랙션 — Phase 3
- 백엔드 (Firebase Functions) 변경 — 모든 집계는 클라이언트에서 기존 데이터로 계산

---

## 핵심 통찰 — "맨날 못하는 구조" 의 한계

기존 시스템은 약점 = "복습 일정에 묶인 항목" 이었다. Phase 2 는 약점을 **"언제든 진입할 수 있는 학습 단위"** 로 재정의한다.

| | 기존 | Phase 2 이후 |
|---|---|---|
| 약점에 진입하는 길 | 일정 알림이 뜬 날만 | 일정 알림 OR 홈 카드 탭 (언제든) |
| 카드의 의미 | 복습 진도 표시 | 자주 틀리는 약점 인지 + 진입 입구 |
| 약점 상세 정보 | 없음 | 신규 화면에서 모두 한 곳에 |

홈 카드 변경과 상세 화면 신규는 **짝** 이다. 어느 한쪽만 만들면 가치가 반쪽이 된다.

---

## 설계

### 1. 홈 약점 카드 재설계

#### Before (현재)
```
[함수의 극한]              ●●●○ day7
함수의 극한이 잘 안 잡혀
점점 나아지는 중
```
- 우측: 4단계 점 (복습 진도) + stage 라벨
- 카드는 탭 불가

#### After (Phase 2)
```
[함수의 극한]              ●●● 단골 약점     ▶
함수의 극한이 잘 안 잡혀
점점 나아지는 중 ✓
```
- 우측: 심각도 점 + 한글 라벨
- 카드 전체 탭 가능 → 약점 상세 화면 이동
- 우측 끝에 작은 ▶ 화살표 (탭 시그널)
- "점점 나아지는 중" / "해결됐어요 ✓" 배지는 그대로

#### 심각도 계산
- **시간 범위:** 최근 5번 학습 (진단 + 모의고사 통합)
- **카운트 단위:** 시도 단위 (한 학습 세션에서 약점이 등장하면 +1, 문제 개수 무관)
- **등급 컷:**
  - 4~5번 등장 → `●●● 단골 약점` (주황/빨강 톤, `BrandColors.danger` 계열)
  - 2~3번 등장 → `●● 자주 등장` (황토/연한 주황)
  - 1번 등장 → `● 가끔 등장` (기존 그린)
- **예외:** `completed === true` (해결된 약점) 은 등급과 무관하게 그린 톤 + "해결됐어요 ✓" 배지

#### 카드 정렬
- 1순위: 심각도 내림차순 (단골 → 자주 → 가끔)
- 2순위: 등장 횟수 내림차순
- 3순위: 최근 등장 시점 내림차순
- 표시 개수: Top 3 (기존과 동일)

#### 섹션 노출 조건 변경
- **Before:** `latestDiagnosticSummary` 가 있어야 노출 (10문제 진단 한 적 있어야 함)
- **After:** `weaknessProgressItems.length > 0` 이면 노출 (모의고사만 풀어도 OK)

### 2. 약점 상세 화면 (신규)

#### 진입 경로
- 홈 "내 약점" 카드 탭 → 약점 상세 화면 push

#### 라우트
- `app/quiz/weakness/[weaknessId].tsx` (Expo Router)
- 진입 인자: `weaknessId`

#### 화면 구성 (위→아래)
```
┌─────────────────────────────────┐
│  ← 뒤로        함수의 극한       │  AppBar
├─────────────────────────────────┤
│  [미적분]                        │  토픽 칩
│  함수의 극한이 잘 안 잡혀         │  약점명 헤드라인
│                                 │
│  ●●● 단골 약점                   │  심각도 (홈 카드와 동일 시각)
│  최근 5번 중 4번 등장             │  여기서만 정확한 숫자 공개
├─────────────────────────────────┤
│  복습 진도                       │  4단계 점이 이사오는 곳
│  ●●●○  day7 복습 완료           │
│  다음 복습: day30                │
├─────────────────────────────────┤
│  정답률 추이                     │  WeaknessAccuracyChart 재사용
│  [기존 차트 컴포넌트]             │  (점 < 3 개면 placeholder)
├─────────────────────────────────┤
│  등장 기록                       │
│  · 2026년 4월 모의고사           │
│  · 2026년 3월 진단               │
│  · 2026년 3월 모의고사           │
│  · 2026년 2월 모의고사           │
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │   지금 바로 연습하기      │    │  핵심 CTA (일정 무관)
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

#### 3가지 상태

**상태 A. 아직 복습 시작 전**
- 복습 진도 섹션: `○○○○` + "복습 시작 전"
- 정답률 추이: 보통 데이터 없음 → placeholder
- CTA: "지금 바로 연습하기"

**상태 B. 복습 진행 중**
- 복습 진도: 현재 stage 까지 점 채움 + 다음 복습 안내
- 정답률 추이: 데이터 점 ≥ 3 이면 차트, 아니면 placeholder
- CTA: "지금 바로 연습하기"

**상태 C. 해결됨 (day30 완료)**
```
✓ 해결됐어요!                     심각도 점 자리에 체크
최근 5번 중 0번 등장              

복습 진도
●●●● 완료

CTA: 다시 연습하기                 카피 변경
```

#### "지금 바로 연습하기" 동작
- 기존 약점 연습 진입 라우트 재사용 (`/quiz/practice?weaknessId=...`)
- 일정 (ReviewTask 의 nextDueAt) 과 무관하게 진입
- 풀고 나온 결과는 정상적으로 학습 이력에 기록 (기존 흐름)
- ReviewTask 의 stage 진행에는 영향 없음 (별도 흐름)

### 3. 정답률 추이 차트 — 엄격한 재사용 룰

상세 화면에 정답률 추이를 포함하되, 비용 폭증을 막기 위해 다음 룰을 강제한다.

#### 허용
- ✅ 기존 `features/quiz/components/weakness-growth-chart.tsx`(`WeaknessAccuracyChart`) **그대로 재사용**
- ✅ 데이터를 약점 1개 기준으로 필터링
- ✅ 데이터 점 < 3 개면 차트 대신 placeholder 텍스트 ("기록이 더 쌓이면 보여드릴게요")

#### 금지
- ❌ 새 차트 라이브러리 도입
- ❌ SVG 직접 그리기 / 커스텀 애니메이션
- ❌ 차트 디자인 새로 잡기 (색상, 축, 라벨 톤)
- ❌ 인터랙션 추가 (점 탭 → 회차 상세 등)

#### Fallback
구현 중 "기존 컴포넌트가 약점 단일 보기엔 구조적으로 안 맞는다" 는 결론이 나오면 정답률 추이 섹션을 **그 시점에 잘라낸다** (Phase 3 로 이전). 상세 화면의 다른 섹션은 단독으로 의미가 있으므로 fallback 가능.

---

## 데이터 모델

### `WeaknessProgressItem` 변경
```ts
// Before
type WeaknessProgressItem = {
  weaknessId: WeaknessId;
  weaknessLabel: string;
  topicLabel: string;
  stage: ReviewStage;       // 'day1' | 'day3' | 'day7' | 'day30'
  completed: boolean;
};

// After
type WeaknessProgressItem = {
  weaknessId: WeaknessId;
  weaknessLabel: string;
  topicLabel: string;
  completed: boolean;                  // 유지 (배지용)
  stage: ReviewStage;                  // 유지 (상세 화면 복습 진도 섹션용)
  recentAppearanceCount: number;       // 신규 (최근 5번 중 등장 횟수)
  severity: 'frequent' | 'often' | 'occasional';  // 신규
  appearances: WeaknessAppearance[];   // 신규 (상세 화면 등장 기록용)
};

type WeaknessAppearance = {
  attemptId: string;
  source: 'diagnostic' | 'featured-exam';
  sourceLabel: string;        // "2026년 4월 모의고사" 등
  attemptedAt: string;        // ISO timestamp
};
```

### 계산 로직 (`buildWeaknessProgressItems`)

```ts
function computeRecentAppearanceCount(
  weaknessId: WeaknessId,
  attempts: LearningAttempt[],
): number {
  const recent5 = attempts
    .filter((a) => a.source === 'diagnostic' || a.source === 'featured-exam')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5);
  return recent5.filter((a) => a.topWeaknesses.includes(weaknessId)).length;
}

function computeSeverity(count: number): WeaknessProgressItem['severity'] {
  if (count >= 4) return 'frequent';
  if (count >= 2) return 'often';
  return 'occasional';
}
```

---

## 변경 / 신규 파일

### 변경
| 파일 | 변경 내용 |
|---|---|
| `features/learning/types.ts` | `WeaknessProgressItem` 에 `recentAppearanceCount`, `severity`, `appearances` 추가 |
| `features/learning/home-state.ts` | `buildWeaknessProgressItems` 가 신규 필드 계산 |
| `features/quiz/components/home-weakness-section.tsx` | 섹션 노출 조건 변경 (`latestDiagnosticSummary` 가드 → `items.length > 0`) |
| `features/quiz/components/weakness-progress-item.tsx` | 4단계 점 → 심각도 점 + 라벨, `Pressable` 로 감싸 탭 가능, ▶ 화살표 추가 |

### 신규
| 파일 | 역할 |
|---|---|
| `app/quiz/weakness/[weaknessId].tsx` | 약점 상세 화면 라우트 |
| `features/quiz/screens/weakness-detail-screen.tsx` | 화면 컨테이너 |
| `features/quiz/components/weakness-detail-screen-view.tsx` | 화면 뷰 (Thin Screen 패턴) |
| `features/quiz/hooks/use-weakness-detail-screen.ts` | 상세 화면 로직 훅 |
| `features/quiz/components/weakness-detail-header.tsx` | 토픽 칩 + 약점명 + 심각도 영역 |
| `features/quiz/components/weakness-detail-review-progress.tsx` | 4단계 점 + stage 라벨 (홈에서 이사) |
| `features/quiz/components/weakness-detail-appearances.tsx` | 등장 기록 리스트 |

---

## 빈 상태 / 엣지 케이스

| 케이스 | 동작 |
|---|---|
| 학습 0회 | 홈 약점 섹션 자체 숨김 |
| 학습 1~2회 | 약점 카드 표시 (대부분 `occasional`) |
| 학습 5회+ | Phase 2 본 가치 발휘 |
| `completed === true` | 심각도 라벨 대신 "해결됐어요 ✓", 그린 톤 |
| 정답률 데이터 점 < 3 | 차트 대신 placeholder 텍스트 |
| 약점 상세 화면에 invalid `weaknessId` 진입 | 홈으로 `router.replace` (방어) |

---

## 성공 기준

1. 홈에서 "내 약점" 카드 우측에 심각도 점 + 라벨이 정상 표시된다
2. 카드를 탭하면 약점 상세 화면으로 이동한다
3. 상세 화면의 "지금 바로 연습하기" 버튼이 일정 (ReviewTask) 과 무관하게 약점 연습 화면으로 이동한다
4. 모의고사만 푼 사용자도 홈 "내 약점" 섹션이 노출된다
5. day30 까지 완료된 약점 카드는 "해결됐어요 ✓" 가 뜨고 그린 톤이다
6. 정답률 추이 차트는 데이터 점 ≥ 3 일 때만 보이고, 미만이면 placeholder 가 뜬다
7. 기존 복습 일정 (day1/day3/day7/day30) 알림 / 큐 동작은 변화 없다

---

## 보류 / Phase 3

- **정답률 추이 차트의 인터랙션** (점 탭 → 그 회차의 상세 보기)
- **회차별 틀린 문제 목록** (몇 번 문제 틀렸는지)
- **약점 상세 화면의 정답률 추이를 약점 단일 뷰로 새로 디자인** (현재는 기존 컴포넌트 재사용에 한정)
- **알림 (Push) 연동** — "함수의 극한 약점, 오늘 한번 더 풀어볼래요?" 같은 능동 권유

---

## 회귀 위험

- **`WeaknessProgressItem` 데이터 형 확장** — 소비처는 `home-weakness-section.tsx` 단일. 안전.
- **섹션 노출 조건 완화** — 모의고사만 푼 사용자에게 카드가 갑자기 노출됨. 사용자 여정상 자연스러우므로 OK 로 판단.
- **"지금 바로 연습하기" 가 일정 외 시점에 약점 연습을 트리거** — 학습 이력은 정상 기록되지만, ReviewTask 의 day1 → day3 → day7 → day30 진행에는 영향 없음. 일정 시스템과 별도 흐름.
- **약점 상세 화면의 invalid 라우트 진입** — `router.replace('/(tabs)/quiz')` 방어. crash 없음.
