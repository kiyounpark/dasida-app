import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/brand/BrandHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, BrandSpacing } from '@/constants/brand';
import { BrandTypography } from '@/constants/typography';
import { PeerPresenceStrip } from '@/features/learning/components/peer-presence-strip';
import type { UseQuizHubScreenResult } from '@/features/quiz/hooks/use-quiz-hub-screen';

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

function getSessionLabel(status: 'anonymous' | 'authenticated') {
  return status === 'anonymous' ? '로컬 익명 프로필' : '연결된 학습자';
}

function getActivityKindLabel(kind: 'diagnostic' | 'review' | 'exam') {
  switch (kind) {
    case 'diagnostic':
      return '진단';
    case 'review':
      return '복습';
    case 'exam':
      return '실전';
  }
}

type MetaChipProps = {
  label: string;
};

function MetaChip({ label }: MetaChipProps) {
  return (
    <View style={styles.metaChip}>
      <Text selectable style={styles.metaChipText}>
        {label}
      </Text>
    </View>
  );
}

type SupportCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  iconName: 'book.fill' | 'clock.fill';
  disabled?: boolean;
  onPress?: () => void;
  stacked?: boolean;
};

function SupportCard({
  eyebrow,
  title,
  body,
  ctaLabel,
  iconName,
  disabled = false,
  onPress,
  stacked = false,
}: SupportCardProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.supportCard,
        stacked && styles.supportCardStacked,
        disabled && styles.supportCardDisabled,
        pressed && !disabled && styles.supportCardPressed,
      ]}>
      <View style={styles.supportCardTopRow}>
        <View style={styles.supportCardIconWrap}>
          <IconSymbol name={iconName} size={18} color={BrandColors.primaryDark} />
        </View>
        <Text selectable style={styles.supportCardEyebrow}>
          {eyebrow}
        </Text>
      </View>
      <Text selectable style={styles.supportCardTitle}>
        {title}
      </Text>
      <Text selectable style={styles.supportCardBody}>
        {body}
      </Text>
      <Text
        selectable
        style={[styles.supportCardCta, disabled && styles.supportCardCtaDisabled]}>
        {ctaLabel}
      </Text>
    </Pressable>
  );
}

