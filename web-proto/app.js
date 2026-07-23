(function () {
  // ── 설정 ──
  const PROJECT_ID = 'dasida-app';
  const ANALYZE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;
  const FLOW_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/diagnoseFlow`;

  // 진단 flow(문진표 트리·약점 매핑·키워드 규칙)는 서버에서만 돈다.
  // 브라우저는 서버가 내려주는 "노드 하나 + draft 토큰"만 그려주는 껍데기다.
  let draft = null;

  async function callFlow(payload) {
    const res = await fetch(FLOW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

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

  // 버튼 클릭은 대부분 서버 호출이라, 실패해도 안 죽고 버튼을 복원하도록 일괄 래핑한다.
  let lastButtons = [];
  function setActions(buttons) {
    lastButtons = buttons;
    actionsBox.innerHTML = '';
    buttons.forEach(({ label, kind, onPress }) => {
      const b = document.createElement('button');
      if (kind) b.className = kind;
      b.textContent = label;
      b.addEventListener('click', async () => {
        actionsBox.innerHTML = '';
        try {
          await onPress();
        } catch (error) {
          coachSays('연결이 잠깐 끊겼어. 한 번만 다시 눌러줄래?');
          setActions(lastButtons);
        }
      });
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
      await routeFromAnalysis(result);
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
  async function routeFromAnalysis(result) {
    try {
      if (!result.hasSolvingWork) {
        askMethodByText(); // 갈래 3: 풀이 흔적 없음 → 질문 폴백
        return;
      }
      if (result.needsManualSelection) {
        await showCandidateCards(result.candidateMethodIds); // 갈래 2: 애매 → 후보 카드
        return;
      }
      await assertMethod(result); // 갈래 1: 확신 → 단언
    } catch (error) {
      coachSays('진단을 불러오다 연결이 끊겼어. 새로고침하고 다시 올려줄래?');
      setActions([{ label: '다시 시도', kind: 'primary', onPress: () => window.location.reload() }]);
    }
  }

  // 갈래 1: 단언 + 탈출구 (라벨은 서버에서 받아온다)
  async function assertMethod(result) {
    const { methods } = await callFlow({ action: 'labels', ids: [result.predictedMethodId] });
    const info = methods[0];
    if (!info) {
      // 서버가 라벨을 못 준 경우(알 수 없는 방법) — 죽지 말고 후보 카드로
      await showCandidateCards(result.candidateMethodIds);
      return;
    }
    const snippet = firstSnippet(result.transcription);
    coachSays(`풀이 읽었어. ${snippet ? snippet + ' — ' : ''}${info.labelKo}(으)로 접근했네.`);
    coachSays('그럼 여기서부터 같이 보자.');
    setActions([
      { label: '맞아, 시작하자', kind: 'primary', onPress: async () => { userSays('맞아'); await startFlow(result.predictedMethodId); } },
      { label: '아니야, 다른 방법으로 풀었어', kind: 'ghost', onPress: async () => { userSays('아니야'); await showCandidateCards([]); } },
    ]);
  }
  function firstSnippet(transcription) {
    if (!transcription) return '';
    const cut = transcription.split(/[.。\n]/)[0].trim();
    return cut.length > 40 ? cut.slice(0, 40) + '…' : cut;
  }

  // 갈래 2: 후보 카드 (후보 없으면 전체 목록) — 라벨·목록 모두 서버에서 받는다
  async function showCandidateCards(candidateIds, promptText) {
    let candidates = [];
    if (candidateIds && candidateIds.length > 0) {
      const res = await callFlow({ action: 'labels', ids: candidateIds });
      candidates = res.methods; // 서버가 unknown·미확인 id를 이미 걸러 valid만 반환
    }
    const list = candidates.length > 0
      ? candidates
      : (await callFlow({ action: 'labels', ids: [] })).methods; // 후보 없으면 전체 선택 목록
    coachSays(
      promptText ??
        (candidates.length > 0 ? '풀이를 봤는데 확실하지 않아. 이 중에 어떤 방법이었어?' : '어떤 방법으로 풀었어?')
    );
    const buttons = list.map((m) => ({
      label: m.labelKo,
      onPress: async () => { userSays(m.labelKo); await startFlow(m.id); },
    }));
    if (candidates.length > 0) {
      buttons.push({ label: '이 중엔 없어', kind: 'ghost', onPress: async () => { await showCandidateCards([]); } });
    }
    setActions(buttons);
  }

  // 갈래 3: 질문 폴백 — 서버가 키워드 매칭 (규칙이 브라우저에 없다)
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
    submit.addEventListener('click', async () => {
      const rawText = input.value.trim();
      if (!rawText) return;
      submit.disabled = true;
      userSays(rawText);
      actionsBox.innerHTML = '';
      try {
        const { methods, matched } = await callFlow({ action: 'matchText', text: rawText });
        await showCandidateCards(methods.map((m) => m.id), matched ? '이 중에 있어?' : undefined);
      } catch (error) {
        coachSays('연결이 잠깐 끊겼어. 다시 알려줄래?');
        askMethodByText();
      }
    });
    actionsBox.appendChild(submit);
    input.focus();
  }

  // ── 진단 flow 러너 (서버가 노드를 한 스텝씩 내려준다) ──
  async function startFlow(methodId) {
    const { draft: next, node } = await callFlow({ action: 'start', methodId });
    draft = next;
    renderNode(node);
  }
  async function advance(event) {
    const { draft: next, node } = await callFlow({ action: 'advance', draft, event });
    draft = next;
    renderNode(node);
  }
  function renderNode(node) {
    if (node.kind === 'choice') {
      cardEl(node.title, node.body);
      setActions(node.options.map((option) => ({
        label: option.text,
        onPress: async () => { userSays(option.text); await advance({ type: 'choice', optionId: option.id }); },
      })));
      return;
    }

    if (node.kind === 'explain') {
      cardEl(node.title, node.body);
      setActions([
        { label: node.primaryLabel, kind: 'primary', onPress: async () => { await advance({ type: 'explain', reply: 'continue' }); } },
        { label: node.secondaryLabel, kind: 'ghost', onPress: async () => { await advance({ type: 'explain', reply: 'dont_know' }); } },
      ]);
      return;
    }

    if (node.kind === 'check') {
      cardEl(node.title, node.prompt);
      const buttons = node.options.map((option) => ({
        label: option.text,
        onPress: async () => { userSays(option.text); await advance({ type: 'check', optionId: option.id }); },
      }));
      buttons.push({ label: '모르겠어요', kind: 'ghost', onPress: async () => { await advance({ type: 'check' }); } });
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
