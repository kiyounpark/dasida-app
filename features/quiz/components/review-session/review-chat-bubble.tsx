// v2 NEW: 노트북 톤 채팅 버블. DiagnosisChatBubble(진단 톤) 대체.
//
// 차이:
// - 보더 1.5 + soft drop-shadow → 1px edge 보더, 그림자 없음 (L2 톤)
// - row에 좌/우 들여쓰기 추가 → 대화 흐름이 시각적으로 드러남
// - AI 버블 배경 = paper, User 버블 = forest800 (notebook과 일관)
// - tone(positive/warning/info) 지원 유지

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import { Paper } from './paper-tokens';

type ReviewChatBubbleProps = {
  role: 'assistant' | 'user';
  text: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'info';
  showAvatar?: boolean;
};

const AVATAR_SIZE = 30;

export function ReviewChatBubble({
  role,
  text,
  tone = 'neutral',
  showAvatar = false,
}: ReviewChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      {!isUser && showAvatar && (
        <Image
          source={require('@/assets/review/ai-coach-avatar.png')}
          style={styles.avatar}
          contentFit="cover"
        />
      )}
      {!isUser && !showAvatar && <View style={styles.avatarSpacer} />}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          !isUser && tone === 'positive' ? styles.assistantPositive : null,
          !isUser && tone === 'warning' ? styles.assistantWarning : null,
          !isUser && tone === 'info' ? styles.assistantInfo : null,
        ]}>
        <Text
          selectable
          style={[
            styles.text,
            isUser ? styles.userText : styles.assistantText,
          ]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  assistantRow: {
    justifyContent: 'flex-start',
    paddingRight: 36,           // v2: 우측 들여쓰기로 대화 흐름 강조
  },
  userRow: {
    justifyContent: 'flex-end',
    paddingLeft: 48,            // v2: 좌측 들여쓰기
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    flexShrink: 0,
  },
  avatarSpacer: { width: 0, height: AVATAR_SIZE },
  bubble: {
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 15,
    flexShrink: 1,
  },
  // ── L2 톤: 1px edge 보더, 그림자 없음 ──
  assistantBubble: {
    maxWidth: '100%',
    backgroundColor: Paper.paper,
    borderColor: Paper.edge,
    borderWidth: 1,
    borderBottomLeftRadius: 6,
  },
  assistantPositive: {
    backgroundColor: Paper.forest100,
    borderColor: Paper.forest300,
  },
  assistantWarning: {
    backgroundColor: Paper.rustSoft,
    borderColor: Paper.rust,
  },
  assistantInfo: {
    backgroundColor: Paper.cream,
    borderColor: Paper.edge,
  },
  userBubble: {
    maxWidth: '100%',
    backgroundColor: Paper.forest800,
    borderBottomRightRadius: 6,
  },
  text: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,                 // v2: 16 → 14 (채팅 톤에 맞게)
    lineHeight: 22,
  },
  assistantText: {
    color: Paper.ink,
  },
  userText: {
    color: Paper.cream,
    fontFamily: FontFamilies.semibold,
  },
});