export function QuizHubScreenView({
  authNoticeMessage,
  homeState,
  isCompactLayout,
  isReady,
  onDismissAuthNotice,
  onOpenExams,
  onOpenPractice,
  onOpenRecentResult,
  onRefresh,
  onStartDiagnostic,
  profile,
  session,
}: UseQuizHubScreenResult) {

  if (!isReady) {
    return (
      <View style={styles.screen}>
        <BrandHeader compact />
        <View style={styles.loadingWrap}>
          <View style={styles.loadingCard}>
            <Text selectable style={styles.loadingTitle}>
              학습 허브를 준비 중이에요
            </Text>
            <Text selectable style={styles.loadingBody}>
              지금 할 일과 최근 학습 흐름을 불러오고 있습니다.
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
            <Text selectable style={styles.loadingTitle}>
              허브 상태를 다시 불러와야 해요
            </Text>
            <Text selectable style={styles.loadingBody}>
              현재 학습자 상태를 완전히 복원하지 못했습니다. 한 번 더 불러오면 대부분
              바로 해결됩니다.
            </Text>
            <Pressable style={styles.retryButton} onPress={() => void onRefresh()}>
              <Text selectable style={styles.retryButtonText}>
                다시 불러오기
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const isReviewHero = homeState.hero === 'review';

  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.headerBlock}>
          <Text selectable style={styles.headerEyebrow}>
            DASIDA
          </Text>
          <Text
            selectable
            style={[styles.headerTitle, isCompactLayout && styles.headerTitleCompact]}>
            틀린 문제 정리, 쉽게.
          </Text>
          <View style={styles.metaRow}>
            <MetaChip label={formatGradeLabel(profile.grade)} />
            <MetaChip label={getSessionLabel(session.status)} />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.heroCard,
            isReviewHero ? styles.heroCardReview : styles.heroCardDiagnostic,
            pressed && styles.heroCardPressed,
          ]}
          onPress={isReviewHero ? onOpenPractice : onStartDiagnostic}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text selectable style={styles.heroBadgeText}>
                {isReviewHero ? `오늘 복습 ${homeState.todayReviewCount}개` : '가장 쉬운 시작'}
              </Text>
            </View>
            <View style={styles.heroArrowWrap}>
              <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.heroCopy}>
            <Text selectable style={styles.heroTitle}>
              {homeState.heroTitle}
            </Text>
            <Text selectable style={styles.heroBody}>
              {homeState.heroBody}
            </Text>
          </View>
          <View style={styles.heroFooter}>
            <Text selectable style={styles.heroCta}>
              {isReviewHero ? '첫 카드 열기' : '시작하기'}
            </Text>
            <Text selectable style={styles.heroMeta}>
              {homeState.heroMeta}
            </Text>
          </View>
        </Pressable>

        <PeerPresenceStrip state={homeState.peerPresence} />

        {authNoticeMessage ? (
          <View style={styles.noticeCard}>
            <View style={styles.noticeCopy}>
              <Text selectable style={styles.noticeTitle}>
                로그인은 완료됐어요
              </Text>
              <Text selectable style={styles.noticeBody}>
                {authNoticeMessage}
              </Text>
            </View>
            <Pressable onPress={onDismissAuthNotice} style={styles.noticeAction}>
              <Text selectable style={styles.noticeActionText}>
                닫기
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.supportRow, isCompactLayout && styles.supportRowStack]}>
          <SupportCard
            eyebrow="실전 연결"
            title={homeState.featuredExamCard.title}
            body={homeState.featuredExamCard.body}
            ctaLabel={homeState.featuredExamCard.ctaLabel}
            iconName="book.fill"
            onPress={onOpenExams}
            stacked={isCompactLayout}
          />
          <SupportCard
            eyebrow="최근 진단"
            title={homeState.recentResultCard.title}
            body={homeState.recentResultCard.body}
            ctaLabel={homeState.recentResultCard.ctaLabel}
            iconName="clock.fill"
            disabled={!homeState.recentResultCard.enabled}
            onPress={onOpenRecentResult}
            stacked={isCompactLayout}
          />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text selectable style={styles.summaryTitle}>
              최근 학습 기록
            </Text>
            <Text selectable style={styles.summarySubtitle}>
              지금 학습 상태를 한눈에 볼 수 있어요.
            </Text>
          </View>
          {homeState.recentActivity.length > 0 ? (
            <View style={styles.summaryList}>
              {homeState.recentActivity.map((activity) => (
                <View key={activity.id} style={styles.summaryRow}>
                  <View style={styles.summaryRail}>
                    <View style={styles.summaryDot} />
                    <View style={styles.summaryLine} />
                  </View>
                  <View style={styles.summaryContent}>
                    <View style={styles.summaryBadge}>
                      <Text selectable style={styles.summaryBadgeText}>
                        {getActivityKindLabel(activity.kind)}
                      </Text>
                    </View>
                    <Text selectable style={styles.summaryRowTitle}>
                      {activity.title}
                    </Text>
                    <Text selectable style={styles.summaryRowBody}>
                      {activity.subtitle}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.summaryEmptyWrap}>
              <Text selectable style={styles.summaryEmptyTitle}>
                최근 학습 기록이 아직 없습니다
              </Text>
              <Text selectable style={styles.summaryEmptyBody}>
                첫 진단을 시작하면 최근 기록이 여기에 쌓여요.
              </Text>
            </View>
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
    paddingTop: BrandSpacing.lg,
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
    borderColor: '#D8E0D5',
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFFCF7',
    padding: BrandSpacing.xl,
    gap: BrandSpacing.xs,
    boxShadow: '0 18px 32px rgba(28, 44, 25, 0.06)',
  },
  loadingTitle: {
    ...BrandTypography.sectionTitle,
    color: BrandColors.text,
  },
  loadingBody: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: BrandSpacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: BrandColors.primary,
  },
  retryButtonText: {
    ...BrandTypography.button,
    color: '#FFFFFF',
  },
  headerBlock: {
    gap: BrandSpacing.xs,
    paddingTop: BrandSpacing.xs,
  },
  headerEyebrow: {
    ...BrandTypography.meta,
    letterSpacing: 0.8,
    color: BrandColors.primarySoft,
  },
  headerTitle: {
    ...BrandTypography.screenTitle,
    color: '#203123',
  },
  headerTitleCompact: {
    fontSize: 25,
    lineHeight: 33,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BrandSpacing.xs,
    marginTop: 2,
  },
  metaChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDE6DB',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  metaChipText: {
    ...BrandTypography.chip,
    color: BrandColors.primaryDark,
  },
  heroCard: {
    overflow: 'hidden',
    minHeight: 270,
    borderRadius: 32,
    borderCurve: 'continuous',
    padding: BrandSpacing.xl,
    gap: BrandSpacing.lg,
    boxShadow: '0 24px 38px rgba(27, 43, 24, 0.12)',
  },
  heroCardDiagnostic: {
    backgroundColor: '#294030',
  },
  heroCardReview: {
    backgroundColor: '#31503A',
  },
  heroCardPressed: {
    opacity: 0.96,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroBadgeText: {
    ...BrandTypography.chip,
    color: 'rgba(255,255,255,0.84)',
    letterSpacing: 0.2,
  },
  heroArrowWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroCopy: {
    gap: BrandSpacing.sm,
  },
  heroTitle: {
    maxWidth: '84%',
    ...BrandTypography.heroTitle,
    color: '#FFFFFF',
  },
  heroBody: {
    maxWidth: '90%',
    ...BrandTypography.body,
    color: 'rgba(255,255,255,0.88)',
  },
  heroFooter: {
    marginTop: 'auto',
    gap: 6,
  },
  heroCta: {
    ...BrandTypography.button,
    color: '#FFFFFF',
  },
  heroMeta: {
    ...BrandTypography.meta,
    color: 'rgba(255,255,255,0.72)',
  },
  supportRow: {
    flexDirection: 'row',
    gap: BrandSpacing.md,
  },
  supportRowStack: {
    flexDirection: 'column',
  },
  supportCard: {
    flex: 1,
    minHeight: 158,
    borderWidth: 1,
    borderColor: '#DDDCD2',
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFFCF8',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
    boxShadow: '0 18px 30px rgba(29, 42, 24, 0.06)',
  },
  supportCardStacked: {
    minHeight: 146,
  },
  supportCardPressed: {
    backgroundColor: '#FBF7F1',
  },
  supportCardDisabled: {
    backgroundColor: '#F1EFE8',
    borderColor: '#E2DFD6',
  },
  supportCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supportCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3EA',
  },
  supportCardEyebrow: {
    ...BrandTypography.meta,
    color: BrandColors.primarySoft,
  },
  supportCardTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  supportCardBody: {
    flex: 1,
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  supportCardCta: {
    ...BrandTypography.button,
    color: BrandColors.primarySoft,
  },
  supportCardCtaDisabled: {
    color: '#98A198',
  },
  noticeCard: {
    borderWidth: 1,
    borderColor: '#D8E5D6',
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#F5FAF3',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
  },
  noticeCopy: {
    gap: 4,
  },
  noticeTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.primaryDark,
  },
  noticeBody: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  noticeAction: {
    alignSelf: 'flex-start',
  },
  noticeActionText: {
    ...BrandTypography.button,
    color: BrandColors.primarySoft,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#DDDCD2',
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: '#FFFDF9',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.md,
    boxShadow: '0 18px 30px rgba(29, 42, 24, 0.06)',
  },
  summaryHeader: {
    gap: 4,
  },
  summaryTitle: {
    ...BrandTypography.sectionTitle,
    color: BrandColors.text,
  },
  summarySubtitle: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  summaryList: {
    gap: BrandSpacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: BrandSpacing.sm,
  },
  summaryRail: {
    width: 16,
    alignItems: 'center',
    paddingTop: 8,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: BrandColors.primarySoft,
  },
  summaryLine: {
    marginTop: 6,
    flex: 1,
    width: 1,
    backgroundColor: '#D9E0D4',
  },
  summaryContent: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EAEEE6',
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF3EA',
  },
  summaryBadgeText: {
    ...BrandTypography.tiny,
    color: BrandColors.primarySoft,
  },
  summaryRowTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  summaryRowBody: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
  },
  summaryEmptyWrap: {
    borderWidth: 1,
    borderColor: '#EAEEE6',
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  summaryEmptyTitle: {
    ...BrandTypography.bodyStrong,
    color: BrandColors.text,
  },
  summaryEmptyBody: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
  },
});
