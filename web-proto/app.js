(function () {
  // ── 설정 ──
  const PROJECT_ID = 'dasida-app';
  const ANALYZE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;
  const DIAGNOSE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/diagnoseMethod`;
  // ⚠️ 지금은 호출부가 없다 — 엔딩의 스토어 버튼을 뺐기 때문(앱에 사진 기능이 아직 없음).
  // 앱에 사진이 생기면 되살린다. 아이패드 UA 판별은 다시 짜기 아까워 남겨둔다.
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

  const F = window.DasidaFlow;
  const catalog = F.diagnosisMethodRoutingCatalog;
  const selectableMethods = F.methodOptions.filter((m) => m.id !== 'unknown');

  // 후보를 못 좁혔을 때 '전체 카탈로그'를 쏟지 않고 주제 기반 상위 N개만 보여준다
  const TOPIC_TOP_N = 5;
  // 오류 짚기 검문소 문턱 — 낮게 시작해 채점표 데이터로 조인다 (spec §2)
  const ERROR_CONFIDENCE_MIN = 0.5;
  // 추측 확인(경우 2 중간 확신) 하한 — 이 미만이면 바로 후보 카드
  const SOFT_ASSERT_MIN = 0.45;
  const SURVEY = window.DasidaPhotoSurvey;
  // 주머니: analyzePhoto 원샷 결과 전체. 방법이 뒤집히면 오류 진단은 무효.
  let pocket = null;
  // 사진/텍스트에서 읽은 풀이 내용 — 후보가 비었을 때 주제 좁히기의 재료
  let lastAnalysisText = '';
  // 텍스트로 물어본 횟수 — 2번 물어봐도 못 좁히면 unknown flow로 진행해 막다른 길을 없앤다
  let textAskCount = 0;

  // diagnoseMethod에 보낼 '보기 목록' (전체 카탈로그, unknown 제외)
  const methodDescriptors = selectableMethods.map((m) => {
    const c = catalog[m.id];
    return {
      id: c.id,
      labelKo: c.labelKo,
      summary: c.summary,
      exampleUtterances: c.exampleUtterances.slice(0, 5),
    };
  });

  // ── 화면 전환 ──
  const screens = {
    upload: document.getElementById('screen-upload'),
    analyzing: document.getElementById('screen-analyzing'),
    chat: document.getElementById('screen-chat'),
  };
  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    window.scrollTo(0, 0);
    if (name === 'analyzing') startAnalyzingSteps(); else stopAnalyzingSteps();
  }

  // ── 분석 중 문구 ──
  // 실제로는 vision 호출 한 번이라 진행률이 없다. 가짜 퍼센트 막대는 정직 라벨에 어긋나므로,
  // AI가 실제로 하는 일들을 4초씩 돌려 보여준다. 16초를 넘기면 더 걸린다고 인정한다 —
  // "15초"라고 해놓고 계속 우기면 그때부터 화면 전체가 안 믿긴다.
  const ANALYZING_STEPS = [
    '사진에서 네 손글씨 읽는 중…',
    '어떤 방법으로 풀었는지 보는 중…',
    '해설이랑 한 줄씩 맞춰보는 중…',
    '처음 갈라진 데 찾는 중…',
  ];
  const ANALYZING_OVERTIME = '거의 다 됐어. 조금만…';
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
    }, 4000);
  }
  function stopAnalyzingSteps() {
    if (analyzingTimer) { clearInterval(analyzingTimer); analyzingTimer = null; }
  }

  // ── 수식 표기 (원희 피드백 규칙 1호: 지수는 위첨자로 — a^2 ✗ → a² ○) ──
  // 앱 components/math/MathText.tsx의 formatMathText를 웹용으로 이식.
  // 손으로 쓴 시험지 모양과 같아야 학생이 안 튕긴다. AI가 읽어준 풀이 인용·확인 문제·
  // 번들 데이터의 ^ 표기를 화면에 닿기 직전(채팅 프리미티브)에 전부 변환한다.
  const SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾',
    a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ',
    m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
  };
  function toSuperscript(value) {
    let converted = '';
    for (const char of value) {
      const mapped = SUPERSCRIPT_MAP[char];
      if (!mapped) return null; // 못 바꾸는 글자(대문자·q 등)면 원문 유지 — 반쪽 변환 금지
      converted += mapped;
    }
    return converted;
  }
  function fmtMath(input) {
    return String(input ?? '')
      .replace(/<=/g, '≤')
      .replace(/>=/g, '≥')
      .replace(/!=/g, '≠')
      // 뒤 피연산자는 lookahead로 둔다 — 소비하면 4*1*2에서 1이 먹혀
      // 두 번째 *가 앞 문자를 못 찾아 4×1*2로 반만 변환된다.
      .replace(/(\d|[A-Za-z)\]])\s*\*\s*(?=\d|[A-Za-z([])/g, '$1×')
      .replace(/(\d|[A-Za-z)\]])\s*\/\s*(?=\d|[A-Za-z(])/g, '$1⁄')
      .replace(/sqrt\s*\(/gi, '√(')
      .replace(/√\(\s*([A-Za-z0-9]+)\s*\)/g, '√$1')
      // x^{n-1} — AI 응답의 LaTeX 습관 방어. 중괄호는 수학 표기가 아니라 묶음이라 벗긴다.
      .replace(/(\)|\d|[A-Za-z])\^\{\s*([A-Za-z0-9+-]+)\s*\}/g, (match, base, exponent) => {
        const superscript = toSuperscript(exponent);
        return superscript ? `${base}${superscript}` : match;
      })
      // ar^(n-1) → ar⁽ⁿ⁻¹⁾ — 괄호째 위첨자 (앱 MathText와 같은 규칙)
      .replace(/(\)|\d|[A-Za-z])\^\(\s*([A-Za-z0-9+-]+)\s*\)/g, (match, base, exponent) => {
        const superscript = toSuperscript(`(${exponent})`);
        return superscript ? `${base}${superscript}` : match;
      })
      .replace(/(\)|\d|[A-Za-z])\^([A-Za-z])/g, (match, base, exponent) => {
        const superscript = toSuperscript(exponent);
        return superscript ? `${base}${superscript}` : match;
      })
      .replace(/(\)|\d|[A-Za-z])\^(-?\d+)/g, (match, base, exponent) => {
        const superscript = toSuperscript(exponent);
        return superscript ? `${base}${superscript}` : match;
      });
  }

  // 수식은 문장과 다른 서체로 읽힌다 — fmtMath가 만든 문자열에서 수식 구간만 공라내 <span class="m">으로 감싼다.
  // innerHTML을 쓰지 않는다 — AI 응답이 그대로 들어오므로 노드로만 쌓는다.
  const SUP = '\\u00b2\\u00b3\\u00b9\\u2070-\\u209f\\u1d43-\\u1dbf';
  const MATH_TRIGGER = new RegExp('[=×⁄√≤≥≠_' + SUP + ']');
  const MATH_RUN = new RegExp('[A-Za-z0-9_(√][A-Za-z0-9_^(){}\\[\\]+\\-−×÷⁄√≤≥≠=.,:\\s' + SUP + ']*', 'g');
  function mathSpan(token, source, start) {
    const el = document.createElement('span');
    // 앞글자가 따옴표면 "네가 쓴 그 줄"을 인용한 것 — 칩으로 한 번 더 세게 잡는다.
    el.className = source[start - 1] === '"' ? 'm q' : 'm';
    // a_n — 아래첨자는 유니코드 맵이 없어 밑줄로 남았던 자리. <sub>로 살린다.
    token.split(/_(\(?[A-Za-z0-9+-]+\)?)/).forEach((part, i) => {
      if (!part) return;
      if (i % 2) {
        const sub = document.createElement('sub');
        sub.textContent = part.replace(/^\(|\)$/g, '');
        el.appendChild(sub);
      } else el.appendChild(document.createTextNode(part));
    });
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
  let uploadedImageDataUrl = null; // 오답노트 카드에 "내 풀이 사진"으로 다시 쓴다 (축소본 재사용 — 재인코딩 없음)

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
    picked.textContent = '✓ ' + f.name;
    picked.style.display = 'block';
    cta.classList.add('ready');
  }

  cta.addEventListener('click', async () => {
    if (!selectedFile || cta.disabled) return;
    cta.disabled = true; // 더블클릭 → vision 이중 호출(이중 과금) 방지
    show('analyzing');
    logEvent('photo_submit'); // 깔때기 1 — 방문이 아니라 "실제로 사진을 올린" 수

    let imageDataUrl;
    try {
      imageDataUrl = await downscaleToDataUrl(selectedFile, 1568, 0.82);
      uploadedImageDataUrl = imageDataUrl;
    } catch {
      show('upload');
      cta.disabled = false;
      alert('이 사진 형식을 못 읽었어요. jpg나 png 사진으로 다시 시도해줘요.');
      return;
    }

    try {
      const response = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
        signal: AbortSignal.timeout(75_000), // 함수 타임아웃(60s)보다 살짝 길게
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();
      show('chat');
      routeFromAnalysis(result);
    } catch (error) {
      show('upload');
      cta.disabled = false;
      alert('분석에 실패했어요. 잠시 후 다시 시도해줘요. (' + error.message + ')');
    }
  });

  // 사진 축소 — 전송량·비용 절감 (긴 변 1568px, JPEG 0.82)
  async function downscaleToDataUrl(file, maxDim, quality) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close(); // 원본 해상도 비트맵 메모리 즉시 해제
    return canvas.toDataURL('image/jpeg', quality);
  }

  // ── 분석 결과 → 3갈래 라우팅 ──
  function routeFromAnalysis(result) {
    pocket = result;
    lastAnalysisText = [result.transcription, result.reason].filter(Boolean).join(' ');
    if (!result.hasSolvingWork) {
      offerRetake(); // 갈래 3: 풀이 흔적 없음 → 다시 찍기 유도 (Task 8)
      return;
    }
    if (result.needsManualSelection) {
      // 경우 2: 1등 추측이 살아 있고 확신이 중간이면 추측 확인부터
      if (result.predictedMethodId !== 'unknown' && result.confidence >= SOFT_ASSERT_MIN && catalog[result.predictedMethodId]) {
        softAssertMethod(result);
        return;
      }
      showCandidateCards(result.candidateMethodIds); // 확신 낮음: 바로 보기 제시
      return;
    }
    assertMethod(result); // 경우 1: 단언
  }

  // 갈래 1: 단언 + 탈출구
  function assertMethod(result) {
    const info = catalog[result.predictedMethodId];
    if (!info) {
      // 서버·웹 카탈로그가 어긋난 경우(사본 드리프트) — 죽지 말고 후보 카드로
      showCandidateCards(result.candidateMethodIds);
      return;
    }
    const label = info.labelKo;
    const snippet = firstSnippet(result.transcription);
    coachSays(`풀이 읽었어. ${snippet ? snippet + ' — ' : ''}${label}(으)로 접근했네.`);
    coachSays('그럼 여기서부터 같이 보자.');
    setActions([
      { label: '맞아, 시작하자', kind: 'primary', onPress: () => { userSays('맞아'); confirmMethod(result.predictedMethodId); } },
      { label: '아니야, 다른 방법으로 풀었어', kind: 'ghost', onPress: () => { userSays('아니야'); showTopicMethods(undefined, [result.predictedMethodId]); } },
    ]);
  }
  function firstSnippet(transcription) {
    if (!transcription) return '';
    const cut = transcription.split(/[.。\n]/)[0].trim();
    return cut.length > 40 ? cut.slice(0, 40) + '…' : cut;
  }

  // 경우 2 중간 확신: 단정 대신 추측 확인 — "~같아. 맞아?"
  function softAssertMethod(result) {
    const info = catalog[result.predictedMethodId];
    const snippet = firstSnippet(result.transcription);
    coachSays(`풀이에 ${snippet ? `"${snippet}" ` : ''}쓴 게 보이던데 — ${info.labelKo}(으)로 푼 것 같아. 맞아?`);
    setActions([
      { label: '맞아', kind: 'primary', onPress: () => { userSays('맞아'); confirmMethod(result.predictedMethodId); } },
      {
        label: '아니야, 다른 방법이야', kind: 'ghost',
        onPress: () => {
          userSays('아니야');
          // 거절된 1등은 후보에서 제외 — 거절한 게 또 뜨지 않게
          showCandidateCards(result.candidateMethodIds, undefined, [result.predictedMethodId]);
        },
      },
    ]);
  }

  // 방법 확정의 단일 관문. 주머니 일치 + 자신감 통과 → 짚기, 아니면 설문.
  function confirmMethod(methodId) {
    const pocketAlive = pocket && methodId === pocket.predictedMethodId;
    if (pocketAlive && pocket.errorCandidates?.length > 0 && pocket.errorConfidence >= ERROR_CONFIDENCE_MIN) {
      startPointing(0);
      return;
    }
    if (pocketAlive && pocket.hasSolvingWork) {
      // 가지 6 = B안: 방법은 맞는데 오류를 못 찾은 날 — 관찰을 솔직하게 보고
      coachSays('그런데 좀 신기해 — 풀이 과정에서는 틀린 데를 못 찾았어. 과정은 맞게 간 것 같거든.');
      coachSays('이러면 보통 마지막에 답을 옮겨 적을 때나 검산에서 새는 경우가 많아.');
      showFeelingSurvey(methodId, '풀면서 느낌상 뭐가 걸렸어?', true);
      return;
    }
    showFeelingSurvey(methodId); // 방법 뒤집힘·풀이 없음: 주머니 무효
  }

  function methodButton(id) {
    return {
      label: catalog[id].labelKo,
      onPress: () => { userSays(catalog[id].labelKo); confirmMethod(id); },
    };
  }

  // 갈래 2: AI 후보 카드 (최대 4개). 후보가 비면 전체를 쏟지 않고 주제 기반으로 좁힌다.
  function showCandidateCards(candidateIds, promptText, excludeIds = []) {
    // unknown·웹 카탈로그에 없는 id(사본 드리프트)·이미 아니라고 한 방법 방어
    const candidates = candidateIds.filter(
      (id) => id !== 'unknown' && catalog[id] && !excludeIds.includes(id),
    );
    if (candidates.length === 0) {
      // 후보가 없으면 전체 목록 대신 주제 기반 상위 N개로 안내
      showTopicMethods(promptText, excludeIds);
      return;
    }
    coachSays(promptText ?? '풀이를 봤는데 확실하지 않아. 이 중에 어떤 방법이었어?');
    const buttons = candidates.map(methodButton);
    buttons.push({
      label: '이 중엔 없어',
      kind: 'ghost',
      // 방금 보여준 후보는 다음 목록에서 제외 — 거절한 게 또 뜨지 않게
      onPress: () => showTopicMethods(undefined, [...excludeIds, ...candidates]),
    });
    setActions(buttons);
  }

  // 후보를 못 좁혔을 때: 읽은 풀이 내용의 주제로 상위 N개만 추리고,
  // 그래도 못 맞추면 학생이 직접 입력하도록 한다 (전체 31개를 쏟지 않는다).
  function showTopicMethods(promptText, excludeIds = []) {
    const matched = matchMethodsByKeywords(lastAnalysisText, TOPIC_TOP_N).filter(
      (id) => !excludeIds.includes(id),
    );
    if (matched.length === 0) {
      // 주제조차 못 좁힘 → 직접 물어보기
      askMethodByText();
      return;
    }
    coachSays(promptText ?? '네가 푼 방식이랑 비슷해 보이는 방법들이야. 이 중에 있어?');
    const buttons = matched.map(methodButton);
    buttons.push({
      label: '여기에도 없어, 직접 쓸게',
      kind: 'ghost',
      onPress: () => askMethodByText(),
    });
    setActions(buttons);
  }

  // 카탈로그 keywords 로컬 매칭 — diagnoseMethod 호출 실패 시(오프라인·구버전 배포)의 폴백
  function matchMethodsByKeywords(rawText, limit = 3) {
    const text = (rawText || '').toLowerCase();
    if (!text) return [];
    return selectableMethods
      .map((m) => {
        const c = catalog[m.id];
        const hits = [...c.keywords, c.labelKo].reduce(
          (n, kw) => n + (text.includes(kw.toLowerCase()) ? 1 : 0), 0);
        return { id: m.id, hits };
      })
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
      .map((s) => s.id);
  }

  // 직접 물어보기: 학생이 자기 말로 적으면 diagnoseMethod(AI)가 방법을 찾아 flow에 자동 연결
  function askMethodByText(promptText) {
    coachSays(promptText ?? '어떻게 풀었는지 짧게 알려줄래? 네 말 그대로 써도 돼.');
    const input = document.createElement('input');
    input.className = 'fallback-input';
    input.placeholder = '예: 근의 공식에 바로 대입했어';
    input.maxLength = 200;
    markAsk();
    actionsBox.innerHTML = '';
    actionsBox.appendChild(input);
    const submit = document.createElement('button');
    submit.className = 'primary';
    submit.textContent = '보내기';
    submit.addEventListener('click', () => {
      const rawText = input.value.trim();
      if (!rawText) return;
      submit.disabled = true; // 응답 대기 중 중복 전송 방지
      userSays(rawText);
      actionsBox.innerHTML = '';
      lastAnalysisText = rawText; // 이후 좁히기는 학생이 쓴 말을 재료로
      routeFromText(rawText);
    });
    actionsBox.appendChild(submit);
    input.focus();
  }

  // 학생이 쓴 글 → AI 판별 → flow 자동 연결. AI 실패 시 키워드 매칭 폴백,
  // 2번 물어봐도 못 좁히면 '잘 모르겠어' 진단 flow로 진행 (막다른 길 없음)
  async function routeFromText(rawText) {
    textAskCount += 1;
    coachSays('잠깐만, 읽어볼게…');

    let result = null;
    try {
      const response = await fetch(DIAGNOSE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: 'photo-flow-web', // 사진 flow는 문제를 미리 모른다 → 로그 구분용 고정 id
          rawText,
          allowedMethodIds: selectableMethods.map((m) => m.id),
          allowedMethods: methodDescriptors,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      result = await response.json();
    } catch {
      // 오프라인·구버전 배포(12개 제한) 등 — 아래에서 키워드 매칭으로 폴백
    }

    // AI가 확신하면 그 방법의 flow로 바로 연결
    if (result && !result.needsManualSelection && catalog[result.predictedMethodId]) {
      const label = catalog[result.predictedMethodId].labelKo;
      coachSays(`${label}(으)로 풀었구나. 그럼 여기서부터 같이 보자.`);
      confirmMethod(result.predictedMethodId);
      return;
    }

    // 애매하면 AI 후보로, AI 실패면 키워드 매칭으로 후보 카드
    const candidateIds = result ? result.candidateMethodIds : matchMethodsByKeywords(rawText, TOPIC_TOP_N);
    const candidates = candidateIds.filter((id) => id !== 'unknown' && catalog[id]);
    if (candidates.length > 0) {
      showCandidateCards(candidates, '이 중에 있어?');
      return;
    }

    if (textAskCount < 2) {
      askMethodByText('음… 잘 못 알아들었어. 어떤 공식이나 방법을 썼는지 조금만 더 자세히 알려줄래?');
      return;
    }

    // 2번 물어봐도 못 좁힘 → 마지막 수단으로 전체 목록에서 직접 고르게
    showAllMethods();
  }

  // 마지막 수단: 전체 카탈로그를 보여주고 직접 고르게 한다.
  // 목록에도 없으면 '잘 모르겠어'로 방법 특정 없이 진행 가능한 진단 flow로.
  function showAllMethods() {
    coachSays('그럼 전체 목록에서 직접 골라볼래?');
    const buttons = selectableMethods.map((m) => methodButton(m.id));
    buttons.push({
      label: '잘 모르겠어',
      kind: 'ghost',
      onPress: () => { userSays('잘 모르겠어'); showFeelingSurvey(null); },
    });
    setActions(buttons);
  }

  // 갈래 3: 풀이 흔적 없음. (b)문제만 찍은 학생을 경우 1로 승격시키는 사다리.
  function offerRetake() {
    coachSays('사진에서 풀이 과정을 못 찾았어. 혹시 종이에 풀었으면, 풀이까지 나오게 다시 찍어줄래? 그러면 어디서 틀렸는지 내가 직접 짚어줄 수 있어.');
    coachSays('머리로 푼 거면 괜찮아 — 어떤 방법으로 풀었는지 짧게만 알려줘.');
    setActions([
      { label: '📷 풀이까지 나오게 다시 찍기', kind: 'primary', onPress: () => window.location.reload() },
      { label: '✏️ 직접 알려줄게', kind: 'ghost', onPress: () => askMethodByText('어떤 방법으로 풀었는지 짧게 알려줄래? 네 말 그대로 써도 돼.') },
    ]);
  }

  // ── 오류 짚기 · 쪽지시험 · 약점 카드 ──

  // 짚기 사다리: 1번 → 2번("하나 더 걸리는 데 있었는데") → 느낌 설문. 세 번째 시도 없음.
  function startPointing(idx) {
    const cand = pocket.errorCandidates[idx];
    if (!cand) {
      showFeelingSurvey(pocket.predictedMethodId, '음, 그럼 내 눈에 보이는 데는 아니었나 보네. 각도를 바꿔보자 — 풀면서 느낌상 뭐가 제일 걸렸어?');
      return;
    }
    if (idx === 0) {
      coachSays('그럼 풀이를 좀 더 보자.');
      coachSays(`여기 — "${cand.quote}" 쓴 부분. 여기서 틀린 것 같아. 맞아?`);
    } else {
      coachSays(`그래? 그럼 하나 더 걸리는 데가 있었는데 — "${cand.quote}" 쓴 줄. 여기 아니야?`);
    }
    setActions([
      { label: idx === 0 ? '맞아, 거기서 틀렸어' : '맞아, 거기야', kind: 'primary',
        onPress: () => { userSays('맞아, 거기야'); showWhy(idx); } },
      { label: idx === 0 ? '아니야, 거기 아니야' : '아니야', kind: 'ghost',
        onPress: () => { userSays('아니야'); startPointing(idx + 1); } },
    ]);
  }

  function showWhy(idx) {
    const cand = pocket.errorCandidates[idx];
    coachSays(cand.why);
    setActions([
      { label: '그렇구나, 확인해볼래', kind: 'primary', onPress: () => showCheck(idx) },
    ]);
  }

  function showCheck(idx) {
    const cand = pocket.errorCandidates[idx];
    // "노트 완성" 예고 — 문답이 노동이 아니라 결과물을 만드는 과정임을 먼저 말한다 (차가운 방문자 '중' 위험 대응)
    // checkSetup(상황 칸)이 있으면 재료를 먼저 깔고 질문 — 카드 밖(사진) 지칭으로 못 푸는 문제 방지
    if (cand.checkSetup) {
      coachSays(`그럼 진짜 아는지 보자 — 이거 통과하면 오늘 오답노트 완성이야. ${cand.checkSetup}`);
      coachSays(cand.checkPrompt);
    } else {
      coachSays(`그럼 진짜 아는지 보자 — 이거 통과하면 오늘 오답노트 완성이야. ${cand.checkPrompt}`);
    }
    setActions(cand.checkOptions.map((opt, i) => ({
      label: opt,
      onPress: () => {
        userSays(opt);
        const passed = i === cand.checkAnswerIndex;
        if (passed) {
          coachSays('그렇지. 이제 이 자리에서는 안 틀리겠네.');
        } else {
          // 재시험 없음 — 한 번만 더 짚고 넘어간다 (늘어지면 귀찮음 축 침범)
          coachSays(`아직 헷갈리는구나. 정답은 "${cand.checkOptions[cand.checkAnswerIndex]}" — 아까랑 같은 원리야.`);
        }
        // A안(07.31): 쪽지 → 재도전 → 오답노트 완성 → 곡선. 노트가 마지막 결과물로 나온다.
        startRetry(idx, { methodId: pocket.predictedMethodId, mistakeType: cand.mistakeType, checkPassed: passed });
      },
    })));
  }

  // 약점 카드 = 설문 경로 전용 (07.31부터). AI 경로는 showWrongNote(오답노트)가 결과물을 맡는다.
  // 설문 경로는 사진 인용·쪽지 기록이 없어 노트를 채울 재료가 부족 — 기존 카드 톤 유지.
  function showWeaknessCard({ methodId, mistakeType }) {
    const methodLabel = methodId && catalog[methodId] ? catalog[methodId].labelKo : '방법 미상';
    const typeInfo = SURVEY.TYPES[mistakeType] || { label: '유형 미상', fix: '' };
    const title = `오늘 찾은 약점 — ${methodLabel} × ${typeInfo.label}`;
    cardEl(title, ['(네가 직접 짚어준 것)', typeInfo.fix].join('\n'), 'final');
    showForgettingCurve('survey', { methodId, mistakeType });
  }

  // ── 즉석 재도전: 아까 무너진 자리 재밟기. 관문 아님 — 어느 선택이든 곡선으로. ──
  function startRetry(idx, ctx) {
    const cand = pocket?.errorCandidates?.[idx];
    // 보기 개수를 상수로 박지 않고 실제 배열 길이에서 뽑는다 — 서버가 4지선다로 가도 웹이 조용히 죽지 않게.
    // 범위 검사가 핵심: 정답 인덱스가 보기 밖이면 전부 오답 처리되고 '정답은 "undefined"'가 학생에게 노출된다.
    const opts = cand?.retryOptions;
    const hasRetry = cand && cand.retrySetup && cand.retryPrompt &&
      Array.isArray(opts) && opts.length >= 2 &&
      Number.isInteger(cand.retryAnswerIndex) &&
      cand.retryAnswerIndex >= 0 && cand.retryAnswerIndex < opts.length;
    if (!hasRetry) { showWrongNote(idx, ctx, 'none'); return; } // if 관문: 조용히 건너뜀 — 노트는 그래도 나온다
    // 쪽지를 틀린 학생에게만 한 템포 — 오답 직후 연타 방지. 맞힌 학생은 빠르게 (귀찮음 축)
    coachSays(ctx.checkPassed
      ? '그럼 진짜 마지막 — 아까 그 자리, 새 숫자로 한 번만 다시 밟아보자.'
      : '괜찮아, 헷갈리라고 있는 자리야. 마지막으로 딱 한 번만 — 새 숫자로 가보자.');
    coachSays(`${cand.retrySetup}\n${cand.retryPrompt}`);
    const buttons = cand.retryOptions.map((opt, i) => ({
      label: opt,
      onPress: () => {
        userSays(opt);
        if (i === cand.retryAnswerIndex) {
          coachSays('그렇지! 아까 무너진 그 자리, 이번엔 통과했어.');
          showWrongNote(idx, ctx, 'pass');
        } else {
          coachSays(`아깝다 — 정답은 "${cand.retryOptions[cand.retryAnswerIndex]}". 아까랑 같은 원리야.`);
          showWrongNote(idx, ctx, 'fail'); // 재시도 없음
        }
      },
    }));
    buttons.push({ label: '지금은 넘어갈래', kind: 'ghost',
      onPress: () => { userSays('지금은 넘어갈래'); showWrongNote(idx, ctx, 'skip'); } });
    setActions(buttons);
  }

  // ── 오답노트 카드: 흐름의 결과물 (07.31 스케치 · A안) ──
  // "진단 결과"가 아니라 "완성된 노트 한 장"으로 — 학생이 아는 양식(내 풀이/갈라진 지점/왜/다음엔)이
  // 자기 손글씨 사진과 함께, 자기가 한 글자도 안 썼는데 채워져 나온다. 정답 칸은 없다(갈라진 지점 노트).
  function showWrongNote(idx, ctx, retryResult) {
    const cand = pocket?.errorCandidates?.[idx];
    const methodLabel = ctx.methodId && catalog[ctx.methodId] ? catalog[ctx.methodId].labelKo : '방법 미상';
    const typeLabel = SURVEY.TYPES[ctx.mistakeType]?.label || '유형 미상';

    coachSays('자, 이게 오늘 네 오답노트야 — 네 손으로 적은 건 한 줄도 없지.');

    const today = new Date();
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
      <div class="note-capture">📸 이 카드, 여기선 저장 안 돼 — 캡처해서 가져가.</div>`;
    // 학생 데이터(인용·설명)는 전부 textContent로 — HTML 해석 금지
    el.querySelector('.note-date').textContent = `${today.getMonth() + 1}/${today.getDate()}`;
    const photo = el.querySelector('.note-photo');
    if (uploadedImageDataUrl) photo.src = uploadedImageDataUrl; else photo.remove();
    // 규칙 1호: 캡처해 갈 카드가 제일 시험지처럼 보여야 한다 — 채팅 프리미티브와 같이 fmtMath를 거친다
    if (cand?.quote) setMath(el.querySelector('.note-quote'), `"${cand.quote}"`);
    else el.querySelector('.note-quote').textContent = '(없음)';
    setMath(el.querySelector('.note-why'), cand?.why || '');
    setMath(el.querySelector('.note-fix'), cand?.fix || SURVEY.TYPES[ctx.mistakeType]?.fix || '');
    const retryMark = { pass: ' · 재도전 ✔', fail: ' · 재도전 ✗', skip: '', none: '' }[retryResult] || '';
    el.querySelector('.note-checks').textContent = `오늘 확인: 쪽지시험 ${ctx.checkPassed ? '✔' : '✗'}${retryMark}`;
    el.querySelector('.note-tags').textContent = `#${methodLabel} #${typeLabel}`;
    // 통역표 첫 호출 — (풀이법, 실수 유형)으로 약점 이름을 찾는다. 앱(features/photo)과 같은 표를 쓴다.
    // 못 찾으면 줄 자체를 안 낸다(기윤 판정 2026.08.13) — 빈 이름표는 학생한테 값이 0이다.
    // 여럿이면 다 나열한다. 하나로 고르는 건 저장 경로를 붙일 때 학생한테 물어본다(08.11 🔒).
    const weaknessEl = el.querySelector('.note-weakness');
    const weaknessIds =
      ctx.methodId && ctx.mistakeType ? F.weaknessCandidatesFor(ctx.methodId, ctx.mistakeType) : [];
    const weaknessLabels = weaknessIds.map((id) => F.diagnosisMap[id]?.labelKo).filter(Boolean);
    // 구분자가 ' · '면 '역·이·대우 혼동'처럼 이름 안에 든 ·와 안 갈린다 — 브라우저 실측으로 잡음
    if (weaknessLabels.length > 0) weaknessEl.textContent = `🏷️ ${weaknessLabels.join(' 또는 ')}`;
    else weaknessEl.remove();
    thread.appendChild(el);
    logEvent('note_shown', { retry: retryResult }); // 깔때기 2 — 끝까지 걸어서 노트를 받은 수

    // 쪽지 ✗인데 재도전으로 만회 못 했으면(실패·스킵·없음) 성공 톤 금지 — 노트의 ✗와 곡선 문구가 모순되지 않게
    const recovered = retryResult === 'pass';
    showForgettingCurve(ctx.checkPassed || recovered ? (retryResult === 'fail' ? 'fail' : 'success') : 'fail', ctx);

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
  function showForgettingCurve(variant, ctx = {}) {
    const methodLabel = ctx.methodId && catalog[ctx.methodId] ? catalog[ctx.methodId].labelKo : '방법 미상';
    // 설문·건너뛰기 경로에선 유형이 없을 수 있다 — 마지막 화면이 죽으면 안 되니 폴백.
    const typeLabel = SURVEY.TYPES[ctx.mistakeType]?.label || '유형 미상';

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
    // 주어를 '앱'으로 못박는다 — 로그인도 저장도 없는 이 웹은 이 약속을 혼자 못 지킨다
    marks[1].textContent = '🔔 앱에서는 이 타이밍에 다시 물어봐';
    marks[2].textContent = '내일이면 여기쯤 — 절반';
    thread.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });

    coachSays(variant === 'survey'
      ? '앱에서는 네 약점을 문제로 만들어서, 타이밍 맞춰 다시 물어봐 줘.'
      : '그래서 타이밍은 내가 챙길게. 앱에서는 이걸 알림으로 해줘.');
    // 복습·알림은 앱에 있지만 사진은 없다. 여기서 안 말하면 스토어에 간 학생이 찾다가 못 찾는다.
    coachSays('근데 사진으로 노트 만드는 건 아직 앱엔 없어 — 지금 만드는 중이야.');

    // 스토어로 보내는 버튼은 뺐다 — 5호 글을 보고 온 학생의 기대는 '사진 → 오답노트'인데
    // 앱에는 그 기능이 없다. 지금 보내면 실망만 남는다. 앱에 사진이 생기면 그때 되살린다.
    let wantClicked = false; // 같은 사람이 여러 번 눌러 수요가 부풀지 않게 한 번만 센다
    const endingActions = () => {
      const buttons = [];
      // 깔때기 3 — 앱에 '없는' 사진 기능을 원하는 수. 다음에 뭘 만들지의 첫 숫자다.
      // 누른 흔적은 말풍선이 아니라 '버튼 자리'에 남긴다 — coachSays(block:'end')와
      // setActions(block:'nearest')가 연달아 smooth 스크롤을 걸어 뒤엣것이 앞엣것을 취소하는 탓에
      // 말풍선이 화면을 스쳐 지나간다. 반응이 없어 보이면 또 누르거나 그냥 나간다.
      buttons.push(wantClicked
        ? { label: '✓ 세어뒀어 — 이거 누른 수 보고 다음 걸 정할게', kind: 'ghost', onPress: () => endingActions() }
        : { label: '📸 앱에서도 사진으로 이렇게 되면 쓸 듯', kind: 'primary',
            onPress: () => { wantClicked = true; logEvent('want_photo_in_app'); endingActions(); } });
      buttons.push({ label: '다른 문제도 올려보기', kind: 'ghost', onPress: () => window.location.reload() });
      setActions(buttons);
    };
    endingActions();
  }

  // 느낌 설문: "어디서 틀렸어?"(분석 숙제)가 아니라 "뭐가 걸렸어?"(경험 증언)만 묻는다.
  function showFeelingSurvey(methodId, promptText, withAnswerReadHint) {
    const options = SURVEY.optionsFor(methodId);
    if (withAnswerReadHint) {
      // B안: 마지막 보기를 힌트 버전으로 교체 (없으면 추가)
      const i = options.findIndex((o) => o.type === 'answer_read');
      if (i >= 0) options[i] = SURVEY.ANSWER_READ_HINT; else options.push(SURVEY.ANSWER_READ_HINT);
    }
    coachSays(promptText || '그럼 — 풀면서 느낌상 뭐가 제일 걸렸어?');
    const buttons = options.map((opt) => ({
      label: opt.text,
      onPress: () => {
        userSays(opt.text);
        showWeaknessCard({ methodId, mistakeType: opt.type, aiConfirmed: false });
      },
    }));
    buttons.push({
      label: '잘 모르겠어', kind: 'ghost',
      onPress: () => {
        userSays('잘 모르겠어');
        showWeaknessCard({ methodId, mistakeType: 'concept_gap', aiConfirmed: false });
      },
    });
    setActions(buttons);
  }
})();
