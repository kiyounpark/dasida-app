import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

type MathTextProps = Omit<TextProps, 'children'> & {
  highlightMath?: boolean;
  mathSegmentStyle?: StyleProp<TextStyle>;
  text: string;
};

export type QuestionDisplaySegment =
  | {
      kind: 'text';
      text: string;
    }
  | {
      kind: 'formula';
      text: string;
    };

const MATH_MARKER_PATTERN =
  /sqrt\s*\(|\^|<=|>=|!=|=|<|>|√|×|⁄|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ]+|(?:\d+[A-Za-z])|(?:[A-Za-z]\d)|(?:[A-Za-z0-9)\]√⁄⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ']\s*[+\-*/×⁄]\s*[A-Za-z0-9([√⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ'])/i;
const MATH_CHUNK_PATTERN =
  /[A-Za-z0-9√⁄≤≥≠()+\-×=<>⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ'](?:[\sA-Za-z0-9√⁄≤≥≠()+\-×=<>⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ']*[A-Za-z0-9√⁄≤≥≠()+\-×=<>⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ'])?/g;

type MathDisplaySegment =
  | {
      kind: 'text';
      text: string;
    }
  | {
      kind: 'math';
      text: string;
    };

const DISPLAY_TOKEN_PATTERN =
  /[A-Za-z0-9√⁄≤≥≠()+\-−×=<>⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ',.]+/g;
const FUNCTION_TOKEN_PATTERN = /^[A-Za-z]\([A-Za-z0-9]+\)$/;
const SIMPLE_TOKEN_PATTERN = /^[A-Za-z0-9]+$/;
const GROUPED_TOKEN_PATTERN = /^[([]?[A-Za-z0-9]+[)\]]?$/;
const MATH_JOINER_PATTERN = /^[\s,.:;=+\-−×⁄<>≤≥≠]*$/;

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

function toSuperscript(value: string): string | null {
  let converted = '';

  for (const char of value) {
    const mapped = SUPERSCRIPT_MAP[char];
    if (!mapped) {
      return null;
    }
    converted += mapped;
  }

  return converted;
}

export function containsMathNotation(input: string): boolean {
  return MATH_MARKER_PATTERN.test(input);
}

function isMathJoiner(input: string): boolean {
  return input.length > 0 && MATH_JOINER_PATTERN.test(input);
}

function countFormulaOperators(input: string): number {
  return (input.match(/[=≤≥≠<>+\-−×⁄]/g) ?? []).length;
}

function isProminentFormula(input: string): boolean {
  const value = input.trim();

  if (!value) {
    return false;
  }

  if (/^[A-Za-z]\([^)]+\)\s*=/.test(value)) {
    return true;
  }

  if (/[=≤≥≠<>]/.test(value)) {
    return value.length >= 7;
  }

  if (value.includes('√') || value.includes('⁄')) {
    return value.length >= 5;
  }

  if (countFormulaOperators(value) >= 2 && value.length >= 10) {
    return true;
  }

  if (/[²³⁴⁵⁶⁷⁸⁹ⁿ⁽]/.test(value) && countFormulaOperators(value) >= 1 && value.length >= 8) {
    return true;
  }

  return false;
}

function canStartFormulaChain(token: string, nextSeparator: string): boolean {
  if (containsMathNotation(token)) {
    return true;
  }

  if (
    (FUNCTION_TOKEN_PATTERN.test(token) ||
      SIMPLE_TOKEN_PATTERN.test(token) ||
      GROUPED_TOKEN_PATTERN.test(token)) &&
    isMathJoiner(nextSeparator)
  ) {
    return true;
  }

  return false;
}

export function splitQuestionDisplaySegments(input: string): QuestionDisplaySegment[] {
  const formatted = formatMathText(input);
  const matches = [...formatted.matchAll(DISPLAY_TOKEN_PATTERN)];
  const segments: QuestionDisplaySegment[] = [];
  let cursor = 0;

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const token = match[0];
    const start = match.index ?? 0;
    const end = start + token.length;
    const nextMatch = matches[index + 1];
    const nextSeparator = nextMatch ? formatted.slice(end, nextMatch.index ?? end) : '';

    if (!canStartFormulaChain(token, nextSeparator)) {
      continue;
    }

    let formulaEnd = end;
    let lastIndex = index;

    while (lastIndex + 1 < matches.length) {
      const followingMatch = matches[lastIndex + 1];
      const between = formatted.slice(formulaEnd, followingMatch.index ?? formulaEnd);

      if (!isMathJoiner(between)) {
        break;
      }

      formulaEnd = (followingMatch.index ?? formulaEnd) + followingMatch[0].length;
      lastIndex += 1;
    }

    const candidate = formatted.slice(start, formulaEnd).trim();
    if (!isProminentFormula(candidate)) {
      continue;
    }

    if (start > cursor) {
      segments.push({
        kind: 'text',
        text: formatted.slice(cursor, start).trim(),
      });
    }

    segments.push({
      kind: 'formula',
      text: candidate,
    });
    cursor = formulaEnd;
    index = lastIndex;
  }

  if (cursor < formatted.length) {
    segments.push({
      kind: 'text',
      text: formatted.slice(cursor).trim(),
    });
  }

  return segments.filter((segment) => segment.text.length > 0);
}

