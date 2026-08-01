import { View } from 'react-native';

import { formatMathText } from '@/components/math/MathText';
import { BrandSpacing } from '@/constants/brand';
import { DiagnosisChatBubble } from '@/features/quiz/components/diagnosis-chat-bubble';

import type { PhotoBubble } from '../types';
import { PhotoNoteCard } from './photo-note-card';

/**
 * 쌓인 대화. 앱에 이미 있는 DiagnosisChatBubble을 그대로 쓴다 —
 * web-proto의 말풍선 CSS가 원래 이 컴포넌트에서 간 것이라 모양이 같다.
 */
export function PhotoChatThread({ bubbles }: { bubbles: PhotoBubble[] }) {
  return (
    <View style={{ gap: BrandSpacing.sm }}>
      {bubbles.map((bubble, index) => {
        if (bubble.kind === 'note') {
          return <PhotoNoteCard key={bubble.id} note={bubble.note} />;
        }
        // 문단은 빈 줄로 벌린다 — web-proto의 .p 간격과 같은 자리
        const text = bubble.paras.map(formatMathText).join('\n\n');
        if (bubble.kind === 'me') {
          return <DiagnosisChatBubble key={bubble.id} role="user" text={text} />;
        }
        const previous = bubbles[index - 1];
        return (
          <DiagnosisChatBubble
            key={bubble.id}
            role="assistant"
            text={text}
            // 답을 기다리는 말풍선만 색이 바뀐다 (web-proto .ask)
            tone={bubble.ask ? 'info' : 'neutral'}
            showAvatar={!previous || previous.kind !== 'coach'}
          />
        );
      })}
    </View>
  );
}
