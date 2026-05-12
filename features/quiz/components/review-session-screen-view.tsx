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
import { PageContainer } from '@/components/layout/page-container';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { DoneView } from './review-session/done-view';
import { EntryRenderer } from './review-session/entry-renderer';
import { LoadingView } from './review-session/loading-view';
import { Paper } from './review-session/paper-tokens';
import { ProgressDots } from './review-session/progress-dots';
import type { ReviewEntry } from './review-session/review-entries';

export function ReviewSessionScreenView({
  task,
  steps,
  currentStepIndex,
  sessionComplete,
  onBack,
  onSelectChoice,
  onPressNext,
  onPressContinue,
  onPressRemember,
  onPressRetry,
  entries,
  freeText,
  fallbackText,
  onChangeFreeText,
  onSubmitFreeText,
  onChangeFallbackText,
  onSubmitFallback,
  onRemedialExplainPrimary,
  onRemedialExplainSecondary,
  onRemedialCheckOption,
  onRemedialCheckDontKnow,
}: UseReviewSessionScreenResult) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const scrollRef = useRef<ScrollView>(null);
  const tabletInputScrollRef = useRef<ScrollView>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // 새 entry 추가 시 auto-scroll 트리거.
  // entries 모델로 통합된 이후 remedialFlowState 가 사라졌으므로 전체 entries.length 를 추적한다.
  const autoScrollFlagRef = useRef(false);
  const prevEntryCountRef = useRef(entries.length);

  useEffect(() => {
    if (entries.length > prevEntryCountRef.current) {
      autoScrollFlagRef.current = true;
    }
    prevEntryCountRef.current = entries.length;
  }, [entries.length]);

  const handleContentSizeChange = () => {
    if (!autoScrollFlagRef.current) return;
    autoScrollFlagRef.current = false;
    scrollRef.current?.scrollToEnd({ animated: true });
    tabletInputScrollRef.current?.scrollToEnd({ animated: true });
  };

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

  const entryHandlers = {
    step,
    currentStepIndex,
    totalSteps,
    freeText,
    fallbackText,
    onSelectChoice,
    onChangeFreeText,
    onSubmitFreeText,
    onChangeFallbackText,
    onSubmitFallback,
    onPressDoneCta: onPressNext,
    onRemedialExplainPrimary,
    onRemedialExplainSecondary,
    onRemedialCheckOption,
    onRemedialCheckDontKnow,
  };

  const renderedEntries = entries.map((entry: ReviewEntry, idx: number) => (
    <EntryRenderer key={`${entry.kind}-${idx}`} entry={entry} {...entryHandlers} />
  ));

  if (isTablet) {
    const leftEntries = entries.filter((e: ReviewEntry) => e.kind === 'step-card');
    const rightEntries = entries.filter((e: ReviewEntry) => e.kind !== 'step-card');
    return (
      <PageContainer variant="split" style={styles.screen}>
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
            {leftEntries.map((entry: ReviewEntry, idx: number) => (
              <EntryRenderer key={`left-${idx}`} entry={entry} {...entryHandlers} />
            ))}
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
              contentInsetAdjustmentBehavior="automatic"
              automaticallyAdjustKeyboardInsets={process.env.EXPO_OS === 'ios'}
              onContentSizeChange={handleContentSizeChange}>
              {rightEntries.map((entry: ReviewEntry, idx: number) => (
                <EntryRenderer key={`right-${idx}`} entry={entry} {...entryHandlers} />
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
      </PageContainer>
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
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets={process.env.EXPO_OS === 'ios'}
          onContentSizeChange={handleContentSizeChange}>
          <ProgressDots totalSteps={totalSteps} currentStepIndex={currentStepIndex} />
          {renderedEntries}
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
