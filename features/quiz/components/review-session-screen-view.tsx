// features/quiz/components/review-session-screen-view.tsx
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import type { UseReviewSessionScreenResult } from '@/features/quiz/hooks/use-review-session-screen';
import { useIsTablet } from '@/hooks/use-is-tablet';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { ChatSection } from './review-session/chat-section';
import { DoneView } from './review-session/done-view';
import { InputSection } from './review-session/input-section';
import { LoadingView } from './review-session/loading-view';
import { Paper } from './review-session/paper-tokens';
import { ProgressDots } from './review-session/progress-dots';
import { StepCard } from './review-session/step-card';

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
  selectedChoiceFeedback,
  aiResponseCount,
  isTextMode,
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
  const scrollRef = useRef<ScrollView>(null);
  const tabletInputScrollRef = useRef<ScrollView>(null);
  const inputFadeAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // 채팅 길이 증가를 렌더 중 감지 → onContentSizeChange가 새 콘텐츠 레이아웃 직후
  // 정확한 끝으로 스크롤 (참고: commit f96f2df).
  const autoScrollFlagRef = useRef(false);
  const prevChatLengthRef = useRef(0);
  if (chatMessages.length > prevChatLengthRef.current) {
    autoScrollFlagRef.current = true;
  }
  prevChatLengthRef.current = chatMessages.length;

  const handleContentSizeChange = () => {
    if (!autoScrollFlagRef.current) return;
    autoScrollFlagRef.current = false;
    scrollRef.current?.scrollToEnd({ animated: true });
    tabletInputScrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleInputFocus = () => {
    autoScrollFlagRef.current = true;
  };

  useEffect(() => {
    if (aiResponseCount >= 2) {
      Animated.timing(inputFadeAnim, {
        toValue: 0.35,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      inputFadeAnim.stopAnimation();
      inputFadeAnim.setValue(1);
    }
    return () => {
      inputFadeAnim.stopAnimation();
    };
  }, [aiResponseCount]);

  useEffect(() => {
    if (!task) {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
      return () => {
        loop.stop();
        spinAnim.stopAnimation();
      };
    }
    spinAnim.stopAnimation();
  }, [task]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const appBar = (
    <SafeAreaView edges={['top']} style={styles.appBar}>
      <View style={styles.appBarInner}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button">
          <IconSymbol name="chevron.left" size={24} color={Paper.ink} />
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
        <LoadingView spin={spin} />
      </View>
    );
  }

  const weaknessLabel = diagnosisMap[task.weaknessId]?.labelKo ?? task.weaknessId;
  const step = steps[currentStepIndex];
  const totalSteps = steps.length;

  if (sessionComplete || !step) {
    return (
      <View style={styles.screen}>
        {appBar}
        <DoneView
          task={task}
          weaknessLabel={weaknessLabel}
          paddingBottom={insets.bottom + 24}
          onPressRetry={onPressRetry}
          onPressRemember={onPressRemember}
        />
      </View>
    );
  }

  const isLastStep = currentStepIndex === steps.length - 1;
  const continueLabel = isLastStep ? '이해했어요, 완료' : '이해했어요, 다음으로';
  const hasFeedback = selectedChoiceFeedback !== null;

  const inputCardContent =
    stepPhase === 'input' ? (
      <InputSection
        step={step}
        selectedChoiceIndex={selectedChoiceIndex}
        userText={userText}
        isTextMode={isTextMode}
        hasInput={hasInput}
        hasFeedback={hasFeedback}
        isLoadingFeedback={isLoadingFeedback}
        selectedChoiceFeedback={selectedChoiceFeedback}
        continueLabel={continueLabel}
        onSelectChoice={onSelectChoice}
        onChangeText={onChangeText}
        onPressNext={onPressNext}
        onPressContinue={onPressContinue}
        onInputFocus={handleInputFocus}
      />
    ) : (
      <ChatSection
        chatMessages={chatMessages}
        chatText={chatText}
        isLoadingFeedback={isLoadingFeedback}
        aiResponseCount={aiResponseCount}
        continueLabel={continueLabel}
        inputFadeAnim={inputFadeAnim}
        onChangeChatText={onChangeChatText}
        onSendChatMessage={onSendChatMessage}
        onPressContinue={onPressContinue}
        onInputFocus={handleInputFocus}
      />
    );

  if (isTablet) {
    return (
      <View style={styles.screen}>
        {appBar}
        <ProgressDots
          totalSteps={totalSteps}
          currentStepIndex={currentStepIndex}
          containerStyle={styles.tabletProgressBar}
        />
        <View style={styles.tabletRow}>
          <ScrollView
            style={[styles.tabletLeft, styles.tabletDivider]}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
            <StepCard step={step} currentStepIndex={currentStepIndex} totalSteps={totalSteps} />
          </ScrollView>
          <KeyboardAvoidingView
            style={styles.tabletRight}
            behavior="padding"
            enabled={process.env.EXPO_OS !== 'ios'}>
            <ScrollView
              ref={tabletInputScrollRef}
              style={{ backgroundColor: Paper.cream }}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={process.env.EXPO_OS === 'ios'}
              onContentSizeChange={handleContentSizeChange}>
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
        behavior="padding"
        enabled={process.env.EXPO_OS !== 'ios'}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={process.env.EXPO_OS === 'ios'}
          onContentSizeChange={handleContentSizeChange}>
          <ProgressDots totalSteps={totalSteps} currentStepIndex={currentStepIndex} />
          <StepCard step={step} currentStepIndex={currentStepIndex} totalSteps={totalSteps} />
          <View style={styles.inputCard}>{inputCardContent}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Paper.cream,
  },
  flex: { flex: 1 },

  appBar: {
    backgroundColor: Paper.cream,
    borderBottomWidth: 1,
    borderBottomColor: Paper.edge,
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
    color: Paper.ink,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  appBarSpacer: { width: 44 },

  scrollView: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  inputCard: {
    paddingTop: 4,
    gap: 10,
  },

  // 태블릿
  tabletProgressBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  tabletRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletLeft: { flex: 1.18 },
  tabletDivider: {
    borderRightWidth: 1,
    borderRightColor: Paper.edge,
    borderStyle: 'dashed',
  },
  tabletRight: { flex: 1 },
});
