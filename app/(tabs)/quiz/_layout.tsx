import { Stack } from 'expo-router';

export default function QuizLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '문제 풀기', headerShown: false }} />
      <Stack.Screen name="exams" options={{ title: '실전 모의고사', headerShown: false }} />
    </Stack>
  );
}
