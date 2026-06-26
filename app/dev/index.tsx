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
  {
    title: '복습 세션',
    desc: '목업 태스크 · 복습 스텝 · 완료 플로우 (formula_understanding)',
    onPress: () =>
      router.push({
        pathname: '/quiz/review-session',
        params: { taskId: '__mock__' },
      }),
  },
  {
    title: '복습 세션 (판별식)',
    desc: 'discriminant_calculation 시범 약점 QA용',
    onPress: () =>
      router.push({
        pathname: '/quiz/review-session',
        params: { taskId: '__mock_disc__' },
      }),
  },
  {
    title: '🎬 캡처용 · 약점 상세',
    desc: '마케팅 영상용 · solving_order_confusion (풀이 순서 혼동)',
    onPress: () => router.push('/dev/capture-weakness'),
  },
  {
    title: '🎬 캡처용 · 약점 비교',
    desc: '마케팅 영상 12~22초 · "미분 약함" → "f\'(x)=0 까먹기" 전환',
    onPress: () => router.push('/dev/capture-comparison'),
  },
  {
    title: '🎬 캡처용 · 약점 진단 플로우',
    desc: '실제 진단 화면 자동 재생 · 미분 오답 → 풀이 순서 혼동',
    onPress: () => router.push('/dev/capture-diagnosis-flow'),
  },
  {
    title: '🎬 캡처용 · 약점 리포트',
    desc: '마케팅 영상 컷6 · 미적분 약점 5개 한눈에 (풀이 순서 혼동 외)',
    onPress: () => router.push('/dev/capture-report'),
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
