# 첫 OTA 묶음 환경값 — 스토어 1.0.12와 같게 누르는 법 (10.07 · astra·Fable → Fable 최종)

## 결론 먼저

- **날것 `eas update`는 쓰지 않는다.** 로컬 `.env.local`·`.env`로 묶여 코드가 쓰는 `EXPO_PUBLIC_*` 28개 중 13개가 스토어판과 다르다 —
  안드 구글 로그인 ID · GA4 키 4개(스토어판엔 없어 꺼져 있는데 켜짐) · 학습 기록 주소 8개(run.app 주소, 같은 함수일 것 — 짐작).
  SDK 54라 eas-cli가 환경을 묻지도 않는다.
- `--environment production`만 붙이면 EAS 서버 값만 쓰고 `.env`는 끈다 — 그런데 **PostHog 두 값은 `eas.json`에만 있어서 빠졌다**(10.12 숫자 세는 주에 PostHog 끊김).
  그리고 맥 셸에 `EXPO_PUBLIC_*`가 깔려 있으면 그것도 섞인다(astra 지적 — `expoCli.js:83-86`).
- **결정(Fable 2차 최종, astra 지적 받아들임)**: ⑴ EAS 서버 production에 PostHog 두 값을 넣는다(plain text, `eas.json`과 글자 그대로)
  ⑵ `package.json` `ota:production` = 셸의 `EXPO_PUBLIC_*`를 벗기고 `eas update --channel production --environment production`.
  누를 땐 `npm run ota:production -- --message "..."` · 찍히는 「loaded from the "production" environment on EAS: …」 줄에 PostHog 키 이름이 있는지 본다.
- **10.07 한 것**: ⑴ `eas env:create` 2개(서버 변수 22→24 · 해시가 스토어 값과 같음) ⑵ 스크립트 ⑶ `CLAUDE.md` 3번 OTA 규칙에 한 줄.
  스크립트와 같은 조건(셸 벗김 + 서버 값 + `EXPO_NO_DOTENV=1`)으로 `expo export`를 떠서 묶음 대조 — 결과는 STATUS PR #57 줄.
- 안 한 것(권고 · 기록만): 게시 전 묶음 자동 재대조(두 번째 OTA부터 필요하면) · PostHog 값이 두 곳(`eas.json`·서버)에 있어 바꿀 땐 둘 다.

토큰: astra 47,350(`gpt-6-astra`, codex stderr `model:` 줄 확인) · Fable 1·2차 누적 154,823.

## 근거 (eas-cli 18.6.0 · Expo SDK 54)

- 스토어 빌드 env = `{ ...EAS 서버 production(plain·sensitive), ...eas.json build.production.env }` — `/opt/homebrew/lib/node_modules/eas-cli/build/build/evaluateConfigWithEnvVarsAsync.js:24-60`. 프로필 distribution 기본값 `store`(@expo/eas-json schema) → 두 플랫폼 다 production 환경.
- `eas update` — `build/commands/update/index.js`: `--environment` 없으면 extraEnv `{}`(190-195) → expo export가 `.env.local`·`.env`를 읽음 · 있으면 서버 값 + `EXPO_NO_DOTENV=1` · `eas.json` build 칸 env는 어느 쪽도 안 읽음 · SDK 55 미만은 환경을 안 물음(147-158) · `--environment`면 캐시 자동 비움(532).
- 자식 env = `{ ...process.env, ...extraEnv }` — `build/utils/expoCli.js:83-86`.
- `.env`는 gitignore(`.gitignore:39-40,69-70`) · `.easignore` 없음 → 빌드 서버에 안 올라감.
- 앱 GA4는 키가 없으면 안 보냄(`features/analytics/log-event.ts:30-38`·`:99-101`) · PostHog는 키가 빈 값일 때만 거름(`features/analytics/posthog.ts:27`) — 문자열 `"null"`이 들어가면 조용히 끊긴다.

## 대조표 (값 대신 sha256 앞 8자리 · 10.07 16:4x — PostHog를 서버에 넣기 전)

