import { View } from 'react-native';

import type { PhotoBubble } from '../types';
import { PhotoChatBubble } from './photo-chat-bubble';
import { PhotoNoteCard } from './photo-note-card';

/** 쌓인 대화. 간격까지 web-proto의 `.thread`와 같다(10px). */
export function PhotoChatThread({ bubbles }: { bubbles: PhotoBubble[] }) {
  return (
    <View style={{ gap: 10 }}>
      {bubbles.map((bubble) =>
        bubble.kind === 'note' ? (
          <PhotoNoteCard key={bubble.id} note={bubble.note} />
        ) : (
          <PhotoChatBubble bubble={bubble} key={bubble.id} />
        ),
      )}
    </View>
  );
}
