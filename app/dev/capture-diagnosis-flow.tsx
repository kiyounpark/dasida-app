import { Stack } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DasidaLogo } from '@/components/brand/DasidaLogo';
import { BrandColors } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
import { FontFamilies } from '@/constants/typography';
import type { DiagnosisFlowNode } from '@/data/detailedDiagnosisFlows';
import { DiagnosisChatBubble } from '@/features/quiz/components/diagnosis-chat-bubble';
import { DiagnosisFlowCard } from '@/features/quiz/components/diagnosis-flow-card';
import {
  DiagnosisMethodSelectorCard,
  type DiagnosisMethodCardOption,
} from '@/features/quiz/components/diagnosis-method-selector-card';
import {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
} from '@/features/quiz/diagnosis-flow-engine';
import { ExamProblemCard } from '@/features/quiz/exam/components/exam-problem-card';
import { DiagnosisMiniCard } from '@/features/quiz/exam/components/diagnosis-mini-card';
import { buildMiniCardText } from '@/features/quiz/exam/diagnosis-mini-card-text';

/**
 * 마케팅 영상 캡처 전용 — 실제 진단 컴포넌트/데이터를 그대로 사용해
 * "미분 오답 → 풀이 순서 혼동" 진단 플로우를 자동 재생한다.
 *
 * 상단 앱바는 홈/퀴즈 화면의 BrandHeader(다시다 로고)를 사용한다.
 * 새로고침은 앱바 우측에 겹쳐 둔 dev 컨트롤 — 누르면 처음부터 자동 재생.
 * 진단 엔진을 손으로 타지 않고 미리 계산된 경로를 타이머로 노출한다. 부수효과 없음.
 */

// 실제로 이미지가 번들된 미분 문제 (g3 미적분 학평 2024-03 2번, 정답 3번)
const EXAM_KEY = 'g3-calc-academic-2024-03/2';
const PROBLEM_NUMBER = 2;
const CORRECT_ANSWER = 3;
const USER_ANSWER = 2;
const METHOD_LABEL = '미분';

const DIFF_METHOD: DiagnosisMethodCardOption = {
  id: 'diff',
  labelKo: METHOD_LABEL,
  summary: '미분해서 풀었어요',
  exampleUtterances: ["미분해서 f'(x)=0을 풀었어요"],
};

const STEP_INTERVAL_MS = 1700;

type Item =
  | { kind: 'problem' }
  | { kind: 'bubble'; role: 'assistant' | 'user'; text: string }
  | { kind: 'selector' }
  | { kind: 'flow-node'; node: DiagnosisFlowNode }
  | { kind: 'mini-card'; patternName: string; patternDescription: string };

/** 진단 엔진을 실제로 walk 해서 "풀이 순서 혼동" 경로의 노드 + 자막을 만든다. */
function buildTimeline(): Item[] {
  const flow = getDiagnosisFlow('diff');

  const draftRoot = createDiagnosisFlowDraft('diff');
  const rootNode = getNode(flow, draftRoot.currentNodeId);
  const chosenOptionText =
    rootNode.kind === 'choice'
      ? rootNode.options.find((o) => o.id === 'diff_order')?.text ?? ''
      : '';

  const draftExplain = advanceFromChoice(draftRoot, 'diff_order');
  const explainNode = getNode(flow, draftExplain.currentNodeId);

  const draftCheck = advanceFromExplain(draftExplain, 'continue');
  const checkNode = getNode(flow, draftCheck.currentNodeId);
  const correctOption =
    checkNode.kind === 'check' ? checkNode.options.find((o) => o.isCorrect) : undefined;

  // 정답 체크 → 최종 약점 카드 (실제 앱이 진단 종료 시 보여주는 또렷한 약점 노드)
  const draftFinal = advanceFromCheck(draftCheck, correctOption?.id);
  const finalNode = getNode(flow, draftFinal.currentNodeId);

  // 실제 mini-card 자막 로직과 동일: 마지막 explain/check 노드 텍스트를 패턴 설명으로 사용
  const lastNodeText =
    checkNode.kind === 'check' ? checkNode.prompt ?? checkNode.title : null;
  const { patternName, patternDescription } = buildMiniCardText({
    methodLabel: METHOD_LABEL,
    lastNodeText,
  });

  return [
    { kind: 'problem' },
    { kind: 'bubble', role: 'assistant', text: '어떤 방법으로 풀었나요?' },
    { kind: 'selector' },
    { kind: 'bubble', role: 'user', text: METHOD_LABEL },
    { kind: 'flow-node', node: rootNode },
    { kind: 'bubble', role: 'user', text: chosenOptionText },
    { kind: 'flow-node', node: explainNode },
    { kind: 'bubble', role: 'user', text: '확인할게요' },
    { kind: 'flow-node', node: checkNode },
    { kind: 'bubble', role: 'user', text: correctOption?.text ?? '' },
    { kind: 'flow-node', node: finalNode },
    { kind: 'mini-card', patternName, patternDescription },
  ];
}

