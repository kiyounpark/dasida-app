# 구현 계획: 즉석 재도전 + 개인화 망각곡선 엔딩

- 스펙: `docs/superpowers/specs/2026-07-25-instant-retry-forgetting-curve-design.md`
- 브랜치: `feat/instant-retry-curve` (base: `feat/photo-flow-error-pointing`, 스택)
- 목표 한 줄: 약점 카드 이후에 "아까 무너진 자리, 이번엔 통과" 장면(재도전)과
  개인화 망각곡선 엔딩 + 앱 CTA를 붙인다.

## 아키텍처 요약

analyzePhoto 원샷 응답의 errorCandidate에 retry 필드 4개(선택)를 추가하고(functions),
웹 사다리는 약점 카드 뒤에 if 관문(retry 필드 존재 시에만 재도전)을 거쳐
망각곡선 SVG 엔딩으로 착지한다. 상류가 어떻게 변해도 관문이 건너뛰기로
방어하므로 functions/웹 배포 순서는 무관하다.

- 스택: Firebase Functions (TypeScript) + web-proto (바닐라 JS/CSS)
- 제약: 재시험 없음 원칙, 반말 코치 톤, 새 API 호출 금지(원샷 유지)
- 전제 인터페이스 (오류 짚기 브랜치가 바뀌어도 이 모양만 유지되면 됨):
  - `pocket.errorCandidates[i]` — quote/why/mistakeType/fix/check* (+retry* 추가)
  - `pocket.predictedMethodId`, `showWeaknessCard({methodId, mistakeType, ..., aiConfirmed, checkPassed})`

---

## Task 1 — functions: retry 필드 생성·정화

**파일**: `functions/src/openai-client.ts`, `functions/src/analyze-photo-core.ts`

1. `openai-client.ts` 스키마의 errorCandidates.items.properties에 추가
   (required에는 **넣지 않는다** — 선택 필드):

```ts
retrySetup: { type: 'string', maxLength: 300 },
retryPrompt: { type: 'string', maxLength: 200 },
retryOptions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 80 } },
retryAnswerIndex: { type: 'integer', minimum: 0, maximum: 2 },
```

2. `PHOTO_ANALYSIS_SYSTEM_PROMPT` 오류 짚기 규칙에 조항 추가 (10번 뒤, 예시 앞):

```
'11. 재도전 문제(retry*): 학생이 틀린 그 단계만 다시 밟는 쌍둥이 문제.',
'    retrySetup은 그 단계 직전까지 세팅된 새 상황(같은 원리, 숫자만 변경) 1~2문장,',
'    retryPrompt는 "여기서 다음 한 수는?" 형태의 질문, 보기 3개, 새 개념 금지.',
'    checkPrompt(방금 짚은 조각 확인)와 달리 retry는 새 숫자로 적용을 확인한다.',
'    자신 없으면 retry 필드를 통째로 생략하세요. 억지 생성 금지.',
```

3. `analyze-photo-core.ts`의 `ErrorCandidate` 타입에 선택 필드 추가:

```ts
retrySetup?: string;
retryPrompt?: string;
retryOptions?: string[];   // 정확히 3개
retryAnswerIndex?: number; // 0~2
```

4. `sanitizeErrorCandidates`의 `out.push(...)` 직전에 retry 검증 추가.
   **retry 불량이어도 후보는 살린다** — retry 필드만 뺀다:

```ts
const retrySetup = typeof c.retrySetup === 'string' ? c.retrySetup.trim() : '';
const retryPrompt = typeof c.retryPrompt === 'string' ? c.retryPrompt.trim() : '';
const retryOptions =
  Array.isArray(c.retryOptions) &&
  c.retryOptions.every((o) => typeof o === 'string' && o.trim() !== '')
    ? (c.retryOptions as string[])
    : [];
const retryAnswerIndex = typeof c.retryAnswerIndex === 'number' ? c.retryAnswerIndex : -1;
const retryValid =
  retrySetup !== '' && retryPrompt !== '' &&
  retryOptions.length === 3 && retryAnswerIndex >= 0 && retryAnswerIndex <= 2;
out.push({
  quote, why, mistakeType, fix, checkPrompt, checkOptions, checkAnswerIndex,
  ...(retryValid ? { retrySetup, retryPrompt, retryOptions, retryAnswerIndex } : {}),
});
```

**검증**: `cd functions && npm run build` 통과. (기존 웹은 retry 필드를 몰라도
그대로 동작 — 추가 필드는 무시됨.)

## Task 2 — web-proto: startRetry (if 관문 + 넘어갈래)

**파일**: `web-proto/app.js`

`showWeaknessCard` 아래에 추가. Consumes: `pocket.errorCandidates[idx]`의 retry 필드.
Produces: `startRetry(idx, ctx)` — ctx는 곡선에 넘길 `{methodId, mistakeType}`.