```
# 코드가 쓰는 EXPO_PUBLIC_* 28개 — 값 대신 sha256 앞 8자리 (10.07 16:4x Claude 실측)
# 스토어 = EAS 서버 production 22개 위에 eas.json build.production.env 2개를 덮은 것
# 로컬 = .env.local 먼저, 그다음 .env (그냥 eas update 를 누를 때 묶이는 값)
# 서버만 = eas update --environment production 일 때 (EXPO_NO_DOTENV=1, eas.json 안 읽음)
KEY                                           스토어       로컬        서버만       판정
EXPO_PUBLIC_DELETE_ACCOUNT_URL                89d3d1e3  89d3d1e3  89d3d1e3  로컬:같음 서버만:같음
EXPO_PUBLIC_DIAGNOSIS_ROUTER_URL              34f64542  70c70a4e  34f64542  로컬:다름 서버만:같음
EXPO_PUBLIC_FIREBASE_API_KEY                  8783e683  8783e683  8783e683  로컬:같음 서버만:같음
EXPO_PUBLIC_FIREBASE_APP_ID                   f14ba2fe  f14ba2fe  f14ba2fe  로컬:같음 서버만:같음
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN              ab54c473  ab54c473  ab54c473  로컬:같음 서버만:같음
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID      1470c6fc  1470c6fc  1470c6fc  로컬:같음 서버만:같음
EXPO_PUBLIC_FIREBASE_PROJECT_ID               7d37ed80  7d37ed80  7d37ed80  로컬:같음 서버만:같음
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET           612334ac  612334ac  612334ac  로컬:같음 서버만:같음
EXPO_PUBLIC_GA4_API_SECRET_ANDROID            -         83ff8a26  -         로컬:다름 서버만:같음
EXPO_PUBLIC_GA4_API_SECRET_IOS                -         837e392c  -         로컬:다름 서버만:같음
EXPO_PUBLIC_GA4_FIREBASE_APP_ID_ANDROID       -         409631b2  -         로컬:다름 서버만:같음
EXPO_PUBLIC_GA4_FIREBASE_APP_ID_IOS           -         4a2ceaf6  -         로컬:다름 서버만:같음
EXPO_PUBLIC_GET_LEARNER_SUMMARY_URL           9193a8af  4a155bd9  9193a8af  로컬:다름 서버만:같음
EXPO_PUBLIC_GET_LEARNING_ATTEMPT_RESULTS_URL  85016e02  dacb4766  85016e02  로컬:다름 서버만:같음
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID          26405131  ec4e2f0a  26405131  로컬:다름 서버만:같음
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID              5b18bb46  5b18bb46  5b18bb46  로컬:같음 서버만:같음
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID              8cb5f59d  8cb5f59d  8cb5f59d  로컬:같음 서버만:같음
EXPO_PUBLIC_IMPORT_LOCAL_LEARNING_HISTORY_URL b4f29577  f710d406  b4f29577  로컬:다름 서버만:같음
EXPO_PUBLIC_LIST_LEARNING_ATTEMPTS_URL        d283077b  af729061  d283077b  로컬:다름 서버만:같음
EXPO_PUBLIC_LIST_REVIEW_TASKS_URL             383d02b9  91e02a56  383d02b9  로컬:다름 서버만:같음
EXPO_PUBLIC_POSTHOG_API_KEY                   f4b4911a  f4b4911a  -         로컬:같음 서버만:다름
EXPO_PUBLIC_POSTHOG_HOST                      f388dc8f  f388dc8f  -         로컬:같음 서버만:다름
EXPO_PUBLIC_RECORD_LEARNING_ATTEMPT_URL       57cfcbf4  1680e980  57cfcbf4  로컬:다름 서버만:같음
EXPO_PUBLIC_REGISTER_PUSH_TOKEN_URL           4388f6e7  4388f6e7  4388f6e7  로컬:같음 서버만:같음
EXPO_PUBLIC_REVIEW_FEEDBACK_URL               a29aa6c1  a29aa6c1  a29aa6c1  로컬:같음 서버만:같음
EXPO_PUBLIC_REVIEW_ROUTER_URL                 -         -         -         로컬:같음 서버만:같음
EXPO_PUBLIC_SAVE_FEATURED_EXAM_STATE_URL      f2e1a3ed  0c1e068e  f2e1a3ed  로컬:다름 서버만:같음
EXPO_PUBLIC_SAVE_REVIEW_TASKS_URL             10be9e4e  10be9e4e  10be9e4e  로컬:같음 서버만:같음

# 로컬에서 다른 학습기록 주소 8개: 스토어=*.cloudfunctions.net/<함수>, 로컬=<함수소문자>-...-du.a.run.app (함수 이름·지역 일치)
# 셋째 조건(서버만 + eas.json의 PostHog 2개를 셸 앞에 붙임)으로 expo export 한 묶음(dist-prod/): 스토어 값 28개 전부 iOS·안드 .hbc에 있음, 로컬에만 있는 값 0, GA4 값 0
```

