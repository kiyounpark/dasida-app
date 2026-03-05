import { router, useLocalSearchParams } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function QuizPracticeScreen() {
  const params = useLocalSearchParams();
  const weakTagParam = getSingleParam(params.weakTag);
  const weakTag =
    typeof weakTagParam === 'string' && weakTagParam.trim().length > 0
      ? weakTagParam
      : '기초 개념 학습 필요';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>약점 집중 훈련</Text>
      <Text>훈련 태그: {weakTag}</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="완료 후 피드백 남기기"
          onPress={() =>
            router.push({
              pathname: '/quiz/feedback',
              params: { weakTag },
            })
          }
        />
      </View>
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
