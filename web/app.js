(function () {
  const P = window.PROBLEM;

  // analytics.js가 window.track을 제공하면 로깅, 없으면 no-op (Task 6에서 활성화)
  const logEvent = (name, params = {}) => {
    if (typeof window.track === 'function') window.track(name, params);
  };

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
    const correct = value === P.answer;
    logEvent('problem_submit', { correct });
    logEvent('result', { outcome: correct ? 'correct' : 'wrong' });
    if (correct) {
      renderResult({
        title: '정답이에요 👏',
        comment: P.commonBreak.comment,
        brokenStep: P.commonBreak.stepIndex,
        breakTag: '사람들이 가장 많이 무너지는 단계',
      });
    } else {
      document.getElementById('method-title').textContent = '아깝네요. 어떻게 푸셨어요?';
      renderMethodOptions();
      show('method');
    }
  });

  // 채점 없이 바로 진단 (6모 때 틀렸던 사람용 — 모바일 다수 경로)
  document.getElementById('btn-skip').addEventListener('click', () => {
    logEvent('skip_to_diagnosis');
    document.getElementById('method-title').textContent = '그때 그 문제, 어떻게 푸셨어요?';
    renderMethodOptions();
    show('method');
  });

  // ----- 상태 2: 풀이 선택 (오답) -----
  function renderMethodOptions() {
    const box = document.getElementById('method-options');
    box.innerHTML = '';
    P.approaches.forEach((a, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'method-option';
      btn.textContent = a.label;
      btn.addEventListener('click', () => {
        logEvent('approach_select', { step: a.brokenStep, index: idx });
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
  document.getElementById('btn-finish').addEventListener('click', () => {
    logEvent('cta_open');
    show('cta');
  });
  document.getElementById('store-link').addEventListener('click', () => {
    logEvent('store_click');
  });

  show('problem');
})();
