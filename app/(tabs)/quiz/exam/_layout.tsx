import { Stack } from 'expo-router';

import { ExamSessionProvider } from '@/features/quiz/exam/exam-session';

export default function ExamLayout() {
  return (
    <ExamSessionProvider>
      <Stack>
        <Stack.Screen name="solve" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
      </Stack>
    </ExamSessionProvider>
  );
}