## 질문 원문 (두 모델에 같은 것)

### 질문 — 첫 OTA를 스토어 1.0.12와 같은 값으로 내보내는 방법 하나만 골라 달라

저장소: /Users/baggiyun/dev/dasida-app (main). 읽기만. 아무것도 실행·배포·수정하지 마라.

#### 상황
- 앱 1.0.12(Expo SDK 54, expo-updates 29, runtimeVersion policy appVersion)가 두 스토어 심사 중이다.
  뜨는 날 PR #57(TS 3파일 버그 둘)을 main에 합치고, 새 빌드 대신 `eas update`(OTA)로 보낸다. 이 프로젝트의 첫 OTA다.
- 걱정: OTA 묶음에 들어가는 EXPO_PUBLIC_* 값이 스토어 빌드와 다르면 학생 폰의 PostHog·서버 주소·로그인 ID가 바뀐다.
  10.12 주에 PostHog 이벤트(`photo_weakness_labeled` 등)로 학생 숫자를 센다 — PostHog가 끊기면 그 주 숫자가 0이 된다.
- 개발자는 1인(기윤). "그 순간 사람이 기억해야 작동하는 장치"는 여러 번 실패했다(기억 0개가 원칙).
  Claude는 매 세션 `docs/STATUS.md`와 `CLAUDE.md`를 끝까지 읽는다.

#### Claude가 확인한 사실 (근거를 직접 열어 확인하라)
- 스토어 빌드 값 = EAS 서버 production 변수 22개 위에 `eas.json` build.production.env 2개(PostHog 키·주소)를 덮은 것
  — `/opt/homebrew/lib/node_modules/eas-cli/build/build/evaluateConfigWithEnvVarsAsync.js:24-60` (eas-cli 18.6.0 · `.env`는 gitignore라 빌드 서버에 안 올라감 · .easignore 없음)
- `eas update` 동작 — `/opt/homebrew/lib/node_modules/eas-cli/build/commands/update/index.js:129-216`
  - `--environment` 없으면 extraEnv 없음 → expo export가 로컬 `.env.local`·`.env`를 읽음. SDK 55 미만이라 환경을 묻지도 않음(147-158)
  - `--environment production`이면 서버 변수 + `EXPO_NO_DOTENV=1`(190-194). `eas.json` build 칸 env는 어느 경우에도 안 읽음
  - 자식 프로세스 env = `{...process.env, ...extraEnv}` — `/opt/homebrew/lib/node_modules/eas-cli/build/utils/expoCli.js:83-84`
- 값 대조표(값 없이 해시만): `/private/tmp/claude-501/-Users-baggiyun-dev-dasida-app/1682ac0d-4837-439c-b8ac-fe3d9ac24e5d/scratchpad/ota/compare.md`
  - 그냥 누르면 28개 중 13개 다름(안드 구글 로그인 ID · GA4 키 4개가 새로 켜짐 · 학습기록 주소 8개가 run.app 주소)
  - `--environment production`만이면 PostHog 2개만 빠짐
  - 서버 변수 + PostHog 2개를 셸 앞에 붙이면 28개 전부 같음 — 그 조건으로 expo export 해서 묶음 안을 확인함
