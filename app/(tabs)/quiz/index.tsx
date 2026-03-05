import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

type NextStep = 'correct' | 'partial' | 'wrong';

export default function QuizIndexScreen() {
  const nextStep: NextStep = 'wrong';
  const weakTag = '계산 실수 반복';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>선별된 10문제 중 1</Text>
      <Text>문제 내용이 이곳에 표시됩니다.</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="제출하기"
          onPress={() =>
            router.push({
              pathname: '/quiz/result',
              params: { nextStep, weakTag },
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
