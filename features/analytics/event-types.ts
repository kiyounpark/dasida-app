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
  | 'photo_weakness_labeled';

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
};

export type ScreenName =
  | 'quiz_hub'
  | 'mock_exam_intro'
  | 'mock_exam_session'
  | 'review_session'
  | 'weakness_practice'
  | 'diagnostic_screen'
  | 'sign_in'
  | 'onboarding'
  | 'history'
  | 'profile'
  | 'unknown';
