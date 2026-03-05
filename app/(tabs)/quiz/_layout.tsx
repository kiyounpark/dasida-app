import { Stack } from 'expo-router';
import { QuizSessionProvider } from '@/features/quiz/session';

export default function QuizLayout() {
  return (
    <QuizSessionProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: '문제 풀기', headerShown: false }} />
        <Stack.Screen name="result" options={{ title: '판정 결과', headerShown: false }} />
        <Stack.Screen name="practice" options={{ title: '연습문제', headerShown: false }} />
        <Stack.Screen name="feedback" options={{ title: '피드백', headerShown: false }} />
      </Stack>
    </QuizSessionProvider>
  );
}
