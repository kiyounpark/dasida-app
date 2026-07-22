(function () {
  // ── 설정 ──
  const PROJECT_ID = 'dasida-app';
  const ANALYZE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;
  const DIAGNOSE_METHOD_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/diagnoseMethod`;

  const F = window.DasidaFlow;
  const catalog = F.diagnosisMethodRoutingCatalog;
  const selectableMethods = F.methodOptions.filter((m) => m.id !== 'unknown');

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
  fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
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
    if (!selectedFile) return;
    show('analyzing');
    try {
      const imageDataUrl = await downscaleToDataUrl(selectedFile, 1568, 0.82);
      const response = await fetch(ANALYZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();
      show('chat');
      routeFromAnalysis(result);
    } catch (error) {
      show('upload');
      alert('분석에 실패했어요. 잠시 후 다시 시도해줘요. (' + error.message + ')');
    }
  });

  // 사진 축소 — 전송량·비용 절감 (긴 변 1568px, JPEG 0.82)
  async function downscaleToDataUrl(file, maxDim, quality) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  // ── 분석 결과 → 3갈래 라우팅 ──
  function routeFromAnalysis(result) {
    if (!result.hasSolvingWork) {
      askMethodByText();  // 갈래 3: 풀이 흔적 없음 → 질문 폴백
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
    const label = catalog[result.predictedMethodId].labelKo;
    const snippet = firstSnippet(result.transcription);
    coachSays(`풀이 읽었어. ${snippet ? snippet + ' — ' : ''}${label}(으)로 접근했네.`);
    coachSays('그럼 여기서부터 같이 보자.');
    setActions([
      { label: '맞아, 시작하자', kind: 'primary', onPress: () => { userSays('맞아'); startFlow(result.predictedMethodId); } },
      { label: '아니야, 다른 방법으로 풀었어', kind: 'ghost', onPress: () => { userSays('아니야'); showCandidateCards([]); } },
    ]);
  }
  function firstSnippet(transcription) {
    if (!transcription) return '';
    const cut = transcription.split(/[.。\n]/)[0].trim();
    return cut.length > 40 ? cut.slice(0, 40) + '…' : cut;
  }

  // 갈래 2: 후보 카드 (후보 없으면 전체 목록)
  function showCandidateCards(candidateIds) {
    const candidates = candidateIds.filter((id) => id !== 'unknown');
    coachSays(candidates.length > 0 ? '풀이를 봤는데 두 가지로 읽혀. 어떤 방법이었어?' : '어떤 방법으로 풀었어?');
    const list = candidates.length > 0 ? candidates : selectableMethods.map((m) => m.id);
    const buttons = list.map((id) => ({
      label: catalog[id].labelKo,
      onPress: () => { userSays(catalog[id].labelKo); startFlow(id); },
    }));
    if (candidates.length > 0) {
      buttons.push({ label: '둘 다 아니야', kind: 'ghost', onPress: () => showCandidateCards([]) });
    }
    setActions(buttons);
  }

  // 갈래 3: 질문 폴백 (기존 diagnoseMethod 함수 재사용)
  function askMethodByText() {
    coachSays('사진에서 풀이 과정을 못 찾았어. 머리로 푼 거면 괜찮아 — 어떤 방법으로 풀었는지 짧게 알려줄래?');
    const input = document.createElement('input');
    input.className = 'fallback-input';
    input.placeholder = '예: 근의 공식에 바로 대입했어';
    actionsBox.innerHTML = '';
    actionsBox.appendChild(input);
    const submit = document.createElement('button');
    submit.className = 'primary';
    submit.textContent = '보내기';
    submit.addEventListener('click', async () => {
      const rawText = input.value.trim();
      if (!rawText) return;
      userSays(rawText);
      actionsBox.innerHTML = '';
      try {
        const allowedMethods = selectableMethods.map((m) => {
          const c = catalog[m.id];
          return { id: c.id, labelKo: c.labelKo, summary: c.summary, exampleUtterances: c.exampleUtterances.slice(0, 2) };
        });
        const response = await fetch(DIAGNOSE_METHOD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemId: 'photo-proto',
            rawText,
            allowedMethodIds: allowedMethods.map((m) => m.id),
            allowedMethods,
          }),
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const result = await response.json();
        if (result.needsManualSelection) showCandidateCards(result.candidateMethodIds);
        else startFlow(result.predictedMethodId);
      } catch {
        showCandidateCards([]);  // 라우터 실패 시 전체 목록으로
      }
    });
    actionsBox.appendChild(submit);
    input.focus();
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
