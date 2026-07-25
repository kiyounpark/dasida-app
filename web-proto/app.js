(function () {
  // ── 설정 ──
  const PROJECT_ID = 'dasida-app';
  const ANALYZE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/analyzePhoto`;
  const DIAGNOSE_URL = `https://asia-northeast3-${PROJECT_ID}.cloudfunctions.net/diagnoseMethod`;
  // TODO(기윤 확인): 실제 스토어 링크 — eas.json ascAppId / app.json android.package에서 유도. 출시 후 1회 육안 확인 필요.
  const STORE_URL_IOS = 'https://apps.apple.com/kr/app/id6761792023';
  const STORE_URL_ANDROID = 'https://play.google.com/store/apps/details?id=com.dasida.app';
  function storeUrl() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) ? STORE_URL_IOS : STORE_URL_ANDROID;
  }

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
    coachSays(`그럼 진짜 아는지 보자. ${cand.checkPrompt}`);
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
        showWeaknessCard({
          methodId: pocket.predictedMethodId,
          mistakeType: cand.mistakeType,
          evidence: cand.quote,
          fix: cand.fix,
          aiConfirmed: true,
          checkPassed: passed,
        });
      },
    })));
  }

  // 약점 카드 v2 = 방법 × 실수 유형 × 증거. 설문 경로(aiConfirmed=false)는 증거 없이 조심스러운 톤.
  function showWeaknessCard({ methodId, mistakeType, evidence, fix, aiConfirmed, checkPassed }) {
    const methodLabel = methodId && catalog[methodId] ? catalog[methodId].labelKo : '방법 미상';
    const typeInfo = SURVEY.TYPES[mistakeType];
    const title = `오늘 찾은 ${aiConfirmed ? '진짜 ' : ''}약점 — ${methodLabel} × ${typeInfo.label}`;
    const lines = [];
    if (aiConfirmed && evidence) lines.push(`짚은 자리: "${evidence}"`);
    if (!aiConfirmed) lines.push('(네가 직접 짚어준 것)');
    lines.push(fix || typeInfo.fix);
    if (aiConfirmed) {
      lines.push(checkPassed
        ? '확인 문제는 한 번에 통과 — 원리는 잡았어. 이제 손이 기억하게 만드는 게 다음이야.'
        : '확인 문제도 헷갈렸어 — 급하게 문제 더 풀지 말고, 이 원리 하나 확실히 잡는 게 먼저야.');
    }
    cardEl(title, lines.join('\n'), 'final');
    coachSays('오늘 여기까지. 다음에 같은 자리에서 안 틀리게, 앱에서 이어서 잡아줄게.');
    setActions([
      { label: '다른 문제도 올려보기', kind: 'primary', onPress: () => window.location.reload() },
    ]);
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
    marks[1].textContent = '🔔 그 직전에 내가 다시 물어볼게';
    marks[2].textContent = '내일이면 여기쯤 — 절반';
    thread.appendChild(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });

    coachSays(variant === 'survey'
      ? '앱에서는 네 약점을 문제로 만들어서, 타이밍 맞춰 다시 물어봐 줘.'
      : '그래서 타이밍은 내가 챙길게. 앱에서는 이걸 알림으로 해줘.');

    // setActions는 클릭 시 버튼을 지운다 — 스토어는 새 탭이라 돌아왔을 때 빈 화면이 되지 않게 다시 그린다.
    const endingActions = () => setActions([
      { label: '📱 다시다에서 이어서 하기', kind: 'primary',
        onPress: () => { window.open(storeUrl(), '_blank'); endingActions(); } },
      { label: '다른 문제도 올려보기', kind: 'ghost', onPress: () => window.location.reload() },
    ]);
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
