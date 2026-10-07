import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { MathText } from '@/components/math/MathText';
import { FontFamilies } from '@/constants/typography';
import type { CloudNoteState } from '@/functions/src/photo-store-contract';

import { useCloudNoteState } from '../cloud/save-note-remote';
import { NOTE_ASK_LINE, noteCardLines } from '../script/note-card-lines';
import { PhotoTheme } from '../theme';
import type { PhotoNote } from '../types';

/**
 * 카드 글자 줄은 웹 카드와 같은 함수(noteCardLines) — 저장된 노트 모양을 그쪽 입력으로 바꾼다.
 * 1.0.9까지 저장된 노트엔 checkSkipped 칸이 없다(= 학생이 본 쪽지).
 */
function linesOf(note: PhotoNote) {
  return noteCardLines({
    ...note,
    checkResult: note.checkSkipped ? 'skip' : note.checkPassed ? 'pass' : 'fail',
    // 옛 노트는 이 필드가 아예 없을 수 있다(`note-store.ts`의 `isPhotoNoteLike`가 안 본다) — 그때도 후보 쪽
    primaryWeaknessId: note.primaryWeaknessId ?? null,
  });
}

/**
 * ☁ 줄(1.0.11) — 서버 응답으로만 바뀐다. 상태가 없거나 'local-only'(안 올라감)면 줄을 안 낸다.
 * 로컬 저장 성공은 증거가 아니다(약속 파일 「저장 규칙」).
 */
function cloudLineOf(state: CloudNoteState | null): string | null {
  if (!state) return null;
  switch (state.kind) {
    case 'saving':
      return '☁ 저장 중';
    case 'stored':
      return state.hasPhoto ? '☁ 저장됨' : '☁ 저장됨 · 사진은 계정에 못 올림';
    case 'failed':
      return '☁ 저장 못 함 · 이 기기엔 남아 있어';
    default:
      return null;
  }
}

/**
 * 오답노트 한 장 — 이 흐름의 결과물.
 * "진단 결과"가 아니라 학생이 아는 양식이 자기 손글씨 사진과 함께 채워져 나온다.
 * 정답 칸은 없다(갈라진 지점 노트). web-proto의 note-card와 같은 구성.
 *
 * 두 자리에서 쓴다 — 흐름 끝(방금 나온 한 장)과 지난 노트 목록.
 * 목록에선 제목이 날짜가 되고, 맨 아래 안내 줄은 뺀다(거기선 이미 "다시 보고 있는" 상태다).
 *
 * cloud: ☁ 줄의 입력. 안 주면 이번 실행에서 올린 상태(uploadPhotoNote)를 note.id로 읽는다 —
 * 흐름 끝은 이 길로 「저장 중」→「저장됨」이 바뀐다. 목록·올리기(3·4)는 아는 값을 직접 넣는다.
 */
export function PhotoNoteCard({
  note,
  variant = 'flow',
  cloud,
}: {
  note: PhotoNote;
  variant?: 'flow' | 'list';
  cloud?: CloudNoteState | null;
}) {
  const lines = linesOf(note);
  const sessionCloud = useCloudNoteState(note.id);
  const cloudLine = cloudLineOf(cloud !== undefined ? cloud : sessionCloud);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>
          {variant === 'list' ? '오답노트' : '오늘의 오답노트 · 1장'}
        </Text>
        <Text style={styles.date}>{note.dateLabel}</Text>
      </View>

      {note.photoUri && (
        // contain: 세로로 긴 시험지 사진도 통째로 — cover는 인용한 그 손글씨 줄을 잘라먹는다
        <Image
          accessibilityLabel="내가 올린 풀이 사진"
          contentFit="contain"
          source={{ uri: note.photoUri }}
          style={styles.photo}
        />
      )}

      <NoteRow label="✂️ 갈라진 지점" text={lines.quote} />
      <NoteRow label="왜" text={note.why} />
      <NoteRow label="다음엔" text={note.fix} />

      <View style={styles.foot}>
        <Text selectable style={styles.checks}>
          {lines.checks}
        </Text>
        <Text selectable style={styles.tags}>
          {lines.tags}
        </Text>
      </View>

      {/* 못 찾았으면 줄 자체를 안 낸다 — 빈 이름표는 학생한테 값이 0이다 (기윤 판정 2026.08.13) */}
      {/* 학생이 골랐으면 그것만 — 골라놓고 '또는'이 그대로 뜨면 물어본 의미가 없다 (2026.09.20) */}
      {lines.weaknessLabels.length > 0 && (
        <Text selectable style={styles.weakness}>
          {/* 구분자가 ' · '면 '역·이·대우 혼동'처럼 이름 안에 든 ·와 안 갈린다 — 실측으로 잡음 */}
          {`🏷️ ${lines.weaknessLabels.join(' 또는 ')}`}
        </Text>
      )}

      {/* 접는 기준 — 웹 카드와 같은 문장 (🔒 10.01 갈림길 ①). 노트가 뜨는 순간의 질문이라 목록에선 뺀다 */}
      {variant === 'flow' && <Text style={styles.ask}>{NOTE_ASK_LINE}</Text>}

      {/* 09.15에 저장이 붙었다 — "아직 저장은 안 돼"는 이제 거짓이라 걷었다 */}
      {variant === 'flow' && (
        <Text style={styles.capture}>📸 여기 남겨뒀어 — 지난 오답노트에서 다시 볼 수 있어.</Text>
      )}

      {cloudLine && <Text style={styles.cloud}>{cloudLine}</Text>}
    </View>
  );
}

