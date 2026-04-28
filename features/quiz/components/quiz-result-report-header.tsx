import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { FontFamilies } from '@/constants/typography';

type QuizResultReportHeaderProps = {
  isCompactLayout: boolean;
};

export function QuizResultReportHeader(_props: QuizResultReportHeaderProps) {
  const router = useRouter();
  const today = useMemo(
    () =>
      new Date()
        .toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\. /g, '·')
        .replace(/\.$/, ''),
    [],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/quiz')}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기">
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Text style={styles.date}>{today}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F8F3E8',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#1A1916',
    fontWeight: '300',
    lineHeight: 32,
    marginTop: -2,
  },
  date: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    color: '#6B675E',
    fontVariant: ['tabular-nums'],
  },
});
