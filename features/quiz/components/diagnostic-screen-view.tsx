import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { MathText } from '@/components/math/MathText';
import { ProblemStatement } from '@/components/math/problem-statement';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { DiagnosisConversationPage } from '@/features/quiz/components/diagnosis-conversation-page';
import { DiagnosisExitConfirmModal } from '@/features/quiz/components/diagnosis-exit-confirm-modal';
import type { UseDiagnosticScreenResult } from '@/features/quiz/hooks/use-diagnostic-screen';

export function DiagnosticScreenView({
  activeDiagnosisPageIndex,
  currentProblem,
  diagnosisPageWidth,
  diagnosisPages,
  diagnosisPagerRef,
  diagnosisPendingAutoScrollRef,
  diagnosisPendingRestoreRef,
  diagnosisScrollOffsetsRef,
  diagnosisStepLabel,
  handleDiagnosisAutoScrollHandled,
  handleDiagnosisMomentumEnd,
  handleDiagnosisRestoreHandled,
  handleDiagnosisScrollOffsetChange,
  hasStarted,
  hasStoredDiagnosisOffset,
  isCompactNavigator,
  isDiagnosing,
  isExitModalVisible,
  isLoadingState,
  onAiHelpContinue,
  onAiHelpFallback,
  onAiHelpInputChange,
  onAiHelpSubmit,
  onAnalyzePage,
  onCheckDontKnow,
  onCheckPress,
  onChoicePress,
  onCloseExitModal,
  onConfirmPredicted,
  onExitDiagnosis,
  onExplainContinue,
  onExplainDontKnow,
  onFinalConfirm,
  onInputChange,
  onManualSelect,
  onOpenExitModal,
  onQuestionChoiceSelect,
  onQuestionSubmit,
  onScrollToDiagnosisPage,
  onScrollToIndexFailed,
  onStartSession,
  progressPercent,
  selectedIndex,
  stepTitle,
}: UseDiagnosticScreenResult) {
  if (isLoadingState) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.loadingBody}>
          <Text selectable style={styles.loadingText}>
            결과를 계산 중입니다...
          </Text>
        </View>
      </View>
    );
  }

  if (isDiagnosing) {
    return (
      <View style={[styles.screen, styles.diagnosisScreen]}>
        <BrandHeader />
        <View style={styles.diagnosisShell}>
          <View pointerEvents="none" style={styles.diagnosisBackdrop}>
            <View style={styles.diagnosisBackdropGlow} />
            <View style={styles.diagnosisBackdropBand} />
          </View>

          <View style={styles.diagnosisSessionBar}>
            <View style={styles.diagnosisHeader}>
              <Pressable
                style={styles.closeButton}
                onPress={onOpenExitModal}
                accessibilityRole="button"
                accessibilityLabel="오답 분석 닫기">
                <IconSymbol name="xmark" size={18} color={DiagnosisTheme.ink} />
              </Pressable>
              <View style={styles.diagnosisHeaderCopy}>
                <Text selectable style={styles.diagnosisHeaderTitle}>
                  오답 약점 분석
                </Text>
                <Text selectable style={styles.diagnosisHeaderMeta}>
                  {diagnosisStepLabel}
                </Text>
              </View>
              <View style={styles.closeSpacer} />
            </View>

            <View style={styles.navigatorRow}>
              <View style={styles.navigatorDots}>
                <View accessible accessibilityRole="tablist" style={styles.navigatorDotsList}>
                  {diagnosisPages.map((page, pageIndex) => {
                    const isActive = pageIndex === activeDiagnosisPageIndex;
                    const isCompleted = page.workspace.status === 'completed';
                    const pageLabel = `${pageIndex + 1} / ${diagnosisPages.length}`;

                    return (
                      <Pressable
                        key={`diagnosis-page-${page.answerIndex}`}
                        style={styles.navigatorDotHitArea}
                        onPress={() => onScrollToDiagnosisPage(pageIndex)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`${pageLabel}로 이동`}
                        accessibilityHint={
                          isCompleted
                            ? '이 문제의 분석은 완료되었습니다'
                            : '이 문제의 분석은 아직 진행 중입니다'
                        }>
                        <View
                          style={[
                            styles.navigatorDot,
                            isCompactNavigator ? styles.navigatorDotCompact : styles.navigatorDotRegular,
                            isCompleted ? styles.navigatorDotCompleted : styles.navigatorDotUpcoming,
                            isActive && styles.navigatorDotActive,
                            isActive && isCompactNavigator && styles.navigatorDotActiveCompact,
                            isActive && !isCompactNavigator && styles.navigatorDotActiveRegular,
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          <FlatList
            ref={diagnosisPagerRef}
            data={diagnosisPages}
            horizontal
            pagingEnabled
            bounces={false}
            directionalLockEnabled
            decelerationRate="fast"
            keyExtractor={(page) => String(page.answerIndex)}
            renderItem={({ item, index }) => (
              <DiagnosisConversationPage
                answerIndex={item.answerIndex}
                width={diagnosisPageWidth}
                isActive={index === activeDiagnosisPageIndex}
                status={item.workspace.status}
                chatEntries={item.workspace.chatEntries}
                methods={item.methods}
                diagnosisInput={item.workspace.diagnosisInput}
                routerResult={item.workspace.routerResult}
                suggestedMethods={item.suggestedMethods}
                analysisErrorMessage={item.workspace.analysisErrorMessage}
                isAnalyzing={item.workspace.isAnalyzing}
                aiHelpInput={item.workspace.aiHelpState?.input ?? ''}
                aiHelpError={item.workspace.aiHelpState?.error ?? ''}
                isAiHelpLoading={item.workspace.aiHelpState?.isLoading ?? false}
                restoreOffset={
                  hasStoredDiagnosisOffset(item.answerIndex)
                    ? diagnosisScrollOffsetsRef.current[item.answerIndex]
                    : undefined
                }
                shouldRestoreScroll={Boolean(
                  diagnosisPendingRestoreRef.current[item.answerIndex],
                )}
                shouldAutoScrollToEnd={Boolean(
                  diagnosisPendingAutoScrollRef.current[item.answerIndex],
                )}
                onInputChange={(text) => onInputChange(item.answerIndex, text)}
                onAnalyze={() => void onAnalyzePage(item)}
                onManualSelect={(methodId) => onManualSelect(item, methodId)}
                onConfirmPredicted={() => onConfirmPredicted(item)}
                onChoicePress={(optionId) => onChoicePress(item, optionId)}
                onExplainContinue={() => onExplainContinue(item)}
                onExplainDontKnow={() => onExplainDontKnow(item)}
                onCheckPress={(optionId) => onCheckPress(item, optionId)}
                onCheckDontKnow={() => onCheckDontKnow(item)}
                onFinalConfirm={() => onFinalConfirm(item)}
                onAiHelpInputChange={(text) => onAiHelpInputChange(item.answerIndex, text)}
                onAiHelpSubmit={() => onAiHelpSubmit(item)}
                onAiHelpContinue={() => onAiHelpContinue(item)}
                onAiHelpFallback={() => onAiHelpFallback(item)}
                onScrollOffsetChange={handleDiagnosisScrollOffsetChange}
                onAutoScrollHandled={handleDiagnosisAutoScrollHandled}
                onRestoreHandled={handleDiagnosisRestoreHandled}
              />
            )}
            style={styles.diagnosisPager}
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode="on-drag"
            showsHorizontalScrollIndicator={false}
            scrollEnabled={diagnosisPages.length > 1}
            getItemLayout={(_, index) => ({
              length: diagnosisPageWidth,
              offset: diagnosisPageWidth * index,
              index,
            })}
            onMomentumScrollEnd={handleDiagnosisMomentumEnd}
            onScrollToIndexFailed={({ index }) => onScrollToIndexFailed(index)}
          />
        </View>

        <DiagnosisExitConfirmModal
          visible={isExitModalVisible}
          onContinue={onCloseExitModal}
          onExit={onExitDiagnosis}
        />
      </View>
    );
  }

  if (!currentProblem) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        {!hasStarted ? (
          <View style={styles.introCard}>
            <Text selectable style={styles.introEyebrow}>
              진단 시작 전
            </Text>
            <Text selectable style={styles.introTitle}>
              10문제 약점 진단
            </Text>
            <Text selectable style={styles.introBody}>
              짧은 10문항으로 자주 흔들리는 단원을 찾고, 결과에서 바로 약점 연습으로 이어집니다.
            </Text>
            <View style={styles.introMetaRow}>
              <View style={styles.introMetaChip}>
                <Text selectable style={styles.introMetaText}>
                  10문항
                </Text>
              </View>
              <View style={styles.introMetaChip}>
                <Text selectable style={styles.introMetaText}>
                  약 3분
                </Text>
              </View>
            </View>
            <BrandButton title="진단 시작하기" onPress={onStartSession} />
          </View>
        ) : (
          <View style={styles.surfaceCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressPercent }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text selectable style={styles.progressLabel}>
                  진행률
                </Text>
                <Text selectable style={styles.progress}>
                  {stepTitle}
                </Text>
              </View>
            </View>
            <View style={styles.topicRow}>
              <Text selectable style={styles.topicChip}>
                {currentProblem.topic}
              </Text>
            </View>
            <ProblemStatement question={currentProblem.question} />

            <View style={styles.choicesContainer}>
              {currentProblem.choices.map((choice, index) => {
                const isSelected = selectedIndex === index;

                return (
                  <Pressable
                    key={`${currentProblem.id}_${index}`}
                    style={[styles.choiceButton, isSelected && styles.choiceButtonSelected]}
                    onPress={() => onQuestionChoiceSelect(index)}>
                    <MathText
                      text={choice}
                      style={[styles.choiceText, isSelected && styles.choiceTextSelected]}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.submitContainer}>
              <BrandButton
                title="답 제출하기"
                onPress={onQuestionSubmit}
                disabled={selectedIndex === null}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  diagnosisScreen: {
    backgroundColor: DiagnosisTheme.canvas,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
    paddingBottom: BrandSpacing.xxl,
    gap: BrandSpacing.md,
  },
  loadingBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.lg,
  },
  loadingText: {
    marginTop: BrandSpacing.lg,
    textAlign: 'center',
    color: BrandColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  diagnosisShell: {
    flex: 1,
    overflow: 'hidden',
    paddingTop: BrandSpacing.sm,
    backgroundColor: DiagnosisTheme.canvas,
  },
  diagnosisBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  diagnosisBackdropGlow: {
    position: 'absolute',
    top: -54,
    left: 20,
    right: 20,
    height: 180,
    borderRadius: 999,
    backgroundColor: '#EEE6D7',
    opacity: 0.7,
  },
  diagnosisBackdropBand: {
    position: 'absolute',
    top: 94,
    left: -40,
    right: -40,
    height: 140,
    borderRadius: 999,
    backgroundColor: '#FAF6EF',
    opacity: 0.9,
  },
  diagnosisSessionBar: {
    marginHorizontal: BrandSpacing.lg,
    paddingHorizontal: BrandSpacing.md,
    paddingTop: 12,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.panel,
    boxShadow: '0 10px 24px rgba(36, 50, 41, 0.06)',
  },
  diagnosisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BrandSpacing.sm,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
  },
  diagnosisHeaderCopy: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  diagnosisHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DiagnosisTheme.ink,
  },
  diagnosisHeaderMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: DiagnosisTheme.inkMuted,
    letterSpacing: 0.2,
  },
  closeSpacer: {
    width: 42,
    height: 42,
  },
  navigatorRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  navigatorDots: {
    alignSelf: 'stretch',
  },
  navigatorDotsList: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  navigatorDotHitArea: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigatorDot: {
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  navigatorDotRegular: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  navigatorDotCompact: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  navigatorDotActive: {
    backgroundColor: DiagnosisTheme.userBubble,
    borderColor: DiagnosisTheme.userBubble,
  },
  navigatorDotActiveRegular: {
    width: 24,
    height: 10,
    borderRadius: 999,
  },
  navigatorDotActiveCompact: {
    width: 20,
    height: 8,
    borderRadius: 999,
  },
  navigatorDotCompleted: {
    backgroundColor: '#73896E',
    borderColor: '#73896E',
  },
  navigatorDotUpcoming: {
    backgroundColor: 'transparent',
    borderColor: '#B4BCAF',
  },
  diagnosisPager: {
    flex: 1,
    marginTop: 6,
  },
  surfaceCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
    boxShadow: '0 12px 32px rgba(41, 59, 39, 0.08)',
  },
  introCard: {
    backgroundColor: BrandColors.card,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.md,
    boxShadow: '0 12px 32px rgba(41, 59, 39, 0.08)',
  },
  introEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primarySoft,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: BrandColors.text,
  },
  introBody: {
    fontSize: 16,
    lineHeight: 24,
    color: BrandColors.mutedText,
  },
  introMetaRow: {
    flexDirection: 'row',
    gap: BrandSpacing.xs,
  },
  introMetaChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#F7FAF6',
  },
  introMetaText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.text,
    fontVariant: ['tabular-nums'],
  },
  progressHeader: {
    gap: BrandSpacing.xs,
    marginBottom: BrandSpacing.xs,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E3ECE2',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.primary,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.mutedText,
  },
  progress: {
    fontSize: 14,
    color: BrandColors.primarySoft,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  topicRow: {
    marginTop: 2,
    marginBottom: BrandSpacing.xs,
  },
  topicChip: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF5EC',
    color: BrandColors.primarySoft,
    fontSize: 12,
    fontWeight: '700',
  },
  choicesContainer: {
    marginTop: BrandSpacing.sm,
    gap: BrandSpacing.sm,
  },
  choiceButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  choiceButtonSelected: {
    borderColor: BrandColors.primarySoft,
    backgroundColor: BrandColors.primarySoft,
  },
  choiceText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 24,
  },
  choiceTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitContainer: {
    marginTop: BrandSpacing.md,
  },
});
