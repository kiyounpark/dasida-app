import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FontFamilies } from '@/constants/typography';

import { Paper } from './paper-tokens';

type ChatEntry = {
  role: 'user' | 'ai';
  text: string;
};

interface ChatSectionProps {
  chatMessages: ChatEntry[];
  chatText: string;
  isLoadingFeedback: boolean;
  aiResponseCount: number;
  continueLabel: string;
  inputFadeAnim: Animated.Value;
  onChangeChatText: (text: string) => void;
  onSendChatMessage: () => void;
  onPressContinue: () => void;
  onInputFocus: () => void;
}

export function ChatSection({
  chatMessages,
  chatText,
  isLoadingFeedback,
  aiResponseCount,
  continueLabel,
  inputFadeAnim,
  onChangeChatText,
  onSendChatMessage,
  onPressContinue,
  onInputFocus,
}: ChatSectionProps) {
  const sendDisabled = !chatText.trim() || isLoadingFeedback || aiResponseCount >= 2;

  return (
    <>
      <View style={styles.list}>
        {chatMessages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.row,
              msg.role === 'user' ? styles.rowUser : styles.rowAi,
            ]}>
            {msg.role === 'ai' && (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>🌿</Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
              ]}>
              {msg.role === 'ai' ? <View style={styles.bubbleTape} /> : null}
              {msg.text ? (
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === 'user' && styles.bubbleTextUser,
                  ]}>
                  {msg.text}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
        {isLoadingFeedback && (
          <View style={[styles.row, styles.rowAi]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>🌿</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleAi]}>
              <View style={styles.bubbleTape} />
              <View style={styles.typing}>
                <View style={[styles.typingDot, { opacity: 0.3 }]} />
                <View style={[styles.typingDot, { opacity: 0.55 }]} />
                <View style={[styles.typingDot, { opacity: 1 }]} />
              </View>
            </View>
          </View>
        )}
      </View>

      {aiResponseCount >= 2 ? (
        <View style={styles.enoughCard}>
          <View style={styles.enoughLeaf}>
            <Text style={styles.enoughLeafText}>🌿</Text>
          </View>
          <Text style={styles.enoughText}>
            충분히 이야기했어요. 다음 단계로 넘어갈까요?
          </Text>
        </View>
      ) : null}

      <Animated.View
        style={[styles.inputRow, { opacity: inputFadeAnim }]}
        pointerEvents={aiResponseCount >= 2 ? 'none' : 'auto'}>
        <View style={styles.input}>
          <TextInput
            style={styles.inputText}
            value={chatText}
            onChangeText={onChangeChatText}
            onFocus={onInputFocus}
            placeholder="계속 써보세요…"
            placeholderTextColor={Paper.inkFaint}
            editable={!isLoadingFeedback && aiResponseCount < 2}
            returnKeyType="send"
            onSubmitEditing={onSendChatMessage}
          />
        </View>
        <Pressable
          style={[styles.sendBtn, sendDisabled && styles.sendBtnDisabled]}
          onPress={onSendChatMessage}
          disabled={sendDisabled}
          accessibilityRole="button"
          accessibilityLabel="메시지 보내기"
          accessibilityState={{ disabled: sendDisabled }}>
          <Text style={styles.sendBtnText}>↑</Text>
        </Pressable>
      </Animated.View>

      <Pressable
        style={[styles.primaryBtn, isLoadingFeedback && styles.primaryBtnDisabled]}
        onPress={onPressContinue}
        disabled={isLoadingFeedback}
        accessibilityRole="button"
        accessibilityLabel={continueLabel}
        accessibilityState={{ disabled: isLoadingFeedback, busy: isLoadingFeedback }}>
        <Text
          style={[
            styles.primaryBtnText,
            isLoadingFeedback && styles.primaryBtnTextDisabled,
          ]}>
          {continueLabel}
        </Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 14,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    backgroundColor: Paper.forest100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Paper.ink,
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 1,
  },
  avatarText: { fontSize: 18 },
  bubble: {
    maxWidth: '76%',
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  bubbleAi: {
    backgroundColor: Paper.paper,
    borderTopLeftRadius: 4,
    shadowColor: Paper.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 0,
    elevation: 1,
  },
  bubbleTape: {
    position: 'absolute',
    top: -6,
    left: 14,
    width: 26,
    height: 10,
    backgroundColor: Paper.honeyTape,
    borderWidth: 1,
    borderColor: Paper.honeyTapeBorder,
    borderRadius: 1,
    transform: [{ rotate: '-2deg' }],
  },
  bubbleUser: {
    backgroundColor: Paper.forest800,
    borderBottomRightRadius: 4,
    shadowColor: Paper.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  bubbleText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Paper.ink,
  },
  bubbleTextUser: {
    fontFamily: FontFamilies.serifBold,
    color: Paper.cream,
    letterSpacing: 0.3,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Paper.forest500,
  },

  enoughCard: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Paper.ink,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Paper.cream,
  },
  enoughLeaf: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Paper.forest500,
    backgroundColor: Paper.forest100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enoughLeafText: { fontSize: 12 },
  enoughText: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 17,
    color: Paper.inkSoft,
  },

  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  input: {
    flex: 1,
    height: 42,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 21,
    backgroundColor: Paper.paper,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: Paper.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 0,
    elevation: 1,
  },
  inputText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: Paper.ink,
    padding: 0,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    backgroundColor: Paper.forest800,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Paper.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  sendBtnDisabled: {
    backgroundColor: Paper.creamDeep,
    borderColor: Paper.edge,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 18,
    color: Paper.cream,
  },

  primaryBtn: {
    marginTop: 14,
    height: 50,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 14,
    backgroundColor: Paper.forest800,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Paper.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  primaryBtnDisabled: {
    backgroundColor: Paper.creamDeep,
    borderColor: Paper.edge,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: Paper.cream,
    letterSpacing: -0.2,
  },
  primaryBtnTextDisabled: { color: Paper.inkFaint },
});
