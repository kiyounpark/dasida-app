(function () {
  const P = window.PROBLEM;

  // analytics.js가 window.track을 제공하면 로깅, 없으면 no-op (Task 6에서 활성화)
  const logEvent = (name, params = {}) => {
    if (typeof window.track === 'function') window.track(name, params);
  };

  const screens = {
    problem: document.getElementById('screen-problem'),
    chat: document.getElementById('screen-chat'),
    summary: document.getElementById('screen-summary'),
  };

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    if (name !== 'chat') window.scrollTo(0, 0);
  }

  // ----- 채팅 엔진 (앱 diagnosis-chat-bubble 이식) -----
  const thread = document.getElementById('chat-thread');
  const actionsBox = document.getElementById('chat-actions');

  function scrollToLatest() {
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }

  function assistantSays(text, tone) {
    // 연속된 코치 말풍선은 첫 개에만 아바타 (앱 showAvatar 방식)
    const prev = thread.lastElementChild;
    const prevAssistant = prev && prev.classList.contains('bubble-row')
      && !prev.classList.contains('user');
    const row = document.createElement('div');
    row.className = 'bubble-row';
    const img = document.createElement('img');
    img.className = 'avatar' + (prevAssistant ? ' ghost' : '');
    img.src = './assets/ai-coach-avatar.png';
    img.alt = '';
    const bubble = document.createElement('div');
    bubble.className = 'bubble assistant' + (tone ? ' ' + tone : '');
    fillWithBold(bubble, text);
    row.append(img, bubble);
    thread.appendChild(row);
    scrollToLatest();
  }

  // "**핵심어**" 마커를 <strong>으로 (텍스트 노드로만 조립 — 주입 없음)
  function fillWithBold(el, text) {
    text.split('**').forEach((part, i) => {
      if (!part) return;
      if (i % 2 === 1) {
        const strong = document.createElement('strong');
        strong.textContent = part;
        el.appendChild(strong);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  // 문제 버블 — 진단 채팅 최상단 (앱 diagnosis-problem-bubble 이식)
  function appendProblemBubble() {
    const card = document.createElement('div');
    card.className = 'problem-bubble';
    const band = document.createElement('div');
    band.className = 'pb-band';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'pb-eyebrow';
    eyebrow.textContent = '오늘 같이 볼 문제';
    const chip = document.createElement('span');
    chip.className = 'pb-chip';
    chip.textContent = P.topic;
    const panel = document.createElement('div');
    panel.className = 'pb-panel';
    const img = document.createElement('img');
    img.src = P.image;
    img.alt = '문제';
    panel.appendChild(img);
    const helper = document.createElement('p');
    helper.className = 'pb-helper';
    helper.textContent = '이 문제를 어떻게 풀었는지부터 같이 볼게요.';
    card.append(band, eyebrow, chip, panel, helper);
    thread.appendChild(card);
    scrollToLatest();
  }

  // 개념 그림 카드 (figures.js의 정적 SVG)
  function appendFigure(key) {
    const svg = (window.FIGURES || {})[key];
    if (!svg) return;
    const card = document.createElement('div');
    card.className = 'figure-card';
    card.innerHTML = svg; // 로컬 정적 자산 — 외부 입력 아님
    thread.appendChild(card);
    scrollToLatest();
  }

  function userSays(text) {
    const row = document.createElement('div');
    row.className = 'bubble-row user';
    const bubble = document.createElement('div');
    bubble.className = 'bubble user';
    bubble.textContent = text;
    row.appendChild(bubble);
    thread.appendChild(row);
    scrollToLatest();
  }

  // buttons: [{ label, kind: 'primary'|'secondary'|'option', onClick }]
  function setActions(buttons) {
    actionsBox.innerHTML = '';
    buttons.forEach(({ label, kind, onClick }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        kind === 'primary' ? 'btn-primary' :
        kind === 'secondary' ? 'btn-secondary' : 'method-option';
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      actionsBox.appendChild(btn);
    });
    scrollToLatest();
  }

  // ----- 약점 정리 페이지 (앱 done-view 스탬프 스타일) -----
  function showSummary(mode, stepIdx) {
    logEvent('summary_shown', { mode, step: stepIdx });
    const step = P.steps[stepIdx];
    const passed = mode === 'passed';
    document.getElementById('stamp-ko').textContent = passed ? '통 과' : '완 료';
    document.getElementById('stamp-en').textContent = passed ? 'PASSED' : 'REVIEWED';
    document.getElementById('stamp-leaf').textContent = passed ? '✅' : '🌿';
    document.getElementById('summary-title').textContent =
      passed ? '이 문제, 통과했어요' : '이 약점, 오늘 짚었어요';
    document.getElementById('summary-sub').textContent =
      passed
        ? '근데 이 문제, 대부분 여기서 무너져요. 넌 넘었고요.'
        : '이제 이 유형을 다시 만나도, 같은 자리에서 안 무너져요.';
    document.getElementById('summary-card-label').textContent =
      passed ? '사람들이 무너지는 단계' : '오늘 짚은 약점';
    document.getElementById('summary-weakness').textContent = step.name;
    document.getElementById('summary-desc').textContent = step.desc;
    const note = document.getElementById('summary-note');
    note.textContent = P.sourceNote;
    note.hidden = !passed; // "무너지는 단계"(정답 경로)에만 출처 명시
    show('summary');
  }

  // ----- 상태 1: 문제 렌더링 -----
  document.getElementById('hook-text').textContent = P.hook;
  document.getElementById('source-label').textContent = P.sourceLabel;
  document.getElementById('problem-image').src = P.image;

  document.getElementById('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const value = Number(document.getElementById('answer-input').value);
    const correct = value === P.answer;
    logEvent('problem_submit', { correct });
    logEvent('result', { outcome: correct ? 'correct' : 'wrong' });
    show('chat');
    userSays('내 답: ' + value);
    if (correct) {
      assistantSays('정답이에요 👏', 'positive');
      assistantSays(P.commonBreak.comment);
      setTimeout(() => showSummary('passed', P.commonBreak.stepIndex), 1400);
    } else {
      appendProblemBubble();
      assistantSays('아깝네요. 이 문제, 어떻게 푸셨어요? 가장 가까운 걸 골라주세요 — 어디서 어긋났는지 짚어드릴게요.');
      setActions(approachActions());
    }
  });

  // 채점 없이 바로 진단 (6모 때 틀렸던 사람용 — 모바일 다수 경로)
  document.getElementById('btn-skip').addEventListener('click', () => {
    logEvent('skip_to_diagnosis');
    show('chat');
    appendProblemBubble();
    assistantSays('그때 그 문제죠. 어떻게 푸셨어요? 가장 가까운 걸 골라주세요 — 기억 안 나도 보면 떠올라요.');
    setActions(approachActions());
  });

  // ----- 진단 대화 트리: 선택 → 짚기·그림·intro → 질문 4개(소크라테스식) → outro → 정리 -----
  function approachActions() {
    return P.approaches.map((a, idx) => ({
      label: a.label,
      kind: 'option',
      onClick: () => {
        logEvent('approach_select', { step: a.brokenStep, index: idx });
        userSays(a.label);
        actionsBox.innerHTML = ''; // 선택 끝 — 코치가 이어서 말하는 동안 버튼 없음
        // 짚기 → 개념 그림 → intro 말풍선, 자동 순차 → 첫 질문
        let t = 400;
        setTimeout(() => assistantSays(a.comment, 'warning'), t); t += 850;
        if (a.figure) { setTimeout(() => appendFigure(a.figure), t); t += 800; }
        (a.dialogue.intro || []).forEach((line) => {
          setTimeout(() => assistantSays(line), t); t += 750;
        });
        setTimeout(() => askQuestion(a, 0), t);
      },
    }));
  }

  // 질문 하나 던지고 3지선다 → 답 반응(정답/오답) → 다음 질문 or outro
  function askQuestion(a, qi) {
    const q = a.dialogue.questions[qi];
    assistantSays(q.q);
    setActions(q.options.map((opt, oi) => ({
      label: opt,
      kind: 'option',
      onClick: () => {
        const correct = oi === q.correct;
        logEvent('dialogue_answer', { step: a.brokenStep, q: qi, correct });
        userSays(opt);
        actionsBox.innerHTML = '';
        const reaction = correct ? q.right : q.wrong[oi];
        setTimeout(() => assistantSays(reaction, correct ? 'positive' : 'warning'), 350);
        // 오답이어도 재시도 없이 다음으로 (correct-and-continue, 막다른 길 없음)
        const nextQi = qi + 1;
        if (nextQi < a.dialogue.questions.length) {
          setTimeout(() => askQuestion(a, nextQi), 1250);
        } else {
          finishDialogue(a);
        }
      },
    })));
  }

  function finishDialogue(a) {
    logEvent('cycle_done', { step: a.brokenStep });
    let t = 1250;
    (a.dialogue.outro || []).forEach((line, i) => {
      setTimeout(() => assistantSays(line, i === 0 ? 'positive' : undefined), t);
      t += 850;
    });
    setTimeout(() => showSummary('weakness', a.brokenStep), t);
  }

  // ----- 상태 3: 마무리 CTA -----
  document.getElementById('store-link').addEventListener('click', () => {
    logEvent('store_click');
  });

  show('problem');
})();
