import { View } from 'react-native';

import type { PhotoBubble } from '../types';
import { PhotoChatBubble } from './photo-chat-bubble';
import { PhotoNoteCard } from './photo-note-card';
import { PhotoWeaknessCard } from './photo-weakness-card';

/** 쌓인 대화. 간격까지 web-proto의 `.thread`와 같다(10px). */
export function PhotoChatThread({ bubbles }: { bubbles: PhotoBubble[] }) {
  return (
    <View style={{ gap: 10 }}>
      {bubbles.map((bubble) => {
        if (bubble.kind === 'note') return <PhotoNoteCard key={bubble.id} note={bubble.note} />;
        if (bubble.kind === 'weakness') return <PhotoWeaknessCard card={bubble.card} key={bubble.id} />;
        return <PhotoChatBubble bubble={bubble} key={bubble.id} />;
      })}
    </View>
  );
}