- `eas.json`, `app.config.js`(updates·runtimeVersion), `CLAUDE.md` 3번(OTA 규칙), `docs/STATUS.md` 16줄(PR #57 줄 「누르기 전」)도 읽어라.
- 앱 GA4는 스토어판에서 키가 없어 꺼져 있다 — `features/analytics/log-event.ts:30-38`이 키를 읽고 `:95-100`에서 없으면 return.
- `production` 채널 → `production` 브랜치, 올라간 업데이트 0개.

#### 후보 (더 나은 게 있으면 그걸 내라)
- A. 설정은 그대로 두고, 뜨는 날 이 한 줄로 누른다:
  `EXPO_PUBLIC_POSTHOG_API_KEY="$(jq -r .build.production.env.EXPO_PUBLIC_POSTHOG_API_KEY eas.json)" EXPO_PUBLIC_POSTHOG_HOST="$(jq -r .build.production.env.EXPO_PUBLIC_POSTHOG_HOST eas.json)" eas update --channel production --environment production --message "..."`
- B. EAS 서버 production 환경에 PostHog 두 키를 넣어 두고(`eas env:create`), 뜨는 날은 `eas update --channel production --environment production`만.
- C. `package.json`에 `ota:production` 스크립트(A를 감싼 것)를 넣고 CLAUDE.md 3번이 그걸 가리키게.
- 그 밖에: CLAUDE.md 3번 OTA 규칙에 "--environment production 필수"를 적을지 · 뜨는 날 누르기 직전에 묶음을 한 번 더 대조할지.

#### 답 형식 (짧게)
1. 고르는 것 하나 + 이유 3줄 이내 — 각 주장에 파일:줄
2. 언제 하나: 지금(뜨기 전) / 뜨는 날
3. 반드시 고칠 것: 위 사실 중 틀린 게 있으면(근거와 함께). 없으면 "없음"
4. 권고(기록만): 있으면 2개 이내

## astra 답 원문 (gpt-6-astra · 47,350토큰)

1. **C — `ota:production` 스크립트로 고정.** 단, 기존 셸의 `EXPO_PUBLIC_*`를 제거한 뒤 A를 적용하도록 보강합니다.
   - PostHog 값은 스토어 빌드와 같은 원본에서 읽습니다([eas.json:46](/Users/baggiyun/dev/dasida-app/eas.json:46)).
   - production 환경과 dotenv 차단을 명령에 고정합니다([update/index.js:190](/opt/homebrew/lib/node_modules/eas-cli/build/commands/update/index.js:190)).
   - CLAUDE OTA 규칙과 STATUS가 같은 스크립트를 가리키면 기윤이 긴 명령을 기억할 필요가 없습니다([CLAUDE.md:24](/Users/baggiyun/dev/dasida-app/CLAUDE.md:24), [STATUS.md:16](/Users/baggiyun/dev/dasida-app/docs/STATUS.md:16)).

2. **언제:** 지금 스크립트·문서 준비. 뜨는 날 PR #57 병합 후 버전 **1.0.12 유지**, 첫 OTA 승인 후 실행.

3. **반드시 고칠 것:** “`--environment production`이면 서버 값만 쓴다”는 부정확합니다. **부모 셸 변수도 상속**하므로 서버에 없는 GA4 등이 남을 수 있습니다. 28개 일치는 검증 당시 환경에서의 결과입니다([expoCli.js:83](/opt/homebrew/lib/node_modules/eas-cli/build/utils/expoCli.js:83)).

4. **권고(기록만):**
   - CLAUDE 3번에 “production OTA는 전용 스크립트만 사용, `--environment production` 필수”를 기록.
   - 첫 OTA는 병합 후 **실제 게시할 묶음**을 저장된 1.0.12 기준과 재대조하고, 불일치하면 게시 중단하도록 자동화.

## Fable 1차 답 원문 (B)

## 1. 고르는 것: **B** (서버 production 환경에 PostHog 2개 `eas env:create`, 뜨는 날은 `eas update --channel production --environment production`만)

- `--environment production`이면 eas-cli가 서버 변수를 자식 env에 얹고 `.env`를 끈다 — `commands/update/index.js:190-195`(`EXPO_NO_DOTENV:'1'`), `utils/expoCli.js:83-86`(`{...process.env, ...extraEnv}`), `node_modules/@expo/env/build/index.js:72-74,92-95`(끔). 서버만 칸에서 빠진 건 PostHog 둘뿐이라(`compare.md:26-27`) 서버에 그 둘을 넣으면 28개 전부 스토어와 같다.
- A/C의 셸 앞붙임은 **조용히 깨질 수 있다**: `jq -r`은 키가 없으면 문자열 `null`을 찍고, `features/analytics/posthog.ts:27`은 빈 값만 거르니 `"null"` 키로 초기화돼 PostHog가 소리 없이 끊긴다. 반면 서버 변수는 누를 때 이름이 찍힌다(`commandUtils/context/contextUtils/loadServerSideEnvironmentVariablesAsync.js:21-22`) — 그 줄에 `EXPO_PUBLIC_POSTHOG_API_KEY`가 있는지가 기억 없이 되는 확인.
- 빌드 쪽은 안 바뀐다: 빌드는 서버 위에 `eas.json` env를 덮으니(`build/evaluateConfigWithEnvVarsAsync.js:53`) 같은 값이면 경고 한 줄(`:47-50`)뿐. SDK 55부터는 `--environment`가 필수라(`commandUtils/flags.js:84`, `update/utils.js:263`) 이 길이 앞으로도 그대로 선다.

B 할 때 주의 둘: visibility는 **plain text**(sensitive도 됨) — secret이면 update가 못 읽는다(`loadServerSideEnvironmentVariablesAsync.js:14,22` "Plain text"·"Sensitive"만 로드). 값은 `eas.json:47-48`과 글자 하나까지 같게(다르면 빌드는 eas.json 값, OTA는 서버 값으로 갈린다 — `:53`).

## 2. 언제: **지금(뜨기 전)**
`eas env:create`는 이미 나간 빌드·업데이트에 영향 0. 뜨는 날은 main에 PR #57 합친 뒤 `eas update --channel production --environment production --message "..."` 한 줄 + 찍히는 「loaded from the "production" environment on EAS: …」 줄에 PostHog 둘이 있는지 본다. `--environment`를 붙이면 번들 캐시도 자동으로 비운다(`commands/update/index.js:532`).

## 3. 반드시 고칠 것: **없음**
줄 번호 둘만 어긋남 — `expoCli.js`는 83-86(84가 아님), `log-event.ts`의 키 없으면 return은 `:99-101`(`:95-98`은 `__DEV__` 가드). 내가 확인 못 한 것: 서버 변수 「22개」(값 출력 금지라 안 셈 — `compare.md`엔 코드가 쓰는 21개만 보임) · production 브랜치 업데이트 0개(네트워크 명령 안 돌림). 나머지 사실(`.env` gitignore `.gitignore:39-40,69-70` · `.easignore` 없음 · SDK 54라 안 묻는 것 `update/utils.js:263` · `eas update`가 eas.json build env 안 읽음 `index.js:160-161`은 cli 칸만)은 맞다.

## 4. 권고(기록만)
- HOST는 `posthog.ts:20`에 기본값 `https://us.i.posthog.com`이 있어 `eas.json:48`과 같다 — 실제로 끊는 건 API_KEY 하나. 그래도 둘 다 넣어야 28/28 대조가 글자 그대로 선다.
- `CLAUDE.md:27` 「누르기 전」에 한 줄: 「`--environment production` 필수 · 찍히는 변수 이름 줄에 `EXPO_PUBLIC_POSTHOG_API_KEY` 있는지 본다」. 뜨는 날 묶음을 다시 뜨는 대조는 안 해도 된다 — 같은 조건의 export는 이미 봤고(`compare.md:36`) 이름 줄 확인이 그 역할.

## Fable 2차 답 원문 (astra 답을 통째로 보여줌 · 「네 안을 방어하지 마라」) — 최종

## 2차 최종 — 1. 고르는 것: **B + 얇은 스크립트(둘 섞기)**

서버 production에 PostHog 2개를 넣고(`eas env:create`, plain text), `package.json`에 `ota:production` = 셸의 `EXPO_PUBLIC_*`를 벗긴 뒤 `eas update --channel production --environment production`만 부르는 한 줄(jq 없음). CLAUDE.md:27이 이 스크립트를 가리킨다. 모양:
`env $(env | sed -n 's/^\(EXPO_PUBLIC_[^=]*\)=.*/-u \1/p') eas update --channel production --environment production` → 누를 땐 `npm run ota:production -- --message "..."`.

- astra가 맞은 건 둘: 「셸 상속」(`utils/expoCli.js:83-86` — process.env가 밑에 깔리고 서버 값이 위를 덮음)과 「긴 명령은 스크립트로」. 그런데 C의 jq 앞붙임은 **서버에 PostHog가 없다는 원인을 그대로 둔다** — SDK 55부터 `--environment`가 강제라(`commandUtils/flags.js:84`, `update/utils.js:263`) 누군가 날것 `eas update`를 치면 PostHog가 다시 빠진다. 서버에 넣으면 날것 명령으로도 맞고, 누를 때 이름이 찍힌다(`loadServerSideEnvironmentVariablesAsync.js:21-22`).
- 반대로 B만으로는 셸 상속을 못 막는다 — 서버에 없는 키(GA4 4개·REVIEW_ROUTER_URL, `compare.md:14-17,31`)는 셸에 있으면 그대로 묶인다. 그래서 스크립트가 `EXPO_PUBLIC_*`를 벗긴다.
- jq를 안 쓰니 `jq -r`이 없는 키에 문자열 `null`을 찍어 `features/analytics/posthog.ts:27`(빈 값만 거름)을 통과하는 조용한 실패가 사라진다.

## 2. 언제
**지금**: `eas env:create` 2개(값은 `eas.json:47-48`과 글자 하나까지 같게 · secret 금지 — update는 plain text·sensitive만 읽음 `loadServerSideEnvironmentVariablesAsync.js:14`) + package.json 스크립트 + CLAUDE.md:27 한 줄. 셋 다 이미 나간 빌드·업데이트에 영향 0.
**뜨는 날**: PR #57 main 합침 → 기윤 OK(첫 OTA, `CLAUDE.md:28`) → 기윤 터미널에서 `npm run ota:production -- --message "..."`(Claude Bash는 rtk 훅이 끼어들 수 있음) → 찍히는 「loaded from the "production" environment on EAS: …」 줄에 PostHog 둘 있는지 본다. `--environment`가 붙으면 번들 캐시도 자동으로 비운다(`commands/update/index.js:532`).

## 3. astra 「셸 상속」 — 맞다. 내 1차 답(B만)은 이걸 안 막았다.
최종안은 두 겹으로 막는다: ⑴ 스크립트가 `EXPO_PUBLIC_*`를 전부 벗기고 실행 → 그 뒤 `expo export`가 보는 건 서버 값 + `EXPO_NO_DOTENV=1`뿐(`commands/update/index.js:190-195`, `@expo/env/build/index.js:72-74,92-95`) ⑵ 서버에 있는 키는 셸에 있어도 서버가 덮는다(`{...process.env, ...extraEnv}` 순서, `expoCli.js:83-86`). 지금 셸은 EXPO_ 0개라(Claude 실측) 오늘은 안 터지지만, 「그 순간 셸이 깨끗해야」 하는 장치라 ⑴이 있어야 기억 0개다. `compare.md:36`의 28/28은 그 깨끗한 셸에서의 결과 — astra 말대로 조건부였다.

## 4. 권고(기록만)
- astra 권고 2(게시 전 묶음 자동 재대조·불일치면 중단)는 지금 안 만든다 — 첫 OTA는 이름 줄 확인 + `compare.md:36`으로 충분. 두 번째 OTA부터 필요하면 그때 `expo export` 해시 대조 스크립트.
- 두 소스(`eas.json:47-48` + 서버) 드리프트: 빌드는 겹치면 eas.json 쪽을 쓰고 값이 달라도 경고만(`build/evaluateConfigWithEnvVarsAsync.js:47-53`). PostHog 키를 바꾸는 날엔 둘 다 고친다 — 다음 빌드 때 production 칸에서 둘을 빼 서버 하나로 모으는 것도 된다.

## Claude가 실제로 한 모양 (Fable 2차와 다른 점)

- 스크립트 sed는 `-nE 's/^(EXPO_PUBLIC_[A-Z0-9_]*)=.*/-u \1/p'`(JSON 이스케이프를 줄이려고 확장 정규식 · 뜻은 같음).
- 더러운 셸 시험: `EXPO_PUBLIC_*` 가짜 3개를 깐 셸에서 스크립트의 `eas update` 자리만 `env`로 바꿔 돌림 → 남은 `EXPO_PUBLIC_*` 0개(안 벗기면 1개).
- 서버에 넣은 뒤 스크립트와 같은 조건(셸 `EXPO_PUBLIC_*` 벗김 + 서버 24개 + `EXPO_NO_DOTENV=1` · Metro 캐시는 스크래치패드 새 폴더)으로 `expo export` → 코드가 쓰는 키 중 서버에 있는 23개 값이 iOS·안드 `.hbc` 둘 다에 있음 · 로컬에만 있는 값 0 · GA4 0. 서버 24개 해시 = 스토어 해시(다름 0).
- 첫 묶음(dist-prod)과 파일 이름(JS 내용 해시)은 같았지만 `.hbc` 바이트는 달랐다 — 같은 JS라도 바이트코드 바이트는 달라질 수 있어 값 대조로 확인했다.
