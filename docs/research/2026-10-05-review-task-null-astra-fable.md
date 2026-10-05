# 서버 과제 모양 (가) 코드 리뷰 — astra·Fable (2026-10-05)

## 결론 먼저

- **둘 다 「반드시 고칠 것: 없음」** — 커밋 `1cf6216`(리베이스 뒤 `ebb516a`). 서버·타입이 이름 없는 노트 과제(`source 'photo'` + `weaknessId: null`)를 받기만 하고, 만드는 곳은 0이라 학생 화면 변화 0.
- 권고 중 **빠진 테스트 둘만** 넣었다(`249613d` — 이관 스키마 · 게스트 저장소 진단 재생성). 나머지 권고는 ⑴ 「노트 다시 보기」 때 볼 것으로 STATUS 🚧 줄에 적었다.
- Claude가 코드로 다시 본 것: 안내 화면 문구(`no-steps-view.tsx:24-26`) · 체인 함수가 노트 과제를 셈(`review-chain.ts:18-38`) · `review_started`에 `task_id`만(`event-types.ts:59`) · 알림은 null이면 이름 없는 문구(`review-notification-scheduler.ts:81-83` — 질문의 「알 수 없음」 전제는 틀렸다, astra 정정).
- 토큰: astra `gpt-6-astra`(codex stderr `model:` 줄) 64,569 · Fable 193,917(도구 62회 · 약 5분).

## 질문 원문 (둘에게 같은 것)

너는 DASIDA(수능 수학 오답 사진 → 분석 → 오답노트 → 복습 앱, 1인 개발) 저장소의 코드 리뷰어다. 파일은 읽기만 한다. 아무것도 고치지 않는다.

## 리뷰 대상
- worktree: `/Users/baggiyun/dev/dasida-app/.claude/worktrees/review-task-null` (브랜치 `review-task-null`)
- 커밋 하나: `1cf6216` (부모 `bc49da3` = main). 변경은 `git -C /Users/baggiyun/dev/dasida-app/.claude/worktrees/review-task-null show 1cf6216`으로 본다.
- 설계(먼저 읽기): `docs/research/2026-10-04-review-floor-design.md` 「결론 먼저」와 「서버 과제 모양」 절 · 결정 `docs/research/2026-10-05-invite-before-review-floor-astra-fable.md` 「결론 먼저」

## 이 커밋이 하려는 것 (1.0.12 「서버 과제 모양 (가)」)
- 서버·타입이 **약점 이름 없는 복습 과제**(= `source: 'photo'` + `weaknessId: null`, 「노트 과제」)를 **받을 수 있게만** 한다.
- 이름 없는 과제를 **실제로 만들기 시작하는 건 다음(⑴ 「노트 다시 보기」 화면) 일**이다. 이번 커밋 뒤에도 앱은 노트 과제를 0개 만든다.
- 서버를 먼저 배포한다(옛 서버는 null을 400으로 거절). 지금 라이브 앱은 iOS 1.0.11 · 안드 1.0.11(일부 1.0.9).
- 종류는 칸을 새로 두지 않고 (출처, 약점) 쌍에서 읽는다. 공용 함수 `functions/src/review-task-contract.ts`(import 0, 앱은 `@/functions/src/…`로 읽음).

## 중점 확인
1. **서버 계약** — `functions/src/learning-history.ts`: `ReviewTaskSchema`(nullable + `.refine` null은 photo만) · 요약 스키마 nullable · 최근 활동 부제 · `createTaskId` · 진단 재생성 필터. null이 들어왔을 때 500/400/조용한 손실이 나는 서버 경로가 남았나(목록·요약·시도 저장·이관 import·알림·탈퇴 등). zod 4의 object `.refine`이 `z.array(...)`·`.parse`·`z.infer`에서 기존 데이터(옛 문서) 동작을 바꾸나.
2. **배포 순서·되돌리기** — 넓힌 서버가 1.0.9/1.0.11 앱에 해가 없나. 되돌릴 때 문제(설계 문서 「되돌리기」)가 이 커밋으로 새로 생기나.
3. **tsc가 못 잡는 자리** — 앱에서 `weaknessId`를 문자열 템플릿·`as` 캐스트·분석 이벤트·알림·저장 키로 쓰는 곳 중 null이면 틀리는 곳이 남았나(커밋은 `review-scheduler.ts`·`current-learner-controller.ts` 두 곳을 공용 id 함수로 바꿨다).
4. **복습 화면 훅** `features/quiz/hooks/use-review-session-screen.ts` — 약점 과제만 `task` 상태로 받고 노트 과제는 `noteTask`로 받아 단계 0개(안내 화면)에서 멈춘다. 약점 과제 동작에 회귀가 있나. 노트 과제엔 `review_started`를 안 찍는다 — 문제 있나.
5. **홈·내 기록** — 약점 진행(`home-state.ts`·`history-insights.ts`)에서 노트 과제를 뺐다. 빼면 안 되는 자리였나, 또 빼야 할 자리가 남았나(예: 홈 복습 줄 `home-review-list.tsx`, 내일 카드, 알림 `review-notification-scheduler.ts`는 `resolveWeaknessLabel(null)` → 「알 수 없음」으로 간다 — 이건 ⑴ 몫으로 남겼다).
6. **테스트** — 빠진 테스트.

## 답 형식
- 맨 위 「반드시 고칠 것」: 없으면 「없음」. 있으면 하나마다 파일:줄 + 어떤 입력에서 무엇이 틀리는지 한 줄.
- 그다음 「권고(기록만)」: 고치지 않아도 되는 것. 파일:줄.
- 근거 없는 주장은 쓰지 마라. 직접 열어 본 줄만 적는다.
- 한국어. 1,500자 안쪽.

