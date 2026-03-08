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
기본 구현 도구는 `Codex`이며, Expo/React Native 관련 요청에서는 문서 규칙에 따라 대응 `SKILL.md`를 먼저 확인합니다.
Codex의 Expo 스킬 활용은 네이티브 자동 훅이 아니라 문서 규칙 기반입니다.
Expo 리스크가 큰 변경은 `Claude Code CLI`로 검증하는 것을 권장하며, `Gemini`는 보조 검토 또는 대체 검토 도구로 사용합니다.

### 스킬 확인 규칙
- UI 화면 구성, 라우팅, 네비게이션, 컴포넌트, 애니메이션, 레이아웃 작업: `.agents/skills/building-native-ui/SKILL.md`
- API 호출, fetch, Firebase 연동, 로딩/에러 처리, 캐싱, 네트워크 디버깅: `.agents/skills/native-data-fetching/SKILL.md`
- NativeWind 또는 Tailwind 스타일링 작업: `.agents/skills/expo-tailwind-setup/SKILL.md`
- 개발 빌드, 디바이스 테스트, TestFlight 관련 작업: `.agents/skills/expo-dev-client/SKILL.md`
- 앱스토어 제출, 배포 준비, 스토어 설정 작업: `.agents/skills/expo-deployment/SKILL.md`
- GitHub Actions, EAS 자동화, 배포 파이프라인 작업: `.agents/skills/expo-cicd-workflows/SKILL.md`
- Expo SDK 버전 업그레이드, 의존성 정리, 마이그레이션 작업: `.agents/skills/upgrading-expo/SKILL.md`
- 웹 코드를 앱 내부 웹뷰 또는 DOM 기반으로 실행하는 작업: `.agents/skills/use-dom/SKILL.md`
- EAS Hosting API 라우트 생성 및 서버 엔드포인트 작업: `.agents/skills/expo-api-routes/SKILL.md`

### Claude 검증 권장 작업
- UI 구조 변경
- 네비게이션 또는 라우팅 변경
- API 호출, Firebase 연동, 캐싱, 에러 처리 변경
- Expo SDK 업그레이드
- 개발 빌드, TestFlight, EAS, 앱스토어 배포 설정 변경
- 네이티브 의존성 또는 빌드 설정 변경

### Claude 검증 생략 가능 작업
- 문서 수정
- 텍스트 또는 카피 수정
- 영향 범위가 좁은 단순 수정
- Expo 스킬과 무관한 운영 정리

### 적용 방식
- 기본 구현은 `Codex`가 수행합니다.
- 관련 작업에서는 대응 `SKILL.md`와 필요한 `references/`를 먼저 확인합니다.
- `Claude` 검증은 권장 규칙이며 필수는 아닙니다.
- `Claude` 검증이 필요한 경우에는 Expo/React Native 관점의 회귀 위험, 빌드 영향, 누락된 테스트를 중점 확인합니다.
- `Gemini`는 보조 검토 또는 대체 검토 도구로 사용합니다.
- 사용자가 스킬 이름을 직접 언급하면 그 스킬을 우선 적용합니다.
