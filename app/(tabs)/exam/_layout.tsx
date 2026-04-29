import { Stack } from 'expo-router';

export default function ExamLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '기출', headerShown: false }} />
    </Stack>
  );
}
