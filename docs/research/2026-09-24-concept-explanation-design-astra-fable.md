# 09.24 — 개념 설명 코드 설계 — astra·Fable

> 부른 법은 `docs/how-we-decide.md` 그대로. astra = `codex exec` gpt-6-astra(stderr `model: gpt-6-astra` 확인), Fable = Agent `model: "fable"`.
> 넣을지·언제·모양(두 덩어리 300자)은 09.23에 잠겼다(`2026-09-23-concept-explanation-astra-fable.md`). 이 판은 **코드 모양**만.

## 갈림길과 답

| | astra | Fable 1라운드 | Fable 2라운드(astra 답을 보고) |
|---|---|---|---|
| 1 필드 모양 | **객체 `concept: {rule, violation} \| null`** | 문자열 하나 `conceptWhy` + 줄바꿈 | **astra 안으로.** 두 덩어리를 프롬프트에만 맡기면 `fix` 두 칸처럼 땜질 문장이 붙는다(`openai-client.ts` 규칙 9). 스키마가 `rule` 칸을 요구해야 모델이 개념·조건을 실제로 적는다 |
| 2 웹 표시 | fix 대신 설명만, 노트엔 안 넣음 | 같음 | — |
| 3 null 강제·길이 | 정화에서도 calc_slip·answer_read 버림, 300 초과는 통째로 버림 | 같음 | 합계는 `rule.length + violation.length`(줄바꿈은 페이로드에 없다) |
| 4 프롬프트 | 맨 위 "해설도 하지 마세요" 문장을 교체 | 규칙 13 안에 경계 문장 | **astra 안으로** — 위 문장과 새 필드가 정면 충돌하면 원천을 고친다. 규칙 13 문장은 Fable 초안 |
| 5 지연 | 1번 후보에만 | 같음(웹은 `startPointing(0)`만 연다 `app.js:400`) | — |
| 6 하나 더 | 중첩 strict 스키마 테스트 | `check_answer`의 `react`를 `dont_get_why_concept`로 갈라야 "설명이 먹혔나"를 센다 | 둘 다 반영 |

Claude가 확인한 것: Fable이 댄 `features/photo/types.ts:17·35`, `app.js:400`(`startPointing(0)`), `app.js:644`(`react`) 전부 맞았다.

## 토큰

astra 1회 4.8만. Fable 2회(1라운드 14.2만 + 2라운드 14.9만, 누적 표시).

## 실제 사진 검증 (09.24~26, 로컬 에뮬레이터 — 운영 서버·원장 흔적 없음)

사진: 시뮬레이터 앨범 손글씨 2장(넓이 음수, 25−12=11) + 타자 풀이 6장(근의 공식 +4ac, 맞은 풀이, 로그 진수, 등비급수 수렴, 부등호 방향, 극값). 투명 PNG 2장은 AI에 검은 화면으로 보여 흰 배경으로 다시 그렸다.

**1바퀴(Fable 초안 규칙 13)** — 설명 10개. math-teacher: S1 오진(AI가 문제 "x축으로"를 오독, why가 먼저 틀림 — STATUS 곁다리에 적힌 같은 사진 오독), S3 "x = −3까지 그대로 넣었어"로 최종 답 노출. target-student: 10개 중 6개가 why 재포장.

**프롬프트 한 바퀴 더 — astra·Fable 둘 다 같은 답**: (b) rule을 "개념 이름·정의·성립 조건"으로, violation은 "값의 탈락·생존을 말하지 마라" + "확신 못 하면 null". 쪽지 정답 겹침은 why·fix에도 있는 기존 성향이라 이번엔 둔다. 문장은 Fable 전문.

**2바퀴** — math-teacher: 설명 10개 수학 전부 맞음, 최종 답 누설 0, 1바퀴 두 곳 고쳐짐. "임계점"(교과 밖) 1건. 로그 샘플은 ⭕ 예시 문장을 거의 그대로 옮겼다(내용은 맞음).
target-student(Haiku)는 여전히 6/10 재포장이라 했고, Claude가 직접 세도 새로 준 게 확실한 건 3~4개. **why(규칙 9)가 이미 개념을 설명하고 있어 concept가 더할 몫이 작다** — 알고 내보낸다. 측정은 `check_answer` `react: dont_get_why_concept` vs `dont_get_why`.

**회귀 확인 (짚기는 모든 학생이 지나간다)** — 25−12=11 사진 같은 조건 10회씩: 옛 프롬프트 4/10, 새 프롬프트 4/10. 누적 옛 8/17 · 새 6/18. 차이 없음. **계산 실수를 절반 넘게 놓치는 건 원래 약점**(이번 변경과 무관). 근의 공식 +4ac 4/4 = 4/4, 맞은 풀이 오탐 0/4 = 0/4.
응답 시간: 옛 5.2~33.8초, 새 3.2~36.1초 — 52초 마감 안. 개념이 붙은 응답의 output 토큰은 약 4.2천(대부분 reasoning).

**범위 밖으로 남긴 것**: 쪽지가 원래 문제의 최종 답을 묻는 것(부등식·극값, 규칙 8 "새 미니 문제" 위반 — 기존 성향), 넓이 사진 오독(규칙 3).

## 토큰 (합계)

astra 2회 약 7.2만(4.8만 + 2.4만). Fable 3회(설계 1·2라운드 + 프롬프트 판정) — 표시값 14.2만·14.9만·9.5만. math-teacher 2회 4.7만·4.5만, target-student(Haiku) 2회 5.6만·3.9만 — 전부 Claude 구독 안.
