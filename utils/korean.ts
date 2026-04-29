export function getKoreanSubjectParticle(word: string): '이' | '가' {
  if (!word) return '이';
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return '이';
  return (code - 0xac00) % 28 === 0 ? '가' : '이';
}
