import type { ConsentSubmitParams } from '@/functions/src/photo-store-contract';

export type EventName =
  | 'diagnosis_started'
  | 'diagnosis_completed'
  | 'graduation_reached'
  | 'review_started'
  | 'review_completed'
  | 'mock_exam_started'
  | 'mock_exam_completed'
  | 'weakness_practice_started'
  | 'weakness_practice_completed'
  | 'no_review_day_card_viewed'
  | 'no_review_day_card_cta_pressed'
  | 'notification_opened'
  | 'review_router_called'
  | 'review_router_succeeded'
  | 'review_router_fallback'
  | 'review_fallback_chat_completed'
  // 사진 오답노트 (1.0.8) — 이 셋이 "학생 사진에서 약점 이름이 몇 % 붙는가"의 분자와 분모다
  | 'photo_submit'
  | 'photo_analyzed'
  | 'photo_weakness_labeled'
  | 'photo_weakness_picked'
  | 'photo_dead_end'
  | 'photo_quiz_verify'
  // 1.0.10(B) — 웹과 같은 대본(features/photo/script)이 내는 이벤트. 웹 GA 이름 앞에 photo_만 붙였다
  | 'photo_method_confirm'
  | 'photo_error_point_react'
  | 'photo_check_answer'
  | 'photo_survey_pick'
  | 'photo_weakness_card_shown'
  | 'photo_note_shown'
  // 1.0.11 대기 화면 예시 카드 넘김 — 웹 wait_card_next 앞에 photo_만 붙였다
  | 'photo_wait_card_next'
  // 1.0.11 사진 동의 화면 — 이름은 약속 파일 CONSENT_GA_EVENTS와 같다
  | 'consent_view'
  | 'consent_submit';

export type ExamSource =
  | 'no_review_day_card'
  | 'exam_selection'
  | 'journey_hub'
  | 'other';

export type DiagnosisSource = 'exam' | 'unit';

export type NotificationType = 'review_reminder' | 'unknown';

