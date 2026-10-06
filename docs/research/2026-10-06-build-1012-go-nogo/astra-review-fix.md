# astra — 고친 커밋 44d3892f·11c08a99 리뷰 (2026-10-06 밤, gpt-6-astra 77,013토큰)

반드시 고칠 것: 1건 — 홈의 늦은 저장이 복습 완료를 되돌리고 다음 과제를 삭제할 수 있습니다.

- `44d3892f`: 복습 화면은 **자신이 호출한 내림만** 기다립니다. 홈의 내림과 실행을 공유하지 않습니다. 근거: [use-review-session-screen.ts:222](features/quiz/hooks/use-review-session-screen.ts#L222), [use-quiz-hub-screen.ts:107](features/quiz/hooks/use-quiz-hub-screen.ts#L107).
- 재현 순서: 홈이 옛 day7을 읽고 저장 지연 → 복습 화면이 day3으로 내림 → 복습 완료로 day3 완료·다음 day7 생성 → 홈의 지연된 저장 도착.
- 실제 스케줄러를 메모리 저장소로 실행해 **day3 미완료로 복귀·다음 day7 소실**을 확인했습니다. 전체 목록 저장이며 서버도 빠진 ID를 삭제합니다. 근거: [review-scheduler.ts:163](features/learning/review-scheduler.ts#L163), [learning-history.ts:1159](functions/src/learning-history.ts#L1159).
- 수정: 계정별 진행 중인 내림 작업을 홈·복습 화면이 공유하고, 저장까지 함께 기다리도록 해야 합니다. 순차 호출의 멱등성만으로는 부족합니다.

그 외 정상 진입·노트 분기·완료본 제외에서 필수 수정은 찾지 못했습니다. `11c08a99`의 버전 변경도 적절합니다.
파일 수정 없음. 기존 테스트는 재실행하지 않았고, 위 재현은 메모리에서만 수행했습니다.
