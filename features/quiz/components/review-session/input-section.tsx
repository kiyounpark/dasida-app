import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ThinkingStep } from '@/data/review-content-map';

import { NoteInput } from '../note-input';
import { Paper } from './paper-tokens';

const CHOICE_LABELS = ['가', '나', '다', '라'];

interface InputSectionProps {
  step: ThinkingStep;
  selectedChoiceIndex: number | null;
  userText: string;
  isTextMode: boolean;
  hasInput: boolean;
  hasFeedback: boolean;
  isLoadingFeedback: boolean;
  selectedChoiceFeedback: string | null;
  continueLabel: string;
  onSelectChoice: (index: number) => void;
  onChangeText: (text: string) => void;
  onPressNext: () => void;
  onPressContinue: () => void;
  onInputFocus: () => void;
}

export function InputSection({
  step,
  selectedChoiceIndex,
  userText,
  isTextMode,
  hasInput,
  hasFeedback,
  isLoadingFeedback,
  selectedChoiceFeedback,
  continueLabel,
  onSelectChoice,
  onChangeText,
  onPressNext,
  onPressContinue,
  onInputFocus,
}: InputSectionProps) {
  const renderChoices = () => (
    <View>
      {step.choices.map((choice, i) => {
        const isSelected = selectedChoiceIndex === i;
        const showFeedbackState = hasFeedback && isSelected;
        const isCorrectChoice = showFeedbackState && choice.correct === true;
        const isWrongChoice = showFeedbackState && choice.correct === false;
        const isDimmed = hasFeedback && !isSelected;

        return (
          <Pressable
            key={i}
            onPress={() => onSelectChoice(i)}
            accessibilityRole="button"
            accessibilityLabel={`보기 ${CHOICE_LABELS[i] ?? i + 1}: ${choice.text}`}
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.choiceBtn,
              isSelected && !hasFeedback && styles.choiceBtnSelected,
              isCorrectChoice && styles.choiceBtnCorrect,
              isWrongChoice && styles.choiceBtnWrong,
              isDimmed && styles.choiceBtnDim,
            ]}>
            <View
              style={[
                styles.choiceBadge,
                isSelected && !hasFeedback && styles.choiceBadgeSelected,
                isCorrectChoice && styles.choiceBadgeCorrect,
                isWrongChoice && styles.choiceBadgeWrong,
              ]}>
              <Text
                style={[
                  styles.choiceBadgeText,
                  isSelected && !hasFeedback && styles.choiceBadgeTextSelected,
                  isCorrectChoice && styles.choiceBadgeTextCorrect,
                  isWrongChoice && styles.choiceBadgeTextWrong,
                ]}>
                {CHOICE_LABELS[i] ?? `${i + 1}`}
              </Text>
            </View>
            <Text
              style={[
                styles.choiceText,
                isSelected && !hasFeedback && styles.choiceTextSelected,
                isCorrectChoice && styles.choiceTextCorrect,
                isWrongChoice && styles.choiceTextWrong,
              ]}>
              {choice.text}
            </Text>
            {isCorrectChoice ? (
              <View style={styles.choiceCheck}>
                <Text style={styles.choiceCheckText}>✓</Text>
              </View>
            ) : null}
            {isWrongChoice ? (
              <View style={styles.choiceX}>
                <Text style={styles.choiceXText}>×</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  const renderFeedback = () => {
    if (!hasFeedback || selectedChoiceIndex === null) return null;
    const isWrong = step.choices[selectedChoiceIndex]?.correct === false;
    return (
      <View style={styles.feedbackBox}>
        <View style={styles.feedbackMarginLine} />
        <View
          style={[
            styles.feedbackBadgeFlag,
            isWrong && styles.feedbackBadgeFlagWrong,
          ]}>
          <Text style={styles.feedbackBadgeFlagText}>
            {isWrong ? '다시 한 번' : '정답'}
          </Text>
        </View>
        <Text style={styles.feedbackText}>{selectedChoiceFeedback}</Text>
      </View>
    );
  };

  const renderChoiceChip = () => {
    if (selectedChoiceIndex === null) return null;
    const choice = step.choices[selectedChoiceIndex];
    if (!choice) return null;
    const isWrong = choice.correct === false;
    return (
      <View style={[styles.chip, isWrong && styles.chipWrong]}>
        <View style={[styles.chipMark, isWrong && styles.chipMarkWrong]}>
          <Text style={[styles.chipMarkText, isWrong && styles.chipMarkTextWrong]}>
            {isWrong ? '×' : '✓'}
          </Text>
        </View>
        <Text style={styles.chipText} numberOfLines={2}>
          {choice.text}
        </Text>
      </View>
    );
  };

  return (
    <>
      {!isTextMode ? (
        <>
          <Text style={styles.inputLabel}>💭 이 단계, 어떻게 이해했나요?</Text>
          {renderChoices()}
          {hasFeedback ? renderFeedback() : null}
          {!hasFeedback ? (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는 직접 써도 돼요</Text>
              <View style={styles.dividerLine} />
            </View>
          ) : null}
        </>
      ) : (
        <>
          {renderChoiceChip()}
          {hasFeedback ? renderFeedback() : null}
        </>
      )}
      {!hasFeedback || isTextMode ? (
        <NoteInput
          value={userText}
          onChangeText={onChangeText}
          onFocus={onInputFocus}
          placeholder="이 단계가 무엇을 하는지 한 줄로 적어보세요…"
          containerStyle={styles.noteInputSpacing}
        />
      ) : null}
      <Pressable
        style={[
          styles.primaryBtn,
          (!hasInput || isLoadingFeedback) && styles.primaryBtnDisabled,
        ]}
        onPress={hasInput && !userText.trim() ? onPressContinue : onPressNext}
        disabled={!hasInput || isLoadingFeedback}
        accessibilityRole="button"
        accessibilityLabel={continueLabel}
        accessibilityState={{ disabled: !hasInput || isLoadingFeedback, busy: isLoadingFeedback }}>
        {isLoadingFeedback ? (
          <ActivityIndicator color={Paper.cream} size="small" />
        ) : (
          <Text
            style={[
              styles.primaryBtnText,
              (!hasInput || isLoadingFeedback) && styles.primaryBtnTextDisabled,
            ]}>
            {continueLabel}
          </Text>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  inputLabel: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 12,
    color: Paper.ink,
    paddingLeft: 4,
    marginBottom: 2,
  },

  // 보기
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 12,
    backgroundColor: Paper.paper,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: Paper.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 0,
    elevation: 1,
  },
  choiceBtnSelected: {
    backgroundColor: Paper.forest800,
    borderColor: Paper.forest800,
  },
  choiceBtnCorrect: {
    backgroundColor: Paper.forest800,
    borderColor: Paper.forest800,
  },
  choiceBtnWrong: {
    backgroundColor: Paper.rustSoft,
    borderColor: Paper.rustDeep,
  },
  choiceBtnDim: { opacity: 0.5 },
  choiceBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    backgroundColor: Paper.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBadgeSelected: {
    backgroundColor: Paper.cream,
    borderColor: Paper.cream,
  },
  choiceBadgeCorrect: {
    backgroundColor: Paper.cream,
    borderColor: Paper.cream,
  },
  choiceBadgeWrong: {
    backgroundColor: Paper.rustDeep,
    borderColor: Paper.rustDeep,
  },
  choiceBadgeText: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 13,
    color: Paper.ink,
  },
  choiceBadgeTextSelected: { color: Paper.forest800 },
  choiceBadgeTextCorrect: { color: Paper.forest800 },
  choiceBadgeTextWrong: { color: Paper.cream },
  choiceText: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 19,
    color: Paper.ink,
  },
  choiceTextSelected: {
    color: Paper.cream,
    fontFamily: FontFamilies.bold,
  },
  choiceTextCorrect: {
    color: Paper.cream,
    fontFamily: FontFamilies.bold,
  },
  choiceTextWrong: {
    color: Paper.rustDeep,
    fontFamily: FontFamilies.bold,
  },
  choiceCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Paper.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCheckText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 12,
    color: Paper.forest800,
  },
  choiceX: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Paper.rustDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceXText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 14,
    color: Paper.cream,
    lineHeight: 16,
  },

  // 인라인 피드백
  feedbackBox: {
    marginTop: 12,
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 12,
    paddingLeft: 38,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 12,
    backgroundColor: Paper.paper,
    position: 'relative',
    shadowColor: Paper.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 0,
    elevation: 1,
  },
  feedbackMarginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 22,
    width: 1.5,
    backgroundColor: Paper.marginRed,
  },
  feedbackBadgeFlag: {
    position: 'absolute',
    top: -10,
    left: 14,
    backgroundColor: Paper.forest800,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  feedbackBadgeFlagWrong: { backgroundColor: Paper.rustDeep },
  feedbackBadgeFlagText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 10,
    color: Paper.cream,
    letterSpacing: 1.2,
  },
  feedbackText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    lineHeight: 20,
    color: Paper.inkSoft,
  },

  // 통합 칩
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 12,
    backgroundColor: Paper.paper,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: Paper.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 0,
    elevation: 1,
  },
  chipWrong: {
    backgroundColor: Paper.rustSoft,
    borderColor: Paper.rustDeep,
  },
  chipMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Paper.forest500,
    backgroundColor: Paper.forest100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipMarkWrong: {
    borderColor: Paper.rustDeep,
    backgroundColor: Paper.rustDeep,
  },
  chipMarkText: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 11,
    color: Paper.forest800,
  },
  chipMarkTextWrong: {
    color: Paper.cream,
    fontSize: 13,
  },
  chipText: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Paper.ink,
  },

  // 디바이더
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Paper.edge,
  },
  dividerText: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    color: Paper.inkMute,
    letterSpacing: 1.4,
  },

  noteInputSpacing: { marginTop: 4 },

  // Primary 버튼
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
