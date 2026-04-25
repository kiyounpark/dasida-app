import { Stack } from 'expo-router';
import { QuizSessionProvider } from '@/features/quiz/session';

export default function QuizFlowLayout() {
  return (
    <QuizSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="diagnostic" options={{ title: '10문제 체험', gestureEnabled: false }} />
        <Stack.Screen name="result" options={{ title: '판정 결과', gestureEnabled: false }} />
        <Stack.Screen name="practice" options={{ title: '연습문제', gestureEnabled: false }} />
        <Stack.Screen name="feedback" options={{ title: '피드백' }} />
        <Stack.Screen name="review-session" options={{ title: '복습 세션' }} />
        <Stack.Screen name="step-complete" options={{ title: '완료', gestureEnabled: false }} />
        <Stack.Screen name="exam" />
      </Stack>
    </QuizSessionProvider>
  );
}
