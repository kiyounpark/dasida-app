import type { MistakeTypeId } from '../types';
import type { ScriptRetryResult } from './script-io';

/**
 * 대본이 내는 이벤트 — 의미만 공용이다. 이름은 웹 GA 이름 그대로(웹 어댑터가 1:1로 보낸다),
 * 앱 어댑터가 photo_* 이름으로 바꿔 보낸다. 전송 칸(submission_id·attempt 등)은 어댑터가 덧붙인다.
 */
export type ScriptEvent =
  | { name: 'method_confirm'; answer: 'yes' | 'no'; mode: 'assert' | 'soft' }
  | { name: 'error_point_react'; react: 'got_it' | 'dont_get_why' | 'not_mine' }
  | {
      name: 'quiz_verify';
      kind: 'check' | 'retry';
      result: 'match' | 'skip';
      reason: string;
      verify_ms: number | null;
      waited_ms: number;
      react?: string;
    }
  | { name: 'check_answer'; passed: 0 | 1; react: string }
  | { name: 'survey_pick'; mistake: MistakeTypeId | 'dont_know' }
  | { name: 'weakness_card_shown'; method: string; mistake: string }
  | { name: 'note_shown'; retry: ScriptRetryResult }
  | {
      name: 'weakness_labeled';
      method_id: string;
      mistake_type: string;
      weakness_count: number;
      labeled: boolean;
    }
  | {
      name: 'weakness_picked';
      method_id: string;
      mistake_type: string;
      candidate_count: number;
      picked: string | null;
    };
