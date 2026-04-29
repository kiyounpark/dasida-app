import { Stack } from 'expo-router';

export default function ExamLayout() {
  return (
    <Stack>
      <Stack.Screen name="solve" options={{ headerShown: false }} />
      <Stack.Screen name="result" options={{ headerShown: false }} />
      <Stack.Screen name="diagnosis" options={{ headerShown: false }} />
      <Stack.Screen name="diagnosis-session" options={{ headerShown: false }} />
    </Stack>
  );
}
