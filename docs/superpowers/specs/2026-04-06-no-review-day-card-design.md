# 비복습 날 홈 카드 설계

**날짜:** 2026-04-06
**상태:** 승인됨

---

## 배경

에빙하우스 복습 스케줄 상 오늘 due인 복습이 없는 날, 홈 화면에 아무 안내도 없이 여정 보드만 표시된다. 여정 보드는 온보딩 가이드 역할이라 복습 사이클 진입 후에는 불필요하며, "복습 없는 날"에 사용자가 무엇을 해야 할지 알 수 없다.

---

## 설계 목표

1. 복습 사이클 진입 시 여정 보드를 숨긴다.
2. 복습 없는 날에 "오늘은 쉬어도 됩니다" 메시지와 모의고사 추천을 보여준다.
3. 개발 익명 모드(dev guest)에서도 동일하게 동작한다.

---

## 화면 상태 정의

### 여정 보드 표시 조건 변경

| 조건 | 현재 | 변경 후 |
|------|------|---------|
| `practiceGraduatedAt` 없음, 복습 태스크 없음 | 표시 | 표시 |
| `practiceGraduatedAt` 없음, 복습 태스크 있음 | 표시 | **숨김** |
| `practiceGraduatedAt` 있음 | 숨김 | 숨김 |

**변경 전:**
```tsx
{!profile?.practiceGraduatedAt ? <JourneyBoard ... /> : null}
```

**변경 후:**
```tsx
{!profile?.practiceGraduatedAt && !homeState?.nextReviewTask ? <JourneyBoard ... /> : null}
```

`nextReviewTask`는 오늘 due 여부와 무관하게 예약된 복습 태스크가 하나라도 있으면 존재한다. 복습 태스크가 생긴 시점이 온보딩 여정의 종료 시점이다.

### 전체 홈 화면 상태표

| 상태 | 표시 요소 |
|------|-----------|
| 복습 태스크 없음 (온보딩 중) | JourneyBoard |
| 복습 있는 날 (`dueReviewTasks.length > 0`) | ReviewHomeCard |
| **복습 없는 날** (`nextReviewTask` 있음, `dueReviewTasks` 없음) | **비복습 날 카드** |
| `practiceGraduatedAt` 있음 | MockExamIntroScreen (기존 분기) |

---

## 비복습 날 카드 UI (Option C)

### 표시 조건

```
homeState.nextReviewTask !== undefined
&& homeState.dueReviewTasks.length === 0
&& !profile.practiceGraduatedAt
```

### 구성

**상단 pill (작은 알림)**
- 텍스트: `"오늘은 복습 없는 날이에요 · 다음 복습 D-{N}"`
- D-N: `nextReviewTask.scheduledFor`와 오늘 날짜 차이 (일 단위)
- 기존 `AuthNotice`와 동일한 pill 스타일 재사용

**모의고사 추천 카드**
- 배경: 다크 (`#1C2C19`)
- 태그: `"오늘 복습 없음 · 실력 확인 추천"`
- 제목: `"잠깐 실력 확인해볼까요?"`
- 본문: `"복습 사이 여유 있을 때 풀어보면 성장 곡선이 보입니다."`
- CTA 버튼: `"모의고사 시작하기"` → `/(tabs)/quiz/exams`

### 데이터 소스

| 항목 | 출처 |
|------|------|
| 오늘 복습 여부 | `homeState.dueReviewTasks.length` |
| 다음 복습 날짜 | `homeState.nextReviewTask.scheduledFor` |
| 복습 사이클 여부 | `homeState.nextReviewTask` 존재 유무 |
| 졸업 여부 | `profile.practiceGraduatedAt` |

모든 데이터는 `LocalReviewTaskStore` (AsyncStorage) 기반으로, Firestore 연결 없이 동작한다. 개발 익명 모드 시드에서도 정상 동작한다.

> **엣지 케이스:** 모든 복습 태스크가 완료된 경우 `nextReviewTask`가 `undefined`가 되어 JourneyBoard가 다시 표시될 수 있다. 이 상태는 사실상 `practiceGraduatedAt`이 설정되어야 할 시점이므로, 졸업 버튼 흐름이 올바르게 동작하면 발생하지 않는다.

---

## 개발 모드 동작

dev guest 시드별 기대 동작:

| 시드 상태 | nextReviewTask | dueReviewTasks | 표시 |
|-----------|---------------|----------------|------|
| `fresh` | 없음 | 없음 | JourneyBoard |
| `day1` (오늘 복습) | 있음 | 있음 | ReviewHomeCard |
| `day3` (복습 예정) | 있음 | 없음 | **비복습 날 카드** |
| `day7` (복습 예정) | 있음 | 없음 | **비복습 날 카드** |
| `practice-graduated` | — | — | MockExamIntroScreen |

---

## 변경 파일 예상

- `features/quiz/components/quiz-hub-screen-view.tsx` — JourneyBoard 조건 변경, 비복습 날 카드 컴포넌트 추가
- `features/quiz/components/no-review-day-card.tsx` (신규) — 비복습 날 카드 컴포넌트
- `features/quiz/hooks/use-quiz-hub-screen.ts` — `onPressExam` 핸들러 추가

---

## 미결 사항 (Future)

### B: 로그인 유저 복습 데이터 Firestore 동기화

**배경:** 현재 `LocalReviewTaskStore`는 AsyncStorage 전용으로 기기 간 동기화가 없다. 모바일 ↔ 태블릿 멀티 디바이스 사용 시 복습 기록이 공유되지 않는다.

**필요 작업:**
- 로그인 상태에서 `ReviewTask`를 Firestore에 저장/조회하는 구현 추가
- `LocalReviewTaskStore` → Firestore 기반 구현 또는 hybrid sync 레이어
- 오프라인 대응 전략 (로컬 우선 + 백그라운드 동기화)

**우선순위:** 멀티 디바이스 지원이 필요한 시점에 별도 브레인스토밍 세션으로 설계.
