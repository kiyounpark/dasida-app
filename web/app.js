(function () {
  const P = window.PROBLEM;

  // analytics.js가 window.track을 제공하면 로깅, 없으면 no-op (Task 6에서 활성화)
  const logEvent = (name, params = {}) => {
    if (typeof window.track === 'function') window.track(name, params);
  };

  const screens = {
    problem: document.getElementById('screen-problem'),
    chat: document.getElementById('screen-chat'),
    cta: document.getElementById('screen-cta'),
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
    const row = document.createElement('div');
    row.className = 'bubble-row';
    const img = document.createElement('img');
    img.className = 'avatar';
    img.src = './assets/ai-coach-avatar.png';
    img.alt = '';
    const bubble = document.createElement('div');
    bubble.className = 'bubble assistant' + (tone ? ' ' + tone : '');
    bubble.textContent = text;
    row.append(img, bubble);
    thread.appendChild(row);
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

  function appendStepMap(brokenStep, breakTag, variant) {
    const card = document.createElement('ol');
    card.className = 'step-map chat-card';
    P.steps.forEach((s, i) => {
      const li = document.createElement('li');
      li.dataset.num = String(i + 1);
      if (i === brokenStep) li.classList.add(variant === 'fixed' ? 'fixed' : 'broken');
      li.innerHTML =
        '<span class="step-name"></span><span class="step-desc"></span>' +
        (i === brokenStep ? '<span class="break-tag"></span>' : '');
      li.querySelector('.step-name').textContent = s.name;
      li.querySelector('.step-desc').textContent = s.desc;
      if (i === brokenStep) {
        li.querySelector('.break-tag').textContent =
          (variant === 'fixed' ? '✅ ' : '⚡ ') + breakTag;
      }
      card.appendChild(li);
    });
    thread.appendChild(card);
    const note = document.createElement('p');
    note.className = 'chat-note';
    note.textContent = P.sourceNote;
    thread.appendChild(note);
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

  function goCta() {
    logEvent('cta_open');
    show('cta');
  }
  const ctaAction = { label: '이걸 내 오답에도 하고 싶다면', kind: 'primary', onClick: goCta };

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
      appendStepMap(P.commonBreak.stepIndex, '사람들이 가장 많이 무너지는 단계');
      setActions([ctaAction]);
    } else {
      assistantSays('아깝네요. 어떻게 푸셨어요? 가장 가까운 걸 골라주세요 — 어디서 어긋났는지 짚어드릴게요.');
      setActions(approachActions());
    }
  });

  // 채점 없이 바로 진단 (6모 때 틀렸던 사람용 — 모바일 다수 경로)
  document.getElementById('btn-skip').addEventListener('click', () => {
    logEvent('skip_to_diagnosis');
    show('chat');
    userSays('6모 때 틀렸던 문제예요. 어디서 막혔는지 볼래요.');
    assistantSays('그때 그 문제, 어떻게 푸셨어요? 가장 가까운 걸 골라주세요 — 기억 안 나도 보면 떠올라요.');
    setActions(approachActions());
  });

  // ----- 진단 사이클: 선택 → 짚기 → 설명 → 확인 → 잡음 -----
  function approachActions() {
    return P.approaches.map((a, idx) => ({
      label: a.label,
      kind: 'option',
      onClick: () => {
        logEvent('approach_select', { step: a.brokenStep, index: idx });
        userSays(a.label);
        assistantSays(a.comment, 'warning');
        appendStepMap(a.brokenStep, '어긋난 단계');
        setActions([
          { label: '왜 그런지 볼래요?', kind: 'primary', onClick: () => enterExplain(a) },
          ctaAction2(),
        ]);
      },
    }));
  }

  // 사이클 건너뛰고 싶은 사람용 보조 마무리
  function ctaAction2() {
    return { label: '여기까지만 볼래요', kind: 'secondary', onClick: goCta };
  }

  function enterExplain(a) {
    logEvent('cycle_explain', { step: a.brokenStep });
    userSays('왜 그런지 볼래요');
    assistantSays(a.explain);
    setActions([
      { label: '이해했어요 — 확인해볼래요', kind: 'primary', onClick: () => enterCheck(a) },
      { label: '아직 잘 모르겠어요', kind: 'secondary', onClick: () => enterEasy(a) },
    ]);
  }

  function enterEasy(a) {
    logEvent('cycle_easy', { step: a.brokenStep });
    userSays('아직 잘 모르겠어요');
    assistantSays(a.easy);
    setActions([
      { label: '이해했어요 — 확인해볼래요', kind: 'primary', onClick: () => enterCheck(a) },
    ]);
  }

  function enterCheck(a) {
    userSays('이해했어요');
    assistantSays('좋아요, 확인 한 번만 해볼게요. ' + a.check.question);
    setActions(checkActions(a));
  }

  function checkActions(a) {
    return a.check.options.map((opt, idx) => ({
      label: opt,
      kind: 'option',
      onClick: () => {
        const correct = idx === a.check.correctIndex;
        logEvent('cycle_check', { step: a.brokenStep, correct });
        userSays(opt);
        if (correct) {
          logEvent('cycle_done', { step: a.brokenStep });
          assistantSays('맞아요. 이 단계, 이제 잡혔어요 ✅ 다음에 이 유형을 만나면, 같은 자리에서 안 무너져요.', 'positive');
          appendStepMap(a.brokenStep, '잡은 단계', 'fixed');
          setActions([ctaAction]);
        } else {
          assistantSays('💡 ' + a.check.hint, 'warning');
          setActions(checkActions(a));
        }
      },
    }));
  }

  // ----- 상태 3: 마무리 CTA -----
  document.getElementById('store-link').addEventListener('click', () => {
    logEvent('store_click');
  });

  show('problem');
})();
