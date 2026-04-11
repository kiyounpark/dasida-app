import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREENS = [
  {
    title: '모의고사 결과 화면',
    desc: '오답 타일 그리드 · 진행률 · 저장 상태',
    onPress: () => router.push('/dev/exam-result'),
  },
  {
    title: '오답 약점 진단 화면',
    desc: '채팅 플로우 · 선생님 아바타 · 진행 바',
    onPress: () =>
      router.push({
        pathname: '/quiz/exam/diagnosis',
        params: {
          examId: 'g1-academic-2026-03',
          problemNumber: '21',
          wrongCount: '5',
          diagnosedCount: '0',
        },
      }),
  },
  {
    title: '진단 퀴즈 스테이지',
    desc: '문제 카드 · 선택지 · 하단 네비게이션',
    onPress: () => router.push('/dev/quiz-stage'),
  },
] as const;

export default function DevHubScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.list}>
        {SCREENS.map((screen) => (
          <TouchableOpacity key={screen.title} style={styles.card} onPress={screen.onPress}>
            <Text style={styles.title}>{screen.title}</Text>
            <Text style={styles.desc}>{screen.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9F7F4' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#1D1B18' },
  desc: { fontSize: 13, color: '#948E83' },
});