function splitMathDisplaySegments(input: string): MathDisplaySegment[] {
  const formatted = formatMathText(input);
  const segments: MathDisplaySegment[] = [];
  let cursor = 0;

  for (const match of formatted.matchAll(MATH_CHUNK_PATTERN)) {
    const rawChunk = match[0];
    const start = match.index ?? 0;
    const trimmedChunk = rawChunk.trim();

    if (!trimmedChunk || !containsMathNotation(trimmedChunk)) {
      continue;
    }

    const leadingWhitespace = rawChunk.length - rawChunk.trimStart().length;
    const trailingWhitespace = rawChunk.length - rawChunk.trimEnd().length;
    const chunkStart = start + leadingWhitespace;
    const chunkEnd = start + rawChunk.length - trailingWhitespace;

    if (chunkStart > cursor) {
      segments.push({
        kind: 'text',
        text: formatted.slice(cursor, chunkStart),
      });
    }

    segments.push({
      kind: 'math',
      text: trimmedChunk,
    });
    cursor = chunkEnd;
  }

  if (cursor < formatted.length) {
    segments.push({
      kind: 'text',
      text: formatted.slice(cursor),
    });
  }

  return segments.filter((segment) => segment.text.length > 0);
}

export function formatMathText(input: string): string {
  return input
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/(\d|[A-Za-z)\]])\s*\*\s*(\d|[A-Za-z([])/g, '$1×$2')
    .replace(/(\d|[A-Za-z)\]])\s*\/\s*(\d|[A-Za-z(])/g, '$1⁄$2')
    .replace(/sqrt\s*\(/gi, '√(')
    .replace(/√\(\s*([A-Za-z0-9]+)\s*\)/g, '√$1')
    .replace(/(\)|\d|[A-Za-z])\^\(\s*([A-Za-z0-9+-]+)\s*\)/g, (match, base: string, exponent: string) => {
      const superscript = toSuperscript(`(${exponent})`);
      return superscript ? `${base}${superscript}` : match;
    })
    .replace(/(\)|\d|[A-Za-z])\^([A-Za-z])/g, (match, base: string, exponent: string) => {
      const superscript = toSuperscript(exponent);
      return superscript ? `${base}${superscript}` : match;
    })
    .replace(/(\)|\d|[A-Za-z])\^(-?\d+)/g, (match, base: string, exponent: string) => {
      const superscript = toSuperscript(exponent);
      return superscript ? `${base}${superscript}` : match;
    });
}

export function MathText({
  text,
  highlightMath = false,
  mathSegmentStyle,
  ...props
}: MathTextProps) {
  if (!highlightMath) {
    return <Text {...props}>{formatMathText(text)}</Text>;
  }

  const segments = splitMathDisplaySegments(text);

  return (
    <Text {...props}>
      {segments.map((segment, index) =>
        segment.kind === 'math' ? (
          <Text key={`math_${index}`} style={mathSegmentStyle}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}