export type EventParams = {
  diagnosis_started: { source: DiagnosisSource };
  diagnosis_completed: {
    source: DiagnosisSource;
    weakness_id: string;
    exam_id?: string;
    problem_number?: number;
  };
  graduation_reached: Record<string, never>;
  review_started: { task_id: string };
  review_completed: {
    task_id: string;
    correct_count: number;
    total_count: number;
  };
  mock_exam_started: { exam_id: string; source: ExamSource };
  mock_exam_completed: {
    exam_id: string;
    duration_sec: number;
    correct_count: number;
    total_count: number;
  };
  weakness_practice_started: { weakness_id: string };
  weakness_practice_completed: {
    weakness_id: string;
    correct_count: number;
    total_count: number;
  };
  no_review_day_card_viewed: { days_until_next_review: number };
  no_review_day_card_cta_pressed: { days_until_next_review: number };
  notification_opened: {
    notification_type: NotificationType;
    task_id?: string;
    scheduled_at?: string;
    opened_at: string;
  };
  review_router_called: {
    weakness_id: string;
    step_index: number;
    candidate_count: number;
  };
  review_router_succeeded: {
    weakness_id: string;
    step_index: number;
    predicted_node_id: string;
    confidence: number;
    source: 'openai-router' | 'mock-router';
  };
  review_router_fallback: {
    weakness_id: string;
    step_index: number;
    reason: 'low_confidence' | 'no_candidates' | 'empty_input' | 'network_error';
  };
  review_fallback_chat_completed: {
    weakness_id: string;
    step_index: number;
    turn_count: 1 | 2;
  };
  /**
   * 사진을 실제로 고르거나 찍은 순간. 취소하면 안 남는다 — 깔때기의 첫 칸.
   * source는 찍었나 앨범에서 골랐나. 눈앞 종이를 바로 찍는 게 주 경로라고
   * 보고 만든 건데, 실제로 그런지는 이 칸이 답한다.
   */
  photo_submit: { source: 'camera' | 'library' };
  /** analyzePhoto 원샷 응답. 실패도 남긴다(success: false) — 안 남기면 분모가 샌다. */
  photo_analyzed: {
    success: boolean;
    /** AI가 읽어낸 풀이법. 실패했으면 없다. */
    method_id?: string;
    /** 사진에 풀이 흔적이 있었나. false면 재촬영 갈래로 빠진다. */
    has_solving_work?: boolean;
    needs_manual_selection?: boolean;
    error_candidate_count?: number;
    /** 사진 거르기(1.0.10). 'blocked_*'면 분석 대신 "다시 찍어줘"로 갔다. 옛 서버면 'none' */
    gate_decision?: string;
  };
  /**
   * 쪽지·재도전 검산 결과, 문항 차례에 한 번 (1.0.10 — 웹 quiz_verify와 같은 칸).
   * result가 skip이면 그 문제를 학생에게 안 냈다. 98% 자체는 여기로 못 잰다(정답표가 필요).
   */
  /** 대기 화면에서 [다음 예시 보기]를 누름 (웹 wait_card_next와 같은 칸). 읽을거리가 붙잡는지 본다 */
  photo_wait_card_next: {
    /** 넘긴 뒤 보이는 카드 순번(0부터) */
    card_index: number;
    /** 대기 화면이 뜬 뒤 지난 시간 */
    wait_ms: number;
  };
  photo_quiz_verify: {
    kind: 'check' | 'retry';
    result: 'match' | 'skip';
    /** match · none/multiple/ambiguous(서버 판정) · error · timeout · wait_timeout · not_started */
    reason: string;
    verify_ms: number | null;
    waited_ms: number;
    /** 쪽지(check)에만 — 짚기에 어떻게 반응한 뒤였나 (웹 quiz_verify와 같은 칸) */
    react?: string;
  };
  /**
   * 오답노트가 나온 순간의 (풀이법 × 실수유형) 칸과 그 칸에서 약점 이름이 붙었는지.
   * weakness_count === 0 이 통역표 186칸 중 131칸(70%)인 빈손 자리다.
   * 붙은 것만 세면 "몇 %"의 분모가 사라지므로 빈손도 반드시 남긴다.
   */
  photo_weakness_labeled: {
    method_id: string;
    mistake_type: string;
    weakness_count: number;
    labeled: boolean;
  };
  /**
   * 후보가 둘 이상이라 학생한테 물었고, 학생이 답한 순간 (2026.09.20 신설).
   *
   * `photo_weakness_labeled`는 **질문 앞에서** 찍힌다 — 그래야 질문에서 나간 학생이 분모에 남는다.
   * **질문 이탈 = labeled(weakness_count ≥ 2) − picked.**
   *
   * `picked`가 null이면 학생이 「잘 모르겠어」를 고른 것이다. 안 물어본 것(후보 1개)과 다르다 —
   * 그 경우엔 이 이벤트 자체가 안 찍힌다.
   */
  photo_weakness_picked: {
    method_id: string;
    mistake_type: string;
    candidate_count: number;
    picked: string | null;
  };
  /**
   * ⚠️ 1.0.9까지 찍힌 이름 — 1.0.10(B)부터는 안 찍힌다. 노트 없이 끝나던 세 갈래가 웹처럼
   * 설문 → 약점 카드(photo_weakness_card_shown)로 가고, 짚기 사다리는 없어졌다.
   *
   * 오답노트를 못 받고 끝난 순간. photo_weakness_labeled가 분자라면 이쪽이 **분모의 나머지**다.
   *
   * 웹 28일 실측이 photo_submit 21 → note_shown 1이었다. 21명 중 20명이 여기로 빠지는데
   * 지금까지 한 건도 안 남아서, 병목이 AI 감지율인지 학생 이탈인지 가를 수가 없었다.
   *
   * reason 셋이 그대로 AI 실패의 종류다:
   * - no_error_found    방법은 맞혔는데 풀이에서 틀린 데를 못 찾음
   * - method_mismatch   방법 자체를 못 읽음 (학생이 목록에서 직접 골라줌)
   * - pointing_rejected 짚어준 자리를 학생이 전부 아니라고 함
   */
  photo_dead_end: {
    reason: 'no_error_found' | 'method_mismatch' | 'pointing_rejected';
    /** 확정된 풀이법. 어느 방법에서 많이 막히는지 봐야 다음에 뭘 고칠지 정해진다. */
    method_id: string;
    /** pointing_rejected에서만 — 짚기 사다리를 몇 개까지 보여주고 거절당했나 (0~2). */
    attempts?: number;
  };
  /** AI가 읽은 방법을 학생이 맞다/아니다 한 순간. mode: 단언(assert)·추측 확인(soft) — 웹 method_confirm */
  photo_method_confirm: { answer: 'yes' | 'no'; mode: 'assert' | 'soft' };
  /**
   * 짚어준 자리에 대한 반응 — 웹 error_point_react. got_it은 "수긍"이지 적중 증명이 아니다.
   * 확실한 빗나감은 not_mine(내가 이렇게 안 썼는데)뿐 — 짚기 적중률의 하한.
   */
  photo_error_point_react: { react: 'got_it' | 'dont_get_why' | 'not_mine' };
  /** 쪽지시험 답 — 설명이 먹혔나를 react별로 가른다 (웹 check_answer) */
  photo_check_answer: { passed: 0 | 1; react: string };
  /** 오류를 못 짚은 날 학생이 고른 느낌 — dont_know는 「잘 모르겠어」 (웹 survey_pick) */
  photo_survey_pick: { mistake: string };
  /**
   * 설문 결말 카드에 닿은 수(저장 안 함). photo_note_shown과 합치면 결말 도달 전체.
   * 🔒 10.01 — 카드로 끝난 수가 노트로 끝난 수보다 많아지면 카드 저장을 붙인다.
   */
  photo_weakness_card_shown: { method: string; mistake: string };
  /** 오답노트까지 걸어간 수 — retry는 재도전 결과(unverified = 검산 통과 못 해 안 냄) (웹 note_shown) */
  photo_note_shown: { retry: string };
  /** 동의 화면이 뜬 순간(1.0.11). 기존 가입자도 다음 실행에 한 번 뜬다 */
  consent_view: Record<string, never>;
  /**
   * [다음]을 눌러 넘긴 순간. 필수 둘은 늘 true라 안 싣는다 — review(선택)와 누른 방식(via)만.
   * via: 'all' = [전체 동의]로 넘김 · 'individual' = 하나씩 골라 넘김. 서버 동의 문서의 via와 같은 값
   */
  consent_submit: ConsentSubmitParams;
};

export type ScreenName =
  | 'quiz_hub'
  | 'mock_exam_intro'
  | 'mock_exam_session'
  | 'review_session'
  | 'weakness_practice'
  | 'diagnostic_screen'
  | 'photo_flow'
  | 'sign_in'
  | 'onboarding'
  | 'history'
  | 'profile'
  | 'unknown';
