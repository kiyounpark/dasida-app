const MAX_DESCRIPTION_LENGTH = 80;
const FALLBACK_PATTERN_NAME = '분석 완료';
const FALLBACK_DESCRIPTION_NO_TEXT =
  '이 패턴을 알아둔 거예요. 다음에 같은 유형이 나오면 한 번 더 떠올려보세요.';
const FALLBACK_DESCRIPTION_NO_DATA = '한 문제 분석이 끝났어요. 학습 노트로 저장됐어요.';

export type MiniCardTextInput = {
  methodLabel: string | null;
  lastNodeText: string | null;
};

export type MiniCardText = {
  patternName: string;
  patternDescription: string;
};

function truncate(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;
  return text.slice(0, MAX_DESCRIPTION_LENGTH - 1) + '…';
}

export function buildMiniCardText(input: MiniCardTextInput): MiniCardText {
  const patternName = input.methodLabel ?? FALLBACK_PATTERN_NAME;

  if (input.lastNodeText) {
    return { patternName, patternDescription: truncate(input.lastNodeText) };
  }

  if (input.methodLabel) {
    return { patternName, patternDescription: FALLBACK_DESCRIPTION_NO_TEXT };
  }

  return {
    patternName: FALLBACK_PATTERN_NAME,
    patternDescription: FALLBACK_DESCRIPTION_NO_DATA,
  };
}