## astra 답 원문 (`gpt-6-astra` · 64,569토큰)

**반드시 고칠 것**

없음. 이번 범위인 ‘서버 수용만 확대·노트 과제 생성 0개’에서 배포를 막을 결함은 찾지 못했습니다.

**권고(기록만)**

- `functions/tests/learning-history-review-tasks.test.ts:299` — 완료된 노트 과제의 요약 검증은 있지만 시도·결과가 빈 배열입니다. ‘완료된 null 과제가 있는 계정에서 다음 진단 저장’, ‘null 과제 이관 후 재조회’ 테스트를 추가하면 서버 경로의 회귀를 더 잘 잡습니다.
- `features/learning/local-learning-history-repository.ts:255` — 로컬 최근 활동은 null 과제를 여전히 「알 수 없음」으로 표시합니다. 서버의 「오답노트」와 다릅니다. 노트 과제 생성 전인 지금은 비차단이며 ⑴에서 맞추면 됩니다.
- `features/quiz/notifications/review-notification-scheduler.ts:81` — 요청의 전제 정정: 로컬 알림은 `resolveWeaknessLabel(null)`을 호출하지 않습니다. null이면 `undefined`를 전달해 약점명 없는 문구를 사용합니다.
- `functions/src/learning-history.ts:1051` — 롤백 주의는 설계대로입니다. null 문서가 생긴 뒤 옛 서버로 돌아가면 시도 저장 전 전체 과제 파싱에서 실패합니다. 이번에는 `use-photo-flow.ts:252`의 생성 조건이 유지되므로 그 상태를 새로 만들지 않습니다.

공통 스키마의 `.refine`은 기존 유효 약점 과제를 거절하거나 값을 변환하지 않습니다. 노트 과제의 `review_started` 생략도 실제 복습을 제공하지 않는 이번 범위에 맞습니다. 화면은 `app/quiz/review-session.tsx:17`에서 taskId별 재마운트하여 체인 이동 때 이전 약점 상태가 남지 않습니다.

읽기 전용으로 검토했으며 파일 수정·테스트 실행은 하지 않았습니다.

## Fable 답 원문 (193,917토큰)

## 반드시 고칠 것
없음.

근거(직접 연 줄): 서버는 과제를 읽는 자리 전부(`functions/src/learning-history.ts:1021`·`:1051`·`:1101`·`:1143`·`:1150`)가 같은 `ReviewTaskSchema`를 쓰고, 쓰기 전 `stripUndefined`(`functions/src/firestore-sanitize.ts:11`)는 `undefined`만 떼고 `null`은 남겨서 저장 뒤 재검사도 통과한다. 비교(`:604`)·요약(`:536`·`:210` nullable)·최근 활동(`:760`)·이관(`learning-history-import-ops.ts:40-45` spread)·알림(`send-review-reminders.ts:53-63` 원문 읽기, 약점 안 봄)·탈퇴(`delete-account.ts` reviewTasks 스키마 0건) 모두 null에서 500·400·손실 없음. 서버가 스스로 null 과제를 만드는 길은 없다(`:862`는 기존 과제 값, `:917`은 topWeaknesses). zod 4.3.6 `.refine`은 `this`를 돌려준다(`functions/node_modules/zod/v4/classic/schemas.d.ts:38`) → `z.array`·`.parse`·`z.infer` 그대로, 옛 문서(문자열 weaknessId)는 refine을 자동 통과. 앱·functions `tsc --noEmit` 둘 다 오류 0(직접 돌림). 배포 순서·되돌리기: 이 커밋은 null 문서를 하나도 안 만드니 되돌려도 깨끗하다 — 설계 「되돌리기」의 500은 ⑴이 과제를 만들기 시작한 뒤 얘기다. 문자열 템플릿은 `review-scheduler.ts:163`(인자가 non-null WeaknessId)·`current-learner-controller.ts:874-883`(개발 시드 리터럴)뿐.

## 권고(기록만)
1. `features/learning/local-learning-history-repository.ts:255` — 게스트 최근 활동 부제가 null이면 「알 수 없음」, 서버(`learning-history.ts:760`)는 「오답노트」. 게스트엔 노트 과제를 안 만드는 설계라 지금은 안 보이지만 두 문구가 갈린다.
2. ⑴ 몫 문구 자리: `review-session/no-steps-view.tsx:24-26`(노트 과제 열면 「알 수 없음 복습을 만드는 중이에요」) · `home-state.ts:70-77`(히어로 본문 「알 수 없음부터 시작하면…」) · `home-review-list.tsx:51-53` · `no-review-day-card.tsx:61`.
3. `features/learning/review-chain.ts:18-38` — `countDueReviews`·`resolveNextDueReview`가 노트 과제를 센다. ⑴ 전엔 0개라 무해하지만, 노트 과제가 생기면 체인 분모에 들어가고 bridge가 노트 과제로 넘겨 안내 화면에서 막힌다 — ⑴에서 같이 볼 것.
4. `review_started`를 노트 과제에 안 찍는 건 지금은 맞다(약점 복습 이벤트). 다만 `features/analytics/event-types.ts:59`가 `task_id`만 실어서 08.02 깔때기(열었나)엔 종류가 없다 — ⑴에서 종류 칸을 넣을 것.
5. 빠진 테스트: 서버 `buildReviewTasks` weakness-practice 가지에 노트 과제가 activeTask일 때(`learning-history.ts:862-877` → `__note__day3`, refine 통과) — `learning-history-weakness-practice.test.ts`에 null 0건 · 이관 스키마 null(`learning-history-import-ops.test.ts:90` 문자열만) · 앱 `local-learning-history-repository.ts:446` 노트 보존 · `review-notification-scheduler.ts:81-83` null → 이름 없는 문구(테스트 `:8` 문자열만).