function NoteRow({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {/* 캡처해 갈 카드가 제일 시험지처럼 보여야 한다 — 말풍선과 같이 수식만 세리프로 뗀다 */}
      <MathText
        highlightMath
        mathSegmentStyle={styles.rowMath}
        selectable
        style={styles.rowText}
        text={text}
      />
    </View>
  );
}

/**
 * 행 줄 높이 — 22가 아니라 22.01이다. 22로 「정리」하지 말 것 (10.07 시뮬레이터 실측).
 * 22면 n줄 높이가 화소 칸(1/3pt)에 딱 맞아 잰 높이에 여유가 0이다. 긴 흐름 화면 아래쪽에선 레이아웃
 * 소수점 오차로 칸이 87.9998pt처럼 아주 조금 작게 잡히고, iOS는 칸에 다 안 들어가는 마지막 줄을
 * 아예 안 그린다 — 흐름 끝 「왜」 칸 넷째 줄이 빈 자리로 남았다. 0.01을 얹으면 잰 높이가 올림되며
 * 0.2~0.3pt 여유가 생긴다. 눈으로 보이는 차이는 없다.
 */
const ROW_LINE_HEIGHT = 22.01;

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PhotoTheme.greenSoft,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  title: {
    fontFamily: FontFamilies.extrabold,
    fontSize: 15,
    color: PhotoTheme.green,
  },
  date: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    color: PhotoTheme.muted,
  },
  photo: {
    width: '100%',
    height: 240,
    backgroundColor: PhotoTheme.cream2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PhotoTheme.line,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: PhotoTheme.line,
    borderStyle: 'dashed',
  },
  label: {
    width: 96,
    fontFamily: FontFamilies.extrabold,
    fontSize: 13,
    lineHeight: ROW_LINE_HEIGHT,
    color: PhotoTheme.greenSoft,
  },
  rowText: {
    flex: 1,
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: ROW_LINE_HEIGHT,
    color: PhotoTheme.ink,
  },
  rowMath: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 16,
    color: PhotoTheme.green,
    letterSpacing: 0.2,
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: PhotoTheme.line,
  },
  checks: {
    fontFamily: FontFamilies.bold,
    fontSize: 12.5,
    color: PhotoTheme.ink,
  },
  tags: {
    fontFamily: FontFamilies.bold,
    fontSize: 12.5,
    color: PhotoTheme.greenSoft,
  },
  weakness: {
    fontFamily: FontFamilies.bold,
    marginTop: 8,
    fontSize: 12.5,
    color: PhotoTheme.green,
  },
  // web-proto `.note-ask` — 크림 바탕 칸, 13px 굵게
  ask: {
    fontFamily: FontFamilies.bold,
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    backgroundColor: PhotoTheme.cream2,
    borderRadius: 8,
    borderCurve: 'continuous',
    overflow: 'hidden',
    fontSize: 13,
    lineHeight: 19.5,
    color: PhotoTheme.ink,
  },
  capture: {
    fontFamily: FontFamilies.regular,
    marginTop: 10,
    fontSize: 12,
    color: PhotoTheme.muted,
    textAlign: 'center',
  },
  cloud: {
    fontFamily: FontFamilies.bold,
    marginTop: 6,
    fontSize: 12,
    color: PhotoTheme.muted,
    textAlign: 'right',
  },
});
