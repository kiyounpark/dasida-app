# AGENTS.md

이 저장소에서 작업하는 모든 에이전트는 아래 규약을 반드시 따릅니다.

1. 작업 시작 시 Slack 알림 전송
- `npm run notify:start -- "<요청 요약>"`
- 웹훅은 `SLACK_WEBHOOK_URL` 또는 `~/.config/dasida/slack-webhook`에서 읽습니다.
- 필요하면 `AI_AGENT_NAME`으로 알림 발신 이름을 지정합니다.

2. 작업 완료 시 Slack 알림 전송
- 성공: `npm run notify:done -- "<변경/테스트 요약>"`
- 실패: `npm run notify:fail -- "<실패 원인>"`

3. 작업 종료 절차
- `pre-commit` 훅은 당분간 사용하지 않습니다.
- 가능한 경우 `git commit -> git push origin <현재 브랜치> -> npm run log:commit` 순서로 마무리합니다.
- 개발 작업 정리 문서는 `docs/PROGRESS.md`이며 원격 URL/커밋 링크가 남아야 합니다.

4. 공통 운영 문서
- 상세 절차는 `docs/AI_COLLABORATION.md`를 단일 소스오브트루스로 사용합니다.
