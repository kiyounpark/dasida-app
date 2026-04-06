# 홈 하단 약점 섹션 설계

**날짜:** 2026-04-06
**상태:** 승인됨

---

## 배경

현재 홈 화면은 복습 카드 또는 모의고사 추천 카드 하나만 표시된다. 학생이 어떤 약점을 갖고 있고, 그것이 얼마나 개선되고 있는지를 홈에서 바로 확인할 수 없다. 이 섹션을 추가해 "지금 내가 어디에 약하고, 얼마나 좋아지고 있는지"를 매일 홈에서 확인할 수 있게 한다.

---

## 설계 목표

1. 복습 있는 날, 복습 없는 날 모두 동일하게 홈 하단에 표시
2. 단원명이 아닌 구체적인 실수 유형(WeaknessId 레이블)으로 표시
3. 약점이 점점 잡혀가는 성장감을 시각적으로 전달
4. 초기 사용자(데이터 부족)에도 자연스럽게 동작

---

## 화면 구성

### 위치

`QuizHubScreenView`의 기존 복습/모의고사 카드 아래, 구분선(`divider`) 이후에 고정 배치.
현재 `posterScreen`은 `justifyContent`가 상태에 따라 달라지므로, 하단 섹션은 별도 `View`로 분리해 항상 하단에 붙도록 레이아웃 조정.

### 섹션 구성 (위→아래)

```
[친구 칩]          ← 라이브 데이터 있을 때만 표시
[약점 해결 현황]    ← 항상 표시
[내 약점 목록]     ← 항상 표시 (최대 3개)
```

---

## 1. 친구 칩

### 표시 조건
- `HomeLearningState.peerPresence.mode === 'live'` 이고 `peers.length > 0` 일 때만 렌더링
- 데이터 없으면 칩 자체를 숨김 (빈 placeholder 없음)

### UI
```
🐥🐻🦊  N명이 지금 같이 복습 중
```
- 아바타 최대 3개 표시 (겹치기 스택)
- 텍스트: `{peers.length}명이 지금 같이 복습 중`
- 스타일: pill 형태, 연한 배경, 좌측 정렬

---

## 2. 약점 해결 현황 그래프

### 표시 조건
- 진단을 1회 이상 완료한 경우 항상 표시

### 상태 A: 해결된 약점 0개 (초기 상태)
```
[막대 1개 실선] → [ghost 막대 점선] → [ghost 막대 점선]
 1주차              2주차               지금
재진단 10문제 풀기 →
```
- 실제 막대 1개 (해결 수 0)
- ghost 막대 2개: 점선 테두리 + 빗금 fill, 색상 없음
- 하단에 "재진단을 보면 성장 곡선이 채워져요" 텍스트
- `재진단 10문제 풀기` 버튼 → 진단 플로우로 이동

### 상태 B: 해결된 약점 1개 이상
```
[막대] → [막대] → [막대 (현재, 가장 진함)]
 1주차    2주차     지금  ↑N개 해결됨
```
- X축: 주차 (첫 진단 기준)
- Y축: 해결된 약점 수 (day30 완료된 `ReviewTask` 개수)
- 현재 막대가 가장 짙은 녹색, 과거로 갈수록 연해짐
- 우측 상단 뱃지: `🌱 N개 해결됨`

### 데이터 소스
- 해결 수: `ReviewTask.stage === 'day30' && completed === true` 인 항목의 `completedAt` 기준 주별 집계
- `HomeLearningState`에 `resolvedWeaknessHistory: Array<{ weekLabel: string; count: number }>` 추가
- 최대 3개 데이터 포인트 표시 (그 이상은 가장 최근 3주만)

---

## 3. 내 약점 목록

### 표시 조건
- 진단 완료 후 `repeatedWeaknesses` 또는 활성 `ReviewTask`가 있으면 표시
- 최대 3개 (진행 중 약점 우선, 완료된 약점 후순위)

### 개별 항목 구조
```
[수열]           ← 단원 칩 (연한 녹색)
계산 실수 반복    ← WeaknessId.labelKo
점점 나아지는 중  ← 상태 뱃지
                    ●●●○  day7  ← 진행 점 + 단계
```

