# AI 협업 운영 규약 (Codex / Claude / Gemini 공통)

## 목적
- 어떤 AI가 작업해도 동일한 방식으로 Slack 알림과 작업 절차를 유지합니다.

## 필수 규칙
- 작업 시작 직후: `npm run notify:start -- "<요청 요약>"`
- 작업 종료 직전(성공): `npm run notify:done -- "<변경 요약>"`
- 작업 종료 직전(실패): `npm run notify:fail -- "<실패 원인>"`
- 작업이 10분 이상 길어지면 중간 진행 알림: `npm run notify:progress -- "<현재 상태>"`
- `pre-commit` 훅은 당분간 도입하지 않음
- 작업 완료 후 가능한 경우 `git commit -> git push -> npm run log:commit` 순서로 마무리

## 알림 스크립트
- 엔트리: `scripts/slack-notify.js`
- 지원 phase: `start`, `progress`, `done`, `fail`, `test`
- 웹훅 소스 우선순위
- `SLACK_WEBHOOK_URL` 환경변수
- `SLACK_WEBHOOK_URL_FILE` 환경변수로 지정한 파일
- 기본 설정 파일: `~/.config/dasida/slack-webhook`
- 에이전트 이름은 `AI_AGENT_NAME` 환경변수로 지정 가능

## 머신 설정 방법
1. 환경변수 방식
```bash
echo 'export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."' >> ~/.zshrc
echo 'export AI_AGENT_NAME="Codex"' >> ~/.zshrc
source ~/.zshrc
```
2. 머신 전역 설정 파일 방식
```bash
mkdir -p ~/.config/dasida
printf '%s\n' 'https://hooks.slack.com/services/...' > ~/.config/dasida/slack-webhook
chmod 600 ~/.config/dasida/slack-webhook
```
3. 에이전트별 이름 예시
```bash
AI_AGENT_NAME=Claude npm run notify:start -- "요청 요약"
AI_AGENT_NAME=Gemini npm run notify:done -- "작업 완료"
```

## 권장 작업 흐름
1. 요청 파악
2. `notify:start`
3. 코드/문서 수정
4. 테스트 실행
5. `git commit`
6. `git push origin <현재 브랜치>`
7. `npm run log:commit`
8. 결과 정리
9. `notify:done` 또는 `notify:fail`

## 개발 기록 원칙
- 개발 작업 정리 문서는 `docs/PROGRESS.md`
- 커밋 로그에는 해시, 브랜치, 원격명, 원격 URL, 커밋 링크를 남김
- `npm run log:commit`은 커밋 후 실행되므로 필요하면 `docs/PROGRESS.md` 반영용 문서 커밋을 별도로 추가
- 수동 작업 로그에도 필요한 경우 배포/푸시 관련 메모를 추가

## 웹훅 교체(rotate) 절차
1. Slack에서 새 Incoming Webhook 발급
2. `SLACK_WEBHOOK_URL` 또는 `~/.config/dasida/slack-webhook` 값 갱신
3. `npm run notify:test`로 송신 확인
