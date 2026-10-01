(function () {
  // ── 설정 ──
  const PROJECT_ID = 'dasida-app';
  const ANALYZE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;
  // 엔딩의 스토어 버튼이 쓴다. 1.0.8(사진 기능)이 양쪽 스토어에 떠 있는 걸 확인하고 되살렸다 (09.23).
  // 스토어 링크 출처: iOS는 eas.json의 ascAppId(6761792023), 안드로이드는 app.json의 android.package(com.dasida.app).
  const STORE_URL_IOS = 'https://apps.apple.com/kr/app/id6761792023';
  const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=com.dasida.app';
  function storeUrl() {
    // iPadOS 13+ 사파리는 기본이 데스크톱 모드라 UA에 'iPad'가 아니라 'Macintosh'로 찍힌다.
    // 그래서 UA 정규식만으로는 실제 아이패드를 거의 못 잡는다 — '터치 되는 Mac'(=아이패드)을 함께 본다.
    // 이 검사를 지우면 아이패드 학생이 플레이스토어로 간다.
    const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /iPhone|iPad|iPod/.test(navigator.userAgent) || isIpadOs ? STORE_URL_IOS : STORE_URL_ANDROID;
  }

  // GA4 — analytics.js가 window.track을 정의한다. 없으면(로컬·차단) 조용히 넘어간다.
  const logEvent = (name, params = {}) => {
    if (typeof window.track === 'function') window.track(name, params);
  };

  // 사용량 원장(photoAnalysisRuns)에 실을 값 — 설계 docs/superpowers/specs/2026-09-23-photo-usage-log-design.md §4.
  // 참여 코드: 기윤이 학생마다 만들어 링크 `?p=코드`로 준다. 한 번 들어오면 링크 없이 다시 와도 이어진다.
  // 형식은 서버 PARTICIPANT_ID_PATTERN(functions/src/photo-analysis-run-log.ts)과 같게 — 틀리면 무시.
  const PARTICIPANT_ID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
  // 어느 링크로 왔나(yt_short6_pin·insta…) — 서버 UTM_SOURCE_PATTERN과 같게. 설계 docs/research/2026-09-27-utm-ledger-astra-fable.md
  const UTM_SOURCE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
  // 주소 값을 먼저 읽는다 — 저장이 막혀도(사파리 프라이빗) 이번 제출엔 싣는다. 안 그러면 QA 사진이 진짜 제출로 찍힌다
  const params = new URLSearchParams(location.search);
  const urlP = params.get('p');
  const urlQa = params.get('qa');
  const urlUtm = params.get('utm_source');
  let participantId = urlP && PARTICIPANT_ID_PATTERN.test(urlP) ? urlP : null;
  let isQa = urlQa !== null && urlQa !== '0' && urlQa !== 'off';
  let utmSource = urlUtm && UTM_SOURCE_PATTERN.test(urlUtm) ? urlUtm : null;
  let utmSeenAt = utmSource ? new Date().toISOString() : null;
  try {
    // ?qa=1 저장은 analytics.js가 먼저 한다. 쓰기만 막혀 저장이 비었어도 주소의 qa=1은 안 지운다.
    // 쓰기보다 먼저 읽는다 — 아래 쓰기가 던져도 저장된 qa=1을 건너뛰지 않게 (09.27 astra·Fable)
    if (localStorage.getItem('dasida_qa') === '1') isQa = true;
    if (participantId) localStorage.setItem('dasida_participant', participantId);
    const stored = localStorage.getItem('dasida_participant');
    participantId = stored && PARTICIPANT_ID_PATTERN.test(stored) ? stored : null;
    // 다른 이름표일 때만 덮고 시각을 새로 — reload()가 쿼리를 들고 다시 열 때마다 시각이 밀리면 안 된다
    if (utmSource && localStorage.getItem('dasida_utm_source') !== utmSource) {
      // 옛 시각부터 지운다 — 시각 쓰기만 실패해도 새 이름표에 옛 링크 시각이 붙지 않고 null로 읽힌다 (09.27 astra·Fable)
      localStorage.removeItem('dasida_utm_seen_at');
      localStorage.setItem('dasida_utm_source', utmSource);
      localStorage.setItem('dasida_utm_seen_at', utmSeenAt);
    }
    const storedUtm = localStorage.getItem('dasida_utm_source');
    utmSource = storedUtm && UTM_SOURCE_PATTERN.test(storedUtm) ? storedUtm : null;
    utmSeenAt = utmSource ? localStorage.getItem('dasida_utm_seen_at') : null;
  } catch {
    // 사파리 프라이빗 등에서 막히면 이번 주소의 값만 메모리에 두고 싣는다
  }
  const host = location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '';

  const F = window.DasidaFlow;
  // 대본(무슨 말 · 어떤 버튼 · 누르면 어디로)은 번들의 공용 모듈이다 — 앱 훅과 같은 글자(B, 10.01).
  // 여기는 화면·업로드·대기·GA·곡선만. 대본 글자를 바꾸려면 features/photo/script/photo-script.ts를 고친다.
  // 설계 docs/research/2026-10-01-b-shared-script-design.md
  let script = null;

  // ── 화면 전환 ──
  const screens = {
    upload: document.getElementById('screen-upload'),
    analyzing: document.getElementById('screen-analyzing'),
    chat: document.getElementById('screen-chat'),
  };
  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    window.scrollTo(0, 0);
    if (name === 'analyzing') { startAnalyzingSteps(); startWaitCards(); } else stopAnalyzingSteps();
  }

  // ── 분석 중 문구 ──
  // 실제로는 vision 호출 한 번이라 진행률이 없다. 가짜 퍼센트 막대는 정직 라벨에 어긋나므로,
  // AI가 실제로 하는 일들을 20초씩 돌려 보여준다(통과 사진 65~110초, 10.01 설계). 80초를 넘기면 더 걸린다고 인정한다 —
  // "30초"라고 해놓고 계속 우기면 그때부터 화면 전체가 안 믿긴다. 마지막 문구에 숫자 상한을 안 쓴다 —
  // fetch 195초에 축소·전송이 더해져 "3분"은 거짓이 된다 (10.01 Fable 정정).
  const ANALYZING_STEPS = [
    '사진에서 네 손글씨 읽는 중…',
    '어떤 방법으로 풀었는지 보는 중…',
    '해설이랑 한 줄씩 맞춰보는 중…',
    '처음 갈라진 데 찾는 중…',
  ];
  const ANALYZING_OVERTIME = '아직 보는 중이야. 너무 오래 걸리면 내가 멈추고 알려줄게';
  const ANALYZING_STEP_MS = 20_000;
  let analyzingTimer = null;
  function startAnalyzingSteps() {
    const el = document.getElementById('analyzing-step');
    if (!el) return;
    stopAnalyzingSteps();
    let i = 0;
    el.textContent = ANALYZING_STEPS[0];
    analyzingTimer = setInterval(() => {
      i += 1;
      const next = i < ANALYZING_STEPS.length ? ANALYZING_STEPS[i] : ANALYZING_OVERTIME;
      el.style.opacity = '0';
      setTimeout(() => { el.textContent = next; el.style.opacity = '1'; }, 250);
      if (i >= ANALYZING_STEPS.length) stopAnalyzingSteps(); // 마지막 문구에서 멈춘다
    }, ANALYZING_STEP_MS);
  }
  function stopAnalyzingSteps() {
    if (analyzingTimer) { clearInterval(analyzingTimer); analyzingTimer = null; }
  }

  // ── 대기 중 예시 오답노트 (10.01 astra·Fable 둘 다 A안, 기윤 OK) ──
  // 학생이 탭을 떠나지 않게 읽을거리를 준다. 입력·채점이 없어 결과가 언제 와도(즉시 chat 전환) 잃는 게 없다.
  // 학생 사진과 무관한 예시라 "네 사진 아님"을 늘 붙인다. 시작 카드는 매번 무작위 — 다시 온 학생도 첫 장이 바뀐다.
  // 카드를 늘릴 땐 이 목록에만 넣는다. 수학은 math-checker, 문구는 target-student를 먼저 거친다.
  const WAIT_CARDS = [
    {
      problem: 'f(x) = x³ − 3x² + 3x 의 극값을 구하시오.',
      lines: ["f'(x) = 3x² − 6x + 3 = 0", 'x = 1', '극값 f(1) = 1'],
      bad: 2,
      why: "f'(x)=3(x−1)²≥0이라 x=1 앞뒤로 부호가 안 바뀌어. 극값은 없어",
      fix: "f'=0 찾으면 앞뒤 부호부터 보기",
    },
    {
      problem: '곡선 y = x² − 1 과 x축, x=0, x=2 로 둘러싸인 넓이는?',
      lines: ['∫<span class="lim"><span>2</span><span>0</span></span> (x² − 1) dx', '= 8/3 − 2', '= 2/3'],
      bad: 0,
      why: '0~1에서 그래프가 x축 아래라, 더해야 할 넓이를 뺐어. 넓이는 2',
      fix: 'x축 아래로 내려가는 구간부터 찾기',
    },
    {
      problem: 'log₂(x−1) + log₂(x−3) = 3 을 풀어라.',
      lines: ['(x−1)(x−3) = 8', 'x² − 4x − 5 = 0', '답: x = 5 또는 x = −1'],
      bad: 2,
      why: '진수 조건 x>3을 안 봐서 x=−1을 남겼어',
      fix: '로그 풀면 진수 조건부터 대보기',
    },
  ];
  let waitCardIndex = 0;
  function renderWaitCard() {
    const card = WAIT_CARDS[waitCardIndex];
    document.getElementById('wait-count').textContent = `${waitCardIndex + 1}/${WAIT_CARDS.length} · 네 사진 아님`;
    document.getElementById('wait-problem').textContent = card.problem;
    const solution = document.getElementById('wait-solution');
    solution.textContent = '';
    card.lines.forEach((line, i) => {
      const row = document.createElement('div');
      if (i === card.bad) row.className = 'bad';
      row.innerHTML = line; // 위 상수만 들어온다(학생 데이터 아님) — 적분 위끝·아래끝 표기 때문에 HTML

      solution.appendChild(row);
    });
    document.getElementById('wait-why').textContent = card.why;
    document.getElementById('wait-fix').textContent = card.fix;
  }
  // 옛 index.html이 캐시에 남은 채 새 app.js가 오면 카드 자리가 없다 — 그때 대기·분석 흐름까지 죽지 않게 조용히 건너뛴다
  function startWaitCards() {
    if (!document.getElementById('wait-problem')) return;
    waitCardIndex = Math.floor(Math.random() * WAIT_CARDS.length);
    renderWaitCard();
  }
  document.getElementById('wait-next')?.addEventListener('click', () => {
    waitCardIndex = (waitCardIndex + 1) % WAIT_CARDS.length;
    renderWaitCard();
    // 읽을거리가 붙잡는지 — 넘김 수 × analysis_hidden으로 본다. card_index는 GA 맞춤 측정기준 등록 뒤부터 보인다
    logEvent('wait_card_next', { ...waitParams(), card_index: waitCardIndex });
  });

  // ── 수식 표기 (원희 피드백 규칙 1호: 지수는 위첨자로 — a^2 ✗ → a² ○) ──
  // 글자 규칙은 앱과 같은 함수 하나(components/math/format-math-text.ts, 번들로 온다).
  // 손으로 쓴 시험지 모양과 같아야 학생이 안 튕긴다. AI가 읽어준 풀이 인용·확인 문제·
  // 번들 데이터의 ^ 표기를 화면에 닿기 직전(채팅 프리미티브)에 전부 변환한다.
  function fmtMath(input) { return F.formatMathText(input); }

  // 수식은 문장과 다른 서체로 읽힌다 — fmtMath가 만든 문자열에서 수식 구간만 공라내 <span class="m">으로 감싼다.
  // innerHTML을 쓰지 않는다 — AI 응답이 그대로 들어오므로 노드로만 쌓는다.
  const SUP = '\\u00b2\\u00b3\\u00b9\\u2070-\\u209f\\u1d43-\\u1dbf\\u2c7c'; // 2c7c = ⱼ
  const MATH_TRIGGER = new RegExp('[=×⁄√≤≥≠_' + SUP + ']');
  const MATH_RUN = new RegExp('[A-Za-z0-9_(√][A-Za-z0-9_^(){}\\[\\]+\\-−×÷⁄√≤≥≠=.,:\\s' + SUP + ']*', 'g');
  function mathSpan(token, source, start) {
    const el = document.createElement('span');
    // 앞글자가 따옴표면 "네가 쓴 그 줄"을 인용한 것 — 칩으로 한 번 더 세게 잡는다.
    el.className = source[start - 1] === '"' ? 'm q' : 'm';
    // a_n은 fmtMath가 이미 aₙ 글자로 바꿔 온다 — 앱 Text엔 <sub>가 없어 둘 다 유니코드로 맞췄다.
    el.textContent = token;
    return el;
  }
  function mathFrag(text) {
    const s = fmtMath(text);
    const frag = document.createDocumentFragment();
    let cursor = 0, m;
    MATH_RUN.lastIndex = 0;
    while ((m = MATH_RUN.exec(s))) {
      const start = m.index;
      const token = m[0].replace(/[\s.,:]+$/, '');
      if (!token || !MATH_TRIGGER.test(token)) {
        if (MATH_RUN.lastIndex <= start) MATH_RUN.lastIndex = start + 1;
        continue;
      }
      if (start > cursor) frag.appendChild(document.createTextNode(s.slice(cursor, start)));
      frag.appendChild(mathSpan(token, s, start));
      cursor = start + token.length;
      MATH_RUN.lastIndex = cursor;
    }
    if (cursor < s.length) frag.appendChild(document.createTextNode(s.slice(cursor)));
    return frag;
  }
  function setMath(el, text) { el.textContent = ''; el.appendChild(mathFrag(text)); }

  // ── 채팅 프리미티브 ──
  const thread = document.getElementById('thread');
  const actionsBox = document.getElementById('actions');
  // 연달아 나오는 코치 말은 새 말풍선을 만들지 않고 '문단'으로 이어 붙인다.
  // 한 생각 = 한 덩어리. 문단 사이는 .p 간격, 문단 안 \n은 pre-wrap 그대로.
  // 단, 이미 답을 기다리는 말풍선(.ask)에는 붙이지 않는다 — 질문 덩어리는 닫아 둔다.
  function para(text) {
    const p = document.createElement('span');
    p.className = 'p';
    setMath(p, text);
    // 문단 전체가 수식 하나면 줄밖으로 내려 크게 않힌다 (칠판 줄).
    if (p.childNodes.length === 1 && p.firstChild.classList?.contains('m')) p.classList.add('math-line');
    return p;
  }
  function coachSays(text) {
    const last = thread.lastElementChild;
    if (last && last.classList.contains('bubble') && last.classList.contains('coach') && !last.classList.contains('ask')) {
      last.appendChild(para(text));
      last.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return last;
    }
    return bubble('coach', text);
  }
  function userSays(text) { bubble('me', text); }
  function bubble(who, text) {
    const el = document.createElement('div');
    el.className = 'bubble ' + who;
    el.appendChild(para(text));
    thread.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return el;
  }
  // 답할 차례임을 말풍선에 표시 — 버튼이 붙는 그 말풍선만 색이 바뀌고,
  // 덩어리의 마지막 문단(=실제 질문)이 굵게 도드라진다.
  function markAsk() {
    const last = thread.lastElementChild;
    if (last && last.classList.contains('bubble') && last.classList.contains('coach')) last.classList.add('ask');
  }
  function cardEl(title, body, extraClass) {
    const el = document.createElement('div');
    el.className = 'card' + (extraClass ? ' ' + extraClass : '');
    el.innerHTML = '<div class="card-title"></div><div class="card-body"></div>';
    setMath(el.querySelector('.card-title'), title);
    setMath(el.querySelector('.card-body'), body || '');
    thread.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  function setActions(buttons) {
    markAsk();
    actionsBox.innerHTML = '';
    buttons.forEach(({ label, kind, onPress }) => {
      const b = document.createElement('button');
      if (kind) b.className = kind;
      setMath(b, label);
      b.addEventListener('click', () => { actionsBox.innerHTML = ''; onPress(); });
      actionsBox.appendChild(b);
    });
    // 말풍선만 스크롤하면 본문이 긴 화면(재도전·엔딩)에서 버튼이 통째로 화면 밖에 남는다.
    // block:'end'가 아니라 'nearest'인 이유 — 전체 목록(31개)처럼 화면보다 긴 줄에서는
    // 'end'가 목록 끝까지 내려가 질문을 1000px 넘게 밀어낸다. 'nearest'는 짧은 줄에선 'end'와 같다.
    actionsBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── 화면 1: 업로드 ──
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const picked = document.getElementById('picked');
  const cta = document.getElementById('cta');
  let selectedFile = null;
  // 사진을 고를 때마다 새로 — 같은 사진으로 다시 누르면 같은 값이 가서 원장이 재시도로 가른다 (설계 §4)
  let submissionId = null;
  // 게이트 화면(사진 거르기)에서 [다시 찍기]로 왔으면 직전 submissionId — resetUpload가 옮겨 담는다.
  // 새로고침(restart)은 안 잇는다 (10.01 설계 §3 submissionId 규칙)
  let retakeOf = null;
  let uploadedImageDataUrl = null; // 오답노트 카드에 "내 풀이 사진"으로 다시 쓴다 (축소본 재사용 — 재인코딩 없음)
  // 대기 재기(09.28, Fable 최종 — docs/research/2026-09-28-wait-time-tracking-astra-fable.md).
  // 학생이 느낀 대기(축소+전송+분석)는 원장 durationMs(AI 호출만)와 달라 여기서 잰다. GA로만 보낸다.
  let waitStartedAt = 0;
  let attempt = 0; // 같은 사진(submissionId) 몇 번째 시도인가 — 원장은 재시도를 같은 submissionId로 본다
  let waitHidden = false; // 대기 화면에서 한 번이라도 숨겨졌나 — 돌아왔는지는 analysis_returned로 본다(analysis_shown은 안 봐도 찍힌다)
  // 돌아옴 재기(10.01, Fable 설계 · astra 안). shown 자리는 09.28 결정대로 안 옮긴다 — 복귀는 별도 이벤트로.
  let waitHiddenAt = 0;
  let waitReturned = false;
  let waitOutcome = null; // 'result' | 'gate' | 'failed' — 돌아온 순간 어느 화면이었나
  const waitParams = () => ({ wait_ms: Math.round(Date.now() - waitStartedAt), submission_id: submissionId, attempt });
  function logLeaveWhileWaiting() {
    if (screens.analyzing.hidden || waitHidden || !waitStartedAt) return; // 대기 화면에서만, 시도당 1회
    waitHidden = true;
    waitHiddenAt = Date.now();
    logEvent('analysis_hidden', waitParams());
  }
  // 대기 중 숨겨졌던 시도의 첫 복귀, 시도당 1회. 결과·거르기·실패 이벤트 직전에도 부른다 —
  // visible 이벤트를 안 주는 브라우저(앱 안 브라우저)와 사파리의 콜백 순서를 "returned → shown"으로 고정한다
  function logReturnWhileWaiting() {
    if (!waitHidden || waitReturned || document.visibilityState !== 'visible') return;
    waitReturned = true;
    logEvent('analysis_returned', { ...waitParams(), away_ms: Math.round(Date.now() - waitHiddenAt), return_screen: waitOutcome || 'waiting' });
  }
  const visibleNow = () => (document.visibilityState === 'visible' ? 1 : 0);
  // 폰 사파리·앱 안 브라우저는 닫을 때 pagehide가 안 올 수 있어 둘 다 건다(짐작, 폰 실측 전)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') logLeaveWhileWaiting(); else logReturnWhileWaiting();
  });
  window.addEventListener('pagehide', logLeaveWhileWaiting);

  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    setFile(fileInput.files[0]);
    fileInput.value = ''; // 같은 파일 재선택 시 change가 다시 발화하도록
  });
  ['dragover', 'dragenter'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (ev) => { const f = ev.dataTransfer.files[0]; if (f) setFile(f); });

  function setFile(f) {
    if (!f) return;
    selectedFile = f;
    submissionId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;
    attempt = 0;
    script?.dispose(); // 옛 대화에서 늦게 깬 검산·diagnose가 아무것도 안 하게
    script = null;
    picked.textContent = '✓ ' + f.name;
    picked.style.display = 'block';
    cta.classList.add('ready');
  }

  // 사진 거르기에 걸린 뒤 [다시 찍기] — 새로고침 대신 업로드 화면으로 되돌린다(새로고침하면 retakeOf가 사라진다).
  // 제출 때 막은 버튼(아래 cta 클릭의 cta.disabled = true)은 show('upload')도 setFile도 안 되살린다 — 여기서 푼다 (astra ②)
  function resetUpload() {
    retakeOf = submissionId; // setFile이 새 id를 만들기 전에 옮겨 담는다
    script?.dispose();
    script = null;
    selectedFile = null;
    fileInput.value = '';
    picked.textContent = '';
    picked.style.display = 'none';
    cta.classList.remove('ready');
    cta.disabled = false;
    // 게이트 말풍선이 다음 분석 대화 위에 남지 않게
    thread.textContent = '';
    actionsBox.textContent = '';
    show('upload');
  }

  // 마감 사슬 AI 150초 → 서버 함수 180초 → 여기 195초. 서버는 이 값 − 15초(최대 177초)를 응답 예산으로 쓴다.
  // 사진 크기·회전은 서버가 받은 축소본으로 서버 한 곳에서 거른다 — 클라이언트 선검사는 없다(원장 행이 사라진다)
  const ANALYZE_CLIENT_DEADLINE_MS = 195_000;

  cta.addEventListener('click', async () => {
    if (!selectedFile || cta.disabled) return;
    cta.disabled = true; // 더블클릭 → vision 이중 호출(이중 과금) 방지. 게이트 [다시 찍기]는 resetUpload가 푼다
    waitStartedAt = Date.now();
    attempt += 1;
    waitHidden = false;
    waitHiddenAt = 0;
    waitReturned = false;
    waitOutcome = null;
    show('analyzing');
    // 깔때기 1 — 방문이 아니라 "실제로 사진을 올린" 수. attempt를 실어 재시도 뺀 분모(attempt=1)를 바로 본다
    logEvent('photo_submit', { ...waitParams(), ...(retakeOf ? { retake_of: retakeOf } : {}) });

    let imageDataUrl;
    try {
      imageDataUrl = await downscaleToDataUrl(selectedFile, 0.82);
      uploadedImageDataUrl = imageDataUrl;
    } catch {
      logReturnWhileWaiting();
      logEvent('analysis_failed', { ...waitParams(), stage: 'downscale', was_hidden: waitHidden ? 1 : 0 }); // 전엔 이 실패가 아무 데도 안 찍혔다
      waitOutcome = 'failed';
      show('upload');
      cta.disabled = false;
      alert('이 사진 형식을 못 읽었어. jpg나 png 사진으로 다시 시도해줘.');
      return;
    }

    try {
      const response = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // participantId·submissionId·utm·retakeOf 값이 null이면 JSON.stringify가 그대로 null을 싣고, 서버는 없는 것으로 본다.
        // clientDeadlineMs는 "긴 마감을 아는 클라이언트" 표식 — 없으면 서버는 옛 57초 예산으로 돈다
        body: JSON.stringify({
          imageDataUrl, channel: 'web', participantId, submissionId, qa: isQa || isLocal, utmSource, utmSeenAt,
          retakeOf, clientDeadlineMs: ANALYZE_CLIENT_DEADLINE_MS,
        }),
        signal: AbortSignal.timeout(ANALYZE_CLIENT_DEADLINE_MS),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();
      show('chat');
      onAnalysisResult(result);
    } catch (error) {
      // 실패도 센다 — 안 세면 photo_submit만 찍히고 사라져 "대기 중 이탈"과 안 갈림
      logReturnWhileWaiting();
      logEvent('analysis_failed', { ...waitParams(), stage: 'request', was_hidden: waitHidden ? 1 : 0, message: String(error?.message || error).slice(0, 90) });
      waitOutcome = 'failed';
      console.error('analyzePhoto 실패', error); // 원문은 여기까지만 — 학생 화면엔 안 나간다
      show('upload');
      cta.disabled = false;
      // 09.30 바꿈(astra 안 · Fable 최종 · 기윤 OK). 옛 문구 "잠깐 늦어졌어. 한 번만 다시 눌러줄래?"는
      // 긴 풀이 시간 초과에서 학생이 4번 다시 눌러 4번 52초를 기다리게 했고, 학생은 "내 오답이라 못 잡았다"로 읽었다.
      // 다시 눌러도 같은 사진은 같게 실패한다 → 재시도를 권하지 않고, 판단을 못 했다는 사실만 말한다. 앱 문구는 1.0.10 때.
      alert('분석을 끝내지 못했어. 이번에는 풀이가 맞는지 틀렸는지 판단하지 못했어.');
    }
  });

  // 사진 축소 — 전송량·비용 절감 (JPEG 0.82). 10.01 바꿈(Fable 최종 · astra 긴 변 상한): 긴 변 1568 → 픽셀 총량 1176×1568 + 긴 변 2048.
  // 긴 변 기준은 세로 긴 사진(스크린샷·세로로 자른 사진)의 짧은 변을 800 밑으로 눌러, 원본이 커도 서버 거르기에 걸렸다.
  // 카메라 3:4 사진은 지금과 같은 1176×1568. 서버 800 기준은 이 값을 모른다 — 800을 옮겨도 여기는 안 바꾼다.
  const DOWNSCALE_MAX_PIXELS = 1176 * 1568;
  const DOWNSCALE_MAX_LONG_SIDE = 2048; // 모델이 이보다 긴 변을 다시 줄이면 "거르기 통과, 모델은 더 작게"가 된다(astra 인용, 확인 안 함)
  async function downscaleToDataUrl(file, quality) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(
      1,
      Math.sqrt(DOWNSCALE_MAX_PIXELS / (bitmap.width * bitmap.height)),
      DOWNSCALE_MAX_LONG_SIDE / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close(); // 원본 해상도 비트맵 메모리 즉시 해제
    return canvas.toDataURL('image/jpeg', quality);
  }

  // ── 분석 결과 → 대본 ──
  function onAnalysisResult(result) {
    // 사진 거르기에 걸림(서버 gate) — 분석 결과가 아니므로 analysis_shown 대신 analysis_gate로 센다
    const gateDecision = result.gate?.decision;
    if (typeof gateDecision === 'string' && gateDecision.startsWith('blocked')) {
      logReturnWhileWaiting();
      logEvent('analysis_gate', { ...waitParams(), was_hidden: waitHidden ? 1 : 0, visible: visibleNow(), decision: gateDecision });
      waitOutcome = 'gate';
    } else {
      // 깔때기 1.5 — 분석 결과가 화면에 닿은 수. photo_submit과의 차 = 대기 중 이탈(+실패).
      // error_found: AI가 오류 후보를 확신 있게 찾았나 — note_shown/weakness_card_shown 비율의 예고편.
      logReturnWhileWaiting();
      // visible: 도착 순간 화면이 보였나 — 숨긴 채 도착하면 "봤다"로 안 센다(돌아오면 analysis_returned가 result로 찍힌다)
      logEvent('analysis_shown', {
        ...waitParams(),
        was_hidden: waitHidden ? 1 : 0,
        visible: visibleNow(),
        has_work: result.hasSolvingWork ? 1 : 0,
        error_found: result.errorCandidates?.length > 0 && result.errorConfidence >= F.ERROR_CONFIDENCE_MIN ? 1 : 0,
      });
      waitOutcome = 'result';
    }
    script?.dispose();
    script = F.createPhotoScript(webIO, {
      verifyQuiz: F.requestQuizVerify,
      diagnoseMethod: (text) => F.requestDiagnoseMethod(text, { problemId: 'photo-flow-web' }), // 사진 flow는 문제를 미리 모른다 → 로그 구분용 고정 id
      submissionId,
      qa: isQa || isLocal,
      photoUri: uploadedImageDataUrl,
      // 약점 고르기는 앱만 — 웹엔 고른 값을 둘 곳(저장·복습)이 없다(08.11 🔒). 웹 노트는 "A 또는 B"
      profile: { picksWeakness: false, textInput: true },
    });
    script.start(result);
  }

  // 대본이 부르는 자리. 이름(GA)은 대본 이벤트 그대로 — 웹이 원래 쓰던 이름이다
  const webIO = {
    say: (text) => { coachSays(text); },
    mySay: (text) => { userSays(text); },
    ask: setActions,
    askText: askTextInput,
    showNote: renderNoteCard,
    showWeaknessCard: (card) => cardEl(card.title, card.body, 'final'),
    end: (ending) => {
      if (ending.kind === 'note') showForgettingCurve(ending.variant, ending.note);
      else if (ending.kind === 'weakness') showForgettingCurve('survey', ending.card);
      // closed("오늘은 여기까지"): 웹은 버튼 없이 끝난다
    },
    run: (effect) => (effect === 'restart' ? window.location.reload() : resetUpload()),
    log: ({ name, ...params }) =>
      logEvent(name, name === 'quiz_verify' ? { ...params, submission_id: submissionId, attempt } : params),
  };

  // 방법을 학생 말로 받는 입력칸 — 보내면 diagnoseMethod(AI)가 방법을 찾는다(대본 routeFromText)
  function askTextInput(prompt) {
    const input = document.createElement('input');
    input.className = 'fallback-input';
    input.placeholder = prompt.placeholder;
    input.maxLength = prompt.maxLength;
    markAsk();
    actionsBox.innerHTML = '';
    actionsBox.appendChild(input);
    const submit = document.createElement('button');
    submit.className = 'primary';
    submit.textContent = prompt.submitLabel;
    submit.addEventListener('click', () => {
      const rawText = input.value.trim();
      if (!rawText) return;
      submit.disabled = true; // 응답 대기 중 중복 전송 방지
      actionsBox.innerHTML = '';
      prompt.onSubmit(rawText);
    });
    actionsBox.appendChild(submit);
    input.focus();
  }

  // ── 오답노트 카드: 흐름의 결과물 (07.31 스케치 · A안) ──
  // "진단 결과"가 아니라 "완성된 노트 한 장"으로 — 학생이 아는 양식(내 풀이/갈라진 지점/왜/다음엔)이
  // 자기 손글씨 사진과 함께, 자기가 한 글자도 안 썼는데 채워져 나온다. 정답 칸은 없다(갈라진 지점 노트).
  // 글자 줄(인용·확인·태그·이름표)은 앱 카드와 같은 함수(F.noteCardLines)
  function renderNoteCard(view) {
    const lines = F.noteCardLines(view);
    const el = document.createElement('div');
    el.className = 'card note-card';
    el.innerHTML = `
      <div class="note-head"><span class="note-title">오늘의 오답노트 · 1장</span><span class="note-date"></span></div>
      <img class="note-photo" alt="내가 올린 풀이 사진" />
      <div class="note-row"><span class="note-label">✂️ 갈라진 지점</span><span class="note-quote"></span></div>
      <div class="note-row"><span class="note-label">왜</span><span class="note-why"></span></div>
      <div class="note-row"><span class="note-label">다음엔</span><span class="note-fix"></span></div>
      <div class="note-foot"><span class="note-checks"></span><span class="note-tags"></span></div>
      <div class="note-weakness"></div>
      <div class="note-ask"></div>
      <div class="note-capture">📸 이 카드, 여기선 저장 안 돼 — 캡처해서 가져가.</div>`;
    // 학생 데이터(인용·설명)는 전부 textContent로 — HTML 해석 금지
    el.querySelector('.note-date').textContent = view.dateLabel;
    // 📌 접는 기준 — 앱 카드와 같은 문장(F.NOTE_ASK_LINE)
    if (view.askLine) el.querySelector('.note-ask').textContent = F.NOTE_ASK_LINE; else el.querySelector('.note-ask').remove();
    const photo = el.querySelector('.note-photo');
    if (view.photoUri) photo.src = view.photoUri; else photo.remove();
    // 규칙 1호: 캡처해 갈 카드가 제일 시험지처럼 보여야 한다 — 채팅 프리미티브와 같이 fmtMath를 거친다
    if (view.quote) setMath(el.querySelector('.note-quote'), lines.quote);
    else el.querySelector('.note-quote').textContent = lines.quote;
    setMath(el.querySelector('.note-why'), view.why);
    setMath(el.querySelector('.note-fix'), view.fix);
    el.querySelector('.note-checks').textContent = lines.checks;
    el.querySelector('.note-tags').textContent = lines.tags;
    // 못 찾으면 줄 자체를 안 낸다(기윤 판정 2026.08.13) — 빈 이름표는 학생한테 값이 0이다.
    // 구분자가 ' · '면 '역·이·대우 혼동'처럼 이름 안에 든 ·와 안 갈린다 — 브라우저 실측으로 잡음
    const weaknessEl = el.querySelector('.note-weakness');
    if (lines.weaknessLabels.length > 0) weaknessEl.textContent = `🏷️ ${lines.weaknessLabels.join(' 또는 ')}`;
    else weaknessEl.remove();
    thread.appendChild(el);
    // 곡선·버튼이 각자 스크롤을 가져가면 캡처하라는 노트가 화면 밖으로 밀린다 — 마지막 스크롤은 노트 머리로
    requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  // ── 엔딩: 개인화 망각곡선 ──
  // 일반 에빙하우스 곡선이 아니라 '방금 찾은 약점'을 곡선 위에 얹어, 앱이 왜 필요한지까지 잇는다.
  const CURVE_LINES = {
    success: '지금은 잡았어. 근데 뇌는 내일이면 이 감각의 절반을 지워 — 네 의지 문제가 아니라 원래 그래.',
    fail: '지금 헷갈린 건 내일이면 더 흐려져. 네 의지 문제가 아니라 뇌가 원래 그래.',
    survey: '네가 짚어준 이 약점, 내일이면 감각의 절반이 사라져. 네 의지 문제가 아니라 뇌가 원래 그래.',
  };

  // 곡선·점은 SVG, 라벨 3개는 HTML — 방법명 길이가 제각각이라 SVG text로는 줄바꿈을 보장할 수 없다.
  function showForgettingCurve(variant, { methodLabel, typeLabel }) {

    coachSays(CURVE_LINES[variant] || CURVE_LINES.fail);

    const el = document.createElement('div');
    el.className = 'card curve-card';
    el.innerHTML = `
      <svg viewBox="0 0 340 180" aria-hidden="true">
        <path d="M24,26 C 96,32 128,116 322,150 L322,166 L24,166 Z" fill="var(--green)" opacity="0.07" />
        <line x1="24" y1="166" x2="322" y2="166" stroke="var(--line)" stroke-width="1.5" />
        <path d="M24,26 C 96,32 128,116 322,150" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" />
        <circle cx="24" cy="26" r="11" fill="var(--green)" />
        <text x="24" y="26" dy="0.35em" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">1</text>
        <circle cx="80" cy="47" r="11" fill="var(--green)" />
        <text x="80" y="47" dy="0.35em" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">2</text>
        <circle cx="146" cy="88" r="11" fill="var(--muted)" />
        <text x="146" y="88" dy="0.35em" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">3</text>
      </svg>
      <ul class="curve-marks">
        <li><span class="n">1</span><span class="t"></span></li>
        <li><span class="n">2</span><span class="t"></span></li>
        <li><span class="n dim">3</span><span class="t"></span></li>
      </ul>`;
    const marks = el.querySelectorAll('.curve-marks .t');
    marks[0].textContent = `방금 잡은 자리 — ${methodLabel} × ${typeLabel} (지금 100%)`;
    // 09.27 되돌림 — 1.0.9가 두 스토어에 떴다(사진 노트가 복습 과제가 된다, E칸). 09.23~27엔 "여기서 한 번 더 보면"이었다.
    marks[1].textContent = '🔔 앱에서는 이 타이밍에 다시 물어봐';
    marks[2].textContent = '내일이면 여기쯤 — 절반';
    thread.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });

    coachSays(variant === 'survey'
      ? '앱에서는 네 약점을 문제로 만들어서, 타이밍 맞춰 다시 물어봐 줘.'
      : '그래서 타이밍은 내가 챙길게. 앱에서는 이걸 알림으로 해줘.');
    // 옛 문장 "사진으로 노트 만드는 건 아직 앱엔 없어"는 1.0.8부터 틀린 말이라 뺐다 (09.23).
    // 링크 복사 버튼은 안 만든다 — 두 번째 풀이는 댓글로 받는다(손 대장으로 센다).
    coachSays('다음에 막힌 풀이도 보내줘.');

    // setActions는 누르는 순간 버튼 줄을 비운다 — 스토어 탭에서 돌아온 학생이 빈 화면을 안 보게 다시 그린다.
    const endingActions = () => setActions([
      { label: '📱 다시다에서 이어서 하기', kind: 'primary',
        onPress: () => { logEvent('store_open'); window.open(storeUrl(), '_blank'); endingActions(); } },
      { label: '다른 문제도 올려보기', kind: 'ghost', onPress: () => window.location.reload() },
    ]);
    endingActions();
  }
})();
