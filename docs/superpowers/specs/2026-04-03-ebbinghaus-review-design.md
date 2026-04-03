# Ebbinghaus Review — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Goal

에빙하우스 망각곡선 기반 복습 시스템을 구축한다. 진단에서 틀린 약점별로 복습 카드를 생성하고, day1 → day3 → day7 → day30 간격으로 스케줄링한다. 복습 화면은 한 단계씩 사고 흐름을 보여주며, 사용자가 각 단계에서 자유롭게 생각을 입력하면 OpenAI가 보완 피드백을 준다.

## Background

- `ReviewStage = 'day1' | 'day3' | 'day7' | 'day30'` 이미 정의됨 (`features/learning/history-types.ts`)
- `ReviewTask` 타입 이미 존재 (`features/learning/types.ts`) — `scheduledFor`, `stage`, `completed`, `weaknessId` 포함
- `LocalReviewTaskStore` 이미 존재 (`features/learning/review-task-store.ts`) — AsyncStorage 기반
- `dueReviewTasks` 이미 여정 상태에 연결됨 (`features/learning/home-journey-state.ts`)
- `review-content-map.ts` — 약점별 `heroPrompt` 이미 존재. 사고 흐름 단계 데이터 추가 필요
- OpenAI 연동 이미 존재 (`functions/src/openai-client.ts`)

## 확정된 설계

### 1. 홈 카드 (에빙하우스 긴장감)

due 복습이 있을 때만 홈 화면에 등장한다.

```
┌─────────────────────────────────┐
│ 🔴 오늘 안 하면 리셋              │
│ 판별식, 기억 사라지는 중           │
│ 기억 유지율 ████░░░░ 38%         │
│ [지금 복습해서 기억 살리기 →]     │
└─────────────────────────────────┘
```

- 기억 유지율(%) = stage별 고정값: day1→70%, day3→50%, day7→35%, day30→20%
- 위치: 여정 보드 아래, due 복습 있을 때만 표시

### 2. 복습 화면 흐름

```
홈 카드 탭
  → 복습 화면 진입
    → 10초 타이머 자동 시작 (버튼 비활성)
      → 10초 후 "사고 흐름 시작" 버튼 활성화
        → 단계 1 표시
          → 하단 자유 입력창 ("이 단계 보고 떠오른 생각 써보세요")
            → 입력 후 "확인" 탭
              → OpenAI 분석 → 보완 피드백 표시 (짧게, 긍정적으로)
                → "다음 단계 →" 자동 활성화
            → 입력 없이 "건너뛰기" 탭 → 그냥 다음 단계
          → 단계 2, 3 반복
        → 모든 단계 완료 후
          → "기억남 ✓" / "다시 볼게요" 선택
```

### 3. AI 피드백 원칙

- 틀렸다고 말하지 않는다
- "좋은 방향이에요! 여기에 [핵심 포인트]도 더하면 완벽해요" 형식
- 짧게 (2-3문장 이내)
- 입력이 없으면 AI 호출 없이 건너뜀

### 4. 에빙하우스 스케줄링

진단/연습 완료 시 틀린 약점별 ReviewTask 생성:

| 액션 | 결과 |
|------|------|
| "기억남 ✓" | 다음 stage로 진행 (day1→day3→day7→day30→완료) |
| "다시 볼게요" | 현재 stage 유지 (같은 간격 후 재등장) |
| 기한 초과 (1단계 하락) | day7→day3, day3→day1, day1→day1 유지 |

기한 초과 감지: 앱 진입 시 `scheduledFor` < 오늘 날짜인 task를 확인해 stage 하락 처리.

### 5. 사고 흐름 콘텐츠

`review-content-map.ts`를 확장해 약점별 단계별 사고 흐름을 추가:

```ts
type ReviewContent = {
  heroPrompt: string;
  thinkingSteps: Array<{
    title: string;
    body: string;
  }>;
};
```

초기 구현은 기존 고1 약점 23개에 대해 단계 데이터를 추가. 고3 약점은 추후 확장.

## 변경 파일

| 파일 | 변경 종류 | 내용 |
|------|----------|------|
| `data/review-content-map.ts` | Modify | `thinkingSteps` 필드 추가, 고1 약점별 단계 데이터 작성 |
| `features/learning/review-scheduler.ts` | Create | ReviewTask 생성, stage 진행, 기한 초과 감지 로직 |
| `features/quiz/components/review-home-card.tsx` | Create | 홈 카드 UI (기억 유지율 바, 긴장감 메시지) |
| `features/quiz/components/review-session-screen-view.tsx` | Create | 복습 화면 뷰 (타이머, 단계별 사고 흐름, 입력창, AI 피드백) |
| `features/quiz/hooks/use-review-session-screen.ts` | Create | 복습 화면 로직 (타이머, 단계 진행, OpenAI 호출) |
| `app/(tabs)/quiz/review-session.tsx` | Create | 복습 화면 라우트 |
| `features/quiz/components/quiz-hub-screen-view.tsx` | Modify | 홈 카드 조건부 렌더링 추가 |
| `features/quiz/hooks/use-quiz-hub-screen.ts` | Modify | dueReviewTasks 기반 카드 노출 로직 추가 |

## Out of Scope

- 고3 약점별 사고 흐름 콘텐츠 (추후)
- 복습 완료 후 통계/히스토리 화면
- Firebase 기반 ReviewTask 원격 동기화 (현재 로컬만)
- Push 알림 ("오늘 복습이 있어요")
- 입력 내용 저장/히스토리

## Future

- OpenAI 호출을 Cloud Functions로 이전 (현재 클라이언트 직접 호출)
- 고3 약점 사고 흐름 콘텐츠 추가
- 복습 완료율 통계 화면
- Push 알림 연동
