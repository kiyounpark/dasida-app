# AI 협업 운영 규약 (Codex / Claude / Gemini 공통)

## 목적
- 어떤 AI가 작업해도 동일한 방식으로 Slack 알림과 작업 절차를 유지합니다.

## 네이티브 빌드 필수 규칙
- 패키지 추가/변경 후 반드시 실행: `npx expo prebuild --clean`
- 시뮬레이터/디바이스 실행: `npx expo run:ios` (Xcode 직접 Run 사용 금지)
- 순서: 패키지 설치 → `npx expo prebuild --clean` → `npx expo run:ios`
- 이 규칙 미준수 시 검정화면(JS 번들 로드 실패) 발생 (2026-03-19 실제 발생)

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
3. 기본 구현은 `Codex`로 진행
4. 필요한 경우 `Claude` 검증 권장
5. 테스트 실행
6. `git commit`
7. `git push origin <현재 브랜치>`
8. `npm run log:commit`
9. 결과 정리
10. `notify:done` 또는 `notify:fail`

## Codex + Claude 운영 모델
- `Codex`: 기본 구현 도구
- `Claude`: Expo 스킬 기반 검증과 리뷰에 권장되는 도구
- `Gemini`: 보조 검토 또는 대체 검토 도구
- Codex의 Expo 스킬 활용은 네이티브 자동 훅이 아니라 저장소 문서 규칙과 스킬 파일 참조를 통해 유도합니다.
- Expo 스킬 소스오브트루스는 `.agents/skills/*`입니다.
- 코드 구조 스킬 소스오브트루스는 `.agents/skills/dasida-code-structure/SKILL.md`와 `docs/ARCHITECTURE.md`입니다.
- `Claude`는 `.claude/skills/*` 링크 경로를 통해 같은 스킬 자산을 읽습니다.

## Claude 훅 운영
- 설정 파일: `.claude/settings.json`
- 훅 스크립트: `.claude/hooks/*`
- 훅은 Claude Code 안에서만 동작하며, Codex나 Gemini 세션에는 적용되지 않습니다.
- `UserPromptSubmit`: 프롬프트 키워드와 최근 변경 파일을 기준으로 관련 Expo 스킬과 로컬 코드 구조 스킬을 함께 선택하고 Claude 문맥에 스킬 경로를 주입합니다.
- `UserPromptSubmit`: `최근 수정`, `최근 변경`, `review`, `검토`, `검증` 같은 프롬프트에서는 현재 워크트리 또는 최신 커밋 기준 변경 파일 요약도 함께 주입합니다.
- `PreToolUse`: 선택된 스킬들 중 아직 읽지 않은 `SKILL.md`가 있으면 첫 `Edit`, `MultiEdit`, `Write`, `Bash` 실행 전에 한 번 `ask`로 확인을 유도합니다.
- `SessionEnd`: 세션 종료 시 `/tmp` 아래 임시 상태 파일을 정리합니다.
- 이 훅 구성은 강제 차단이 아니라 부드러운 가이드 방식이며, 스킬을 먼저 읽게 유도하는 수준으로 운영합니다.

## Claude 훅 파일 구조
- `.claude/settings.json`
- `.claude/hooks/select-expo-skill.mjs`
- `.claude/hooks/check-expo-skill-before-tools.mjs`
- `.claude/hooks/clear-expo-skill-state.mjs`
- 런타임 상태는 레포 내부가 아니라 시스템 임시 디렉터리(`/tmp/dasida-claude-hooks`)에 저장합니다.

## Claude 훅 사용 방법
1. Claude Code를 이 저장소 루트에서 실행합니다.
2. Expo 관련 프롬프트나 코드 구조/리팩터링 프롬프트를 입력하면 `UserPromptSubmit`가 관련 스킬을 자동 라우팅합니다.
3. 최근 수정 검토 프롬프트를 입력하면 현재 워크트리 또는 최신 커밋 파일 목록과 함께 관련 Expo 스킬 + `dasida-code-structure`가 같이 안내됩니다.
4. Claude가 실제 변경을 시작하기 전에 관련 `SKILL.md`를 아직 읽지 않았다면 `PreToolUse`가 한 번 확인을 요청합니다.
5. Claude 세션을 다시 열면 최신 `.claude/settings.json` 기준으로 훅이 적용됩니다.
6. 훅 상태나 동작 확인이 필요하면 Claude Code 내부에서 `/hooks`를 확인합니다.

