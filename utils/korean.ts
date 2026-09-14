export function getKoreanSubjectParticle(word: string): '이' | '가' {
  if (!word) return '이';
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return '이';
  return (code - 0xac00) % 28 === 0 ? '가' : '이';
}

/**
 * 은/는 — 받침 있으면 '은', 없으면 '는'. ㄹ받침도 '은'이라 으로/로(`ro`)와 규칙이 다르다.
 * 09.08에 졸업·브리지 화면이 "…은 더 이상 약점이 아닙니다"로 조사를 박아둔 게 59개 라벨 중 27개에서 깨져 있었다.
 */
export function getKoreanTopicParticle(word: string): '은' | '는' {
  if (!word) return '은';
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return '은';
  return (code - 0xac00) % 28 === 0 ? '는' : '은';
}
