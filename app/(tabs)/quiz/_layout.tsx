import { Stack } from 'expo-router';
import { QuizSessionProvider } from '@/features/quiz/session';

export default function QuizLayout() {
  return (
    <QuizSessionProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: '문제 풀기', headerShown: false }} />
        <Stack.Screen name="diagnostic" options={{ title: '10문제 체험', headerShown: false }} />
        <Stack.Screen name="exams" options={{ title: '실전 모의고사', headerShown: false }} />
        <Stack.Screen name="result" options={{ title: '판정 결과', headerShown: false }} />
        <Stack.Screen name="practice" options={{ title: '연습문제', headerShown: false }} />
        <Stack.Screen name="feedback" options={{ title: '피드백', headerShown: false }} />
        <Stack.Screen name="exam" options={{ headerShown: false }} />
        <Stack.Screen name="review-session" options={{ title: '복습 세션', headerShown: false }} />
      </Stack>
    </QuizSessionProvider>
  );
}
