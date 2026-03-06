import { Text, type TextProps } from 'react-native';

type MathTextProps = Omit<TextProps, 'children'> & {
  text: string;
};

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

export function formatMathText(input: string): string {
  return input
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/(\d|[A-Za-z)\]])\s*\*\s*(\d|[A-Za-z([])/g, '$1×$2')
    .replace(/(\d|[A-Za-z)\]])\s*\/\s*(\d|[A-Za-z(])/g, '$1⁄$2')
    .replace(/sqrt\s*\(/gi, '√(')
    .replace(/√\(\s*([A-Za-z0-9]+)\s*\)/g, '√$1')
    .replace(/(\)|\d|[A-Za-z])\^(-?\d+)/g, (match, base: string, exponent: string) => {
      const superscript = toSuperscript(exponent);
      return superscript ? `${base}${superscript}` : match;
    });
}

export function MathText({ text, ...props }: MathTextProps) {
  return <Text {...props}>{formatMathText(text)}</Text>;
}