## Claude 검증 권장 기준
| 작업 유형 | 권장 스킬 | 검증 포인트 |
|------|------|------|
| 코드 구조 리팩터링, 커스텀 훅 분리, Thin Screen 전환 | `dasida-code-structure` | 책임 분리, route/screen/hook 경계, 파일 길이 기준, 누락된 리팩터링 |
| UI 구조 변경, 화면 구성, 네비게이션 | `building-native-ui` | 화면 흐름, 레이아웃, 네비게이션 회귀, 플랫폼별 동작 |
| API 호출, fetch, Firebase 연동, 캐싱, 에러 처리 | `native-data-fetching` | 네트워크 실패 처리, 상태 관리, 캐싱 전략, 누락된 오류 처리 |
| NativeWind 또는 Tailwind 스타일링 | `expo-tailwind-setup` | 설정 충돌, 스타일 적용 범위, 기존 UI 일관성 |
| 개발 빌드, 디바이스 테스트, TestFlight | `expo-dev-client` | 개발 빌드 필요 여부, 환경 설정, 테스트 경로 |
| EAS, 앱스토어 제출, 배포 설정 | `expo-deployment`, `expo-cicd-workflows` | 배포 단계 누락, 설정 오류, 자동화 경로 |
| Expo SDK 업그레이드, 의존성 정리 | `upgrading-expo` | 호환성, 마이그레이션 누락, 빌드 리스크 |
| WebView/DOM 기반 실행 | `use-dom` | 실행 환경 적합성, 웹 코드 경계 |
| EAS Hosting API routes | `expo-api-routes` | 라우트 구성, 서버 엔드포인트 구조 |

## Claude 검증 생략 가능한 작업
- 문서 수정
- 단순 카피 변경
- 영향 범위가 좁은 단순 수정
- Expo 스킬과 무관한 운영 정리

## 권장 검증 프롬프트 템플릿
```text
목적: 이번 변경 검증
사용 스킬: <skill-name>
변경 요약: <무엇을 바꿨는지>
변경 파일: <파일 목록>
검토 관점:
- Expo/React Native 관점의 위험
- 플랫폼별 회귀 가능성
- 누락된 테스트와 검증
```

## 최근 수정 검토 기본 프롬프트
```text
최근 수정한 내용 검토해줘.
Expo Skills와 dasida-code-structure 기준을 같이 적용해서,
최근 변경 파일 중심으로 위험, 회귀, 누락 테스트를 먼저 봐줘.
```

## 비용 최적화 원칙
- 모든 작업에 `Claude`를 붙이지 않습니다.
- 기본 구현은 `Codex`로 진행합니다.
- Expo 리스크가 큰 변경에서만 `Claude` 검증을 선택적으로 권장합니다.
- `Claude` 검증은 권장 규칙이며 필수는 아닙니다.
- 코드 구조 리팩터링은 `docs/ARCHITECTURE.md`와 로컬 구조 스킬을 기본 기준으로 삼고, 필요할 때만 Claude 검증을 추가합니다.

## 개발 기록 원칙
- 개발 작업 정리 문서는 `docs/PROGRESS.md`
- 커밋 로그에는 해시, 브랜치, 원격명, 원격 URL, 커밋 링크를 남김
- `npm run log:commit`은 커밋 후 실행되므로 필요하면 `docs/PROGRESS.md` 반영용 문서 커밋을 별도로 추가
- 수동 작업 로그에도 필요한 경우 배포/푸시 관련 메모를 추가

## 웹훅 교체(rotate) 절차
1. Slack에서 새 Incoming Webhook 발급
2. `SLACK_WEBHOOK_URL` 또는 `~/.config/dasida/slack-webhook` 값 갱신
3. `npm run notify:test`로 송신 확인
