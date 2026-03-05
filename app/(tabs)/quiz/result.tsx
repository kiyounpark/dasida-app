import { router, useLocalSearchParams } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

type NextStep = 'correct' | 'partial' | 'wrong';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function QuizResultScreen() {
  const params = useLocalSearchParams();
  const nextStepParam = getSingleParam(params.nextStep);
  const weakTagParam = getSingleParam(params.weakTag);

  const nextStep: NextStep =
    nextStepParam === 'correct' || nextStepParam === 'partial' || nextStepParam === 'wrong'
      ? nextStepParam
      : 'wrong';

  const weakTag =
    typeof weakTagParam === 'string' && weakTagParam.trim().length > 0
      ? weakTagParam
      : '기초 개념 학습 필요';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI 분석 결과</Text>
      <Text>판정: {nextStep}</Text>
      <Text>발견된 약점: {weakTag}</Text>
      {nextStep === 'wrong' ? (
        <View style={styles.buttonContainer}>
          <Button
            title="연습문제 풀어볼게요"
            onPress={() =>
              router.push({
                pathname: '/quiz/practice',
                params: { weakTag },
              })
            }
          />
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="문제 화면으로 돌아가기" onPress={() => router.replace('/quiz')} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 40,
  }
});
