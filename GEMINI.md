# GEMINI.md

이 저장소에서 작업할 때 다음을 반드시 수행하세요.

1. 시작 알림: `npm run notify:start -- "<요청 요약>"`
웹훅은 `SLACK_WEBHOOK_URL` 또는 `~/.config/dasida/slack-webhook`에서 읽습니다.
필요하면 `AI_AGENT_NAME=Gemini`를 지정합니다.

2. 종료 알림:
- 성공: `npm run notify:done -- "<변경/테스트 요약>"`
- 실패: `npm run notify:fail -- "<실패 원인>"`

3. 종료 절차:
- `pre-commit`은 사용하지 않음
- 가능한 경우 `git commit -> git push origin <현재 브랜치> -> npm run log:commit`
- 개발 기록은 `docs/PROGRESS.md` 기준으로 남김

상세 운영 규약은 `docs/AI_COLLABORATION.md`를 따릅니다.
