import { BrandColors } from '@/constants/brand';
import type { WeaknessSeverity } from '@/features/learning/types';

export const SEVERITY_LABEL: Record<WeaknessSeverity, string> = {
  frequent: '단골 약점',
  often: '자주 등장',
  occasional: '가끔 등장',
};

export const SEVERITY_DOTS: Record<WeaknessSeverity, number> = {
  frequent: 3,
  often: 2,
  occasional: 1,
};

export function severityColor(severity: WeaknessSeverity, completed: boolean): string {
  if (completed) return '#4A7C59';
  switch (severity) {
    case 'frequent':
      return BrandColors.danger ?? '#D9534F';
    case 'often':
      return '#E8A547';
    case 'occasional':
      return '#4A7C59';
  }
}

export function getKoreanSubjectParticle(word: string): '이' | '가' {
  if (!word) return '이';
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return '이';
  return (code - 0xac00) % 28 === 0 ? '가' : '이';
}
