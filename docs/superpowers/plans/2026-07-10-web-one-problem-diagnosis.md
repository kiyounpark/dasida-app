# 웹 1문제 진단 페이지 (트랙 B v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2027학년도 6월 모평 수학 공통 21번 1문제를 웹/모바일에서 직접 풀고, 틀리면 "풀이 어느 단계에서 어긋났는지" 진단받는 초경량 정적 페이지를 만들어 배포한다.

**Architecture:** 저장소 루트 `web/` 아래 정적 파일 4개(HTML/CSS/JS/데이터)로 구성된 단일 페이지. 서버·로그인·빌드 도구 없음. 화면 상태 4개(문제 → 풀이 선택(오답) / 지도(정답) → 진단 → 마무리)를 순수 JS로 전환. 문제 메타(정답·유형·이미지)는 앱의 `data/exam/g3-calc-mock-2026-06/problems.json`에서 가져오고, **진단 단계 지도는 21번 실제 풀이에 맞춘 문제 전용 데이터**로 하드코딩한다.

**웹은 "실험실"이다 (앱과의 관계):** 웹은 앱의 축소판 명함이 아니라, "문제별 정밀 진단이 상위권(②-b) 반응을 만드나"를 1문제로 싸게 검증하는 실험이다. 앱은 현재 극한 *공통* 진단 흐름(`data/diagnosisTree.ts`의 `limit`)만 갖고 있고, 이 문제 전용 정밀 진단은 **아직 앱에 없다.** 웹에서 반응이 검증되면 그때 앱의 고빈도 문제부터 역수입한다 (v2, 이 계획 범위 밖). 축 분리 — 웹=깊이(1문제), 앱=넓이(전체 오답 추적) — 로 통일성 충돌을 피한다.

**Tech Stack:** 정적 HTML/CSS/Vanilla JS (프레임워크·번들러 없음), Vercel 정적 호스팅, 로컬 확인은 `python3 -m http.server`.

**Spec:** `docs/superpowers/specs/2026-07-10-web-one-problem-diagnosis-design.md`

**테스트 방침:** 스펙 9절에 따라 자동 테스트는 범위 밖. 대신 각 태스크에 수동 검증 단계(정확한 명령 + 기대 결과)를 넣는다. TDD 생략은 스펙에서 승인된 예외.

---

## 파일 구조

```
web/
├── index.html        # 페이지 구조 (4개 상태 섹션)
├── styles.css        # 모바일 우선 스타일
├── app.js            # 상태 전환 + 렌더링 로직
├── problem-data.js   # 문제 1개 데이터 (전역 PROBLEM 객체)
└── assets/
    └── problem-21.webp  # 앱 자산에서 복사한 문제 이미지
```

- `problem-data.js`와 `app.js` 분리 이유: 문제를 교체할 때 데이터 파일만 바꾸면 되게.
- 앱 코드(`app/`, `features/`)는 일절 건드리지 않는다.

---

### Task 1: 스캐폴드 + 문제 이미지 복사

**Files:**
- Create: `web/index.html`
- Create: `web/styles.css`
- Create: `web/assets/problem-21.webp` (복사)

- [ ] **Step 1: 디렉터리 만들고 문제 이미지 복사**

```bash
mkdir -p web/assets
cp assets/exam/g3-calc-mock-2026-06/problems/21.webp web/assets/problem-21.webp
```

