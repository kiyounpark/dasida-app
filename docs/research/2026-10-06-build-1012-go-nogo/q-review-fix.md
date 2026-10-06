작업 폴더(git worktree): `/Users/baggiyun/dev/dasida-app/.claude/worktrees/notif-optin` — 브랜치 notif-optin.

커밋 두 개만 리뷰해라: `44d3892f`(알림 옛 id로 복습에 들어올 때) · `11c08a99`(1.0.12 버전). 파일은 읽기만 한다. 아무것도 고치지 않는다.
- 보는 법: `/usr/bin/git show 44d3892f` · `/usr/bin/git show 11c08a99`(rtk가 `git show`를 줄이니 이 경로로). 바뀐 파일 주변은 직접 열어 봐라.
- 배경: 1.0.12 go/no-go에서 astra가 찾고 Fable 2차가 「빌드 전 반드시」로 정한 버그 — 원문 `docs/research/2026-10-06-build-1012-go-nogo/`(astra-go-nogo.md · fable-go-nogo-1.md). 고치는 모양도 Fable 최종: 복습 화면이 찾기 전에 `stepDownMissedReviewTasks`를 먼저 await → 정확한 미완료 id → 같은 계열(끝 `__단계`만 다른) 미완료 → 없으면 `router.replace('/(tabs)/quiz')`.
- 앞 커밋들은 리뷰가 끝났다 — 다시 보지 마라.

묻는 것: 이 두 커밋에 **「반드시 고칠 것」**이 있나 — 예: 정상 진입(홈 카드·체인 다음 과제)이 홈으로 튕김, 노트 과제(weaknessId null) 경로가 깨짐, 내림이 두 번 돌아 두 칸 내려감, 홈과 복습 화면이 동시에 저장해 서로 덮어 과제가 사라짐, 같은 id 완료본을 다시 풂, 버전이 빌드에 안 들어감. 없으면 첫 줄에 「반드시 고칠 것: 없음」이라고 그대로 써라. 권고는 세 줄 안. 근거는 파일:줄. 한국어 15줄 안.

Claude가 이미 본 것: tsc 0 · quiz·learning jest 464/464(새 테스트 5개) · `expo config --type public`에서 version 1.0.12.
