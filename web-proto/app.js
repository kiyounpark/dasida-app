(function () {
  // ── 설정 ──
  const PROJECT_ID = 'dasida-app';
  const ANALYZE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;

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
      { label: '아니야, 다른 방법으로 풀었어', kind: 'ghost', onPress: () => { userSays('아니야'); showCandidateCards([]); } },
    ]);
  }
  function firstSnippet(transcription) {
    if (!transcription) return '';
    const cut = transcription.split(/[.。\n]/)[0].trim();
    return cut.length > 40 ? cut.slice(0, 40) + '…' : cut;
  }

  // 갈래 2: 후보 카드 (후보 없으면 전체 목록)
  function showCandidateCards(candidateIds, promptText) {
    // unknown·웹 카탈로그에 없는 id(사본 드리프트) 방어
    const candidates = candidateIds.filter((id) => id !== 'unknown' && catalog[id]);
    coachSays(
      promptText ??
        (candidates.length > 0 ? '풀이를 봤는데 확실하지 않아. 이 중에 어떤 방법이었어?' : '어떤 방법으로 풀었어?')
    );
    const list = candidates.length > 0 ? candidates : selectableMethods.map((m) => m.id);
    const buttons = list.map((id) => ({
      label: catalog[id].labelKo,
      onPress: () => { userSays(catalog[id].labelKo); startFlow(id); },
    }));
    if (candidates.length > 0) {
      buttons.push({ label: '이 중엔 없어', kind: 'ghost', onPress: () => showCandidateCards([]) });
    }
    setActions(buttons);
  }

  // 갈래 3: 질문 폴백 — 카탈로그 키워드로 로컬 매칭 (앱 mock 라우터와 같은 원리)
  // 주의: 배포된 diagnoseMethod는 allowedMethods를 최대 12개만 받아 31개 전송 시 항상 400 →
  // 원격 호출 대신 번들에 이미 있는 keywords로 후보를 좁히고 최종 선택은 학생이 한다.
  function matchMethodsByKeywords(rawText) {
    const text = rawText.toLowerCase();
    return selectableMethods
      .map((m) => {
        const c = catalog[m.id];
        const hits = [...c.keywords, c.labelKo].reduce(
          (n, kw) => n + (text.includes(kw.toLowerCase()) ? 1 : 0), 0);
        return { id: m.id, hits };
      })
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 3)
      .map((s) => s.id);
  }

  function askMethodByText() {
    coachSays('사진에서 풀이 과정을 못 찾았어. 머리로 푼 거면 괜찮아 — 어떤 방법으로 풀었는지 짧게 알려줄래?');
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
      userSays(rawText);
      actionsBox.innerHTML = '';
      const matched = matchMethodsByKeywords(rawText);
      showCandidateCards(matched, matched.length > 0 ? '이 중에 있어?' : undefined);
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
