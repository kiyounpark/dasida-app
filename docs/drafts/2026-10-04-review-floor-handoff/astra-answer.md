**Q1. 결론: (c), ‘수학적 결함은 거부, 학생 에이전트의 읽기 평가는 권고’로 정하되, 권고만 남았다고 자동으로 칸을 비우지는 마라.**

- **근거:** (a)의 “그래도 안 읽히면 비움”은 학생 에이전트에게 사실상 거부권을 돌려준다. 현재 정의는 그 의견만으로 탈락시키지 못하게 한다. 동작 수 때문에 학생이 포기한다는 근거도 철회됐다. `.claude/agents/target-student.md:111`, `:127`.
- **제안 규칙:** 반례·거짓·대상과 처방의 불일치는 막는다. 표현 권고는 **고쳐쓰기 1회 → 변경 부분 재검산**으로 처리한다. 수학이 통과하고 읽기 우려만 남으면 **기윤 검토 대기**로 둔다. 기존 재검산 절차의 근거는 `docs/weakness-round-howto.md:86`.
- **“빈 것 = 0”은 무비용이라는 뜻으로는 거짓이다.** 후보가 비면 `primaryWeaknessId=null`이 되고, 과제 생성 호출을 건너뛴다. 후보가 있어도 “잘 모르겠어”면 같다. `features/photo/script/photo-script.ts:507`, `:534`; `features/photo/hooks/use-photo-flow.ts:250`. 따라서 빈칸에도 복습 기회비용이 있다. **재방문을 얼마나 잃는지는 짐작**이다.
- 수열 사례도 “수학은 맞는데 문장만 문제”로 묶으면 안 된다. 이후 기록은 같은 오차가 반복되면 검사를 통과하는 **처방 구조의 결함**을 발견했다. `docs/STATUS-archive.md:513`. 빈칸 비용을 이유로 이 결함을 허용할 근거는 없다.

**반대 안이 더 나은 조건:** 실제 학생에게서 특정 표현·길이가 수행을 막는다는 증거가 생기면 (b)를 시험할 만하다. 그래도 학생이 정한 형식 때문에 수학적 성립 조건을 빼서는 안 된다. 현재는 그 선행 제약을 강제할 근거가 약하다.

**Q2. 결론: 오늘은 (B)—이름 없는 노트의 복습 설계와 견적을 만들어라. 구현 시작 결정은 기존 판정일에 남겨라.**

- **근거:** 현재 초대 조건에 ③이 들어가지만 견적은 없고, 견적·시작 여부를 **10.10**에 판단하기로 기록돼 있다. 오늘 조사 결과를 준비하는 것은 이 결정을 앞당겨 실행하는 것과 다르다. `docs/STATUS.md:15`. **관문에 더 직접 닿는다는 판단**은 초대 조건을 풀면서 이름 없는 노트의 복습 경로를 마련한다는 데 근거한다. 실제 반복 사진 증가 효과는 짐작이다.
- A는 통과한 세트를 얻어도 곧바로 빈칸을 해결하지 못할 수 있다. 승인된 부호만 넣으면 곱셈 실수에도 부호 이름이 붙는 문제가 이미 기록돼 있다. `docs/STATUS-archive.md:495`. 후보 생성도 처방 내용이 아니라 풀이법의 선택지와 실수 태그로 거른다. `features/photo/flow/weakness-mistake-type-map.ts:139`.
- **오늘 산출물 제안:**  
  - 약점 복습과 **사진 노트 복습을 구별하는 과제 계약**. `weaknessId`를 무작정 optional로 바꾸는 안과 비교할 것. 서버는 과제·요약·반복 약점·과제 ID에 이 값을 사용한다. `functions/src/learning-history.ts:208`, `:229`, `:255`, `:513`.
  - **복습할 내용의 화면안:** 저장된 사진과 틀린 줄을 보고 다시 풀고, 기존 설명·처방을 펼쳐 대조하는 안. 노트에는 `quote·why·fix`가 있다. `features/photo/types.ts:85`. 이것으로 학습 효과가 충분한지는 짐작이며, 현재 약점별 생각단계를 그대로 사용할 수는 없다. `features/quiz/hooks/use-review-session-screen.ts:200`.
  - 생성·완료·다음 일정·알림·옛 앱 호환·사진 누락·되돌리기까지 변경 파일과 검증 항목을 적고 견적을 낼 것.

