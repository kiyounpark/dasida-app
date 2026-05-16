import { Pressable, StyleSheet, Text } from 'react-native';

import { FontFamilies } from '@/constants/typography';
import { DiagnosisChatBubble } from '@/features/quiz/components/diagnosis-chat-bubble';
import type { ThinkingStep } from '@/data/review-content-map';

import { AiTypingBubble } from './ai-typing-bubble';
import { FallbackInputCard } from './fallback-input-card';
import { FeedbackBanner } from './feedback-banner';
import { InputArea } from './input-area';
import { Paper } from './paper-tokens';
import { RemedialCheckCard } from './remedial-check-card';
import { RemedialDiagnoseCard } from './remedial-diagnose-card';
import { RemedialExplainCard } from './remedial-explain-card';
import { RemedialSummaryCard } from './remedial-summary-card';
import type { ReviewEntry } from './review-entries';
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
        <DiagnosisChatBubble
          role="user"
          text={`보기 ${CHOICE_LABELS[entry.choiceIndex] ?? entry.choiceIndex + 1}: ${entry.text}`}
        />
      );

    case 'feedback-banner':
      return <FeedbackBanner correct={entry.correct} text={entry.text} />;

    case 'user-bubble':
      return <DiagnosisChatBubble role="user" text={entry.text} />;

    case 'ai-bubble':
      return <DiagnosisChatBubble role="assistant" text={entry.text} showAvatar />;

    case 'ai-typing':
      return <AiTypingBubble />;

    case 'fallback-input':
      // 잠긴(이미 제출된) fallback-input은 렌더하지 않는다.
      // 학생 발화는 동시에 append되는 user-bubble이 보여주므로 중복이고,
      // fallbackText state가 모든 인스턴스에 공유되어 2턴 입력이 1턴에도 뜨는 버그 회피.
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
    height: 50,
    borderWidth: 1.5,
    borderColor: Paper.ink,
    borderRadius: 14,
    backgroundColor: Paper.forest800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 0 rgba(26,25,22,1)',
  },
  text: {
    fontFamily: FontFamilies.bold,
    fontSize: 14,
    color: Paper.cream,
    letterSpacing: -0.2,
  },
});