- [ ] **Step 2: `web/index.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>이 문제, 왜 틀렸는지 30초 만에 알 수 있어요 | 다시다</title>
  <meta property="og:title" content="6월 모평 수학 21번, 어디서 무너졌는지 30초 진단" />
  <meta property="og:description" content="풀 줄 아는 문제를 또 틀리는 이유 — 풀이의 어느 단계가 어긋났는지 짚어드려요." />
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <main class="container">

    <!-- 상태 1: 문제 -->
    <section id="screen-problem">
      <p class="hook" id="hook-text"></p>
      <p class="source-label" id="source-label"></p>
      <img id="problem-image" alt="6월 모평 수학 21번 문제" />
      <form id="answer-form">
        <label for="answer-input" class="answer-label">정답 (자연수)</label>
        <input id="answer-input" type="number" inputmode="numeric" min="1" max="999"
               placeholder="답을 입력하세요" required />
        <button type="submit" class="btn-primary">채점하기</button>
      </form>
    </section>

    <!-- 상태 2: 풀이 선택 (오답일 때만) -->
    <section id="screen-method" hidden>
      <h2>아깝네요. 어떻게 푸셨어요?</h2>
      <p class="sub">가장 가까운 걸 골라주세요. 어디서 어긋났는지 짚어드릴게요.</p>
      <div id="method-options"></div>
    </section>

    <!-- 상태 3: 진단 / 지도 (같은 컴포넌트, 하이라이트만 다름) -->
    <section id="screen-result" hidden>
      <h2 id="result-title"></h2>
      <p id="result-comment"></p>
      <ol id="step-map" class="step-map"></ol>
      <p class="source-note" id="source-note"></p>
      <button id="btn-finish" class="btn-primary">이걸 내 오답에도 하고 싶다면</button>
    </section>

    <!-- 상태 4: 마무리 CTA -->
    <section id="screen-cta" hidden>
      <h2>다시다는 이걸 네 모든 오답에 해요</h2>
      <p>실제 모의고사와 같은 환경에서 풀고, 틀린 문제마다
         "풀이 어느 단계에서 어긋났는지"를 기록해요.</p>
      <a class="btn-primary" id="store-link"
         href="https://apps.apple.com/kr/app/dasida" target="_blank" rel="noopener">다시다 보러 가기</a>
      <p class="cta-sub">강요 아님. 이 페이지만 써도 돼요.</p>
    </section>

  </main>
  <script src="./problem-data.js"></script>
  <script src="./app.js"></script>
</body>
</html>
```

(스토어 링크 href는 Task 5에서 실제 iOS/안드 링크로 확정한다.)

