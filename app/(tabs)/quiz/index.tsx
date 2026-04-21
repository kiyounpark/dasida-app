import { Tabs } from 'expo-router';
import QuizHubScreen from '@/features/quiz/screens/quiz-hub-screen';

export default function QuizHubRoute() {
  return (
    <>
      <Tabs.Screen options={{ tabBarStyle: { display: 'none' } }} />
      <QuizHubScreen />
    </>
  );
}
