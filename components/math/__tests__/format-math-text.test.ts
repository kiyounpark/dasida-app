import { formatMathText } from '../format-math-text';

// 기대값은 옮기기 전 웹 fmtMath(web-proto/app.js:220-249)를 node로 돌린 값이다.
// 아래첨자 줄만 새 규칙(웹은 <sub> 태그로 그렸다 — 앱 Text엔 없어서 둘 다 유니코드로).
describe('formatMathText — 웹·앱 공용 수식 글자', () => {
  it.each([
    ['a<=b', 'a≤b'],
    ['a>=b', 'a≥b'],
    ['a!=b', 'a≠b'],
    ['4*1*2', '4×1×2'],
    ['a/b', 'a⁄b'],
    ['sqrt(2)', '√2'],
    ['sqrt(x+1)', '√(x+1)'],
    ['x^{2}', 'x²'],
    ['x^{n-1}', 'xⁿ⁻¹'],
    ['ar^(n-1)', 'ar⁽ⁿ⁻¹⁾'],
    ['e^x', 'eˣ'],
    ['2^10', '2¹⁰'],
    ['x^-1', 'x⁻¹'],
    ['x^2 + 4x + 4', 'x² + 4x + 4'],
  ])('%s → %s', (input, expected) => {
    expect(formatMathText(input)).toBe(expected);
  });

  it.each([
    ['a_n', 'aₙ'],
    ['a_{n+1}', 'aₙ₊₁'],
    ['a_(n+1)', 'aₙ₊₁'],
    ['a_10', 'a₁₀'],
    ['S_n = n^2 + 4n', 'Sₙ = n² + 4n'],
    ['log_2(x)', 'log₂(x)'],
    ['a_n^2', 'aₙ²'],
  ])('아래첨자 %s → %s', (input, expected) => {
    expect(formatMathText(input)).toBe(expected);
  });

  it.each([
    // 못 바꾸는 글자가 하나라도 있으면 원문 그대로 — 반쪽 변환 금지
    'S_q',
    'x^Q',
    'a_{n+b}',
    'lim_{x→1}',
    'log_c(b)',
    // 영어 단어를 잇는 밑줄은 아래첨자가 아니다
    'solving_order_confusion',
  ])('바꿀 수 없는 %s는 그대로', (input) => {
    expect(formatMathText(input)).toBe(input);
  });

  it('수식이 없는 문장은 글자 하나 안 바뀐다', () => {
    expect(formatMathText('그럼 여기서부터 같이 보자.')).toBe('그럼 여기서부터 같이 보자.');
  });
});
