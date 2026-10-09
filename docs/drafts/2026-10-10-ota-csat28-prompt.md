# OTA — 26수능 28번 객관식 고침 (새 방에 붙여 넣을 프롬프트)

> 10.09 오전 관제탑이 씀. **돌리는 때 = 10.10 18:00 주간 한도 리셋 뒤**(10.09는 한도 95% 직전이라 21시 쇼츠 올리기가 먼저).
> 누르기 전에 기윤 OK를 받는다(학생에게 가는 변경). STATUS 16줄(28번 고침)·15줄(두 스토어 1.0.13)·20줄 ⑴(OTA 다시 낼 때)이 근거.

```text
OTA 방입니다. 26수능 28번 데이터 고침 하나를 1.0.13 설치본에 OTA로 보냅니다.
누르는 건 기윤 OK 뒤입니다. 그 전까지는 확인만 합니다.

【배경】
- 1.0.13이 두 스토어에 떴다(안드 10.08 17:58 · 애플 10.09 09:3x Ready for Distribution) — docs/STATUS.md 15줄.
- 28번 고침 `1179f887`: data/exam/g3-calc-csat-2025/problems.json 28번 type만 short_answer → multiple_choice(정답 ⑤ 그대로).
  1.0.13 빌드(main ff88e337)엔 안 들어갔다 — STATUS 16줄.
- 10.09 관제탑 확인: `git diff --stat ff88e337..main -- . ':!docs'` = problems.json(28번) + scripts/play-track.js(앱에 안 실림)뿐.

【누르기 전 확인 — 전부 main 폴더에서】
1. main이 최신이고 깨끗한지(git status). 메인 폴더는 main 그대로 둔다.
2. 위 diff를 다시 돌려 앱 쪽 변경이 28번 하나뿐인지. 그 사이 다른 코드가 main에 들어왔으면 멈추고 보고.
   (Codex 브랜치 codex/weakness-cta · codex/notif-null-test는 리뷰 전이라 main에 없어야 한다.)
3. app.config.js의 version = 1.0.13 인지(runtimeVersion이 appVersion 정책 — 이 숫자 설치본에만 간다).
4. 파일 수 한도: 플랫폼별 `./node_modules/.bin/expo export --dump-assetmap` + `assets:verify`로 묶음 파일 수가
   서버 한도 1,000 아래인지(10.08 첫 OTA 41·42개). 방법 = ~/dev/dasida-measure/2026-10-08-ota-asset-patterns/
   · Claude 메모리 「OTA는 파일 1,000개 한도」. (npx expo는 rtk가 가로챈다 — ./node_modules/.bin/expo)
5. 여기까지 결과를 기윤에게 보여주고 「눌러」 OK를 받는다.

【누르기】
npm run ota:production -- --message "26수능 28번 객관식으로 (1179f887)"
- 찍히는 「loaded from the "production" environment on EAS: …」 줄에 EXPO_PUBLIC_POSTHOG_API_KEY가 있는지 본다.
- 날것 `eas update`는 쓰지 않는다(CLAUDE.md 3번 — 로컬 .env로 묶여 값 13개가 다르다).

【누른 뒤】
- 기윤 폰(스토어판 1.0.13): 앱 두 번 껐다 켜기 → 설정에 「업데이트 xxxxxxxx」 → 기출 26수능 28번이 보기 ①~⑤로 뜨는지.
- 되돌리기가 필요하면: eas update:roll-back-to-embedded --channel production
- STATUS 16줄에 발행 시각·그룹 ID·폰 확인을 적고, 끝난 줄은 archive로(STATUS 갱신 규칙).

【보내지 않는 곳】
- 1.0.12 설치본엔 안 보낸다(CLAUDE.md 3번 기본값 — 사진→노트 흐름 끊김·저장 실패급 큰 버그가 아님).
```
