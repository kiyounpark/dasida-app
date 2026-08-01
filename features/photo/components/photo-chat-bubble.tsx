import { StyleSheet, Text, View } from 'react-native';

import {
  splitMathDisplaySegments,
  type MathDisplaySegment,
} from '@/components/math/MathText';
import { FontFamilies } from '@/constants/typography';

import { PhotoTheme } from '../theme';
import type { PhotoBubble } from '../types';

/**
 * 사진 흐름 말풍선. web-proto/index.html의 `.bubble` 규칙을 그대로 옮긴 것이라
 * 앱의 DiagnosisChatBubble과 따로 둔다 — 그쪽은 문단 단위 강조도, 칠판 줄도 없다.
 *
 * 지키는 것 셋:
 * 1. 답할 차례인 말풍선(`ask`)은 폭·바탕·테두리로 "여기 네가 답한다"를 읽기 전에 알린다.
 * 2. 문단 전체가 수식이면 제 줄에 크게 떨어뜨린다(칠판 줄).
 * 3. 인용부호 안의 수식 = "네가 쓴 그 줄"만 바탕을 깔아 한 번 더 잡는다.
 */
export function PhotoChatBubble({ bubble }: { bubble: Exclude<PhotoBubble, { kind: 'note' }> }) {
  const isMe = bubble.kind === 'me';
  const isAsk = bubble.kind === 'coach' && bubble.ask;

  return (
    <View style={isMe ? styles.rowMe : styles.rowCoach}>
      <View
        style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleCoach,
          isAsk && styles.bubbleAsk,
        ]}>
        {bubble.paras.map((para, index) => (
          <Paragraph
            isAsk={isAsk}
            isLast={index === bubble.paras.length - 1}
            isMe={isMe}
            key={`${bubble.id}_${index}`}
            spaced={index > 0}
            text={para}
          />
        ))}
      </View>
    </View>
  );
}

type ParagraphProps = {
  text: string;
  isMe: boolean;
  isAsk: boolean;
  isLast: boolean;
  spaced: boolean;
};

function Paragraph({ text, isMe, isAsk, isLast, spaced }: ParagraphProps) {
  const segments = splitMathDisplaySegments(text);

  // 코치가 문제를 보여주는 문단이 통째로 수식이면 칠판 줄로 떨어뜨린다.
  // 내 말풍선(진한 초록)에는 안 쓴다 — 크림 바탕이 얹히면 내 답이 안 읽힌다.
  // 가로 스크롤은 안 쓴다: 세로 ScrollView 안에 가로 ScrollView를 넣으면 높이를 못 정해
  // 화면 끝까지 늘어난다. 360px에서는 긴 식이 접히는 편이 스크롤보다 낫다.
  if (!isMe && segments.length === 1 && segments[0].kind === 'math') {
    return (
      <View style={[styles.mathLine, spaced && styles.spaced]}>
        <Text selectable style={styles.mathLineText}>
          {segments[0].text}
        </Text>
      </View>
    );
  }

  return (
    <Text
      selectable
      style={[
        styles.body,
        isMe && styles.bodyMe,
        // 덩어리의 마지막 문단 = 실제 질문. 여기만 굵게 도드라진다.
        isAsk && isLast && styles.bodyAskLast,
        spaced && styles.spaced,
      ]}>
      {segments.map((segment, index) =>
        segment.kind === 'math' ? (
          <Text
            key={index}
            style={[
              styles.math,
              isMe && styles.mathMe,
              isQuoted(segments, index) && (isMe ? styles.mathQuoteMe : styles.mathQuote),
            ]}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}

/** 앞 글자가 따옴표면 "네가 쓴 그 줄"을 인용한 것이다 */
function isQuoted(segments: MathDisplaySegment[], index: number): boolean {
  const previous = segments[index - 1];
  return previous?.kind === 'text' && /["'“‘]\s*$/.test(previous.text);
}

const styles = StyleSheet.create({
  rowCoach: {
    alignItems: 'flex-start',
  },
  rowMe: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '88%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  bubbleCoach: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PhotoTheme.line,
    borderTopLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: PhotoTheme.green,
    borderTopRightRadius: 4,
  },
  // 답할 차례: 폭을 꽉 채우고 테두리로 잡는다.
  // 바탕은 흰색 그대로 둔다 — 코치 말풍선이 거의 다 질문이라, 바탕까지 바꾸면 화면 전체가 크림이 된다.
  bubbleAsk: {
    maxWidth: '100%',
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderColor: PhotoTheme.greenSoft,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 4,
  },
  body: {
    // 커스텀 폰트는 fontWeight로 굵어지지 않는다 — 굵기마다 family를 갈아끼운다
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    lineHeight: 23,
    color: PhotoTheme.ink,
  },
  bodyMe: {
    color: '#FFFFFF',
  },
  bodyAskLast: {
    fontFamily: FontFamilies.bold,
    color: PhotoTheme.green,
  },
  // 한 덩어리 안의 문단 — 생각이 바뀌는 자리만 벌린다 (말풍선을 쪼개지 않는다)
  spaced: {
    marginTop: 9,
  },
  // 수식 — 배경도 테두리도 없이 서체만 바꾼다. 말풍선은 조용하게, 숫자만 읽히게.
  math: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 17,
    color: PhotoTheme.green,
    letterSpacing: 0.2,
  },
  // 진한 초록 바탕에서는 세리프 획이 사라진다 — 크기와 자간을 올린다
  mathMe: {
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  // RN은 중첩 Text에 padding·borderRadius가 안 먹는다 — 바탕색만으로 칩을 만든다.
  // 말풍선이 흰색이라 칩은 크림으로 깐다(웹은 반대인데, 웹은 질문 말풍선 바탕이 크림이라 그렇다).
  mathQuote: {
    backgroundColor: PhotoTheme.cream2,
  },
  mathQuoteMe: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  mathLine: {
    borderLeftWidth: 3,
    borderLeftColor: PhotoTheme.greenSoft,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: PhotoTheme.cream,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  mathLineText: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 19,
    lineHeight: 26,
    color: PhotoTheme.green,
    letterSpacing: 0.2,
  },
});