### 단원 칩
- `diagnosisMap[weaknessId]`에 `topicLabel` 필드 추가 (수열, 미분, 적분, 극한 등)
- 스타일: `background: rgba(74,124,89,0.13)`, pill 형태, 연한 녹색 통일
- 진행 중 / 완료 모두 같은 녹색 스타일 사용

### 상태 뱃지
| 상태 | 텍스트 |
|------|--------|
| day1 또는 day3 진행 중 | 점점 나아지는 중 |
| day7 진행 중 | 점점 나아지는 중 |
| day30 완료 | 해결됐어요 ✓ |

### 진행 점 (4개)
| 단계 | 채워진 점 |
|------|-----------|
| day1 | ●○○○ |
| day3 | ●●○○ |
| day7 | ●●●○ |
| day30 완료 | ●●●● |

### 데이터 소스
- 항목: 활성 `ReviewTask` 목록 (`completed: false`) + 최근 완료된 항목
- `HomeLearningState`에 `weaknessProgressItems` 추가:

```typescript
type WeaknessProgressItem = {
  weaknessId: WeaknessId;
  topicLabel: string;        // 단원명 (수열, 미분 등)
  weaknessLabel: string;     // diagnosisMap[id].labelKo
  stage: ReviewStage;
  completed: boolean;
};
```

---

## 데이터 모델 변경

### `HomeLearningState` 추가 필드

```typescript
weaknessProgressItems: WeaknessProgressItem[];  // 최대 3개
resolvedWeaknessHistory: Array<{
  weekLabel: string;   // '1주차', '2주차', '지금'
  count: number;
}>;                                              // 최대 3개 포인트
```

### `diagnosisMap` 항목 확장

각 `WeaknessId`에 `topicLabel` 필드 추가:
```typescript
type DiagnosisEntry = {
  id: WeaknessId;
  labelKo: string;
  topicLabel: string;  // '수열', '미분', '적분', '극한', '확률', '기하' 등
  desc: string;
};
```

---

## 신규 컴포넌트

| 컴포넌트 | 파일 | 역할 |
|----------|------|------|
| `HomeWeaknessSection` | `features/quiz/components/home-weakness-section.tsx` | 전체 섹션 wrapper (친구칩 + 그래프 + 목록) |
| `WeaknessGrowthChart` | `features/quiz/components/weakness-growth-chart.tsx` | 해결 수 막대 그래프 |
| `WeaknessProgressItem` | `features/quiz/components/weakness-progress-item.tsx` | 개별 약점 항목 |

---

## 변경 파일 예상

| 파일 | 변경 내용 |
|------|-----------|
| `data/diagnosisMap.ts` | `topicLabel` 필드 추가 |
| `features/learning/types.ts` | `WeaknessProgressItem` 타입 추가 |
| `features/learning/home-state.ts` | `weaknessProgressItems`, `resolvedWeaknessHistory` 빌드 로직 추가 |
| `features/quiz/components/quiz-hub-screen-view.tsx` | `HomeWeaknessSection` 렌더링 추가, 레이아웃 조정 |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | 필요시 핸들러 추가 |
| `features/quiz/components/home-weakness-section.tsx` | 신규 |
| `features/quiz/components/weakness-growth-chart.tsx` | 신규 |
| `features/quiz/components/weakness-progress-item.tsx` | 신규 |

---

## 엣지 케이스

| 상황 | 처리 |
|------|------|
| 진단 미완료 | 섹션 전체 숨김 |
| 약점 없음 (모두 완료) | 완료된 항목 최대 3개 표시 |
| 친구 데이터 없음 | 친구 칩 숨김 (빈 공간 없음) |
| 해결된 약점 0개 | 막대 1개(0) + ghost 2개 + CTA |
| `practiceGraduatedAt` 있음 | 섹션 표시 여부 별도 검토 (현재 스코프 외) |

---

## 미결 사항 (Future)

- 약점 섹션에서 약점 항목 탭 시 해당 약점 상세/재복습으로 이동하는 딥링크
- 친구 칩 탭 시 같이 복습 중인 학생 목록 표시
- Firestore 기반 피어 프레즌스 실시간 연동
