import type { HeardFromAnswer, LearnerProfile } from './types';

export type LearnerProfileStore = {
  load(accountKey: string): Promise<LearnerProfile | null>;
  createInitial(accountKey: string): Promise<LearnerProfile>;
  save(profile: LearnerProfile): Promise<void>;
  saveHeardFrom(accountKey: string, answer: HeardFromAnswer): Promise<void>;
  reset(accountKey: string): Promise<void>;
};

