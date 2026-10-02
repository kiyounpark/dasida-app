import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadRemotePhotoNotes } from '../cloud/remote-note-store';
import { PhotoNoteCard } from '../components/photo-note-card';
import { readPhotoNotes } from '../note-store';
import { PhotoTheme } from '../theme';
import type { PhotoNote } from '../types';

import { FontFamilies } from '@/constants/typography';

/**
 * 지난 오답노트 목록. 저장은 09.15에 붙었는데 꺼내 볼 자리가 없어서 만든 화면이다.
 *
 * 카드는 흐름 끝에서 쓰던 PhotoNoteCard를 그대로 쓴다 — 방금 본 그 모양이어야
 * "아까 그거"로 알아본다. 새로 그리면 같은 물건인지 학생이 모른다.
 *
 * accountKey·getRemoteAuthHeaders는 주소가 내려준다(app/photo-notes.tsx). 화면이 직접 집지 않는 이유는
 * PhotoFlowScreen과 같다 — 프로바이더 없이 그리는 테스트를 살려 둔다.
 *
 * 1.0.11 다른 기기 보기: 기기 노트를 먼저 그리고, 서버에만 있는 노트를 뒤에 더한다(같은 id면 기기 것).
 * 서버를 못 읽으면 기기 노트만 — 오류 띠는 없다. 헤더 함수가 없으면 서버를 안 부른다.
 */
export function PhotoNotesScreen({
  accountKey,
  getRemoteAuthHeaders,
}: {
  accountKey?: string | null;
  getRemoteAuthHeaders?: ((accountKey: string) => Promise<Record<string, string>>) | null;
} = {}) {
  const [notes, setNotes] = useState<PhotoNote[] | null>(null);
  const [remotePending, setRemotePending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const local = accountKey ? await readPhotoNotes(accountKey) : [];
      if (cancelled) return;

      setRemotePending(!!accountKey && !!getRemoteAuthHeaders);
      setNotes(local);
      if (!accountKey || !getRemoteAuthHeaders) return;

      await loadRemotePhotoNotes(accountKey, local, getRemoteAuthHeaders, {
        isCancelled: () => cancelled,
        onUpdate: (merged) => {
          if (!cancelled) setNotes(merged);
        },
      });
      if (!cancelled) setRemotePending(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [accountKey, getRemoteAuthHeaders]);

  // 읽는 중엔 아무 말도 안 한다 — 기기에서 읽는 거라 한 프레임이고, "없어요"가 깜빡이면 더 나쁘다
  if (notes === null) {
    return <SafeAreaView style={styles.safe} edges={['bottom']} />;
  }

  // 새 기기에선 기기 노트가 0장이다 — 서버 답을 기다리는 동안 "아직 노트가 없어"를 띄우면 거짓말이 된다
  if (notes.length === 0 && remotePending) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.empty}>
          <ActivityIndicator accessibilityLabel="노트 불러오는 중" color={PhotoTheme.muted} />
        </View>
      </SafeAreaView>
    );
  }

  if (notes.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 노트가 없어</Text>
          <Text style={styles.emptyBody}>
            틀린 문제를 한 장 올리면 오답노트가 만들어지고, 여기 쌓여.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.list} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.count}>{`노트 ${notes.length}장`}</Text>
        {notes.map((note) => (
          <PhotoNoteCard key={note.id} note={note} variant="list" />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PhotoTheme.cream,
  },
  list: {
    padding: 18,
    gap: 14,
  },
  count: {
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    color: PhotoTheme.muted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 18,
    color: PhotoTheme.ink,
  },
  emptyBody: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 22,
    color: PhotoTheme.muted,
    textAlign: 'center',
  },
});
