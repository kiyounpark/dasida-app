import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import type { SolveMethodId } from '@/data/diagnosisTree';
import type { DiagnosisRouterResult } from '@/features/quiz/diagnosis-router';

export type DiagnosisMethodCardOption = {
  id: SolveMethodId;
  labelKo: string;
  summary?: string;
  exampleUtterances?: string[];
};

type DiagnosisMethodSelectorCardProps = {
  methods: DiagnosisMethodCardOption[];
  diagnosisInput: string;
  routerResult: DiagnosisRouterResult | null;
  suggestedMethods: DiagnosisMethodCardOption[];
  analysisErrorMessage: string;
  isAnalyzing: boolean;
  disabled?: boolean;
  onInputChange: (text: string) => void;
  onAnalyze: () => void;
  onManualSelect: (methodId: SolveMethodId) => void;
  onConfirmPredicted: () => void;
};

export function DiagnosisMethodSelectorCard({
  methods,
  diagnosisInput,
  routerResult,
  suggestedMethods,
  analysisErrorMessage,
  isAnalyzing,
  disabled = false,
  onInputChange,
  onAnalyze,
  onManualSelect,
  onConfirmPredicted,
}: DiagnosisMethodSelectorCardProps) {
  const predictedLabel = methods.find((method) => method.id === routerResult?.predictedMethodId)?.labelKo;
  const exampleText = methods
    .slice(0, 2)
    .map((method) => method.exampleUtterances?.[0])
    .filter(Boolean)
    .map((example) => `"${example}"`)
    .join(', ');

  return (
    <View style={styles.card}>
      <Text selectable style={styles.title}>
        가장 가까운 풀이 방법을 골라주세요
      </Text>
      <Text selectable style={styles.helper}>
        선택지로 바로 고르거나, 아래에 직접 적어서 추천을 받을 수 있어요.
      </Text>

      <View style={styles.optionGroup}>
        {methods.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.optionButton, disabled && styles.optionDisabled]}
            onPress={() => onManualSelect(option.id)}
            accessibilityRole="button"
            accessibilityLabel={option.labelKo}
            disabled={disabled}>
            <Text selectable style={styles.optionTitle}>
              {option.labelKo}
            </Text>
            {option.summary ? (
              <Text selectable style={styles.optionSummary}>
                {option.summary}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      <View style={styles.inputSection}>
        <Text selectable style={styles.inputLabel}>
          선택지에 없다면, 어떤 식으로 풀었는지 짧게 적어주세요.
        </Text>
        {exampleText ? (
          <Text selectable style={styles.inputHint}>
            예) {exampleText}
          </Text>
        ) : null}
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={diagnosisInput}
          onChangeText={onInputChange}
          editable={!disabled}
          placeholder="예: 근의 공식으로 풀다가 판별식 계산에서 막혔어요"
          placeholderTextColor="#98A19A"
          multiline
          textAlignVertical="top"
        />
        <Pressable
          style={[
            styles.analyzeButton,
            (!diagnosisInput.trim() || disabled) && styles.analyzeButtonDisabled,
          ]}
          onPress={onAnalyze}
          accessibilityRole="button"
          accessibilityLabel="입력 내용으로 추천받기"
          disabled={!diagnosisInput.trim() || disabled || isAnalyzing}>
          {isAnalyzing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.analyzeButtonText}>입력 내용으로 추천받기</Text>
          )}
        </Pressable>
        {analysisErrorMessage ? (
          <Text selectable style={styles.errorText}>
            {analysisErrorMessage}
          </Text>
        ) : null}
      </View>

      {routerResult && !routerResult.needsManualSelection && predictedLabel ? (
        <View style={styles.predictionCard}>
          <Text selectable style={styles.predictionLabel}>
            {predictedLabel}
          </Text>
          <Text selectable style={styles.predictionBody}>
            입력 내용을 기준으로 이 풀이 방법이 가장 가까워 보여요.
          </Text>
          <Pressable
            style={[styles.confirmButton, disabled && styles.optionDisabled]}
            onPress={onConfirmPredicted}
            accessibilityRole="button"
            accessibilityLabel="이 추천으로 계속"
            disabled={disabled}>
            <Text style={styles.confirmButtonText}>이 추천으로 계속</Text>
          </Pressable>
        </View>
      ) : null}

      {routerResult?.needsManualSelection ? (
        <View style={styles.lowConfidenceSection}>
          <Text selectable style={styles.lowConfidenceTitle}>
            설명만으로는 풀이 방법이 완전히 구분되진 않았어요.
          </Text>
          {suggestedMethods.length > 0 ? (
            <>
              <Text selectable style={styles.lowConfidenceBody}>
                지금 설명으로는 아래 방법이 가장 가까워 보여요.
              </Text>
              <View style={styles.optionGroup}>
                {suggestedMethods.map((method) => (
                  <Pressable
                    key={method.id}
                    style={[styles.suggestedButton, disabled && styles.optionDisabled]}
                    onPress={() => onManualSelect(method.id)}
                    accessibilityRole="button"
                    accessibilityLabel={method.labelKo}
                    disabled={disabled}>
                    <Text selectable style={styles.suggestedTitle}>
                      {method.labelKo}
                    </Text>
                    {method.summary ? (
                      <Text selectable style={styles.suggestedSummary}>
                        {method.summary}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <Text selectable style={styles.lowConfidenceHint}>
            {suggestedMethods.length > 0
              ? '위 후보를 누르거나, 조금 더 자세히 적어주시면 다시 추천해드릴게요.'
              : '조금 더 자세히 적어주시면 다시 추천해드릴게요.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: '92%',
    padding: BrandSpacing.md,
    gap: BrandSpacing.sm,
    borderWidth: 1,
    borderColor: '#E6C7C7',
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: '#FFF4F4',
    boxShadow: '0 12px 28px rgba(154, 52, 52, 0.08)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#9A3434',
  },
  helper: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7A5A5A',
  },
  optionGroup: {
    gap: BrandSpacing.xs,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#F2B8B8',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  optionDisabled: {
    opacity: 0.62,
  },
  optionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: BrandColors.text,
  },
  optionSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7A7A7A',
  },
  inputSection: {
    gap: BrandSpacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#7A5A5A',
  },
  inputHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8C7A7A',
    fontStyle: 'italic',
  },
  input: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: '#E3D2D2',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: BrandColors.text,
  },
  inputDisabled: {
    opacity: 0.72,
  },
  analyzeButton: {
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: BrandColors.warning,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonDisabled: {
    backgroundColor: '#C9C2BC',
  },
  analyzeButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: BrandColors.danger,
  },
  predictionCard: {
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
    borderWidth: 1,
    borderColor: '#F5D76E',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFF9E6',
  },
  predictionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9A7D0A',
  },
  predictionBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6F5B18',
  },
  confirmButton: {
    marginTop: BrandSpacing.xs,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: BrandColors.success,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lowConfidenceSection: {
    gap: BrandSpacing.xs,
  },
  lowConfidenceTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: BrandColors.danger,
  },
  lowConfidenceBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7A5A5A',
  },
  suggestedButton: {
    borderWidth: 1,
    borderColor: '#F0C24C',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFF9E6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  suggestedTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#9A7D0A',
  },
  suggestedSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7A6A2B',
  },
  lowConfidenceHint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7A5A5A',
  },
});
