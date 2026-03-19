# CLAUDE.md

이 저장소에서 Claude는 Expo/React Native 변경의 검증과 리뷰를 우선 담당합니다.

1. 시작 알림: `npm run notify:start -- "<요청 요약>"`
웹훅은 `SLACK_WEBHOOK_URL` 또는 `~/.config/dasida/slack-webhook`에서 읽습니다.
필요하면 `AI_AGENT_NAME=Claude`를 지정합니다.

2. 기본 역할
- 기본 구현 도구는 `Codex`이며, Claude는 Expo 스킬 기반 검증과 리뷰를 권장되는 방식으로 수행합니다.
- Expo 관련 리뷰 시 `.claude/skills/*` 링크 경로를 먼저 확인하고, 실제 스킬 소스는 `.agents/skills/*`를 기준으로 봅니다.
- 코드 구조/리팩터링/커스텀 훅 분리 작업은 `.claude/skills/dasida-code-structure/SKILL.md`와 `docs/ARCHITECTURE.md`를 먼저 확인합니다.
- 이 저장소에는 `.claude/settings.json` 기반 Claude 훅이 포함되어 있으며, `UserPromptSubmit`가 관련 Expo 스킬을 자동 제안하고 `PreToolUse`가 첫 `Edit|Write|Bash` 전에 스킬 확인을 한 번 유도합니다.
- 작은 문서 수정, 단순 텍스트 수정, 영향 범위가 좁은 단순 수정에는 Claude 검증을 생략할 수 있습니다.

3. 네이티브 빌드 규칙 (필수)
- **패키지 추가/변경 후에는 반드시**: `npx expo prebuild --clean`
- **시뮬레이터 실행은**: `npx expo run:ios` (Xcode 직접 Run 금지)
- 순서: 패키지 설치 → `npx expo prebuild --clean` → `npx expo run:ios`
- 이 규칙을 어기면 검정화면(JS 번들 로드 실패) 발생

4. 검증이 권장되는 작업
- 코드 구조 리팩터링, Thin Screen 전환, custom hook 분리
- UI 구조 변경, 네비게이션 변경
- API 호출, Firebase 연동, 캐싱, 에러 처리 변경
- Expo SDK 업그레이드
- 개발 빌드, TestFlight, EAS, 앱스토어 배포 설정 변경
- 네이티브 의존성 또는 빌드 설정 변경

4. 리뷰 초점
- Expo/React Native 관점의 버그와 플랫폼 회귀 위험
- 네비게이션, 빌드, 배포 영향
- 누락된 테스트와 검증 항목
- 스킬 지침 위반 여부

5. 권장 리뷰 프롬프트
```text
목적: 이번 변경 검증
사용 스킬: <skill-name>
변경 요약: <무엇을 바꿨는지>
리뷰 범위: <파일 목록>
중점 확인:
- Expo/React Native 관점의 위험
- 플랫폼별 회귀 가능성
- 누락된 테스트와 검증
```

6. Claude 훅 운영
- 설정 파일: `.claude/settings.json`
- 훅 스크립트: `.claude/hooks/select-expo-skill.mjs`, `.claude/hooks/check-expo-skill-before-tools.mjs`
- `UserPromptSubmit`: 프롬프트 키워드로 관련 Expo 또는 로컬 구조 스킬을 자동 라우팅
- `PreToolUse`: 선택된 스킬을 아직 읽지 않은 상태에서 첫 변경/실행 시 한 번 `ask`
- `SessionEnd`: 세션 종료 시 임시 상태를 정리
- 훅은 Claude Code 안에서만 동작하며, 변경 후에는 Claude 세션을 다시 열어 적용 상태를 확인합니다.

7. 종료 알림:
- 성공: `npm run notify:done -- "<변경/테스트 요약>"`
- 실패: `npm run notify:fail -- "<실패 원인>"`

8. 종료 절차:
- `pre-commit`은 사용하지 않음
- 가능한 경우 `git commit -> git push origin <현재 브랜치> -> npm run log:commit`
- 개발 기록은 `docs/PROGRESS.md` 기준으로 남김

상세 운영 규약은 `docs/AI_COLLABORATION.md`를 따릅니다.
