// 수식 표기 — 웹(web-proto, 번들로)과 앱(MathText)이 같은 함수를 쓴다.
// 원희 피드백 규칙 1호: 지수는 위첨자로 (a^2 ✗ → a² ○). 손으로 쓴 시험지 모양과 같아야 학생이 안 튕긴다.
// 문자열 → 문자열 변환만 여기 둔다. 서체·색·칩은 그리는 쪽(웹 mathSpan · 앱 MathText) 몫이다.
// 이 파일은 웹 번들에 실린다 — react-native·expo·DOM import 금지.

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '(': '⁽',
  ')': '⁾',
  a: 'ᵃ',
  b: 'ᵇ',
  c: 'ᶜ',
  d: 'ᵈ',
  e: 'ᵉ',
  f: 'ᶠ',
  g: 'ᵍ',
  h: 'ʰ',
  i: 'ⁱ',
  j: 'ʲ',
  k: 'ᵏ',
  l: 'ˡ',
  m: 'ᵐ',
  n: 'ⁿ',
  o: 'ᵒ',
  p: 'ᵖ',
  r: 'ʳ',
  s: 'ˢ',
  t: 'ᵗ',
  u: 'ᵘ',
  v: 'ᵛ',
  w: 'ʷ',
  x: 'ˣ',
  y: 'ʸ',
  z: 'ᶻ',
};

// 유니코드에 아래첨자가 있는 글자만 — b·c·d·f·g·q·w·y·z와 대문자는 없다.
const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  a: 'ₐ',
  e: 'ₑ',
  h: 'ₕ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  l: 'ₗ',
  m: 'ₘ',
  n: 'ₙ',
  o: 'ₒ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
  x: 'ₓ',
};

// 못 바꾸는 글자(대문자·q 등)가 하나라도 있으면 null → 원문 유지. 반쪽 변환 금지.
function mapAll(value: string, map: Record<string, string>): string | null {
  let converted = '';

  for (const char of value) {
    const mapped = map[char];
    if (!mapped) {
      return null;
    }
    converted += mapped;
  }

  return converted;
}

export function formatMathText(input: string): string {
  const sup = (match: string, base: string, value: string) => {
    const converted = mapAll(value, SUPERSCRIPT_MAP);
    return converted ? `${base}${converted}` : match;
  };
  const sub = (match: string, base: string, value: string) => {
    const converted = mapAll(value, SUBSCRIPT_MAP);
    return converted ? `${base}${converted}` : match;
  };

  return (
    String(input ?? '')
      .replace(/<=/g, '≤')
      .replace(/>=/g, '≥')
      .replace(/!=/g, '≠')
      // 뒤 피연산자는 lookahead로 둔다 — 소비하면 4*1*2에서 1이 먹혀
      // 두 번째 *가 앞 문자를 못 찾아 4×1*2로 반만 변환된다.
      .replace(/(\d|[A-Za-z)\]])\s*\*\s*(?=\d|[A-Za-z([])/g, '$1×')
      .replace(/(\d|[A-Za-z)\]])\s*\/\s*(?=\d|[A-Za-z(])/g, '$1⁄')
      .replace(/sqrt\s*\(/gi, '√(')
      .replace(/√\(\s*([A-Za-z0-9]+)\s*\)/g, '√$1')
      // x^{n-1} — AI 응답의 LaTeX 습관 방어. 중괄호는 수학 표기가 아니라 묶음이라 벗긴다.
      .replace(/(\)|\d|[A-Za-z])\^\{\s*([A-Za-z0-9+-]+)\s*\}/g, sup)
      // ar^(n-1) → ar⁽ⁿ⁻¹⁾ — 괄호째 위첨자
      .replace(/(\)|\d|[A-Za-z])\^\(\s*([A-Za-z0-9+-]+)\s*\)/g, (match, base: string, value: string) =>
        sup(match, base, `(${value})`),
      )
      .replace(/(\)|\d|[A-Za-z])\^([A-Za-z])/g, sup)
      .replace(/(\)|\d|[A-Za-z])\^(-?\d+)/g, sup)
      // 아래첨자는 위첨자 뒤에 — 먼저 바꾸면 a_n^2의 밑(n)이 ₙ이 돼 ^2를 못 바꾼다.
      // a_{n+1}·a_(n+1) → aₙ₊₁ (묶음 괄호는 벗긴다), a_n → aₙ, a_10 → a₁₀
      .replace(/(\)|\d|[A-Za-z])_\{\s*([A-Za-z0-9+=-]+)\s*\}/g, sub)
      .replace(/(\)|\d|[A-Za-z])_\(\s*([A-Za-z0-9+=-]+)\s*\)/g, sub)
      // 뒤에 영어 글자가 이어지면 단어(solving_order)다 — 아래첨자가 아니다
      .replace(/(\)|\d|[A-Za-z])_(\d+|[A-Za-z](?![A-Za-z]))/g, sub)
  );
}