- [ ] **Step 3: `web/styles.css` 작성 (모바일 우선)**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
    "Noto Sans KR", sans-serif;
  background: #f7f8fa; color: #1a1d21; line-height: 1.6;
}
.container { max-width: 480px; margin: 0 auto; padding: 24px 16px 48px; }
.hook { font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; }
.source-label { font-size: 0.8rem; color: #6b7280; margin-bottom: 16px; }
#problem-image { width: 100%; border-radius: 12px; background: #fff;
  border: 1px solid #e5e7eb; margin-bottom: 16px; }
.answer-label { display: block; font-size: 0.9rem; margin-bottom: 6px; }
#answer-input { width: 100%; padding: 14px; font-size: 1.1rem;
  border: 1px solid #d1d5db; border-radius: 10px; margin-bottom: 12px; }
.btn-primary { display: block; width: 100%; padding: 15px; font-size: 1rem;
  font-weight: 700; color: #fff; background: #2563eb; border: none;
  border-radius: 10px; text-align: center; text-decoration: none; cursor: pointer; }
h2 { font-size: 1.15rem; margin-bottom: 8px; }
.sub { font-size: 0.9rem; color: #4b5563; margin-bottom: 16px; }
.method-option { display: block; width: 100%; text-align: left; padding: 14px;
  margin-bottom: 10px; background: #fff; border: 1px solid #d1d5db;
  border-radius: 10px; font-size: 0.95rem; cursor: pointer; }
.step-map { list-style: none; margin: 16px 0; }
.step-map li { position: relative; padding: 12px 14px 12px 38px; margin-bottom: 8px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
.step-map li::before { content: attr(data-num); position: absolute; left: 12px;
  top: 12px; width: 20px; height: 20px; border-radius: 50%; background: #e5e7eb;
  font-size: 0.75rem; font-weight: 700; display: flex; align-items: center;
  justify-content: center; }
.step-map li.broken { border-color: #dc2626; background: #fef2f2; }
.step-map li.broken::before { background: #dc2626; color: #fff; }
.step-name { font-weight: 700; display: block; }
.step-desc { font-size: 0.85rem; color: #4b5563; }
.break-tag { display: inline-block; margin-top: 6px; font-size: 0.78rem;
  font-weight: 700; color: #dc2626; }
.source-note { font-size: 0.75rem; color: #9ca3af; margin-bottom: 20px; }
.cta-sub { font-size: 0.8rem; color: #6b7280; text-align: center; margin-top: 10px; }
#result-comment { margin-bottom: 4px; }
```

- [ ] **Step 4: 로컬 서버로 뼈대 확인**

```bash
python3 -m http.server 8000 --directory web
```

브라우저에서 `http://localhost:8000` 열기.
기대: 훅/출처는 아직 빈 상태지만, 문제 이미지가 보이고 답 입력창·버튼이 렌더링됨. 콘솔에 `problem-data.js`/`app.js` 404 에러는 정상 (다음 태스크에서 생성).

- [ ] **Step 5: Commit**

```bash
git add web/
git commit -m "feat(web): 1문제 진단 페이지 스캐폴드 (HTML/CSS + 문제 이미지)"
```

---

### Task 2: 문제 데이터 작성 (`problem-data.js`) — ⚠️ 기윤 검수 게이트

**Files:**
- Create: `web/problem-data.js`
- 참조: `data/exam/g3-calc-mock-2026-06/problems.json` (21번: 단답형, 정답 11, 극한·연속)

**문제 원문 (`web/assets/problem-21.webp`):**
> 최고차항 계수가 1인 삼차함수 f(x). 실수 t에 대하여 f(α) = f'(t) − 4t² + 4 를 만족시키는 실수 α의 **최댓값**을 g(t)라 하자. g(t)가 **t=3에서만 불연속**이고 g(3)=1일 때, f(2)의 값을 구하시오. [4점]

이 문제는 앱의 `limit` 공통 흐름("0/0 처리", "∞/∞ 최고차항")과 **층위가 다르다.** 21번을 틀리는 상위권은 0/0을 몰라서가 아니라, "가장 큰 실근의 점프 구조"와 "한 점에서만 불연속 → 접함" 번역에서 무너진다. 그래서 앱 공통 데이터를 재사용하지 않고 **21번 전용 단계 지도**를 쓴다.

- [ ] **Step 1: 실제 풀이 구조 확인 (아래가 확정 근거)**

내부적으로 검증한 풀이 흐름 (정답 f(2)=11, `problems.json`의 answer=11과 일치):
1. g(t) = "f(α) = k의 **가장 큰 실근**을 주는 함수" (k = f'(t)−4t²+4)
2. 삼차함수에서 가장 큰 실근은 k가 **극솟값을 지나는 순간 점프**한다 → 불연속의 정체
3. k(t)=f'(t)−4t²+4는 **위로 볼록한 포물선** → "t=3에서만" 불연속이려면 꼭짓점(t=3)에서 극솟값과 **접함** → 최고차/계수 확정
4. g(3)=1 → 접하는 순간의 g값 = 극소점 x좌표 확정
5. 계수 확정 후 f(2) 계산 → 11

- [ ] **Step 2: `web/problem-data.js` 작성**

```javascript
// 문제 1개 데이터. 문제를 교체할 때 이 파일만 바꾼다.
// 진단 단계 지도는 이 문제(21번) 전용 — 앱 공통 극한 흐름과 다름.
window.PROBLEM = {
  id: 'g3-calc-mock-2026-06-21',
  sourceLabel: '2027학년도 6월 모의평가 수학 (공통) 21번 · 4점',
  image: './assets/problem-21.webp',
  answer: 11,
  hook: '풀 줄 아는 문제인데, 시험만 보면 또 틀리지 않나요?',

  // 21번 실제 풀이 단계 지도
  steps: [
    { name: 'g(t) 해석', desc: '"f(α) = k의 가장 큰 실근을 주는 함수"로 읽어낸다. (k = f′(t)−4t²+4)' },
    { name: '불연속의 정체 찾기', desc: '삼차함수에서 가장 큰 실근은 k가 극솟값을 지나는 순간 점프한다 — 여기가 불연속의 원인.' },
    { name: '"t=3에서만" 번역', desc: 'k(t)는 위로 볼록한 포물선. 딱 한 점에서만 불연속이려면 꼭짓점 t=3에서 극솟값과 접해야 한다.' },
    { name: 'g(3)=1 대입', desc: '접하는 순간의 g값으로 극소점 위치를 확정한다.' },
    { name: '계수 확정·계산', desc: 'f(x)를 완성하고 f(2)를 계산한다. → 11' },
  ],

  // 오답자용: "어떻게 풀었어요?" 선택지 → 어긋난 단계
  approaches: [
    { label: 'g(t)가 뭘 뜻하는지부터 못 잡았다', brokenStep: 0,
      comment: '첫 단계예요. g(t)를 "가장 큰 실근을 주는 함수"로 못 읽으면 이 문제는 안 풀려요.' },
    { label: 'g(t)는 알겠는데, 왜 불연속이 생기는지 못 찾았다', brokenStep: 1,
      comment: '여기가 이 문제의 진짜 발상 지점이에요. "가장 큰 실근이 극솟값에서 점프한다"를 못 보면 여기서 멈춰요.' },
    { label: '극솟값 만나는 것까진 갔는데 "t=3에서만"을 못 써먹었다', brokenStep: 2,
      comment: '조건 번역에서 어긋났어요. "한 점에서만 = 접함"으로 바꾸는 게 열쇠예요.' },
    { label: '구조는 다 잡았는데 계수 확정/계산에서 꼬였다', brokenStep: 4,
      comment: '발상은 살아 있어요. 무너진 건 마지막 계산 단계 하나예요.' },
  ],

  // 정답자용: 이 문제에서 가장 많이 무너지는 단계
  commonBreak: {
    stepIndex: 1,
    comment: '맞히셨네요. 근데 이 문제, 사람들은 대부분 여기서 무너져요 — "가장 큰 실근이 극솟값에서 점프한다"를 못 보는 지점이요.',
  },

  sourceNote: '※ "무너지는 단계"는 실제 방문자 통계가 아니라 다시다 약점 분석 기준입니다.',
};
```

- [ ] **Step 3: 기윤 검수 (게이트)**

위 풀이 구조는 내부 검증본이고 정답은 공식 정답(11)과 일치하지만, 기윤이 가진 6월 모평 21번 **해설지와 한 번 대조**해서 단계 문구를 확정한다. **확정 전에는 Task 3으로 넘어가지 않는다.** (앱 데이터 검증과 같은 기준 — 정직 원칙)

- [ ] **Step 4: Commit**

```bash
git add web/problem-data.js
git commit -m "feat(web): 6모 수학 21번 전용 진단 데이터 (실제 풀이 기반, 기윤 검수 완료)"
```

---

### Task 3: 상태 전환 + 렌더링 (`app.js`)

**Files:**
- Create: `web/app.js`

- [ ] **Step 1: `web/app.js` 작성**

```javascript
(function () {
  const P = window.PROBLEM;

  const screens = {
    problem: document.getElementById('screen-problem'),
    method: document.getElementById('screen-method'),
    result: document.getElementById('screen-result'),
    cta: document.getElementById('screen-cta'),
  };

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    window.scrollTo(0, 0);
  }

  // ----- 상태 1: 문제 렌더링 -----
  document.getElementById('hook-text').textContent = P.hook;
  document.getElementById('source-label').textContent = P.sourceLabel;
  document.getElementById('problem-image').src = P.image;

  document.getElementById('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const value = Number(document.getElementById('answer-input').value);
    if (value === P.answer) {
      renderResult({
        title: '정답이에요 👏',
        comment: P.commonBreak.comment,
        brokenStep: P.commonBreak.stepIndex,
        breakTag: '사람들이 가장 많이 무너지는 단계',
      });
    } else {
      renderMethodOptions();
      show('method');
    }
  });

  // ----- 상태 2: 풀이 선택 (오답) -----
  function renderMethodOptions() {
    const box = document.getElementById('method-options');
    box.innerHTML = '';
    P.approaches.forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'method-option';
      btn.textContent = a.label;
      btn.addEventListener('click', () => {
        renderResult({
          title: '여기서 어긋났어요',
          comment: a.comment,
          brokenStep: a.brokenStep,
          breakTag: '어긋난 단계',
        });
      });
      box.appendChild(btn);
    });
  }

  // ----- 상태 3: 진단/지도 (공용 컴포넌트) -----
  function renderResult({ title, comment, brokenStep, breakTag }) {
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-comment').textContent = comment;
    const map = document.getElementById('step-map');
    map.innerHTML = '';
    P.steps.forEach((s, i) => {
      const li = document.createElement('li');
      li.dataset.num = String(i + 1);
      if (i === brokenStep) li.classList.add('broken');
      li.innerHTML =
        '<span class="step-name"></span><span class="step-desc"></span>' +
        (i === brokenStep ? '<span class="break-tag"></span>' : '');
      li.querySelector('.step-name').textContent = s.name;
      li.querySelector('.step-desc').textContent = s.desc;
      if (i === brokenStep) li.querySelector('.break-tag').textContent = '⚡ ' + breakTag;
      map.appendChild(li);
    });
    document.getElementById('source-note').textContent = P.sourceNote;
    show('result');
  }

  // ----- 상태 4: 마무리 -----
  document.getElementById('btn-finish').addEventListener('click', () => show('cta'));

  show('problem');
})();
```

- [ ] **Step 2: 4개 상태 수동 검증 (데스크톱 브라우저)**

```bash
python3 -m http.server 8000 --directory web
```

`http://localhost:8000`에서 순서대로:

| 시나리오 | 조작 | 기대 결과 |
|---|---|---|
| 정답 | `11` 입력 → 채점 | "정답이에요 👏" + 단계 지도에서 2번째 단계 빨간 하이라이트 + 출처 문구 |
| 오답 | 새로고침 → `7` 입력 → 채점 | "어떻게 푸셨어요?" 선택지 4개 |
| 진단 | 선택지 2번째 클릭 | "여기서 어긋났어요" + 해당 단계 하이라이트 + 코멘트 |
| CTA | "이걸 내 오답에도…" 클릭 | 다시다 소개 + 스토어 링크 화면 |
| 무입력 | 빈 채로 채점 | 브라우저 기본 required 경고, 화면 전환 없음 |

콘솔 에러 0개 확인.

- [ ] **Step 3: Commit**

```bash
git add web/app.js
git commit -m "feat(web): 진단 페이지 상태 전환 + 단계 지도 렌더링"
```

---

### Task 4: 모바일 실기기 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 같은 Wi-Fi에서 실기기 접속**

```bash
# Mac IP 확인
ipconfig getifaddr en0
python3 -m http.server 8000 --directory web
```

iPhone 사파리에서 `http://<Mac IP>:8000` 접속.

- [ ] **Step 2: 모바일 체크리스트 (스펙 8·9절 성공 기준)**

- [ ] 문제 이미지가 세로 화면에서 읽을 수 있는 크기로 보인다 (핀치줌 없이)
- [ ] 숫자 입력 시 숫자 키패드가 뜬다 (`inputmode="numeric"` 동작)
- [ ] 정답/오답/진단/CTA 4개 상태 전부 통과, 가로 스크롤 없음
- [ ] 문제 보고 → 답 입력 → 진단까지 끊김 없이 1분 내 도달
- [ ] (가능하면) 안드로이드 크롬에서 동일 체크

- [ ] **Step 3: 발견된 문제 수정 후 Commit** (수정이 있었던 경우만)

```bash
git add web/
git commit -m "fix(web): 모바일 실기기 검증 반영"
```

---

### Task 5: 스토어 링크 확정 + 배포 (Vercel)

**Files:**
- Modify: `web/index.html` (스토어 링크 1곳)

- [ ] **Step 1: 실제 스토어 링크 확정**

기윤에게 확인받아 `#store-link`의 href를 실제 링크로 교체한다.
- iOS App Store 링크와 Google Play 링크 중 **하나로 통일할지, OS 감지로 나눌지 기윤이 선택** (v1 권장: 링크 하나 — 오르비는 태블릿/아이패드 비중 높으므로 App Store 우선. OS 감지는 v2)

- [ ] **Step 2: Vercel 배포**

```bash
cd web
npx vercel --prod
```

첫 실행 시 로그인/프로젝트 생성 프롬프트가 뜨면 기윤이 진행 (프로젝트명 예: `dasida-one-problem`). 완료되면 `https://<project>.vercel.app` URL 출력.

- [ ] **Step 3: 배포된 URL에서 모바일 재검증**

실기기(셀룰러 데이터로, Wi-Fi 아님)에서 배포 URL 접속 → Task 4 체크리스트 중 4개 상태 통과 + 이미지 로딩 속도 확인.

- [ ] **Step 4: Commit + 마무리 기록**

```bash
git add web/index.html
git commit -m "feat(web): 스토어 링크 확정 + Vercel 배포"
git push origin main
```

- Notion "DASIDA 개발 기록" 페이지 상태 → 구현완료, 배포 URL 기록
- 데일리 로그에 배포 URL 한 줄 추가

---

## 범위 밖 재확인 (스펙 7절)

이 계획에 없으면 만들지 않는다: 문제 2개 이상, 방문자 통계 수집, 회원가입/오답 저장, 딥링크, Expo 웹 빌드, 커스텀 도메인, 자동 테스트.