```js
// ── 즉석 재도전: 아까 무너진 자리 재밟기. 관문 아님 — 어느 선택이든 곡선으로. ──
function startRetry(idx, ctx) {
  const cand = pocket?.errorCandidates?.[idx];
  const hasRetry = cand && cand.retrySetup && cand.retryPrompt &&
    Array.isArray(cand.retryOptions) && cand.retryOptions.length === 3 &&
    Number.isInteger(cand.retryAnswerIndex);
  if (!hasRetry) { showForgettingCurve('success', ctx); return; } // if 관문: 조용히 건너뜀
  coachSays('그럼 진짜 마지막 — 아까 그 자리, 새 숫자로 한 번만 다시 밟아보자.');
  coachSays(`${cand.retrySetup}\n${cand.retryPrompt}`);
  const buttons = cand.retryOptions.map((opt, i) => ({
    label: opt,
    onPress: () => {
      userSays(opt);
      if (i === cand.retryAnswerIndex) {
        coachSays('그렇지! 아까 무너진 그 자리, 이번엔 통과했어.');
        showForgettingCurve('success', ctx);
      } else {
        coachSays(`아깝다 — 정답은 "${cand.retryOptions[cand.retryAnswerIndex]}". 아까랑 같은 원리야.`);
        showForgettingCurve('fail', ctx); // 재시도 없음
      }
    },
  }));
  buttons.push({ label: '지금은 넘어갈래', kind: 'ghost',
    onPress: () => { userSays('지금은 넘어갈래'); showForgettingCurve('success', ctx); } });
  setActions(buttons);
}
```

**검증**: retry 필드 있는 응답 → 문항 노출, 없는 응답 → 곡선 직행 (콘솔 에러 0).

## Task 3 — web-proto: showForgettingCurve + CTA

**파일**: `web-proto/app.js`, `web-proto/styles.css`, `web-proto/index.html`(필요 시)

Consumes: `variant('success'|'fail'|'survey')`, `ctx.methodId`, `ctx.mistakeType`.

1. 대사 3종:

```js
const CURVE_LINES = {
  success: '지금은 잡았어. 근데 뇌는 내일이면 이 감각의 절반을 지워 — 네 의지 문제가 아니라 원래 그래.',
  fail: '지금 헷갈린 건 내일이면 더 흐려져. 네 의지 문제가 아니라 뇌가 원래 그래.',
  survey: '네가 짚어준 이 약점, 내일이면 감각의 절반이 사라져. 네 의지 문제가 아니라 뇌가 원래 그래.',
};
```

2. SVG 곡선 (인라인 생성, 정적): 지수감쇠 곡선 1개 + 마커 3개
   - 시작점(좌상단): `방금 잡은 자리 — {methodLabel} × {typeLabel} (지금 100%)`
   - 중간 하락 지점: `내일이면 여기쯤 — 절반`
   - 하락 직전 알림 마커: `🔔 그 직전에 내가 다시 물어볼게`
   - viewBox 700×260, 곡선 path는 `M40,40 C 200,60 320,150 660,210` 계열로 우하향
3. 코치 마무리 대사: `'그래서 타이밍은 내가 챙길게. 앱에서는 이걸 알림으로 해줘.'`
   (survey variant: `'앱에서는 네 약점을 문제로 만들어서, 타이밍 맞춰 다시 물어봐 줘.'`)
4. CTA 버튼 2개:

```js
setActions([
  { label: '📱 다시다에서 이어서 하기', kind: 'primary', onPress: () => window.open(STORE_URL, '_blank') },
  { label: '다른 문제도 올려보기', kind: 'ghost', onPress: () => window.location.reload() },
]);
```

`STORE_URL`은 파일 상단 상수. **값은 기윤 확인 필요** (열린 질문: iOS/Android
분기 vs 단일 스마트 링크). 확인 전까지는 iOS/Android UA 분기 2링크로 구현.

5. `styles.css`: `.curve-card` (카드 폭 100%, SVG 반응형 `max-width:100%`),
   마커 텍스트는 12~13px, 곡선은 CSS 변수 색 사용(기존 카드 팔레트 따름).

**검증**: 세 variant 모두 곡선+라벨 렌더링, 모바일 폭(375px)에서 깨짐 없음.

## Task 4 — 배선: 엔딩 교체

**파일**: `web-proto/app.js`

`showWeaknessCard` 끝부분의 기존 엔딩을 교체:

```js
// 기존 (삭제):
coachSays('오늘 여기까지. 다음에 같은 자리에서 안 틀리게, 앱에서 이어서 잡아줄게.');
setActions([{ label: '다른 문제도 올려보기', kind: 'primary', onPress: () => window.location.reload() }]);

// 신규: aiConfirmed 경로는 재도전으로, 설문 경로는 곡선 직행
const ctx = { methodId, mistakeType };
if (aiConfirmed) {
  startRetry(cardIdx, ctx); // cardIdx: showCheck→showWeaknessCard로 idx 전달 필요
} else {
  showForgettingCurve('survey', ctx);
}
```

`showCheck(idx)`가 `showWeaknessCard({...})` 호출 시 `idx`를 함께 넘기도록
시그니처에 `idx` 추가 (설문 경로 호출부는 idx 없이 호출 — undefined 허용).

**검증**: aiConfirmed 경로에서 약점 카드 → 재도전 순서로 이어짐, 설문 경로는 곡선 직행.

## Task 5 — 검증·시식

1. `cd functions && npm run build` — 타입 통과
2. 스펙의 수동 시나리오 7종 실행 (성공/실패/넘어갈래/설문/필드 결손/라벨/실사진 시식)
   - 필드 결손 시나리오는 Task 1 배포 전의 기존 functions 응답으로 자연 재현 가능
3. 실사진 시식: 실제 풀이 사진 3장 이상으로 retry 문제 품질(정답 키 맞는지) 육안 확인
4. 커밋 단위: Task 1 / Task 2+3+4 / 검증·문구 조정 — 각각 커밋

## 열린 질문 (구현 중 확인)

- `STORE_URL`: 양대 스토어 실제 링크 (기윤 제공 필요)
- 재도전 진입 대사·곡선 문구는 시식 후 기윤 톤 검수 1회
