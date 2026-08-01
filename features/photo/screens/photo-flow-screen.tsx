import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoActionButtons } from '../components/photo-action-buttons';
import { PhotoAnalyzingView } from '../components/photo-analyzing-view';
import { PhotoChatThread } from '../components/photo-chat-thread';
import { PhotoUploadView } from '../components/photo-upload-view';
import { usePhotoFlow } from '../hooks/use-photo-flow';
import { PhotoTheme } from '../theme';

/** 화면 셋(업로드 · 분석 중 · 대화)을 조합하기만 한다. 흐름은 use-photo-flow가 들고 있다. */
export function PhotoFlowScreen() {
  const { status, imageUri, error, thread, start } = usePhotoFlow();
  const scrollRef = useRef<ScrollView>(null);
  const { bubbles, actions, press } = thread;

  // 말풍선이 늘면 아래로 따라간다 (web-proto의 scrollIntoView 자리)
  useEffect(() => {
    if (status !== 'chat') return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [status, bubbles, actions]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {status === 'upload' && <PhotoUploadView error={error} onPick={start} />}
      {status === 'analyzing' && <PhotoAnalyzingView />}
      {status === 'chat' && (
        <ScrollView
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
          ref={scrollRef}>
          {imageUri && (
            <View style={styles.previewFrame}>
              <Image contentFit="cover" source={{ uri: imageUri }} style={styles.preview} />
            </View>
          )}
          <PhotoChatThread bubbles={bubbles} />
          <PhotoActionButtons actions={actions} onPress={press} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PhotoTheme.cream,
  },
  // web-proto .wrap(가로 22) · .thread(위 8 아래 24) · .actions(아래 30)와 같은 여백
  list: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 30,
    gap: 10,
  },
  previewFrame: {
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: PhotoTheme.line,
    backgroundColor: PhotoTheme.cream2,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 140,
  },
});
