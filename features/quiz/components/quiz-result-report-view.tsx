import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { PageContainer } from '@/components/layout/page-container';
import { BrandColors, BrandRadius } from '@/constants/brand';
import { FontFamilies } from '@/constants/typography';
import { diagnosisMap } from '@/data/diagnosisMap';
import type { UseResultScreenResult } from '@/features/quiz/hooks/use-result-screen';
import { NotificationOptInCard } from '@/features/quiz/components/notification-opt-in-card';

import { QuizResultReportCard } from './quiz-result-report-card';
import { QuizResultReportHeader } from './quiz-result-report-header';
import { QuizResultReportHero } from './quiz-result-report-hero';

type QuizResultReportViewProps = {
  onOpenWeaknessPractice: (weaknessId: string) => void;
  optInCard: UseResultScreenResult['optInCard'];
  persistResult: () => Promise<void>;
  saveErrorMessage: string | null;
  saveState: UseResultScreenResult['saveState'];
  summary: NonNullable<UseResultScreenResult['liveSummary']>;
};

export function QuizResultReportView({
  onOpenWeaknessPractice,
  optInCard,
  persistResult,
  saveErrorMessage,
  saveState,
  summary,
}: QuizResultReportViewProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 390;

  const primaryWeaknessId = summary.topWeaknesses[0];
  const primaryInfo = primaryWeaknessId
    ? diagnosisMap[primaryWeaknessId as keyof typeof diagnosisMap]
    : null;
  const missedCount = primaryWeaknessId
    ? summary.wrongByWeakness?.[primaryWeaknessId] ?? 1
    : 1;

  const secondaryWeaknesses = summary.topWeaknesses.slice(1, 3);
  const extraWeaknesses = summary.topWeaknesses.slice(3);

  return (
    <View style={styles.screen}>
      <QuizResultReportHeader isCompactLayout={isCompactLayout} />

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.container,
          isCompactLayout && styles.containerCompact,
        ]}>
        <PageContainer variant="reading" style={{ gap: isCompactLayout ? 12 : 14 }}>
        {saveState === 'saving' ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>학습 기록을 저장 중이에요</Text>
            <Text style={styles.statusBody}>
              결과, 반복 약점, 다음 복습 일정을 같이 정리하고 있습니다.
            </Text>
          </View>
        ) : null}

        {saveState === 'error' ? (
          <View style={[styles.statusCard, styles.errorCard]}>
            <Text style={styles.statusTitle}>결과 저장이 완료되지 않았어요</Text>
            <Text style={styles.statusBody}>
              {saveErrorMessage ?? '네트워크를 확인한 뒤 다시 시도해 주세요.'}
            </Text>
            <View style={styles.statusButtonWrap}>
              <BrandButton
                title="다시 저장하기"
                variant="danger"
                onPress={() => void persistResult()}
              />
            </View>
          </View>
        ) : null}

        {primaryWeaknessId ? (
          <>
            <QuizResultReportHero
              isCompactLayout={isCompactLayout}
              primaryWeaknessId={primaryWeaknessId}
              missedCount={missedCount}
            />
            <View style={styles.divider} />
          </>
        ) : null}

        {secondaryWeaknesses.length > 0 ? (
          <View style={styles.cardList}>
            {secondaryWeaknesses.map((weaknessId) => {
              const info = diagnosisMap[weaknessId as keyof typeof diagnosisMap];
              if (!info) return null;
              return (
                <QuizResultReportCard
                  key={weaknessId}
                  description={info.desc}
                  isCompactLayout={isCompactLayout}
                  tip={info.tip}
                  title={info.labelKo}
                />
              );
            })}
          </View>
        ) : null}

        {extraWeaknesses.length > 0 ? (
          <View style={styles.extraSection}>
            <Text style={styles.extraSectionLabel}>
              그 외 약점 {extraWeaknesses.filter((id) => id in diagnosisMap).length}개
            </Text>
            <View style={styles.compactList}>
              {extraWeaknesses.map((weaknessId) => {
                const info = diagnosisMap[weaknessId as keyof typeof diagnosisMap];
                if (!info) return null;
                return (
                  <View key={weaknessId} style={styles.compactRow}>
                    <View style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{info.topicLabel}</Text>
                    </View>
                    <Text style={styles.compactRowName} numberOfLines={1}>
                      {info.labelKo}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <NotificationOptInCard
          weaknessLabels={optInCard.weaknessLabels}
          state={optInCard.state}
          onEnable={optInCard.onEnable}
          onDismiss={optInCard.onDismiss}
        />

        <View style={styles.ctaWrap}>
          <BrandButton
            title={
              primaryInfo
                ? `${primaryInfo.labelKo}부터 다시 풀기`
                : '약점 기반 연습문제 풀기'
            }
            variant="neutral"
            disabled={!primaryWeaknessId}
            onPress={() => {
              if (!primaryWeaknessId) return;
              onOpenWeaknessPractice(primaryWeaknessId);
            }}
            style={styles.primaryCta}
          />
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.replace('/(tabs)/quiz')}>
            <Text style={styles.ghostBtnText}>나중에 풀게요</Text>
          </TouchableOpacity>
        </View>
        </PageContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F3E8',
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  containerCompact: {
    paddingHorizontal: 14,
    gap: 12,
  },
  statusCard: {
    borderWidth: 1,
    borderColor: 'rgba(53, 72, 50, 0.16)',
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  errorCard: {
    borderColor: '#D48B7A',
    backgroundColor: '#FFF7F4',
  },
  statusTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 15,
    lineHeight: 22,
    color: BrandColors.text,
  },
  statusBody: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    lineHeight: 20,
    color: '#4F5B52',
  },
  statusButtonWrap: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECE4CD',
  },
  cardList: {
    gap: 12,
  },
  extraSection: {
    gap: 8,
  },
  extraSectionLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B675E',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  compactList: {
    gap: 6,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 252, 247, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(41, 59, 39, 0.10)',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topicChip: {
    backgroundColor: 'rgba(74, 124, 89, 0.13)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  topicChipText: {
    fontFamily: FontFamilies.bold,
    fontSize: 11,
    lineHeight: 16,
    color: '#2A5C38',
  },
  compactRowName: {
    flex: 1,
    fontFamily: FontFamilies.bold,
    fontSize: 13,
    lineHeight: 18,
    color: '#1C2C19',
  },
  ctaWrap: {
    gap: 8,
    paddingTop: 6,
  },
  primaryCta: {
    minHeight: 52,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingVertical: 14,
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  ghostBtnText: {
    fontFamily: FontFamilies.medium,
    fontSize: 13,
    color: '#6B675E',
  },
});
