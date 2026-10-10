import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoBackBar } from '../components/photo-back-bar';
import { PhotoNoteCard } from '../components/photo-note-card';
import { usePhotoNotesScreen } from '../hooks/use-photo-notes-screen';
import { PhotoTheme } from '../theme';

import { FontFamilies } from '@/constants/typography';

/** 「서버에 없는 노트 올리기」(1.0.11 4번) 문구 — 동의 화면 「내 노트, 계정에 저장」과 같은 말을 쓴다 */
export function uploadMissingLabel(count: number) {
  return `이 기기에만 있는 노트 ${count}장, 계정에 저장하기`;
}
export function uploadProgressLabel(done: number, total: number) {
  return `계정에 저장하는 중… ${done}/${total}`;
}

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
 * 4번: 서버 목록을 읽었고 기기에만 있는 노트가 있으면 「계정에 저장하기」 한 줄. 상태는 use-photo-notes-screen.
 */
export function PhotoNotesScreen({
  accountKey,
  getRemoteAuthHeaders,
  inTab = false,
}: {
  accountKey?: string | null;
  getRemoteAuthHeaders?: ((accountKey: string) => Promise<Record<string, string>>) | null;
  /** 「내 기록」 탭 안 — 돌아갈 곳이 없어 뒤로 버튼을 빼고, 아래 여백은 탭바가 맡는다 (q-5) */
  inTab?: boolean;
} = {}) {
  const { notes, remotePending, remoteFailed, reload, cloudOf, missingCount, upload, uploadMissing } = usePhotoNotesScreen({
    accountKey,
    getRemoteAuthHeaders,
  });

  // 맨 위 「< 뒤로」 줄은 모든 상태에 있어야 한다 — iOS 기본 헤더를 껐다(app/_layout.tsx, 1.0.12 ⓪)
  const backBar = <PhotoBackBar label={inTab ? undefined : '뒤로'} title="지난 오답노트" />;
  const edges = inTab ? ([] as const) : (['bottom'] as const);

  // 읽는 중엔 아무 말도 안 한다 — 기기에서 읽는 거라 한 프레임이고, "없어요"가 깜빡이면 더 나쁘다
  if (notes === null) {
    return (
      <SafeAreaView style={styles.safe} edges={edges}>
        {backBar}
      </SafeAreaView>
    );
  }

  // 새 기기에선 기기 노트가 0장이다 — 서버 답을 기다리는 동안 "아직 노트가 없어"를 띄우면 거짓말이 된다
  if (notes.length === 0 && remotePending) {
    return (
      <SafeAreaView style={styles.safe} edges={edges}>
        {backBar}
        <View style={styles.empty}>
          <ActivityIndicator accessibilityLabel="노트 불러오는 중" color={PhotoTheme.muted} />
        </View>
      </SafeAreaView>
    );
  }

  // 새 기기에서 서버를 못 읽었다 — 노트가 서버에 있을 수 있으니 「없어」라고 하지 않는다
  if (notes.length === 0 && remoteFailed) {
    return (
      <SafeAreaView style={styles.safe} edges={edges}>
        {backBar}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>노트를 못 불러왔어</Text>
          <Text style={styles.emptyBody}>인터넷을 확인하고 다시 시도해 줘.</Text>
          <Pressable accessibilityRole="button" onPress={reload} style={styles.upload}>
            <Text style={styles.uploadLabel}>다시 시도</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (notes.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={edges}>
        {backBar}
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
    <SafeAreaView style={styles.safe} edges={edges}>
      {backBar}
      <ScrollView contentContainerStyle={styles.list} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.count}>{`노트 ${notes.length}장`}</Text>
        {(missingCount > 0 || upload) && (
          <Pressable
            accessibilityRole="button"
            disabled={!!upload}
            onPress={() => void uploadMissing()}
            style={({ pressed }) => [styles.upload, (pressed || upload) && styles.uploadBusy]}>
            <Text style={styles.uploadLabel}>
              {upload ? uploadProgressLabel(upload.done, upload.total) : uploadMissingLabel(missingCount)}
            </Text>
          </Pressable>
        )}
        {notes.map((note) => (
          <PhotoNoteCard key={note.id} note={note} variant="list" cloud={cloudOf(note)} />
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
  // photo-action-buttons의 기본 버튼과 같은 모양 — 흐름에서 보던 버튼이라 눌러도 되는 줄로 읽힌다
  upload: {
    borderWidth: 1.5,
    borderColor: PhotoTheme.greenSoft,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  uploadBusy: {
    opacity: 0.72,
  },
  uploadLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 21,
    color: PhotoTheme.green,
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
