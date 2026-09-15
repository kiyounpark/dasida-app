import { weaknessOrder, type WeaknessId } from '@/data/diagnosisMap';

export function createInitialWeaknessScores(): Record<WeaknessId, number> {
  return weaknessOrder.reduce((acc, id) => {
    acc[id] = 0;
    return acc;
  }, {} as Record<WeaknessId, number>);
}
