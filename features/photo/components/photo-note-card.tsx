import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { MathText } from '@/components/math/MathText';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';

import { PhotoTheme } from '../theme';
import type { PhotoNote, RetryResult } from '../types';

const RETRY_MARK: Record<RetryResult, string> = {
  pass: ' · 재도전 ✔',
  fail: ' · 재도전 ✗',
  skip: '',
  none: '',
};

/**
 * 오답노트 한 장 — 이 흐름의 결과물.
 * "진단 결과"가 아니라 학생이 아는 양식이 자기 손글씨 사진과 함께 채워져 나온다.
 * 정답 칸은 없다(갈라진 지점 노트). web-proto의 note-card와 같은 구성.
 */
export function PhotoNoteCard({ note }: { note: PhotoNote }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>오늘의 오답노트 · 1장</Text>
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

      <NoteRow label="✂️ 갈라진 지점" text={note.quote ? `"${note.quote}"` : '(없음)'} />
      <NoteRow label="왜" text={note.why} />
      <NoteRow label="다음엔" text={note.fix} />

      <View style={styles.foot}>
        <Text selectable style={styles.checks}>
          {`오늘 확인: 쪽지시험 ${note.checkPassed ? '✔' : '✗'}${RETRY_MARK[note.retryResult]}`}
        </Text>
        <Text selectable style={styles.tags}>
          {`#${note.methodLabel} #${note.typeLabel}`}
        </Text>
      </View>

      {/* 못 찾았으면 줄 자체를 안 낸다 — 빈 이름표는 학생한테 값이 0이다 (기윤 판정 2026.08.13) */}
      {note.weaknessIds.length > 0 && (
        <Text selectable style={styles.weakness}>
          {/* 구분자가 ' · '면 '역·이·대우 혼동'처럼 이름 안에 든 ·와 안 갈린다 — 실측으로 잡음 */}
          {`🏷️ ${note.weaknessIds.map((id) => diagnosisMap[id].labelKo).join(' 또는 ')}`}
        </Text>
      )}

      <Text style={styles.capture}>📸 아직 저장은 안 돼 — 캡처해서 가져가.</Text>
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
    lineHeight: 22,
    color: PhotoTheme.greenSoft,
  },
  rowText: {
    flex: 1,
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 22,
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
  capture: {
    fontFamily: FontFamilies.regular,
    marginTop: 10,
    fontSize: 12,
    color: PhotoTheme.muted,
    textAlign: 'center',
  },
});
