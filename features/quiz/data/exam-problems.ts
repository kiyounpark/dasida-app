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
  imageKey?: string;
};

type ProblemsJson = { problems: ExamProblem[] };

const examProblemsMap: Record<string, ExamProblem[]> = {
  'g1-academic-2024-03': (require('../../../data/exam/g1-academic-2024-03/problems.json') as ProblemsJson).problems,
  'g1-academic-2025-03': (require('../../../data/exam/g1-academic-2025-03/problems.json') as ProblemsJson).problems,
  'g1-academic-2026-03': (require('../../../data/exam/g1-academic-2026-03/problems.json') as ProblemsJson).problems,
  'g2-academic-2024-03': (require('../../../data/exam/g2-academic-2024-03/problems.json') as ProblemsJson).problems,
  'g2-academic-2025-03': (require('../../../data/exam/g2-academic-2025-03/problems.json') as ProblemsJson).problems,
  'g2-academic-2026-03': (require('../../../data/exam/g2-academic-2026-03/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2022-03': (require('../../../data/exam/g3-calc-academic-2022-03/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2023-03': (require('../../../data/exam/g3-calc-academic-2023-03/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2024-03': (require('../../../data/exam/g3-calc-academic-2024-03/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2025-03': (require('../../../data/exam/g3-calc-academic-2025-03/problems.json') as ProblemsJson).problems,
  'g3-calc-academic-2026-03': (require('../../../data/exam/g3-calc-academic-2026-03/problems.json') as ProblemsJson).problems,
  'g3-calc-csat-2022': (require('../../../data/exam/g3-calc-csat-2022/problems.json') as ProblemsJson).problems,
  'g3-calc-csat-2023': (require('../../../data/exam/g3-calc-csat-2023/problems.json') as ProblemsJson).problems,
  'g3-calc-csat-2024': (require('../../../data/exam/g3-calc-csat-2024/problems.json') as ProblemsJson).problems,
  'g3-calc-csat-2025': (require('../../../data/exam/g3-calc-csat-2025/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2022-06': (require('../../../data/exam/g3-calc-mock-2022-06/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2022-09': (require('../../../data/exam/g3-calc-mock-2022-09/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2023-06': (require('../../../data/exam/g3-calc-mock-2023-06/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2023-09': (require('../../../data/exam/g3-calc-mock-2023-09/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2024-06': (require('../../../data/exam/g3-calc-mock-2024-06/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2024-09': (require('../../../data/exam/g3-calc-mock-2024-09/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2025-06': (require('../../../data/exam/g3-calc-mock-2025-06/problems.json') as ProblemsJson).problems,
  'g3-calc-mock-2025-09': (require('../../../data/exam/g3-calc-mock-2025-09/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2022-03': (require('../../../data/exam/g3-geom-academic-2022-03/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2023-03': (require('../../../data/exam/g3-geom-academic-2023-03/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2024-03': (require('../../../data/exam/g3-geom-academic-2024-03/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2025-03': (require('../../../data/exam/g3-geom-academic-2025-03/problems.json') as ProblemsJson).problems,
  'g3-geom-academic-2026-03': (require('../../../data/exam/g3-geom-academic-2026-03/problems.json') as ProblemsJson).problems,
  'g3-geom-csat-2022': (require('../../../data/exam/g3-geom-csat-2022/problems.json') as ProblemsJson).problems,
  'g3-geom-csat-2023': (require('../../../data/exam/g3-geom-csat-2023/problems.json') as ProblemsJson).problems,
  'g3-geom-csat-2024': (require('../../../data/exam/g3-geom-csat-2024/problems.json') as ProblemsJson).problems,
  'g3-geom-csat-2025': (require('../../../data/exam/g3-geom-csat-2025/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2022-06': (require('../../../data/exam/g3-geom-mock-2022-06/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2022-09': (require('../../../data/exam/g3-geom-mock-2022-09/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2023-06': (require('../../../data/exam/g3-geom-mock-2023-06/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2023-09': (require('../../../data/exam/g3-geom-mock-2023-09/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2024-06': (require('../../../data/exam/g3-geom-mock-2024-06/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2024-09': (require('../../../data/exam/g3-geom-mock-2024-09/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2025-06': (require('../../../data/exam/g3-geom-mock-2025-06/problems.json') as ProblemsJson).problems,
  'g3-geom-mock-2025-09': (require('../../../data/exam/g3-geom-mock-2025-09/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2022-03': (require('../../../data/exam/g3-stats-academic-2022-03/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2023-03': (require('../../../data/exam/g3-stats-academic-2023-03/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2024-03': (require('../../../data/exam/g3-stats-academic-2024-03/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2025-03': (require('../../../data/exam/g3-stats-academic-2025-03/problems.json') as ProblemsJson).problems,
  'g3-stats-academic-2026-03': (require('../../../data/exam/g3-stats-academic-2026-03/problems.json') as ProblemsJson).problems,
  'g3-stats-csat-2022': (require('../../../data/exam/g3-stats-csat-2022/problems.json') as ProblemsJson).problems,
  'g3-stats-csat-2023': (require('../../../data/exam/g3-stats-csat-2023/problems.json') as ProblemsJson).problems,
  'g3-stats-csat-2024': (require('../../../data/exam/g3-stats-csat-2024/problems.json') as ProblemsJson).problems,
  'g3-stats-csat-2025': (require('../../../data/exam/g3-stats-csat-2025/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2022-06': (require('../../../data/exam/g3-stats-mock-2022-06/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2022-09': (require('../../../data/exam/g3-stats-mock-2022-09/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2023-06': (require('../../../data/exam/g3-stats-mock-2023-06/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2023-09': (require('../../../data/exam/g3-stats-mock-2023-09/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2024-06': (require('../../../data/exam/g3-stats-mock-2024-06/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2024-09': (require('../../../data/exam/g3-stats-mock-2024-09/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2025-06': (require('../../../data/exam/g3-stats-mock-2025-06/problems.json') as ProblemsJson).problems,
  'g3-stats-mock-2025-09': (require('../../../data/exam/g3-stats-mock-2025-09/problems.json') as ProblemsJson).problems,
};

export function getExamProblems(examId: string): ExamProblem[] {
  return examProblemsMap[examId] ?? [];
}
