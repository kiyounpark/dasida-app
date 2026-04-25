export function computeCanGraduate(params: {
  activeMode: 'weakness' | 'challenge' | 'review';
  solvedCount: number;
  questionCount: number;
  practiceGraduatedAt: string | undefined;
}): boolean {
  return (
    params.activeMode === 'weakness' &&
    params.questionCount > 0 &&
    params.solvedCount >= params.questionCount &&
    !params.practiceGraduatedAt
  );
}
