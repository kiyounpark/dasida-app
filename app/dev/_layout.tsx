import { Redirect, Stack } from 'expo-router';

export default function DevLayout() {
  // 프로덕션 빌드에서 접근 차단
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '개발 허브', headerShown: true }} />
      <Stack.Screen name="exam-result" options={{ headerShown: false }} />
      <Stack.Screen name="quiz-stage" options={{ headerShown: false }} />
    </Stack>
  );
}
