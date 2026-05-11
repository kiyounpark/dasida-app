import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Paper } from './paper-tokens';

type Props = { text: string };

export function RemedialTransitionCard({ text }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Paper.forest100,
    borderColor: Paper.forest300,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
  },
  text: {
    color: Paper.forest700,
    fontSize: 13,
    fontWeight: '600',
  },
});
