// v2: DiagnosisChatBubble → ReviewChatBubble 로 교체. 채팅 톤을 노트북에 통합.
// (선택) input-area의 잠긴 인스턴스를 PickedChoiceChip으로 압축.
import { Pressable, StyleSheet, Text } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import type { ThinkingStep } from '@/data/review-content-map';

import { AiTypingBubble } from './ai-typing-bubble';
import { FallbackInputCard } from './fallback-input-card';
import { FeedbackBanner } from './feedback-banner';
import { InputArea } from './input-area';
import { Paper } from './paper-tokens';
// PickedChoiceChip 은 v2 컴포넌트 셋에 포함돼 있지만 entry-renderer 에서는
// 더 이상 자동으로 사용하지 않는다. 다른 자리(예: 약점 상세, 히스토리)에서
// "내가 고른 답" 요약이 필요하면 직접 import 해서 쓰세요.
import { RemedialCheckCard } from './remedial-check-card';
import { RemedialDiagnoseCard } from './remedial-diagnose-card';
import { RemedialExplainCard } from './remedial-explain-card';
import { RemedialSummaryCard } from './remedial-summary-card';
import type { ReviewEntry } from './review-entries';
import { ReviewChatBubble } from './review-chat-bubble';  // v2: 노트북 톤 채팅
import { StepCard } from './step-card';

const CHOICE_LABELS = ['가', '나', '다', '라'];

type Props = {
  entry: ReviewEntry;
  step: ThinkingStep;
  currentStepIndex: number;
  totalSteps: number;
  freeText: string;
  fallbackText: string;
  onSelectChoice: (i: number) => void;
  onChangeFreeText: (t: string) => void;
  onSubmitFreeText: () => void;
  onChangeFallbackText: (t: string) => void;
  onSubmitFallback: () => void;
  onPressDoneCta: () => void;
  onRemedialExplainPrimary: (nodeId: string) => void;
  onRemedialExplainSecondary: (nodeId: string) => void;
  onRemedialCheckOption: (nodeId: string, optionId: string) => void;
  onRemedialCheckDontKnow: (nodeId: string) => void;
  onRemedialDiagnoseOption: (nodeId: string, optionId: string) => void;
  onRemedialSummaryContinue: (nodeId: string) => void;
};

export function EntryRenderer(props: Props) {
  const { entry, step, currentStepIndex, totalSteps } = props;

  switch (entry.kind) {
    case 'step-card':
      return <StepCard step={step} currentStepIndex={currentStepIndex} totalSteps={totalSteps} />;

    case 'input-area':
      // v2: 잠긴 input-area는 렌더하지 않는다.
      //   - 학생이 무엇을 골랐는지는 바로 다음 entry(choice-bubble or user-bubble)가 이미 보여줌
      //   - 잠긴 보기 카드를 dim 상태로 두면 스크롤 부피만 늘고 정보는 중복
      //   - 임의 텍스트(예: "이전 단계 보기")로 압축하면 실제 선택/정오답 정보 손실
      //   → fallback-input과 동일하게 null 리턴이 정답.
      if (!entry.interactive) return null;
      return (
        <InputArea
          step={step}
          freeText={props.freeText}
          interactive={entry.interactive}
          onSelectChoice={props.onSelectChoice}
          onChangeFreeText={props.onChangeFreeText}
          onSubmitFreeText={props.onSubmitFreeText}
        />
      );

    case 'choice-bubble':
      return (
        <ReviewChatBubble
          role="user"
          text={`보기 ${CHOICE_LABELS[entry.choiceIndex] ?? entry.choiceIndex + 1}: ${entry.text}`}
        />
      );

    case 'feedback-banner':
      return <FeedbackBanner correct={entry.correct} text={entry.text} />;

    case 'user-bubble':
      return <ReviewChatBubble role="user" text={entry.text} />;

    case 'ai-bubble':
      return <ReviewChatBubble role="assistant" text={entry.text} showAvatar />;

    case 'ai-typing':
      return <AiTypingBubble />;

    case 'fallback-input':
      if (!entry.interactive) return null;
      return (
        <FallbackInputCard
          text={props.fallbackText}
          turn={entry.turn}
          interactive={entry.interactive}
          onChangeText={props.onChangeFallbackText}
          onSubmit={props.onSubmitFallback}
        />
      );

    case 'remedial-node': {
      const node = entry.node;
      if (node.kind === 'explain') {
        return (
          <RemedialExplainCard
            node={node}
            interactive={entry.interactive}
            onPressPrimary={() => props.onRemedialExplainPrimary(node.id)}
            onPressSecondary={() => props.onRemedialExplainSecondary(node.id)}
          />
        );
      }
      if (node.kind === 'check') {
        return (
          <RemedialCheckCard
            node={node}
            interactive={entry.interactive}
            onPressOption={(opt) => props.onRemedialCheckOption(node.id, opt)}
            onPressDontKnow={() => props.onRemedialCheckDontKnow(node.id)}
          />
        );
      }
      if (node.kind === 'diagnose') {
        return (
          <RemedialDiagnoseCard
            node={node}
            interactive={entry.interactive}
            onPressOption={(opt) => props.onRemedialDiagnoseOption(node.id, opt)}
          />
        );
      }
      if (node.kind === 'summary') {
        return (
          <RemedialSummaryCard
            node={node}
            interactive={entry.interactive}
            onPressContinue={() => props.onRemedialSummaryContinue(node.id)}
          />
        );
      }
      return null;
    }

    case 'done-cta':
      return (
        <Pressable
          style={ctaStyles.btn}
          onPress={props.onPressDoneCta}
          accessibilityRole="button"
          accessibilityLabel={entry.label}>
          <Text style={ctaStyles.text}>{entry.label}</Text>
        </Pressable>
      );

    default:
      return null;
  }
}

const ctaStyles = StyleSheet.create({
  btn: {
    marginTop: 14,
    height: 52,                   // v2: 50 → 52
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
    elevation: 2,
  },
  text: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,                 // v2: 14 → 15
    color: Paper.cream,
    letterSpacing: -0.2,
  },
});
