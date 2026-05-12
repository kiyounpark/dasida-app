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
  | 'review_fallback_chat_completed';

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