const NOOP = () => {};

export default function CaptureDiagnosisFlowScreen() {
  const items = useMemo(buildTimeline, []);
  const [visibleCount, setVisibleCount] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const play = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + 1;
        if (next >= items.length) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return items.length;
        }
        return next;
      });
    }, STEP_INTERVAL_MS);
  }, [items.length]);

  // 새로고침 = 처음부터 다시 자동 재생 (녹화 테이크 사이 리셋)
  const restart = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setVisibleCount(1);
    play();
  }, [play]);

  const visible = items.slice(0, visibleCount);
  const lastIndex = visible.length - 1;

  return (
    <View style={styles.screen}>
      {/* dev 스택 기본 네이티브 헤더 숨김 */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ↻ 새로고침 — 로고 앱바 '위'의 dev 컨트롤. 녹화 시 로고 바부터 프레이밍하면 안 잡힘 */}
      <SafeAreaView edges={['top']} style={styles.refreshStrip}>
        <Pressable
          onPress={restart}
          hitSlop={10}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="처음부터 다시 재생">
          <Text style={styles.refreshIcon}>↻</Text>
          <Text style={styles.refreshText}>새로고침</Text>
        </Pressable>
      </SafeAreaView>

      {/* 실제 다시다 로고 앱바 (녹화 프레임 시작점) */}
      <View style={styles.logoBar}>
        <View style={styles.logoInner}>
          <DasidaLogo width={172} height={45} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {visible.map((item, index) => {
          const isActive = index === lastIndex;
          return (
            <Animated.View
              key={index}
              entering={FadeInDown.duration(260).withInitialValues({
                opacity: 0,
                transform: [{ translateY: 10 }],
              })}>
              <ItemRenderer item={item} isActive={isActive} />
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ItemRenderer({ item, isActive }: { item: Item; isActive: boolean }) {
  if (item.kind === 'problem') {
    // 문제 이미지는 작게 — 대화가 화면을 더 많이 차지하도록 (실제 컴포넌트 그대로, 폭만 축소)
    return (
      <View style={styles.problemWrap}>
        <ExamProblemCard
          imageKey={EXAM_KEY}
          userAnswer={USER_ANSWER}
          correctAnswer={CORRECT_ANSWER}
          problemType="multiple_choice"
        />
      </View>
    );
  }

  if (item.kind === 'bubble') {
    return (
      <DiagnosisChatBubble
        role={item.role}
        text={item.text}
        showAvatar={item.role === 'assistant'}
      />
    );
  }

  if (item.kind === 'selector') {
    return (
      <DiagnosisMethodSelectorCard
        methods={[DIFF_METHOD]}
        diagnosisInput=""
        routerResult={null}
        suggestedMethods={[]}
        analysisErrorMessage=""
        isAnalyzing={false}
        disabled={!isActive}
        onInputChange={NOOP}
        onAnalyze={NOOP}
        onManualSelect={NOOP}
        onConfirmPredicted={NOOP}
      />
    );
  }

  if (item.kind === 'flow-node') {
    return (
      <DiagnosisFlowCard
        node={item.node}
        methodLabel={METHOD_LABEL}
        disabled={!isActive}
        onChoicePress={NOOP}
        onExplainContinue={NOOP}
        onExplainDontKnow={NOOP}
        onCheckPress={NOOP}
        onCheckDontKnow={NOOP}
      />
    );
  }

  return (
    <DiagnosisMiniCard
      problemNumber={PROBLEM_NUMBER}
      patternName={item.patternName}
      patternDescription={item.patternDescription}
      noteCount={1}
      totalNotes={1}
      onPause={NOOP}
      onNext={NOOP}
      isLastProblem
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DiagnosisTheme.canvas },
  refreshStrip: {
    backgroundColor: DiagnosisTheme.canvas,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
    alignItems: 'flex-end',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(41,59,39,0.25)',
    backgroundColor: '#fff',
  },
  refreshButtonPressed: { opacity: 0.6 },
  logoBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  logoInner: {
    height: 42,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  refreshIcon: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: DiagnosisTheme.ink,
  },
  refreshText: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: DiagnosisTheme.ink,
  },
  canvas: { flex: 1 },
  canvasContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 12,
  },
  problemWrap: {
    width: '88%',
    alignSelf: 'center',
  },
});
