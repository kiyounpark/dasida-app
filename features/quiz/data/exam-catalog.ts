// AUTO-GENERATED — do not edit by hand
// Run: python3 scripts/generate_exam_assets.py

export type ExamGrade   = 'g1' | 'g2' | 'g3';
export type ExamSubject = 'common' | 'stats' | 'calc' | 'geom';
export type ExamType    = 'academic' | 'mock' | 'csat';

export type ExamCatalogItem = {
  examId:       string;
  grade:        ExamGrade;
  subject:      ExamSubject;
  type:         ExamType;
  year:         number;
  month:        number | null;
  title:        string;
  questionCount: number;
};

export const EXAM_CATALOG: ExamCatalogItem[] = [
  { examId: 'g1-academic-2026-03', grade: 'g1', subject: 'common', type: 'academic', year: 2026, month: 3, title: '2026년 3월 고1 공통 학력평가', questionCount: 30 },
  { examId: 'g1-academic-2025-03', grade: 'g1', subject: 'common', type: 'academic', year: 2025, month: 3, title: '2025년 3월 고1 공통 학력평가', questionCount: 30 },
  { examId: 'g1-academic-2024-03', grade: 'g1', subject: 'common', type: 'academic', year: 2024, month: 3, title: '2024년 3월 고1 공통 학력평가', questionCount: 30 },
  { examId: 'g2-academic-2026-03', grade: 'g2', subject: 'common', type: 'academic', year: 2026, month: 3, title: '2026년 3월 고2 공통 학력평가', questionCount: 30 },
  { examId: 'g2-academic-2025-03', grade: 'g2', subject: 'common', type: 'academic', year: 2025, month: 3, title: '2025년 3월 고2 공통 학력평가', questionCount: 30 },
  { examId: 'g2-academic-2024-03', grade: 'g2', subject: 'common', type: 'academic', year: 2024, month: 3, title: '2024년 3월 고2 공통 학력평가', questionCount: 30 },
  { examId: 'g3-stats-csat-2025', grade: 'g3', subject: 'stats', type: 'csat', year: 2025, month: null, title: '2025 고3 확률과통계 수능', questionCount: 30 },
  { examId: 'g3-stats-csat-2024', grade: 'g3', subject: 'stats', type: 'csat', year: 2024, month: null, title: '2024 고3 확률과통계 수능', questionCount: 30 },
  { examId: 'g3-stats-csat-2023', grade: 'g3', subject: 'stats', type: 'csat', year: 2023, month: null, title: '2023 고3 확률과통계 수능', questionCount: 30 },
  { examId: 'g3-stats-csat-2022', grade: 'g3', subject: 'stats', type: 'csat', year: 2022, month: null, title: '2022 고3 확률과통계 수능', questionCount: 30 },
  { examId: 'g3-stats-mock-2025-09', grade: 'g3', subject: 'stats', type: 'mock', year: 2025, month: 9, title: '2025년 9월 고3 확률과통계 모의고사', questionCount: 30 },
  { examId: 'g3-stats-mock-2025-06', grade: 'g3', subject: 'stats', type: 'mock', year: 2025, month: 6, title: '2025년 6월 고3 확률과통계 모의고사', questionCount: 30 },
  { examId: 'g3-stats-mock-2024-09', grade: 'g3', subject: 'stats', type: 'mock', year: 2024, month: 9, title: '2024년 9월 고3 확률과통계 모의고사', questionCount: 30 },
  { examId: 'g3-stats-mock-2024-06', grade: 'g3', subject: 'stats', type: 'mock', year: 2024, month: 6, title: '2024년 6월 고3 확률과통계 모의고사', questionCount: 30 },
  { examId: 'g3-stats-mock-2023-09', grade: 'g3', subject: 'stats', type: 'mock', year: 2023, month: 9, title: '2023년 9월 고3 확률과통계 모의고사', questionCount: 30 },
  { examId: 'g3-stats-mock-2023-06', grade: 'g3', subject: 'stats', type: 'mock', year: 2023, month: 6, title: '2023년 6월 고3 확률과통계 모의고사', questionCount: 30 },
  { examId: 'g3-stats-mock-2022-09', grade: 'g3', subject: 'stats', type: 'mock', year: 2022, month: 9, title: '2022년 9월 고3 확률과통계 모의고사', questionCount: 30 },
  { examId: 'g3-stats-mock-2022-06', grade: 'g3', subject: 'stats', type: 'mock', year: 2022, month: 6, title: '2022년 6월 고3 확률과통계 모의고사', questionCount: 30 },
  { examId: 'g3-stats-academic-2026-03', grade: 'g3', subject: 'stats', type: 'academic', year: 2026, month: 3, title: '2026년 3월 고3 확률과통계 학력평가', questionCount: 30 },
  { examId: 'g3-stats-academic-2025-03', grade: 'g3', subject: 'stats', type: 'academic', year: 2025, month: 3, title: '2025년 3월 고3 확률과통계 학력평가', questionCount: 30 },
  { examId: 'g3-stats-academic-2024-03', grade: 'g3', subject: 'stats', type: 'academic', year: 2024, month: 3, title: '2024년 3월 고3 확률과통계 학력평가', questionCount: 30 },
  { examId: 'g3-stats-academic-2023-03', grade: 'g3', subject: 'stats', type: 'academic', year: 2023, month: 3, title: '2023년 3월 고3 확률과통계 학력평가', questionCount: 30 },
  { examId: 'g3-stats-academic-2022-03', grade: 'g3', subject: 'stats', type: 'academic', year: 2022, month: 3, title: '2022년 3월 고3 확률과통계 학력평가', questionCount: 30 },
  { examId: 'g3-calc-csat-2025', grade: 'g3', subject: 'calc', type: 'csat', year: 2025, month: null, title: '2025 고3 미적분 수능', questionCount: 30 },
  { examId: 'g3-calc-csat-2024', grade: 'g3', subject: 'calc', type: 'csat', year: 2024, month: null, title: '2024 고3 미적분 수능', questionCount: 30 },
  { examId: 'g3-calc-csat-2023', grade: 'g3', subject: 'calc', type: 'csat', year: 2023, month: null, title: '2023 고3 미적분 수능', questionCount: 30 },
  { examId: 'g3-calc-csat-2022', grade: 'g3', subject: 'calc', type: 'csat', year: 2022, month: null, title: '2022 고3 미적분 수능', questionCount: 30 },
  { examId: 'g3-calc-mock-2025-09', grade: 'g3', subject: 'calc', type: 'mock', year: 2025, month: 9, title: '2025년 9월 고3 미적분 모의고사', questionCount: 30 },
  { examId: 'g3-calc-mock-2025-06', grade: 'g3', subject: 'calc', type: 'mock', year: 2025, month: 6, title: '2025년 6월 고3 미적분 모의고사', questionCount: 30 },
  { examId: 'g3-calc-mock-2024-09', grade: 'g3', subject: 'calc', type: 'mock', year: 2024, month: 9, title: '2024년 9월 고3 미적분 모의고사', questionCount: 30 },
  { examId: 'g3-calc-mock-2024-06', grade: 'g3', subject: 'calc', type: 'mock', year: 2024, month: 6, title: '2024년 6월 고3 미적분 모의고사', questionCount: 30 },
  { examId: 'g3-calc-mock-2023-09', grade: 'g3', subject: 'calc', type: 'mock', year: 2023, month: 9, title: '2023년 9월 고3 미적분 모의고사', questionCount: 30 },
  { examId: 'g3-calc-mock-2023-06', grade: 'g3', subject: 'calc', type: 'mock', year: 2023, month: 6, title: '2023년 6월 고3 미적분 모의고사', questionCount: 30 },
  { examId: 'g3-calc-mock-2022-09', grade: 'g3', subject: 'calc', type: 'mock', year: 2022, month: 9, title: '2022년 9월 고3 미적분 모의고사', questionCount: 30 },
  { examId: 'g3-calc-mock-2022-06', grade: 'g3', subject: 'calc', type: 'mock', year: 2022, month: 6, title: '2022년 6월 고3 미적분 모의고사', questionCount: 30 },
  { examId: 'g3-calc-academic-2026-03', grade: 'g3', subject: 'calc', type: 'academic', year: 2026, month: 3, title: '2026년 3월 고3 미적분 학력평가', questionCount: 30 },
  { examId: 'g3-calc-academic-2025-03', grade: 'g3', subject: 'calc', type: 'academic', year: 2025, month: 3, title: '2025년 3월 고3 미적분 학력평가', questionCount: 30 },
  { examId: 'g3-calc-academic-2024-03', grade: 'g3', subject: 'calc', type: 'academic', year: 2024, month: 3, title: '2024년 3월 고3 미적분 학력평가', questionCount: 30 },
  { examId: 'g3-calc-academic-2023-03', grade: 'g3', subject: 'calc', type: 'academic', year: 2023, month: 3, title: '2023년 3월 고3 미적분 학력평가', questionCount: 30 },
  { examId: 'g3-calc-academic-2022-03', grade: 'g3', subject: 'calc', type: 'academic', year: 2022, month: 3, title: '2022년 3월 고3 미적분 학력평가', questionCount: 30 },
  { examId: 'g3-geom-csat-2025', grade: 'g3', subject: 'geom', type: 'csat', year: 2025, month: null, title: '2025 고3 기하 수능', questionCount: 30 },
  { examId: 'g3-geom-csat-2024', grade: 'g3', subject: 'geom', type: 'csat', year: 2024, month: null, title: '2024 고3 기하 수능', questionCount: 30 },
  { examId: 'g3-geom-csat-2023', grade: 'g3', subject: 'geom', type: 'csat', year: 2023, month: null, title: '2023 고3 기하 수능', questionCount: 30 },
  { examId: 'g3-geom-csat-2022', grade: 'g3', subject: 'geom', type: 'csat', year: 2022, month: null, title: '2022 고3 기하 수능', questionCount: 30 },
  { examId: 'g3-geom-mock-2025-09', grade: 'g3', subject: 'geom', type: 'mock', year: 2025, month: 9, title: '2025년 9월 고3 기하 모의고사', questionCount: 30 },
  { examId: 'g3-geom-mock-2025-06', grade: 'g3', subject: 'geom', type: 'mock', year: 2025, month: 6, title: '2025년 6월 고3 기하 모의고사', questionCount: 30 },
  { examId: 'g3-geom-mock-2024-09', grade: 'g3', subject: 'geom', type: 'mock', year: 2024, month: 9, title: '2024년 9월 고3 기하 모의고사', questionCount: 30 },
  { examId: 'g3-geom-mock-2024-06', grade: 'g3', subject: 'geom', type: 'mock', year: 2024, month: 6, title: '2024년 6월 고3 기하 모의고사', questionCount: 30 },
  { examId: 'g3-geom-mock-2023-09', grade: 'g3', subject: 'geom', type: 'mock', year: 2023, month: 9, title: '2023년 9월 고3 기하 모의고사', questionCount: 30 },
  { examId: 'g3-geom-mock-2023-06', grade: 'g3', subject: 'geom', type: 'mock', year: 2023, month: 6, title: '2023년 6월 고3 기하 모의고사', questionCount: 30 },
  { examId: 'g3-geom-mock-2022-09', grade: 'g3', subject: 'geom', type: 'mock', year: 2022, month: 9, title: '2022년 9월 고3 기하 모의고사', questionCount: 30 },
  { examId: 'g3-geom-mock-2022-06', grade: 'g3', subject: 'geom', type: 'mock', year: 2022, month: 6, title: '2022년 6월 고3 기하 모의고사', questionCount: 30 },
  { examId: 'g3-geom-academic-2026-03', grade: 'g3', subject: 'geom', type: 'academic', year: 2026, month: 3, title: '2026년 3월 고3 기하 학력평가', questionCount: 30 },
  { examId: 'g3-geom-academic-2025-03', grade: 'g3', subject: 'geom', type: 'academic', year: 2025, month: 3, title: '2025년 3월 고3 기하 학력평가', questionCount: 30 },
  { examId: 'g3-geom-academic-2024-03', grade: 'g3', subject: 'geom', type: 'academic', year: 2024, month: 3, title: '2024년 3월 고3 기하 학력평가', questionCount: 30 },
  { examId: 'g3-geom-academic-2023-03', grade: 'g3', subject: 'geom', type: 'academic', year: 2023, month: 3, title: '2023년 3월 고3 기하 학력평가', questionCount: 30 },
  { examId: 'g3-geom-academic-2022-03', grade: 'g3', subject: 'geom', type: 'academic', year: 2022, month: 3, title: '2022년 3월 고3 기하 학력평가', questionCount: 30 },
];

export const EXAM_CATALOG_BY_ID = Object.fromEntries(
  EXAM_CATALOG.map(e => [e.examId, e]),
);
