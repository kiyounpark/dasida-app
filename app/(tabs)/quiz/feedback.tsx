import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function QuizFeedbackScreen() {
  const params = useLocalSearchParams();
  const weakTagParam = getSingleParam(params.weakTag);
  const weakTag =
    typeof weakTagParam === 'string' && weakTagParam.trim().length > 0
      ? weakTagParam
      : '기초 개념 학습 필요';
  const [feedback, setFeedback] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>피드백</Text>
      <Text style={styles.tag}>오늘 약점: {weakTag}</Text>
      <Text style={styles.message}>연습문제를 완료했어요. 한 줄 의견을 남겨주세요.</Text>
      <TextInput
        style={styles.input}
        value={feedback}
        onChangeText={setFeedback}
        placeholder="예: 약점이 명확해서 좋았어요"
      />
      <View style={styles.buttonContainer}>
        <Button title="제출하기 (MVP 더미)" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tag: {
    fontSize: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    marginTop: 8,
  },
});
