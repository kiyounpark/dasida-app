// features/quiz/components/review-session-screen-view.tsx
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import type { UseReviewSessionScreenResult } from '@/features/quiz/hooks/use-review-session-screen';
import { useIsTablet } from '@/hooks/use-is-tablet';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function ReviewSessionScreenView({
  task,
  steps,
  currentStepIndex,
  stepPhase,
  selectedChoiceIndex,
  userText,
  chatMessages,
  chatText,
  isLoadingFeedback,
  sessionComplete,
  hasInput,
  onBack,
  onSelectChoice,
  onChangeText,
  onPressNext,
  onChangeChatText,
  onSendChatMessage,
  onPressContinue,
  onPressRemember,
  onPressRetry,
}: UseReviewSessionScreenResult) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  const appBar = (
    <SafeAreaView edges={['top']} style={styles.appBar}>
      <View style={styles.appBarInner}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button">
          <IconSymbol name="chevron.left" size={24} color={BrandColors.primary} />
        </Pressable>
        <Text style={styles.appBarTitle}>오늘의 복습</Text>
        <View style={styles.appBarSpacer} />
      </View>
    </SafeAreaView>
  );

  if (!task) {
    return (
      <View style={styles.screen}>
        {appBar}
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>복습 데이터를 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  const weaknessLabel = diagnosisMap[task.weaknessId]?.labelKo ?? task.weaknessId;
  const step = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  if (sessionComplete || !step) {
    return (
      <View style={styles.screen}>
        {appBar}
        <View style={[styles.doneScreen, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.doneEmoji}>🌿</Text>
          <Text style={styles.doneTitle}>모든 단계 완료!</Text>
          <Text style={styles.doneSub}>{weaknessLabel} 흐름을{'\n'}다시 확인했어요.</Text>

          <View style={styles.scheduleBox}>
            <Text style={styles.scheduleLabel}>다음 복습 일정</Text>
            <Text style={styles.scheduleVal}>
              {task.stage === 'day1' ? '3일 후' :
               task.stage === 'day3' ? '7일 후' :
               task.stage === 'day7' ? '30일 후' : '졸업 🎓'}
            </Text>
          </View>

          <View style={styles.doneButtons}>
            <Pressable style={styles.retryBtn} onPress={onPressRetry}>
              <Text style={styles.retryBtnText}>🤔 다시 볼게요</Text>
            </Pressable>
            <Pressable style={styles.rememberBtn} onPress={onPressRemember}>
              <Text style={styles.rememberBtnText}>✓ 기억났어요!</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const continueLabel = isLastStep ? '이해했어요, 완료 →' : '이해했어요, 다음 단계 →';

  // ── 입력 카드 공통 내부 (mobile + tablet 공유) ──────────────────────────────
  const inputCardContent =
    stepPhase === 'input' ? (
      <>
        <Text style={styles.inputLabel}>💭 이 단계, 어떻게 이해했나요?</Text>
        <View style={styles.choices}>
          {step.choices.map((choice, i) => (
            <Pressable
              key={i}
              style={[styles.choiceBtn, selectedChoiceIndex === i && styles.choiceBtnSelected]}
              onPress={() => onSelectChoice(i)}>
              <Text
                style={[
                  styles.choiceBtnText,
                  selectedChoiceIndex === i && styles.choiceBtnTextSelected,
                ]}>
                {choice.text}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는 직접 써도 돼요</Text>
          <View style={styles.dividerLine} />
        </View>
        <TextInput
          style={styles.textInput}
          value={userText}
          onChangeText={onChangeText}
          placeholder="자유롭게 써보세요..."
          placeholderTextColor={BrandColors.disabled}
          multiline
        />
        <Pressable
          style={[styles.primaryBtn, (!hasInput || isLoadingFeedback) && styles.primaryBtnDisabled]}
          onPress={onPressNext}
          disabled={!hasInput || isLoadingFeedback}>
          {isLoadingFeedback ? (
            <ActivityIndicator color="#F6F2EA" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>다음으로</Text>
          )}
        </Pressable>
      </>
    ) : (
      <>
        <View style={styles.chatMessages}>
          {chatMessages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.bubbleRow,
                msg.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowAi,
              ]}>
              {msg.role === 'ai' && <Text style={styles.aiBadgeIcon}>✨</Text>}
              <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                {msg.text ? (
                  <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                    {msg.text}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
          {isLoadingFeedback && (
            <View style={[styles.bubbleRow, styles.bubbleRowAi]}>
              <Text style={styles.aiBadgeIcon}>✨</Text>
              <View style={[styles.bubble, styles.bubbleAi]}>
                <ActivityIndicator size="small" color={BrandColors.primary} />
              </View>
            </View>
          )}
        </View>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            value={chatText}
            onChangeText={onChangeChatText}
            placeholder="계속 써보세요..."
            placeholderTextColor={BrandColors.disabled}
            editable={!isLoadingFeedback}
            returnKeyType="send"
            onSubmitEditing={onSendChatMessage}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!chatText.trim() || isLoadingFeedback) && styles.sendBtnDisabled,
            ]}
            onPress={onSendChatMessage}
            disabled={!chatText.trim() || isLoadingFeedback}>
            <Text style={styles.sendBtnText}>↑</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.primaryBtn, isLoadingFeedback && styles.primaryBtnDisabled]}
          onPress={onPressContinue}
          disabled={isLoadingFeedback}>
          <Text style={styles.primaryBtnText}>{continueLabel}</Text>
        </Pressable>
      </>
    );

  if (isTablet) {
    return (
      <View style={styles.screen}>
        {appBar}
        <View style={[styles.progressBar, styles.tabletProgressBar]}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.progressSeg, i <= currentStepIndex && styles.progressSegDone]}
            />
          ))}
        </View>
        <View style={styles.tabletRow}>
          <ScrollView
            style={styles.tabletLeft}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.stepCard}>
              <View style={styles.stepNumRow}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>{currentStepIndex + 1}</Text>
                </View>
                <Text style={styles.stepNumLabel}>{`${currentStepIndex + 1} / ${steps.length} 단계`}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
              {step.example ? (
                <View style={styles.stepExampleBox}>
                  <Text style={styles.stepExampleText}>{step.example}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
          <KeyboardAvoidingView
            style={styles.tabletRight}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              style={{ backgroundColor: '#FFFFFF' }}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
              keyboardShouldPersistTaps="handled">
              <View style={styles.inputCard}>{inputCardContent}</View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {appBar}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={Platform.OS !== 'ios'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
          <View style={styles.progressBar}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[styles.progressSeg, i <= currentStepIndex && styles.progressSegDone]}
              />
            ))}
          </View>
          <View style={styles.stepCard}>
            <View style={styles.stepNumRow}>
              <View style={styles.stepNumBadge}>
                <Text style={styles.stepNumText}>{currentStepIndex + 1}</Text>
              </View>
              <Text style={styles.stepNumLabel}>{`${currentStepIndex + 1} / ${steps.length} 단계`}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepBody}>{step.body}</Text>
            {step.example ? (
              <View style={styles.stepExampleBox}>
                <Text style={styles.stepExampleText}>{step.example}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.inputCard}>{inputCardContent}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F2EA',
  },
  flex: {
    flex: 1,
  },
  appBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
  },
  appBarInner: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    flex: 1,
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    color: BrandColors.primary,
    textAlign: 'center',
  },
  appBarSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
  },
  loadingText: {
    fontFamily: FontFamilies.regular,
    fontSize: 15,
    color: BrandColors.mutedText,
    textAlign: 'center',
    marginTop: 40,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: BrandSpacing.sm,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6E2D4',
  },
  progressSegDone: {
    backgroundColor: BrandColors.primary,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
  },
  stepNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: '#F6F2EA',
  },
  stepNumLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: BrandColors.mutedText,
  },
  stepTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 17,
    color: BrandColors.primary,
  },
  stepBody: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    color: BrandColors.text,
    lineHeight: 22,
  },
  stepExampleBox: {
    backgroundColor: '#F6F2EA',
    borderRadius: BrandRadius.sm,
    padding: 10,
    marginTop: 4,
  },
  stepExampleText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: BrandColors.primarySoft,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
  },
  inputLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: BrandColors.primary,
  },
  choices: {
    gap: 6,
  },
  choiceBtn: {
    backgroundColor: '#F6F2EA',
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
    borderRadius: BrandRadius.sm,
    padding: 12,
  },
  choiceBtnSelected: {
    backgroundColor: '#eef3ec',
    borderColor: BrandColors.primary,
  },
  choiceBtnText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
  },
  choiceBtnTextSelected: {
    fontFamily: FontFamilies.bold,
    color: BrandColors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D6E2D4',
  },
  dividerText: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: BrandColors.disabled,
  },
  textInput: {
    backgroundColor: '#F6F2EA',
    borderWidth: 1,
    borderColor: '#D6E2D4',
    borderRadius: BrandRadius.sm,
    padding: 11,
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  // 채팅 UI
  chatMessages: {
    gap: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAi: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 12,
    padding: 10,
    maxWidth: '82%',
  },
  bubbleUser: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 2,
  },
  bubbleAi: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D6E2D4',
    borderTopLeftRadius: 2,
  },
  bubbleText: {
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  aiBadgeIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F6F2EA',
    borderWidth: 1,
    borderColor: '#D6E2D4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontFamily: FontFamilies.regular,
    fontSize: 13,
    color: BrandColors.text,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: BrandColors.disabled,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FontFamilies.bold,
  },
  primaryBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: BrandColors.disabled,
  },
  primaryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: '#F6F2EA',
  },
  // 완료 화면
  doneScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.xl,
    gap: BrandSpacing.sm,
  },
  doneEmoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  doneTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 20,
    color: BrandColors.primary,
    textAlign: 'center',
  },
  doneSub: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    color: BrandColors.mutedText,
    textAlign: 'center',
    lineHeight: 22,
  },
  scheduleBox: {
    backgroundColor: '#fff',
    borderRadius: BrandRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D6E2D4',
    alignItems: 'center',
    width: '100%',
    marginVertical: 4,
  },
  scheduleLabel: {
    fontFamily: FontFamilies.regular,
    fontSize: 11,
    color: BrandColors.mutedText,
    marginBottom: 4,
  },
  scheduleVal: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    color: BrandColors.success,
  },
  doneButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  retryBtn: {
    flex: 1,
    backgroundColor: '#F6F2EA',
    borderRadius: BrandRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D6E2D4',
  },
  retryBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: BrandColors.mutedText,
  },
  rememberBtn: {
    flex: 2,
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rememberBtnText: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: '#F6F2EA',
  },
  // 태블릿 레이아웃
  tabletProgressBar: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  tabletRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: {
    flex: 55,
    borderRightWidth: 1,
    borderRightColor: '#D6E2D4',
  },
  tabletRight: {
    flex: 45,
  },
});
