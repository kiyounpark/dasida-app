export type ExamCategory = 'mock_exam' | 'academic_assessment';

export type ExamCatalogItem = {
  id: string;
  category: ExamCategory;
  year: number;
  month: number;
  title: string;
  questionCount: number;
};

export const MOCK_EXAM_CATALOG: ExamCatalogItem[] = [
  { id: 'mock-2025-10', category: 'mock_exam', year: 2025, month: 10, title: '2025년 10월 모의고사', questionCount: 30 },
  { id: 'mock-2025-09', category: 'mock_exam', year: 2025, month: 9, title: '2025년 9월 모의고사', questionCount: 30 },
  { id: 'mock-2025-06', category: 'mock_exam', year: 2025, month: 6, title: '2025년 6월 모의고사', questionCount: 30 },
  { id: 'mock-2024-10', category: 'mock_exam', year: 2024, month: 10, title: '2024년 10월 모의고사', questionCount: 30 },
  { id: 'mock-2024-09', category: 'mock_exam', year: 2024, month: 9, title: '2024년 9월 모의고사', questionCount: 30 },
  { id: 'mock-2024-06', category: 'mock_exam', year: 2024, month: 6, title: '2024년 6월 모의고사', questionCount: 30 },
];

export const ACADEMIC_ASSESSMENT_CATALOG: ExamCatalogItem[] = [
  { id: 'academic-2025-11', category: 'academic_assessment', year: 2025, month: 11, title: '2025년 11월 학력평가', questionCount: 30 },
  { id: 'academic-2025-09', category: 'academic_assessment', year: 2025, month: 9, title: '2025년 9월 학력평가', questionCount: 30 },
  { id: 'academic-2025-06', category: 'academic_assessment', year: 2025, month: 6, title: '2025년 6월 학력평가', questionCount: 30 },
  { id: 'academic-2025-03', category: 'academic_assessment', year: 2025, month: 3, title: '2025년 3월 학력평가', questionCount: 30 },
  { id: 'academic-2024-11', category: 'academic_assessment', year: 2024, month: 11, title: '2024년 11월 학력평가', questionCount: 30 },
  { id: 'academic-2024-09', category: 'academic_assessment', year: 2024, month: 9, title: '2024년 9월 학력평가', questionCount: 30 },
  { id: 'academic-2024-06', category: 'academic_assessment', year: 2024, month: 6, title: '2024년 6월 학력평가', questionCount: 30 },
  { id: 'academic-2024-03', category: 'academic_assessment', year: 2024, month: 3, title: '2024년 3월 학력평가', questionCount: 30 },
];
