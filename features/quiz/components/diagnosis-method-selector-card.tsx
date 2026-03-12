import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { DiagnosisTheme } from '@/constants/diagnosis-theme';
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
  clarifyingInput: string;
  hasSubmittedClarifyingInput: boolean;
  routerResult: DiagnosisRouterResult | null;
  suggestedMethods: DiagnosisMethodCardOption[];
  analysisErrorMessage: string;
  isAnalyzing: boolean;
  disabled?: boolean;
  appearance?: 'default' | 'suggested';
  onInputChange: (text: string) => void;
  onAnalyze: () => void;
  onClarifyingInputChange: (text: string) => void;
  onClarifyingAnalyze: () => void;
  onManualSelect: (methodId: SolveMethodId) => void;
  onConfirmPredicted: () => void;
};

export function DiagnosisMethodSelectorCard({
  methods,
  diagnosisInput,
  clarifyingInput,
  hasSubmittedClarifyingInput,
  routerResult,
  suggestedMethods,
  analysisErrorMessage,
  isAnalyzing,
  disabled = false,
  appearance = 'default',
  onInputChange,
  onAnalyze,
  onClarifyingInputChange,
  onClarifyingAnalyze,
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
  const canShowClarifyingComposer =
    Boolean(routerResult?.needsManualSelection) && !hasSubmittedClarifyingInput;
  const lowConfidenceHint = hasSubmittedClarifyingInput
    ? suggestedMethods.length > 0
      ? '추가 설명까지 봤지만 아직 완전히 구분하긴 어려워요. 위 후보에서 고르거나 처음 설명을 바꿔서 다시 시도해보세요.'
      : '추가 설명까지 봤지만 아직 완전히 구분하긴 어려워요. 처음 설명을 조금 바꿔서 다시 시도해보세요.'
    : suggestedMethods.length > 0
      ? '위 후보를 누르거나, 아래에 한 줄만 더 적어주면 한 번 더 추천해볼게요.'
      : '아래에 한 줄만 더 적어주면 한 번 더 추천해볼게요.';

  return (
    <View
      style={[
        styles.card,
        appearance === 'suggested' ? styles.suggestedAppearance : null,
        disabled ? styles.cardDisabled : null,
      ]}>
      <View style={styles.header}>
        <Text selectable style={styles.title}>
          어떤 방식으로 풀었나요?
        </Text>
        <Text selectable style={styles.helper}>
          선택지로 바로 고르거나, 직접 적어서 추천을 받을 수 있어요.
        </Text>
      </View>

      <View style={styles.optionGroup}>
        {methods.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.optionButton, disabled ? styles.optionButtonDisabled : null]}
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

      <View style={styles.inputPanel}>
        <Text selectable style={styles.inputLabel}>
          직접 메모로 적기
        </Text>
        <Text selectable style={styles.inputBody}>
          선택지에 없다면, 어떤 식으로 풀었는지 짧게 남겨주세요.
        </Text>
        {exampleText ? (
          <Text selectable style={styles.inputHint}>
            예) {exampleText}
          </Text>
        ) : null}
        <TextInput
          style={[styles.input, disabled ? styles.inputDisabled : null]}
          value={diagnosisInput}
          onChangeText={onInputChange}
          editable={!disabled}
          placeholder="예: 식을 바꿔보니 x=3이 보여서 넣었어요"
          placeholderTextColor="#92A095"
          multiline
          textAlignVertical="top"
        />
        <Pressable
          style={[
            styles.analyzeButton,
            (!diagnosisInput.trim() || disabled || isAnalyzing) && styles.analyzeButtonDisabled,
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
        <View style={styles.infoCard}>
          <Text selectable style={styles.infoEyebrow}>
            추천된 풀이법
          </Text>
          <Text selectable style={styles.infoTitle}>
            {predictedLabel}
          </Text>
          <Text selectable style={styles.infoBody}>
            입력 내용을 기준으로 이 풀이 방법이 가장 가까워 보여요.
          </Text>
          <Pressable
            style={[styles.confirmButton, disabled ? styles.optionButtonDisabled : null]}
            onPress={onConfirmPredicted}
            accessibilityRole="button"
            accessibilityLabel="이 추천으로 계속"
            disabled={disabled}>
            <Text style={styles.confirmButtonText}>이 추천으로 계속</Text>
          </Pressable>
        </View>
      ) : null}

      {routerResult?.needsManualSelection ? (
        <View style={styles.lowConfidenceCard}>
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
                    style={[styles.suggestedButton, disabled ? styles.optionButtonDisabled : null]}
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
          {canShowClarifyingComposer ? (
            <View style={styles.clarifyingPanel}>
              <Text selectable style={styles.clarifyingTitle}>
                조금만 더 설명해줄래요?
              </Text>
              <Text selectable style={styles.clarifyingBody}>
                어떤 공식이나 식 변형을 썼는지 한 줄만 더 적어주면, 이 단계에서 한 번 더 추천해볼게요.
              </Text>
              <TextInput
                style={[styles.clarifyingInput, disabled ? styles.inputDisabled : null]}
                value={clarifyingInput}
                onChangeText={onClarifyingInputChange}
                editable={!disabled}
                placeholder="예: 완전제곱식으로 바꾼 뒤 x=3을 넣었어요"
                placeholderTextColor="#978B74"
                multiline
                textAlignVertical="top"
              />
              <Pressable
                style={[
                  styles.clarifyingButton,
                  (!clarifyingInput.trim() || disabled || isAnalyzing) &&
                    styles.clarifyingButtonDisabled,
                ]}
                onPress={onClarifyingAnalyze}
                accessibilityRole="button"
                accessibilityLabel="추가 설명으로 다시 추천받기"
                disabled={!clarifyingInput.trim() || disabled || isAnalyzing}>
                {isAnalyzing ? (
                  <ActivityIndicator color={DiagnosisTheme.ink} />
                ) : (
                  <Text style={styles.clarifyingButtonText}>
                    추가 설명으로 다시 추천받기
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
          <Text selectable style={styles.lowConfidenceHint}>
            {lowConfidenceHint}
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
    borderColor: DiagnosisTheme.line,
    borderRadius: BrandRadius.md,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.panelAlt,
    boxShadow: '0 12px 26px rgba(36, 50, 41, 0.07)',
  },
  suggestedAppearance: {
    backgroundColor: DiagnosisTheme.panel,
  },
  cardDisabled: {
    backgroundColor: '#F2F0EA',
    borderColor: '#D8D8D1',
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: DiagnosisTheme.ink,
  },
  helper: {
    fontSize: 14,
    lineHeight: 21,
    color: DiagnosisTheme.inkMuted,
  },
  optionGroup: {
    gap: BrandSpacing.xs,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: DiagnosisTheme.choiceBorder,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.choiceBg,
    paddingVertical: 12,
    paddingHorizontal: 13,
    gap: 4,
  },
  optionButtonDisabled: {
    opacity: 0.66,
  },
  optionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: DiagnosisTheme.ink,
  },
  optionSummary: {
    fontSize: 13,
    lineHeight: 19,
    color: DiagnosisTheme.inkMuted,
  },
  inputPanel: {
    gap: BrandSpacing.xs,
    padding: BrandSpacing.sm,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: DiagnosisTheme.line,
    backgroundColor: DiagnosisTheme.panel,
  },
  inputLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    color: '#58715F',
    letterSpacing: 0.3,
  },
  inputBody: {
    fontSize: 14,
    lineHeight: 20,
    color: DiagnosisTheme.inkMuted,
  },
  inputHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7A857B',
    fontStyle: 'italic',
  },
  input: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: DiagnosisTheme.choiceBorder,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    lineHeight: 22,
    color: DiagnosisTheme.ink,
  },
  inputDisabled: {
    backgroundColor: '#F6F4EF',
  },
  analyzeButton: {
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.userBubble,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonDisabled: {
    backgroundColor: '#9BA79E',
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
  infoCard: {
    padding: BrandSpacing.md,
    gap: BrandSpacing.xs,
    borderWidth: 1,
    borderColor: DiagnosisTheme.infoBorder,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.infoBg,
  },
  infoEyebrow: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    color: '#577159',
    letterSpacing: 0.3,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: DiagnosisTheme.ink,
  },
  infoBody: {
    fontSize: 14,
    lineHeight: 20,
    color: DiagnosisTheme.inkMuted,
  },
  confirmButton: {
    marginTop: BrandSpacing.xs,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.userBubble,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lowConfidenceCard: {
    gap: BrandSpacing.xs,
    padding: BrandSpacing.md,
    borderWidth: 1,
    borderColor: DiagnosisTheme.warningBorder,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.warningBg,
  },
  lowConfidenceTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: '#7A5A20',
  },
  lowConfidenceBody: {
    fontSize: 14,
    lineHeight: 20,
    color: DiagnosisTheme.inkMuted,
  },
  suggestedButton: {
    borderWidth: 1,
    borderColor: DiagnosisTheme.choiceActiveBorder,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: DiagnosisTheme.choiceActiveBg,
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 4,
  },
  suggestedTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: DiagnosisTheme.ink,
  },
  suggestedSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: DiagnosisTheme.inkMuted,
  },
  lowConfidenceHint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6E634A',
  },
  clarifyingPanel: {
    gap: BrandSpacing.xs,
    marginTop: 2,
    padding: BrandSpacing.sm,
    borderWidth: 1,
    borderColor: '#E5D3A7',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFFDF7',
  },
  clarifyingTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: '#6D5B25',
  },
  clarifyingBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#746A54',
  },
  clarifyingInput: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#E2D3AF',
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: 15,
    lineHeight: 21,
    color: DiagnosisTheme.ink,
  },
  clarifyingButton: {
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#D3BC80',
    backgroundColor: '#F9EDCC',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clarifyingButtonDisabled: {
    borderColor: '#DDCFAC',
    backgroundColor: '#F2EAD7',
  },
  clarifyingButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: DiagnosisTheme.ink,
  },
});
