// 느낌 설문 + 약점 카드 문구 — 실수 유형 6종 기준.
// 원칙: 특정 문제의 숫자·식 금지(어떤 문제가 와도 성립), 분석 아닌 느낌을 묻는다.
window.DasidaPhotoSurvey = (function () {
  // 유형 라벨(카드 표기)과 통조림 처방(설문 경로 카드용 — 짚기 성공 시엔 AI의 fix 사용)
  var TYPES = {
    concept_gap:    { label: '개념 구멍',    fix: '문제 더 풀기 전에 이 방법이 왜 되는지 설명을 한 번만 다시 보자. 원리가 잡히면 나머지는 따라와.' },
    formula_recall: { label: '공식 기억',    fix: '시작 전에 공식을 손으로 세 번 써보자. 외운 게 아니라 손에 붙어야 실전에서 안 흔들려.' },
    setup_error:    { label: '식 세우기',    fix: '식을 세우면 대입하기 전에 문제 말과 맞는지 한 번 소리 내서 확인하자.' },
    calc_slip:      { label: '계산 손실수',  fix: '계산을 한 줄에 몰아 쓰지 말고 한 단계 한 줄로 끊어 쓰자. 손실수는 줄 간격에서 잡힌다.' },
    procedure_miss: { label: '절차 누락',    fix: '이 방법의 단계를 번호로 적어두고 풀 때마다 지워가며 가자. 빼먹는 자리가 보이게.' },
    answer_read:    { label: '마무리 해석',  fix: '답 쓰기 전에 "문제가 뭘 물었지?"를 한 번 다시 읽자. 다 풀고 넘어지는 게 제일 아깝잖아.' },
  };

  // 기본 설문 3종 — 커스텀이 없는 방법은 이 문구를 쓴다 (모든 방법에 실제 문구 보장)
  var DEFAULT_OPTIONS = [
    { type: 'concept_gap', text: '이 방법의 원리 자체가 잘 안 잡혔어' },
    { type: 'calc_slip',   text: '식은 세웠는데 계산에서 미끄러졌어' },
    { type: 'answer_read', text: '다 풀어놓고 마지막에 답을 잘못 쓴 것 같아' },
  ];

  // 방법별 커스텀 (그 방법의 언어로) — 검증하며 계속 추가한다
  var BY_METHOD = {
    cps: [
      { type: 'concept_gap',    text: '(x−a)² 꼴로 만드는 원리가 헷갈렸어' },
      { type: 'calc_slip',      text: '식 변형하다가 계산에서 미끄러졌어' },
      { type: 'procedure_miss', text: '(x−a)²=k까지 갔는데 그다음 뭘 할지 몰랐어' },
    ],
    vertex: [
      { type: 'formula_recall', text: '-b/2a 공식이 가물가물했어' },
      { type: 'calc_slip',      text: 'x 구하고 대입하다가 계산이 엉켰어' },
      { type: 'answer_read',    text: '구한 값에서 뭘 답으로 쓸지 헷갈렸어' },
    ],
    limit: [
      { type: 'concept_gap', text: '극한을 어떻게 쪼개는지 개념이 안 잡혔어' },
      { type: 'calc_slip',   text: '식 정리하다가 계산이 엉켰어' },
      { type: 'answer_read', text: '수렴인지 발산인지 마지막 판단이 헷갈렸어' },
    ],
  };

  // B안(오류 못 찾은 날) 전용: answer_read 힌트 버전
  var ANSWER_READ_HINT = { type: 'answer_read', text: '마지막에 답 쓸 때 실수한 것 같아' };

  function optionsFor(methodId) {
    var custom = methodId && BY_METHOD[methodId];
    return (custom || DEFAULT_OPTIONS).slice();
  }

  return { TYPES: TYPES, optionsFor: optionsFor, ANSWER_READ_HINT: ANSWER_READ_HINT };
})();
