import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand/BrandHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { diagnosisMap } from '@/data/diagnosisMap';
import { useCurrentLearner } from '@/features/learner/provider';
import { useQuizSession } from '@/features/quiz/session';

function formatGradeLabel(grade: 'g1' | 'g2' | 'g3' | 'unknown') {
  switch (grade) {
    case 'g1':
      return '고1';
    case 'g2':
      return '고2';
    case 'g3':
      return '고3';
    default:
      return '학년 미설정';
  }
}

function getHeroTitle(hero: 'diagnostic' | 'review') {
  return hero === 'review' ? '오늘의 약점 학습' : '3분 체험 10문제';
}

function getHeroBody(
  hero: 'diagnostic' | 'review',
  reviewWeaknessLabel?: string,
) {
  if (hero === 'review') {
    return reviewWeaknessLabel
      ? `${reviewWeaknessLabel} 약점을 오늘 다시 짧게 점검할 차례예요.`
      : '오늘 다시 볼 약점이 준비돼 있어요.';
  }

  return '빠르게 약점을 찾고, 바로 복습 방향까지 이어지는 첫 체험입니다.';
}

export default function QuizHubScreen() {
  const { isReady, session, profile, homeState, refresh } = useCurrentLearner();
  const { resetSession } = useQuizSession();

  const reviewWeaknessLabel = homeState?.nextReviewTask
    ? diagnosisMap[homeState.nextReviewTask.weaknessId].labelKo
    : undefined;
  const latestWeaknessLabel = homeState?.latestDiagnosticSummary?.topWeaknesses[0]
    ? diagnosisMap[homeState.latestDiagnosticSummary.topWeaknesses[0]].labelKo
    : undefined;

  const handleStartDiagnostic = () => {
    resetSession();
    router.push({
      pathname: '/quiz/diagnostic',
      params: { autostart: '1' },
    });
  };

  const handleOpenPractice = () => {
    const weaknessId = homeState?.nextReviewTask?.weaknessId;
    if (!weaknessId) {
      return;
    }

    router.push({
      pathname: '/quiz/practice',
      params: {
        mode: 'weakness',
        weaknessId,
      },
    });
  };

  const handleOpenRecentResult = () => {
    if (!homeState?.latestDiagnosticSummary) {
      return;
    }

    router.push({
      pathname: '/quiz/result',
      params: { source: 'snapshot' },
    });
  };

  const handleOpenExams = () => {
    router.push('/quiz/exams');
  };

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.loadingWrap}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingTitle}>학습 허브를 준비 중이에요</Text>
            <Text style={styles.loadingBody}>
              현재 학습자 상태를 불러오고 있습니다.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!profile || !homeState || !session) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.loadingWrap}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingTitle}>학습 허브를 다시 불러와야 해요</Text>
            <Text style={styles.loadingBody}>
              현재 학습자 상태를 완전히 복원하지 못했습니다. 한 번 더 불러오면 대부분 바로
              해결됩니다.
            </Text>
            <Pressable style={styles.retryButton} onPress={() => void refresh()}>
              <Text style={styles.retryButtonText}>다시 불러오기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>DASIDA 학습 허브</Text>
          <Text style={styles.headerTitle}>오늘도 약점을 줄여볼까요?</Text>
          <Text style={styles.headerBody}>
            10문제로 빠르게 진단하고, 다시 볼 약점과 실전 연결 흐름을 한 화면에서
            이어갑니다.
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{formatGradeLabel(profile.grade)}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>
                {session.status === 'anonymous' ? '로컬 익명 프로필' : '연결된 학습자'}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.heroCard,
            pressed && styles.heroCardPressed,
          ]}
          onPress={homeState.hero === 'review' ? handleOpenPractice : handleStartDiagnostic}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroEyebrow}>
              {homeState.hero === 'review' ? '오늘 다시 할 일' : '가장 쉬운 시작'}
            </Text>
            <IconSymbol name="chevron.right" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>{getHeroTitle(homeState.hero)}</Text>
          <Text style={styles.heroBody}>
            {getHeroBody(homeState.hero, reviewWeaknessLabel)}
          </Text>
          <View style={styles.heroFooter}>
            <Text style={styles.heroCta}>
              {homeState.hero === 'review' ? '이어하기' : '시작하기'}
            </Text>
            {homeState.hero === 'review' && homeState.nextReviewTask ? (
              <Text style={styles.heroSubMeta}>
                {homeState.nextReviewTask.stage.toUpperCase()} · {reviewWeaknessLabel}
              </Text>
            ) : (
              <Text style={styles.heroSubMeta}>10문항 · 약 3분</Text>
            )}
          </View>
        </Pressable>

        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryCard,
              styles.halfCard,
              pressed && styles.secondaryCardPressed,
            ]}
            onPress={handleOpenExams}>
            <Text style={styles.secondaryEyebrow}>실전 연결</Text>
            <Text style={styles.secondaryTitle}>대표 모의고사</Text>
            <Text style={styles.secondaryBody}>
              {homeState.featuredExamCard.status === 'in_progress'
                ? '이어 풀 수 있는 실전 세트가 있어요.'
                : homeState.featuredExamCard.status === 'completed'
                  ? '최근에 한 번 마친 실전 세트예요.'
                  : '실전 감각을 붙일 대표 세트를 준비해두었습니다.'}
            </Text>
            <Text style={styles.secondaryLink}>
              {homeState.featuredExamCard.status === 'in_progress' ? '계속 풀기' : '보러가기'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryCard,
              styles.halfCard,
              !homeState.latestDiagnosticSummary && styles.secondaryCardDisabled,
              pressed && homeState.latestDiagnosticSummary && styles.secondaryCardPressed,
            ]}
            disabled={!homeState.latestDiagnosticSummary}
            onPress={handleOpenRecentResult}>
            <Text style={styles.secondaryEyebrow}>최근 진단</Text>
            <Text style={styles.secondaryTitle}>최근 결과</Text>
            <Text style={styles.secondaryBody}>
              {homeState.latestDiagnosticSummary
                ? `${latestWeaknessLabel ?? '진단 결과'} 중심으로 다시 볼 수 있어요.`
                : '아직 저장된 진단 결과가 없어요.'}
            </Text>
            <Text
              style={[
                styles.secondaryLink,
                !homeState.latestDiagnosticSummary && styles.secondaryLinkMuted,
              ]}>
              {homeState.latestDiagnosticSummary ? '결과 보기' : '진단 후 열림'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>최근 학습 요약</Text>
          {homeState.recentActivity.length > 0 ? (
            <View style={styles.summaryList}>
              {homeState.recentActivity.map((activity) => (
                <View key={activity.id} style={styles.summaryRow}>
                  <View style={styles.summaryDot} />
                  <View style={styles.summaryCopy}>
                    <Text style={styles.summaryRowTitle}>{activity.title}</Text>
                    <Text style={styles.summaryRowBody}>{activity.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.summaryEmpty}>최근 학습 기록이 아직 없습니다.</Text>
          )}
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
  loadingWrap: {
    flex: 1,
    paddingHorizontal: BrandSpacing.lg,
    paddingTop: BrandSpacing.md,
  },
  loadingCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FFFFFF',
    padding: BrandSpacing.xl,
    gap: BrandSpacing.xs,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: BrandColors.text,
  },
  loadingBody: {
    fontSize: 15,
    lineHeight: 24,
    color: BrandColors.mutedText,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: BrandSpacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BrandRadius.md,
    backgroundColor: BrandColors.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FAFCF8',
    padding: BrandSpacing.xl,
    gap: BrandSpacing.sm,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primarySoft,
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: BrandColors.text,
    lineHeight: 36,
  },
  headerBody: {
    fontSize: 15,
    lineHeight: 24,
    color: BrandColors.mutedText,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BrandSpacing.xs,
    marginTop: BrandSpacing.xs,
  },
  metaChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EEF5EC',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  heroCard: {
    backgroundColor: BrandColors.primary,
    borderRadius: BrandRadius.lg,
    padding: BrandSpacing.xl,
    gap: BrandSpacing.md,
  },
  heroCardPressed: {
    backgroundColor: BrandColors.primaryDark,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.86)',
  },
  heroFooter: {
    gap: 4,
  },
  heroCta: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSubMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },
  row: {
    flexDirection: 'row',
    gap: BrandSpacing.md,
  },
  halfCard: {
    flex: 1,
  },
  secondaryCard: {
    minHeight: 192,
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FFFFFF',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  secondaryCardPressed: {
    backgroundColor: '#F8FBF7',
  },
  secondaryCardDisabled: {
    backgroundColor: '#F6F8F5',
    borderColor: '#E1E7DE',
  },
  secondaryEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primarySoft,
  },
  secondaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.text,
    lineHeight: 24,
  },
  secondaryBody: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: BrandColors.mutedText,
  },
  secondaryLink: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primarySoft,
  },
  secondaryLinkMuted: {
    color: '#8C978D',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FFFFFF',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.md,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.text,
  },
  summaryList: {
    gap: BrandSpacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: BrandSpacing.sm,
    alignItems: 'flex-start',
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: BrandColors.primarySoft,
    marginTop: 7,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  summaryRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.text,
  },
  summaryRowBody: {
    fontSize: 14,
    lineHeight: 21,
    color: BrandColors.mutedText,
  },
  summaryEmpty: {
    fontSize: 14,
    lineHeight: 22,
    color: BrandColors.mutedText,
  },
});
