// AUTO-GENERATED — do not edit by hand
// Run: python3 scripts/generate_exam_assets.py

export type ExamProblemType = 'multiple_choice' | 'short_answer';

export type ExamProblem = {
  number: number;
  type: ExamProblemType;
  score: number;
  answer: number;
  topic: string;
  diagnosisMethods: string[];
};

type ProblemsJson = { problems: ExamProblem[] };

const examProblemsMap: Record<string, ExamProblem[]> = {
  'g1-academic-2024-03': (require('../../../data/exam/고1-공통/2024-3월-학평/problems.json') as ProblemsJson).problems,
  'g1-academic-2025-03': (require('../../../data/exam/고1-공통/2025-3월-학평/problems.json') as ProblemsJson).problems,
  'g1-academic-2026-03': (require('../../../data/exam/고1-공통/2026-3월-학평/problems.json') as ProblemsJson).problems,
  'g2-academic-2024-03': (require('../../../data/exam/고2-공통/2024-3월-학평/problems.json') as ProblemsJson).problems,
  'g2-academic-2025-03': (require('../../../data/exam/고2-공통/2025-3월-학평/problems.json') as ProblemsJson).problems,
  'g2-academic-2026-03': (require('../../../data/exam/고2-공통/2026-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2022-03': (require('../../../data/exam/고3-미적분/2022-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2023-03': (require('../../../data/exam/고3-미적분/2023-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2024-03': (require('../../../data/exam/고3-미적분/2024-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2025-03': (require('../../../data/exam/고3-미적분/2025-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2026-03': (require('../../../data/exam/고3-미적분/2026-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-calc-csat-2022': (require('../../../data/exam/고3-미적분/2022-수능/problems.json') as ProblemsJson).problems,
  'g3-calc-csat-2023': (require('../../../data/exam/고3-미적분/2023-수능/problems.json') as ProblemsJson).problems,
  'g3-calc-csat-2024': (require('../../../data/exam/고3-미적분/2024-수능/problems.json') as ProblemsJson).problems,
  'g3-calc-csat-2025': (require('../../../data/exam/고3-미적분/2025-수능/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2022-06': (require('../../../data/exam/고3-미적분/2022-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2022-09': (require('../../../data/exam/고3-미적분/2022-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2023-06': (require('../../../data/exam/고3-미적분/2023-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2023-09': (require('../../../data/exam/고3-미적분/2023-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2024-06': (require('../../../data/exam/고3-미적분/2024-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2024-09': (require('../../../data/exam/고3-미적분/2024-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2025-06': (require('../../../data/exam/고3-미적분/2025-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2025-09': (require('../../../data/exam/고3-미적분/2025-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2022-03': (require('../../../data/exam/고3-기하/2022-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2023-03': (require('../../../data/exam/고3-기하/2023-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2024-03': (require('../../../data/exam/고3-기하/2024-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2025-03': (require('../../../data/exam/고3-기하/2025-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2026-03': (require('../../../data/exam/고3-기하/2026-3월-학평-기하/problems.json') as ProblemsJson).problems,
  'g3-geom-csat-2022': (require('../../../data/exam/고3-기하/2022-수능/problems.json') as ProblemsJson).problems,
  'g3-geom-csat-2023': (require('../../../data/exam/고3-기하/2023-수능/problems.json') as ProblemsJson).problems,
  'g3-geom-csat-2024': (require('../../../data/exam/고3-기하/2024-수능/problems.json') as ProblemsJson).problems,
  'g3-geom-csat-2025': (require('../../../data/exam/고3-기하/2025-수능/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2022-06': (require('../../../data/exam/고3-기하/2022-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2022-09': (require('../../../data/exam/고3-기하/2022-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2023-06': (require('../../../data/exam/고3-기하/2023-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2023-09': (require('../../../data/exam/고3-기하/2023-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2024-06': (require('../../../data/exam/고3-기하/2024-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2024-09': (require('../../../data/exam/고3-기하/2024-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2025-06': (require('../../../data/exam/고3-기하/2025-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2025-09': (require('../../../data/exam/고3-기하/2025-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2022-03': (require('../../../data/exam/고3-확률과통계/2022-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2023-03': (require('../../../data/exam/고3-확률과통계/2023-학평/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2024-03': (require('../../../data/exam/고3-확률과통계/2024-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2025-03': (require('../../../data/exam/고3-확률과통계/2025-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2026-03': (require('../../../data/exam/고3-확률과통계/2026-3월-학평/problems.json') as ProblemsJson).problems,
  'g3-stats-csat-2022': (require('../../../data/exam/고3-확률과통계/2022-수능/problems.json') as ProblemsJson).problems,
  'g3-stats-csat-2023': (require('../../../data/exam/고3-확률과통계/2023-수능/problems.json') as ProblemsJson).problems,
  'g3-stats-csat-2024': (require('../../../data/exam/고3-확률과통계/2024-수능/problems.json') as ProblemsJson).problems,
  'g3-stats-csat-2025': (require('../../../data/exam/고3-확률과통계/2025-수능/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2022-06': (require('../../../data/exam/고3-확률과통계/2022-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2022-09': (require('../../../data/exam/고3-확률과통계/2022-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2023-06': (require('../../../data/exam/고3-확률과통계/2023-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2023-09': (require('../../../data/exam/고3-확률과통계/2023-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2024-06': (require('../../../data/exam/고3-확률과통계/2024-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2024-09': (require('../../../data/exam/고3-확률과통계/2024-9월-모평/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2025-06': (require('../../../data/exam/고3-확률과통계/2025-6월-모평/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2025-09': (require('../../../data/exam/고3-확률과통계/2025-9월-모평/problems.json') as ProblemsJson).problems,
};

export function getExamProblems(examId: string): ExamProblem[] {
  return examProblemsMap[examId] ?? [];
}
