# 내 기록 화면 리디자인 스펙

**날짜**: 2026-04-13  
**상태**: 기획완료

---

## 배경

현재 "내 기록" 화면은 정보는 있지만 시각적으로 밋밋해 한눈에 들어오지 않는다. 카드 5개가 균일하게 쌓여 있어 시각적 위계가 없고, 히어로 지표가 불분명하다.

---

## 핵심 방향

**복습 완료 횟수를 히어로 숫자로 올린다.**

- 정답률은 당일 컨디션에 흔들리는 성과 지표라 "성장하고 있다"는 느낌을 주기 어렵다
- 복습 완료 횟수는 노력 자체가 바로 수치로 보이고 항상 앞으로 가는 지표다
- 초반부터 의미 있게 올라가며 유저 동기부여에 직결된다

---

## 화면 구성

### 레이아웃 원칙
- **BrandHeader 없음** — 여정 화면과 동일, 탭바가 "내 기록" 역할을 대신
- **화면 타이틀 없음** — 탭바 레이블과 중복, 히어로 카드가 바로 시작

### 1. 히어로 카드 (다크 그린 `#293B27`)

| 영역 | 내용 | 데이터 소스 |
|---|---|---|
| 메인 숫자 | 복습 완료 N회 | `totals.reviewAttempts` (신규) |
| 우측 패널 | 진행 중인 약점 + 단계 | `dueReviewTasks[].weaknessId` + `stage` |
| 하단 보조 | 최근 정답률 + 변화량 | `spotlight.value` + `badgeText` |
| CTA 버튼 | 오늘 할 일 시작 | `hero.ctaLabel` + `onPrimaryAction` |

### 2. 약점별 진행 단계 카드

- 각 약점의 현재 단계(DAY1/3/7/30)를 프로그레스 바로 시각화
- 오늘 복습 대상은 주황색으로 강조
- 데이터: `dueReviewTasks`

### 3. 최근 활동 카드

- 진단/복습 이력 최근 항목
- 데이터: `summary.recentActivity`

---

## 데이터 변경

### `totals.reviewAttempts` 신규 추가

**타입 변경** (`features/learning/types.ts`):
```ts
totals: {
  diagnosticAttempts: number;
  featuredExamAttempts: number;
  reviewAttempts: number; // 신규
};
```

**계산 방식** (정규화):
- 독립 카운터로 관리하지 않음
- `recordAttempt()` 실행 시 summary 재계산 과정에서 `source: 'weakness-practice'` 완료 시도 수를 COUNT
- 노션 롤업과 동일한 구조 — 원본 데이터(`LearningAttempt`)가 single source of truth

---

## 제거되는 것

| 항목 | 이유 |
|---|---|
| BrandHeader | 여정 화면과 일관성, 공간 확보 |
| 화면 타이틀 "내 기록" | 탭바와 중복 |
| "오늘 해야 할 1가지" 별도 카드 | 히어로 카드 CTA로 통합 |
| "지난번과 이번" 비교 카드 | 히어로 카드 보조 영역으로 축소 |
| "짧은 메모" 카드 제목 | "최근 활동"으로 명칭 변경 |

---

## 영향 범위

| 파일 | 변경 유형 |
|---|---|
| `features/learning/types.ts` | `totals.reviewAttempts` 필드 추가 |
| `features/learning/history-repository.ts` | summary 재계산 시 reviewAttempts COUNT 추가 |
| `features/history/history-insights.ts` | 히어로 데이터 구조 변경 |
| `features/history/components/history-screen-view.tsx` | 전면 UI 재작성 |
| `features/history/hooks/use-history-screen.ts` | 필요 시 마이너 조정 |
