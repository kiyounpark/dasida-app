import type { WeaknessId } from '@/data/diagnosisMap';

export type ReviewTask = {
  id: string;
  weaknessId: WeaknessId;
  source: 'diagnostic' | 'exam';
  sourceId: string;
  scheduledFor: string;
  stage: 'day1' | 'day3' | 'day7';
  completed: boolean;
  createdAt: string;
};

export type PeerPresenceItem = {
  id: string;
  nickname: string;
  avatarUrl?: string;
  avatarSeed?: string;
  statusText: string;
};

export type PeerPresenceSnapshot = {
  peers: PeerPresenceItem[];
  updatedAt: string;
};
