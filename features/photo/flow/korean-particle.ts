/**
 * 받침에 따라 '으로'와 '로'를 고른다.
 *
 * 08.31에 `"느낌 설문"로 이어져`가 학생 화면에 그대로 나갔다 — 템플릿에 조사를 박아둔 탓이다.
 * 막다른 길 문구에는 풀이법 이름 31개가 들어오므로(인수분해로 / 미분으로 / 근의 공식으로)
 * 받침을 실제로 세야 한다.
 */
export function ro(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  // 한글 음절이 아니면 손대지 않는다 — 빈 문자열·영문·숫자가 와도 화면이 깨지지 않게
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return `${word}로`;
  const jongseong = (last - 0xac00) % 28;
  // 받침 없음(0)과 ㄹ받침(8)은 '로' — "인수분해로", "서울로"
  return jongseong === 0 || jongseong === 8 ? `${word}로` : `${word}으로`;
}
