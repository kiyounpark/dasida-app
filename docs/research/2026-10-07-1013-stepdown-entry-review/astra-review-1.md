# astra — 리뷰 `3d9ffba` (2026-10-07 오후 · 맥 · gpt-6-astra · 37,856토큰)

질문 = 같은 폴더 `q-review.md`(첫 줄 작업 폴더만 맥 worktree 경로로). codex stderr `model: gpt-6-astra` 확인.

---

반드시 고칠 것: 1개 — [P2] 날짜 기준 불일치로 정상 홈 진입이 튕깁니다.

- 새 필터는 기기 날짜를 사용합니다: `features/learning/review-chain.ts:7`, `features/quiz/hooks/use-review-session-screen.ts:112`.
- 서버 홈 due는 KST 기준입니다: `functions/src/learning-history.ts:548`. 이 목록을 홈이 그대로 표시합니다: `features/learning/home-today-state.ts:35`.
- 예: KST 10/7 01:00·기기 UTC 10/6 16:00에 `scheduledFor=2026-10-07T00:00:00.000Z`인 미완료 과제는 홈에 뜨지만, 누르면 새 필터에서 제외되어 홈으로 돌아갑니다: `features/quiz/hooks/use-review-session-screen.ts:231`.
- 기존 날짜 불일치를 이번 필터가 **정상 진입 차단으로 바꾼 회귀**입니다. 홈 due·진입·체인의 날짜 기준을 통일해야 합니다.

나머지 검토에서는 반드시 고칠 문제를 찾지 못했습니다.
- 홈·복습은 실제로 같은 provider store를 사용합니다: `features/learner/provider.tsx:62`, `:351`.
- Promise는 성공·거부 모두 `finally`로 제거되고, 화면 취소는 공유 작업을 취소하지 않습니다: `features/learning/review-scheduler.ts:138`, `features/quiz/hooks/use-review-session-screen.ts:260`.
- 완료본은 제외하며 노트 분기도 유지됩니다: `features/quiz/hooks/use-review-session-screen.ts:112`, `:237`. 체인의 날짜 조건도 새 필터와 같습니다: `features/learning/review-chain.ts:33`.

코드 읽기만 수행했습니다. 테스트·기기 검증은 재실행하지 않았습니다.
