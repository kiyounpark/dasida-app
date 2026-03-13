import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandButton } from '@/components/brand/BrandButton';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import { useCurrentLearner } from '@/features/learner/provider';

function getFeaturedExamStatusLabel(status: 'not_started' | 'in_progress' | 'completed') {
  switch (status) {
    case 'in_progress':
      return '이어서 풀 수 있는 상태예요';
    case 'completed':
      return '가장 최근에 한 번 마쳤어요';
    default:
      return '아직 시작하지 않았어요';
  }
}

export default function FeaturedExamsScreen() {
  const { homeState, profile } = useCurrentLearner();
  const featuredExamCard = homeState?.featuredExamCard ?? {
    examId: profile?.featuredExamState?.examId ?? 'featured-mock-1',
    status: profile?.featuredExamState?.status ?? 'not_started',
  };

  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text selectable style={styles.eyebrow}>
            실전 연결 축
          </Text>
          <Text selectable style={styles.title}>
            대표 모의고사 1세트
          </Text>
          <Text selectable style={styles.body}>
            10문제 체험으로 약점을 찾은 뒤, 대표 실전 세트에서 같은 약점이 실제로
            어떻게 흔들리는지 확인할 수 있게 만들 예정입니다.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text selectable style={styles.cardTitle}>
            현재 준비 상태
          </Text>
          <Text selectable style={styles.statusLabel}>
            {getFeaturedExamStatusLabel(featuredExamCard.status)}
          </Text>
          <Text selectable style={styles.cardBody}>
            시험 풀이 화면과 오답 복기 연결은 다음 단계에서 붙일 예정입니다. 지금은 허브
            카드와 사용자 상태 구조가 먼저 준비돼 있습니다.
          </Text>
          <BrandButton
            title="학습 허브로 돌아가기"
            variant="neutral"
            onPress={() => router.replace('/quiz')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
    paddingBottom: BrandSpacing.xxl,
    gap: BrandSpacing.md,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#F7FBF6',
    padding: BrandSpacing.xl,
    gap: BrandSpacing.sm,
  },
  eyebrow: {
    ...BrandTypography.meta,
    color: BrandColors.primarySoft,
  },
  title: {
    ...BrandTypography.screenTitle,
    color: BrandColors.text,
  },
  body: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  statusCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FFFFFF',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  cardTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  statusLabel: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.primarySoft,
  },
  cardBody: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
});