설계 문서는 버리기 쉽고 운영 데이터 변경도 없다. 사용자 제공 **09.10 잠금**에도 빈칸 생산보다 덜 충돌한다. 다만 해당 잠금의 원문은 저장소 검색에서 찾지 못했으므로, 이 부분은 제공한 맥락에 의존한다.

**반대 안이 더 나은 조건:** 실제 유입 노트가 해당 수열 칸에 집중되고, 완전한 세트를 넣는 일이 ③보다 빨리 막힌 복습을 여는 것으로 확인되면 A가 낫다. 현재 읽은 파일만으로는 그 분포를 입증할 수 없다.

**Q3. 결론: 규칙 5는 ‘검증된 변경을 격리 브랜치에 준비’까지 완화할 수 있지만, ‘빌드 전 5줄 확인만’으로 바꾸는 것은 부족하다.**

- **근거:** 앱은 약점·복습 데이터를 정적으로 가져온다. `features/quiz/hooks/use-review-session-screen.ts:5`. 그러나 **“다음 빌드 전에는 절대 학생에게 안 간다”는 보장은 없다.** 업데이트 URL과 앱 버전 기반 runtime 설정이 있다. `app.config.js:13`. 저장소 설계도 JS 변경 전달 경로를 **OTA 또는 새 빌드**로 명시한다. `docs/superpowers/specs/2026-04-16-weakness-source-schema-sync-design.md:192`. 현재 운영 채널의 실제 배포 상태까지 확인한 것은 아니다.
- 서버 허용 목록은 별도다. `weaknessOrder`가 Zod enum이므로 브랜치에서 추가하거나 앱을 빌드했다고 운영 서버가 새 ID를 받지는 않는다. `functions/src/learning-history.ts:194`. 서버가 모르는 ID를 앱이 먼저 보내는 순서가 깨질 수 있다.
- **제안할 대체 규칙:** “에이전트는 격리 브랜치에 완전한 세트와 검증 결과를 준비한다. 기윤 승인 전에는 출시 경로로 합치거나 앱·OTA·서버에 배포하지 않는다.” 기윤이 보는 **5항목**은 요약 화면으로 쓰되, 승인 대상은 복습 콘텐츠와 서버 허용 ID까지 포함한 전체 세트여야 한다. 기존 규칙도 그 전체를 묶는다. `docs/STATUS-archive.md:613`.
- 기윤에게 수학 검산을 떠넘기지는 않는다. 독립 검산 결과, 변경 diff, 착지 검사와 앱·서버 검사 결과를 함께 붙여야 한다. 정해진 검사 절차는 `docs/weakness-round-howto.md:113`. **제안 판단:** 이 조건이면 브랜치 준비 비용을 줄이면서 최종 투입 결정권을 유지할 수 있다.

**반대 안이 더 나은 조건:** 전체 세트 검증이나 배포 경계가 확보되지 않으면 기존 규칙을 유지하는 편이 낫다. 짧은 문구 승인만으로는 복습 콘텐츠 누락과 서버 불일치를 잡지 못한다.

코드는 수정하지 않았다. Slack 시작·완료 알림은 모두 `fetch failed`로 전송되지 않았다.

읽은 파일 목록: `docs/weakness-routine-v2-2026-09-20.md`, `docs/weakness-round-howto.md`, `docs/STATUS-archive.md`, `docs/STATUS.md`, `docs/AI_COLLABORATION.md`, `features/photo/flow/weakness-mistake-type-map.ts`, `.claude/agents/{weakness-author,math-checker,target-student}.md`, `functions/src/learning-history.ts`, `features/photo/hooks/use-photo-flow.ts`, `features/photo/script/photo-script.ts`, `features/photo/types.ts`, `features/quiz/hooks/use-review-session-screen.ts`, `app.config.js`, `eas.json`, `package.json`, `scripts/slack-notify.js`; 검색으로 해당 줄 확인: `docs/superpowers/specs/2026-04-16-weakness-source-schema-sync-design.md`, `docs/research/2026-09-23-marketing-pricing-deadline-astra-fable.md`.
