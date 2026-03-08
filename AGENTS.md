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

## Expo Skills
이 프로젝트는 레포 내부 `.agents/skills/`에 설치된 Expo Skills를 사용합니다.
Expo/React Native 관련 요청이 들어오면 에이전트는 사용자 지시가 없어도 작업 유형에 맞는 `SKILL.md`를 먼저 확인해야 합니다.
여러 스킬이 동시에 관련되면 가장 직접적인 스킬을 먼저 적용하고, 필요한 경우에만 최소 개수로 추가합니다.

### 자동 적용 규칙
- UI 화면 구성, 라우팅, 네비게이션, 컴포넌트, 애니메이션, 레이아웃 작업: `.agents/skills/building-native-ui/SKILL.md`
- API 호출, fetch, Firebase 연동, 로딩/에러 처리, 캐싱, 네트워크 디버깅: `.agents/skills/native-data-fetching/SKILL.md`
- NativeWind 또는 Tailwind 스타일링 작업: `.agents/skills/expo-tailwind-setup/SKILL.md`
- 개발 빌드, 디바이스 테스트, TestFlight 관련 작업: `.agents/skills/expo-dev-client/SKILL.md`
- 앱스토어 제출, 배포 준비, 스토어 설정 작업: `.agents/skills/expo-deployment/SKILL.md`
- GitHub Actions, EAS 자동화, 배포 파이프라인 작업: `.agents/skills/expo-cicd-workflows/SKILL.md`
- Expo SDK 버전 업그레이드, 의존성 정리, 마이그레이션 작업: `.agents/skills/upgrading-expo/SKILL.md`
- 웹 코드를 앱 내부 웹뷰 또는 DOM 기반으로 실행하는 작업: `.agents/skills/use-dom/SKILL.md`
- EAS Hosting API 라우트 생성 및 서버 엔드포인트 작업: `.agents/skills/expo-api-routes/SKILL.md`

### 적용 방식
- 스킬을 쓰기로 판단하면 해당 `SKILL.md`를 먼저 열고, 필요한 `references/`만 추가로 확인합니다.
- 스킬 지침과 기존 코드베이스 패턴이 충돌하면, 사용자 요구사항과 현재 저장소 구조에 맞는 쪽을 우선합니다.
- 사용자가 스킬 이름을 직접 언급하면 그 스킬을 우선 적용합니다.
