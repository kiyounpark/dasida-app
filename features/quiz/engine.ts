import { weaknessOrder, type WeaknessId } from '@/data/diagnosisMap';
import type { QuizAnswer, QuizResultSummary } from './types';

export function createInitialWeaknessScores(): Record<WeaknessId, number> {
  return weaknessOrder.reduce((acc, id) => {
    acc[id] = 0;
    return acc;
  }, {} as Record<WeaknessId, number>);
}

export function incrementWeaknessScore(
  scores: Record<WeaknessId, number>,
  weaknessId: WeaknessId,
): Record<WeaknessId, number> {
  return {
    ...scores,
    [weaknessId]: scores[weaknessId] + 1,
  };
}

export function getTopWeaknesses(
  scores: Record<WeaknessId, number>,
  count: number,
): WeaknessId[] {
  const orderIndex = weaknessOrder.reduce((acc, id, index) => {
    acc[id] = index;
    return acc;
  }, {} as Record<WeaknessId, number>);

  return [...weaknessOrder]
    .sort((a, b) => {
      const scoreDiff = scores[b] - scores[a];
      if (scoreDiff !== 0) return scoreDiff;
      return orderIndex[a] - orderIndex[b];
    })
    .filter((id) => scores[id] > 0)
    .slice(0, count);
}

export function buildQuizResult(
  answers: QuizAnswer[],
  weaknessScores: Record<WeaknessId, number>,
  totalQuestions: number,
): QuizResultSummary {
  const correct = answers.filter((answer) => answer.isCorrect).length;
  const wrong = totalQuestions - correct;
  const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const allCorrect = wrong === 0;
  const topWeaknesses = allCorrect ? [] : getTopWeaknesses(weaknessScores, 3);

  return {
    total: totalQuestions,
    correct,
    wrong,
    accuracy,
    allCorrect,
    topWeaknesses,
  };
}
