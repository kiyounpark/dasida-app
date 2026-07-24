(function () {
  // ── 설정 ──
  const PROJECT_ID = 'dasida-app';
  const ANALYZE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;
  const DIAGNOSE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/diagnoseMethod`;

  const F = window.DasidaFlow;
  const catalog = F.diagnosisMethodRoutingCatalog;
  const selectableMethods = F.methodOptions.filter((m) => m.id !== 'unknown');

  // 후보를 못 좁혔을 때 '전체 카탈로그'를 쏟지 않고 주제 기반 상위 N개만 보여준다
  const TOPIC_TOP_N = 5;
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
  }

  // ── 채팅 프리미티브 ──
  const thread = document.getElementById('thread');
  const actionsBox = document.getElementById('actions');
  function coachSays(text) { bubble('coach', text); }
  function userSays(text) { bubble('me', text); }
  function bubble(who, text) {
    const el = document.createElement('div');
    el.className = 'bubble ' + who;
    el.textContent = text;
    thread.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  function cardEl(title, body, extraClass) {
    const el = document.createElement('div');
    el.className = 'card' + (extraClass ? ' ' + extraClass : '');
    el.innerHTML = '<div class="card-title"></div><div class="card-body"></div>';
    el.querySelector('.card-title').textContent = title;
    el.querySelector('.card-body').textContent = body || '';
    thread.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  function setActions(buttons) {
    actionsBox.innerHTML = '';
    buttons.forEach(({ label, kind, onPress }) => {
      const b = document.createElement('button');
      if (kind) b.className = kind;
      b.textContent = label;
      b.addEventListener('click', () => { actionsBox.innerHTML = ''; onPress(); });
      actionsBox.appendChild(b);
    });
  }

  // ── 화면 1: 업로드 ──
  const drop = document.getElementById('drop');
  const fileInput = document.getElementById('file');
  const picked = document.getElementById('picked');
  const cta = document.getElementById('cta');
  let selectedFile = null;

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

    let imageDataUrl;
    try {
      imageDataUrl = await downscaleToDataUrl(selectedFile, 1568, 0.82);
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
    // 후보를 못 좁혔을 때 주제 좁히기에 쓸 재료 (읽은 풀이 + 근거)
    lastAnalysisText = [result.transcription, result.reason].filter(Boolean).join(' ');
    if (!result.hasSolvingWork) {
      // 갈래 3: 풀이 흔적 없음 → 질문 폴백
      askMethodByText('사진에서 풀이 과정을 못 찾았어. 머리로 푼 거면 괜찮아 — 어떤 방법으로 풀었는지 짧게 알려줄래?');
      return;
    }
    if (result.needsManualSelection) {
      showCandidateCards(result.candidateMethodIds);  // 갈래 2: 애매 → 후보 카드
      return;
    }
    assertMethod(result);  // 갈래 1: 확신 → 단언
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
      { label: '맞아, 시작하자', kind: 'primary', onPress: () => { userSays('맞아'); startFlow(result.predictedMethodId); } },
      { label: '아니야, 다른 방법으로 풀었어', kind: 'ghost', onPress: () => { userSays('아니야'); showTopicMethods(undefined, [result.predictedMethodId]); } },
    ]);
  }
  function firstSnippet(transcription) {
    if (!transcription) return '';
    const cut = transcription.split(/[.。\n]/)[0].trim();
    return cut.length > 40 ? cut.slice(0, 40) + '…' : cut;
  }

  function methodButton(id) {
    return {
      label: catalog[id].labelKo,
      onPress: () => { userSays(catalog[id].labelKo); startFlow(id); },
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
      startFlow(result.predictedMethodId);
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
      onPress: () => { userSays('잘 모르겠어'); startFlow('unknown'); },
    });
    setActions(buttons);
  }

  // ── 진단 flow 러너 (앱 엔진 그대로 걷기) ──
  let draft = null;
  function startFlow(methodId) {
    draft = F.createDiagnosisFlowDraft(methodId);
    renderCurrentNode();
  }
  function renderCurrentNode() {
    const flow = F.getDiagnosisFlow(draft.methodId);
    const node = F.getNode(flow, draft.currentNodeId);

    if (node.kind === 'choice') {
      cardEl(node.title, node.body);
      setActions(node.options.map((option) => ({
        label: option.text,
        onPress: () => { userSays(option.text); draft = F.advanceFromChoice(draft, option.id); renderCurrentNode(); },
      })));
      return;
    }

    if (node.kind === 'explain') {
      cardEl(node.title, node.body);
      setActions([
        { label: node.primaryLabel, kind: 'primary', onPress: () => { draft = F.advanceFromExplain(draft, 'continue'); renderCurrentNode(); } },
        { label: node.secondaryLabel, kind: 'ghost', onPress: () => { draft = F.advanceFromExplain(draft, 'dont_know'); renderCurrentNode(); } },
      ]);
      return;
    }

    if (node.kind === 'check') {
      cardEl(node.title, node.prompt);
      const buttons = node.options.map((option) => ({
        label: option.text,
        onPress: () => { userSays(option.text); draft = F.advanceFromCheck(draft, option.id); renderCurrentNode(); },
      }));
      buttons.push({ label: '모르겠어요', kind: 'ghost', onPress: () => { draft = F.advanceFromCheck(draft, undefined); renderCurrentNode(); } });
      setActions(buttons);
      return;
    }

    // final: 최종 약점 카드
    cardEl(node.title, node.body, 'final');
    coachSays('오늘 여기까지. 이 카드가 네 진짜 약점이야 — 다음에 같은 자리에서 안 틀리게, 앱에서 이어서 잡아줄게.');
    setActions([
      { label: '다른 문제도 올려보기', kind: 'primary', onPress: () => window.location.reload() },
    ]);
  }
})();
