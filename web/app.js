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
    explain: document.getElementById('screen-explain'),
    check: document.getElementById('screen-check'),
    cta: document.getElementById('screen-cta'),
  };

  let currentApproach = null; // 오답 사이클에서 고른 approach
  let resultNext = 'cta';     // 진단 화면의 버튼이 가는 곳: 'explain' | 'cta'

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
      currentApproach = null;
      renderResult({
        title: '정답이에요 👏',
        comment: P.commonBreak.comment,
        brokenStep: P.commonBreak.stepIndex,
        breakTag: '사람들이 가장 많이 무너지는 단계',
        buttonLabel: '이걸 내 오답에도 하고 싶다면',
        next: 'cta',
      });
    } else {
      enterMethod('아깝네요. 어떻게 푸셨어요?');
    }
  });

  // 채점 없이 바로 진단 (6모 때 틀렸던 사람용 — 모바일 다수 경로)
  document.getElementById('btn-skip').addEventListener('click', () => {
    logEvent('skip_to_diagnosis');
    enterMethod('그때 그 문제, 어떻게 푸셨어요?');
  });

  function enterMethod(title) {
    document.getElementById('method-title').textContent = title;
    renderMethodOptions();
    show('method');
  }

  // ----- 상태 2: 풀이 선택 (오답/스킵) -----
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
        currentApproach = a;
        renderResult({
          title: '여기서 어긋났어요',
          comment: a.comment,
          brokenStep: a.brokenStep,
          breakTag: '어긋난 단계',
          buttonLabel: '왜 그런지 볼래요?',
          next: 'explain',
        });
      });
      box.appendChild(btn);
    });
  }

  // ----- 상태 3: 진단/지도 (짚기·마무리 공용 컴포넌트) -----
  function renderResult({ title, comment, brokenStep, breakTag, buttonLabel, next, variant }) {
    resultNext = next;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-comment').textContent = comment;
    const map = document.getElementById('step-map');
    map.innerHTML = '';
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
      map.appendChild(li);
    });
    document.getElementById('source-note').textContent = P.sourceNote;
    document.getElementById('btn-finish').textContent = buttonLabel;
    show('result');
  }

  document.getElementById('btn-finish').addEventListener('click', () => {
    if (resultNext === 'explain' && currentApproach) {
      enterExplain();
    } else {
      logEvent('cta_open');
      show('cta');
    }
  });

  // ----- 상태 3.5: 사이클 — 왜 그런지 설명 -----
  function enterExplain() {
    const a = currentApproach;
    logEvent('cycle_explain', { step: a.brokenStep });
    document.getElementById('explain-title').textContent = P.steps[a.brokenStep].name + ' — 왜 그럴까요?';
    document.getElementById('explain-body').textContent = a.explain;
    document.getElementById('btn-easier').hidden = false;
    show('explain');
  }

  document.getElementById('btn-easier').addEventListener('click', () => {
    const a = currentApproach;
    logEvent('cycle_easy', { step: a.brokenStep });
    document.getElementById('explain-body').textContent = a.easy;
    document.getElementById('btn-easier').hidden = true;
  });

  document.getElementById('btn-got-it').addEventListener('click', () => enterCheck());

  // ----- 상태 3.6: 사이클 — 확인 미니 질문 -----
  function enterCheck() {
    const a = currentApproach;
    const box = document.getElementById('check-options');
    const hint = document.getElementById('check-hint');
    document.getElementById('check-question').textContent = a.check.question;
    hint.hidden = true;
    hint.textContent = '💡 ' + a.check.hint;
    box.innerHTML = '';
    a.check.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'method-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        const correct = idx === a.check.correctIndex;
        logEvent('cycle_check', { step: a.brokenStep, correct });
        if (correct) {
          logEvent('cycle_done', { step: a.brokenStep });
          renderResult({
            title: '이 단계, 이제 잡혔어요 ✅',
            comment: '다음에 이 유형을 만나면, 같은 자리에서 안 무너져요.',
            brokenStep: a.brokenStep,
            breakTag: '잡은 단계',
            buttonLabel: '이걸 내 오답에도 하고 싶다면',
            next: 'cta',
            variant: 'fixed',
          });
        } else {
          btn.classList.add('wrong');
          hint.hidden = false;
        }
      });
      box.appendChild(btn);
    });
    show('check');
  }

  // ----- 상태 4: 마무리 CTA -----
  document.getElementById('store-link').addEventListener('click', () => {
    logEvent('store_click');
  });

  show('problem');
})();
