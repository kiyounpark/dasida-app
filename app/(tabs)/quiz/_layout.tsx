import { Stack } from 'expo-router';

export default function QuizLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '문제 풀기', headerShown: false }} />
      <Stack.Screen name="result" options={{ title: '판정 결과' }} />
      <Stack.Screen name="practice" options={{ title: '연습문제' }} />
      <Stack.Screen name="feedback" options={{ title: '피드백' }} />
    </Stack>
  );
}
