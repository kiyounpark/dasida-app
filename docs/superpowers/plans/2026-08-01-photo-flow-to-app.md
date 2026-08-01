# 사진 흐름을 앱으로 (A) — 2026.08.01

web-proto(`dasida-proto.netlify.app`)에 이미 돌고 있는 사진 흐름을 앱 화면으로 옮긴다.
**만드는 게 아니라 옮기는 것.** 문구·순서·말풍선 개수는 이미 검수돼서 정해졌다 — 다시 안 정한다.

정하는 건 두 가지뿐이다: **자르는 순서**, **대화를 들고 있는 모양.**

---

## 배경 (안 다시 정하는 것)

- 앱 사진 입구는 [PR #41](https://github.com/kiyounpark/dasida-app/pull/41)에서 `app/dev/photo-analyze.tsx`까지 들어감. 실기기 왕복 8.1초, 사진 473~695KB.
- 지금 앱은 서버 응답이 **날것 JSON**으로만 뜬다. 화면이 없다.
- 스토어 배포는 `want_photo_in_app`이 찍힐 때까지 안 한다. 오늘 범위는 main 머지 + 폰의 "다시다 Dev"로 써보기까지.

## 안 하는 것

- 홈(학습 여정)은 한 줄도 안 건드린다. 그건 B(별도 세션)가 지도부터 만든다.
- `app/(tabs)/_layout.tsx` 안 건드린다 (B 소유 — 탭 구성이 `practiceGraduatedAt`으로 갈린다).
- 기존 `app/dev/photo-analyze.tsx`는 그대로 둔다. 8.1초 재던 화면이라 또 쓸 수 있다.

---

## 1. 대화를 들고 있는 모양 🔒

web-proto는 `thread.appendChild(...)`로 화면에 직접 붙인다 (명령형). React Native는 상태를 바꾸면 화면이 따라온다 (선언형). **1:1 이식이 안 되는 자리는 여기 하나뿐이다.**

### 상태는 배열 둘

```ts
type Bubble =
  | { kind: 'coach'; paras: string[]; ask?: boolean }   // ask = 답 기다리는 중 (색 바뀜)
  | { kind: 'me';    paras: string[] }
  | { kind: 'card';  title: string; body: string; variant?: 'weakness' | 'note' };

type Action = { label: string; kind?: 'primary' | 'ghost'; onPress: () => void };

thread:  Bubble[]     // 밑으로 쌓인다. 지워지지 않는다.
actions: Action[]     // 하단 버튼. 매번 통째로 갈아끼운다.
```

**대화 자체가 상태다.** 단계(state machine)를 따로 두지 않는다 — 과거 말풍선을 전부 들고 있어야 해서 어차피 배열이 필요하고, 단계를 이중으로 관리하면 어긋난다.

### 프리미티브 넷만 만든다

web-proto의 흐름 함수들(`assertMethod`·`startPointing`·`showCheck`…)이 쓰는 건 결국 이 넷뿐이다. 이 넷만 맞춰두면 **흐름 코드는 거의 그대로 옮겨진다.**

- `say(text)` — 코치 말풍선. 직전이 코치 말풍선이고 `ask`가 아니면 **거기에 문단을 덧붙인다** (한 생각 = 한 덩어리). [app.js:201](../../../web-proto/app.js)
- `mySay(text)` — 내 말풍선
- `card(title, body, variant?)` — 카드
- `ask(buttons)` — 하단 버튼 교체 + 직전 코치 말풍선에 `ask` 표시

### 수식은 공짜로 온다

web-proto의 `fmtMath`는 앱 `components/math/MathText.tsx`의 `formatMathText`를 웹으로 이식한 것이다 (app.js:96 주석). 앱에는 원본이 그대로 있으니 **다시 안 만든다** — `<MathText />` 를 쓴다.

### 브라우저 전용 API — 옮기기 전에 갈아끼울 자리

- `AbortSignal.timeout` → `AbortController` + `setTimeout` (PR #41에서 이미 겪음)
- `createImageBitmap` / `canvas` 축소 → `expo-image-manipulator` (photo-analyze.tsx에 이미 있음)
- `alert()` → 말풍선이나 `Alert.alert`
- `window.location.reload()` → 상태 초기화
- `scrollIntoView` → `ScrollView.scrollToEnd`
- `setInterval` 분석 문구 → 그대로 되지만 언마운트 시 정리 필요

---

## 2. 자르는 순서

한 덩어리 끝날 때마다 폰에서 확인하고 다음으로 간다. **다 만들어놓고 한꺼번에 보여주지 않는다.**

**덩어리 1 — 껍데기 + 첫 갈래 (오늘)**
사진 고르기 → 분석 중 문구 4단계 → 대화 화면이 뜨고, 분석 결과에 따라 네 갈래 중 하나가 나온다: 단언(`assertMethod`) · 추측 확인(`softAssertMethod`) · 후보 카드(`showCandidateCards`) · 다시 찍기(`offerRetake`).
→ **오늘 폰에 떠야 하는 것이 이것.** 날것 JSON이 사라지고 대화가 뜬다.

**덩어리 2 — 짚어주는 대화**
`startPointing` → `showWhy`. "여기 — '…' 쓴 부분. 여기서 틀린 것 같아. 맞아?" 사다리 2번까지, 세 번째 없음.

**덩어리 3 — 쪽지시험 + 재도전**
`showCheck` → `startRetry`. 재시험 없음(한 번만 더 짚고 넘어감).

**덩어리 4 — 오답노트 카드 + 망각곡선**
`showWrongNote` → `showForgettingCurve`. AI 경로의 결과물.

**덩어리 5 — 설문 경로**
`showFeelingSurvey` → `showWeaknessCard`. 사진에서 못 건진 날의 우회로.

---

## 3. 파일 자리

물건은 `features/photo/`에 산다. `app/`엔 **부르는 한 줄만.** 나중에 홈으로 옮길 땐 `features/photo/`를 안 건드리고 그 한 줄만 옮긴다.

```
features/photo/
  hooks/use-photo-flow.ts        ① 일하는 것 — 사진 고르기·축소·서버 호출·에러
  hooks/use-photo-thread.ts      ① 대화 상태 + 프리미티브 넷 (say/mySay/card/ask)
  flow/route-from-analysis.ts    ① 분석 결과 → 갈래 (순수 로직, 테스트 가능)
  screens/photo-flow-screen.tsx  ② 화면 조합
  components/                    ② 말풍선·카드·액션 버튼·분석중 문구
app/dev/photo-flow.tsx           ③ 주소 한 줄
```

hook 분리 기준은 [dasida-code-structure](../../../.claude/skills/dasida-code-structure/SKILL.md) 그대로. 지금 `photo-analyze.tsx`는 `useState` 5개·서버 호출·에러 분기·219줄로 네 개나 걸린다.

---

## 4. 끝났다고 말하기 전에

- `npx jest` 통과 (현재 495 PASS)
- lint 에러 0
- `route-from-analysis.ts`에 테스트 (네 갈래 각각)
- **폰의 "다시다 Dev"에서 실제로 사진 한 장 넣어보기.** JS만 바뀌므로 재빌드 불필요 — `npm run start:dev` QR.
