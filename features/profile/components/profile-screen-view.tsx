import { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Constants from 'expo-constants';

import { useIsTablet } from '@/hooks/use-is-tablet';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
import { LEGAL_URLS } from '@/constants/legal-urls';
import { BrandTypography } from '@/constants/typography';
import type { UseProfileScreenResult } from '@/features/profile/hooks/use-profile-screen';

function maskAccountKey(accountKey: string) {
  if (accountKey.length <= 18) {
    return accountKey;
  }

  return `${accountKey.slice(0, 12)}...${accountKey.slice(-4)}`;
}

function formatProviderLabel(provider: 'anonymous' | 'apple' | 'google') {
  switch (provider) {
    case 'apple':
      return 'Apple';
    case 'google':
      return 'Google';
    default:
      return '익명';
  }
}

function DeleteAccountConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopBand} />
          <Text selectable style={styles.modalTitle}>
            정말 탈퇴하시겠어요?
          </Text>
          <Text selectable style={styles.modalBody}>
            모든 학습 기록이 삭제되며{'\n'}복구할 수 없습니다.
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [styles.modalCancelButton, pressed && { opacity: 0.75 }]}
              onPress={onCancel}
              accessibilityRole="button">
              <Text style={styles.modalCancelLabel}>취소</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalConfirmButton, pressed && { opacity: 0.82 }]}
              onPress={onConfirm}
              accessibilityRole="button">
              <Text style={styles.modalConfirmLabel}>탈퇴</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SecondaryNotice({
  tone,
  message,
}: {
  tone: 'error' | 'success';
  message: string;
}) {
  return (
    <View
      style={[
        styles.noticeCard,
        tone === 'error' ? styles.noticeCardError : styles.noticeCardSuccess,
      ]}>
      <Text
        selectable
        style={[
          styles.noticeText,
          tone === 'error' ? styles.noticeTextError : styles.noticeTextSuccess,
        ]}>
        {message}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  subtle = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  subtle?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        subtle && styles.actionButtonSubtle,
        disabled && styles.actionButtonDisabled,
        pressed && !disabled && styles.actionButtonPressed,
      ]}>
      <Text
        selectable
        style={[
          styles.actionButtonText,
          subtle && styles.actionButtonTextSubtle,
          disabled && styles.actionButtonTextDisabled,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ProfileScreenView({
  busyAction,
  errorMessage,
  gradeOptions,
  homeState,
  isDevBuild,
  isGuestDevSession,
  isReady,
  manualImportCandidate,
  noticeMessage,
  onDeleteAccount,
  onGoToOnboarding,
  onImportLocalHistory,
  onPullReviewDueDates,
  onResetLocalProfile,
  onSeedPreview,
  onSignIn,
  onSignOut,
  onUpdateGrade,
  previewStates,
  profile,
  session,
  supportedAuthProviders,
}: UseProfileScreenResult) {
  const isTablet = useIsTablet();
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  return (
    <View style={styles.screen}>
      <DeleteAccountConfirmModal
        visible={deleteConfirmVisible}
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
          setDeleteConfirmVisible(false);
          void onDeleteAccount();
        }}
      />
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.container, isTablet && styles.tabletContainer]}>
        <View style={styles.heroCard}>
          <Text selectable style={styles.title}>
            설정
          </Text>
          <Text selectable style={styles.subtitle}>
            {isGuestDevSession
              ? '개발용 익명 세션에서 로컬 학습 상태와 로그인 전환을 확인합니다.'
              : '연결된 계정, 학년 설정, 이 기기 기록 가져오기를 관리합니다.'}
          </Text>
        </View>

        {errorMessage ? <SecondaryNotice tone="error" message={errorMessage} /> : null}
        {noticeMessage ? <SecondaryNotice tone="success" message={noticeMessage} /> : null}

        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            현재 학습자 상태
          </Text>
          {isReady && session && profile ? (
            <View style={styles.infoList}>
              <Text selectable style={styles.body}>
                세션 상태: {session.status}
              </Text>
              <Text selectable style={styles.body}>
                계정 키: {maskAccountKey(session.accountKey)}
              </Text>
              <Text selectable style={styles.body}>
                로그인 방식: {isGuestDevSession ? '개발용 익명' : formatProviderLabel(session.provider)}
              </Text>
              {session.status === 'authenticated' && session.email ? (
                <Text selectable style={styles.body}>
                  계정 이메일: {session.email}
                </Text>
              ) : null}
              <Text selectable style={styles.body}>
                허브 히어로: {homeState?.hero ?? '준비 중'}
              </Text>
            </View>
          ) : (
            <Text selectable style={styles.body}>
              학습자 상태를 불러오는 중입니다.
            </Text>
          )}
        </View>

        {session?.status === 'authenticated' ? (
          <View style={styles.card}>
            <Text selectable style={styles.cardTitle}>
              계정 관리
            </Text>

            <View style={styles.accountInfoRow}>
              <View style={styles.providerBadge}>
                <Text selectable style={styles.providerBadgeText}>
                  {formatProviderLabel(session.provider)}
                </Text>
              </View>
              {session.email ? (
                <Text selectable style={styles.accountEmail} numberOfLines={1}>
                  {session.email}
                </Text>
              ) : null}
            </View>

            {manualImportCandidate ? (
              <View style={styles.importCard}>
                <Text selectable style={styles.importTitle}>
                  자동으로 옮기지 못한 이 기기 기록
                </Text>
                <Text selectable style={styles.body}>
                  아직 계정으로 옮기지 않은 학습 기록 {manualImportCandidate.recordCount}건이 남아
                  있습니다.
                </Text>
                <ActionButton
                  label={
                    busyAction === 'import'
                      ? '가져오는 중...'
                      : '이 기기의 로컬 기록 가져오기'
                  }
                  disabled={busyAction !== null}
                  onPress={() => void onImportLocalHistory()}
                />
              </View>
            ) : null}

            <ActionButton
              label={busyAction === 'sign-out' ? '로그아웃 중...' : '로그아웃'}
              disabled={busyAction !== null}
              subtle
              onPress={() => void onSignOut()}
            />

            <View style={styles.deleteAccountSection}>
              <Text selectable style={styles.deleteAccountDescription}>
                탈퇴하면 모든 학습 기록이 영구적으로 삭제됩니다.
              </Text>
              <Pressable
                disabled={busyAction !== null}
                onPress={() => setDeleteConfirmVisible(true)}
                style={({ pressed }) => [
                  styles.deleteAccountLink,
                  (pressed || busyAction !== null) && { opacity: 0.48 },
                ]}>
                <Text selectable style={styles.deleteAccountLinkText}>
                  {busyAction === 'delete-account' ? '탈퇴 처리 중...' : '회원 탈퇴'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            학년 설정
          </Text>
          <View style={styles.chipWrap}>
            {gradeOptions.map((option) => {
              const isSelected = profile?.grade === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => void onUpdateGrade(option.value)}>
                  <Text selectable style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text selectable style={styles.cardTitle}>
            앱 정보
          </Text>
          <Text selectable style={styles.body}>
            버전 {Constants.expoConfig?.version ?? '—'}
          </Text>
          <ActionButton
            label="개인정보처리방침"
            onPress={() => void Linking.openURL(LEGAL_URLS.privacyPolicy)}
          />
        </View>

        {isDevBuild ? (
          <View style={styles.card}>
            <Text selectable style={styles.cardTitle}>
              소셜 로그인 테스트
            </Text>
            <Text selectable style={styles.body}>
              {isGuestDevSession
                ? '개발용 익명 세션에서 실제 로그인 전환을 다시 확인할 수 있습니다.'
                : '지금은 로그인된 계정 세션입니다. 다시 테스트하려면 로그아웃 후 개발용 익명으로 계속으로 돌아오세요.'}
            </Text>
            {isGuestDevSession && supportedAuthProviders.length > 0 ? (
              <View style={styles.authButtonList}>
                {supportedAuthProviders.map((provider) => (
                  <ActionButton
                    key={provider}
                    label={
                      busyAction === provider
                        ? `${formatProviderLabel(provider)} 로그인 중...`
                        : `${formatProviderLabel(provider)}로 로그인`
                    }
                    disabled={busyAction !== null}
                    onPress={() => void onSignIn(provider)}
                  />
                ))}
              </View>
            ) : isGuestDevSession ? (
              <Text selectable style={styles.body}>
                현재 빌드에는 테스트할 소셜 로그인 제공자가 설정되어 있지 않습니다.
              </Text>
            ) : null}
            <ActionButton
              label={
                busyAction === 'sign-out'
                  ? isGuestDevSession
                    ? '로그인 게이트로 이동 중...'
                    : '로그아웃 중...'
                  : isGuestDevSession
                    ? '로그인 게이트로 돌아가기'
                    : '로그아웃하고 로그인 게이트로 이동'
              }
              disabled={busyAction !== null}
              subtle
              onPress={() => void onSignOut()}
            />
          </View>
        ) : null}

        {isDevBuild ? (
          <View style={styles.card}>
            <Text selectable style={styles.cardTitle}>
              온보딩
            </Text>
            <Text selectable style={styles.body}>
              닉네임과 학년을 입력하는 온보딩 화면으로 이동합니다.
            </Text>
            <ActionButton
              label="온보딩 화면으로 이동"
              onPress={onGoToOnboarding}
            />
          </View>
        ) : null}

        {isDevBuild ? (
          <View style={[styles.card, styles.devCard]}>
            <Text selectable style={styles.devLabel}>
              개발용 상태 미리보기
            </Text>
            <Text selectable style={styles.body}>
              {isGuestDevSession
                ? '익명 로컬 모드에서 허브 히어로와 리뷰 상태를 빠르게 전환합니다.'
                : '이 도구는 로그인된 계정 데이터를 건드리지 않기 위해 개발용 익명 세션에서만 실행됩니다.'}
            </Text>
            {isGuestDevSession ? (
              <>
                <View style={styles.previewList}>
                  {previewStates.map((preview) => (
                    <ActionButton
                      key={preview.value}
                      label={preview.label}
                      subtle
                      disabled={busyAction !== null}
                      onPress={() => void onSeedPreview(preview.value)}
                    />
                  ))}
                </View>
                <ActionButton
                  label={
                    busyAction === 'pull-review-dates'
                      ? '날짜 당기는 중...'
                      : '복습 날짜 당기기'
                  }
                  disabled={busyAction !== null}
                  subtle
                  onPress={() => void onPullReviewDueDates()}
                />
                <ActionButton
                  label={busyAction === 'reset-local' ? '초기화 중...' : '로컬 상태 초기화'}
                  disabled={busyAction !== null}
                  subtle
                  onPress={() => void onResetLocalProfile()}
                />
              </>
            ) : (
              <View style={styles.devHintCard}>
                <Text selectable style={styles.devHintTitle}>
                  로그인 후에도 카드가 사라지지 않게 유지했습니다.
                </Text>
                <Text selectable style={styles.body}>
                  미리보기를 다시 쓰려면 로그아웃 후 sign-in 화면에서 `개발용 익명으로 계속`을 선택하면 됩니다.
                </Text>
              </View>
            )}
          </View>
        ) : null}
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
    backgroundColor: '#FAFCF8',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.xs,
  },
  title: {
    ...BrandTypography.screenTitle,
    color: BrandColors.text,
  },
  subtitle: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  card: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    backgroundColor: '#fff',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.sm,
  },
  cardTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  body: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  infoList: {
    gap: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BrandSpacing.xs,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#F7FAF6',
  },
  chipSelected: {
    borderColor: BrandColors.primarySoft,
    backgroundColor: BrandColors.primarySoft,
  },
  chipText: {
    ...BrandTypography.chip,
    color: BrandColors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  authButtonList: {
    gap: BrandSpacing.xs,
  },
  actionButton: {
    borderRadius: BrandRadius.md,
    backgroundColor: BrandColors.primarySoft,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  actionButtonSubtle: {
    backgroundColor: '#F4F6F3',
  },
  actionButtonDisabled: {
    backgroundColor: '#E6ECE4',
  },
  actionButtonPressed: {
    opacity: 0.82,
  },
  actionButtonText: {
    ...BrandTypography.button,
    color: '#FFFFFF',
  },
  actionButtonTextSubtle: {
    color: BrandColors.primaryDark,
  },
  actionButtonTextDisabled: {
    color: BrandColors.disabled,
  },
  noticeCard: {
    borderRadius: BrandRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noticeCardError: {
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F5C4C4',
  },
  noticeCardSuccess: {
    backgroundColor: '#F0FAF2',
    borderWidth: 1,
    borderColor: '#BDE3C3',
  },
  noticeText: {
    ...BrandTypography.body,
  },
  noticeTextError: {
    color: BrandColors.danger,
  },
  noticeTextSuccess: {
    color: BrandColors.success,
  },
  accountInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BrandSpacing.xs,
  },
  providerBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: '#EEF4EC',
  },
  providerBadgeText: {
    ...BrandTypography.chip,
    color: BrandColors.primaryDark,
  },
  accountEmail: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
    flexShrink: 1,
  },
  deleteAccountSection: {
    marginTop: 4,
    paddingTop: BrandSpacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BrandColors.border,
    gap: 6,
  },
  deleteAccountDescription: {
    ...BrandTypography.meta,
    color: BrandColors.mutedText,
  },
  deleteAccountLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  deleteAccountLinkText: {
    ...BrandTypography.meta,
    color: BrandColors.danger,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(214, 69, 69, 0.35)',
  },
  importCard: {
    gap: BrandSpacing.xs,
    padding: BrandSpacing.md,
    borderRadius: BrandRadius.md,
    backgroundColor: '#F8FBF7',
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  importTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  devHintCard: {
    gap: BrandSpacing.xs,
    padding: BrandSpacing.md,
    borderRadius: BrandRadius.md,
    backgroundColor: '#F8FBF7',
    borderWidth: 1,
    borderColor: BrandColors.border,
  },
  devHintTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  devCard: {
    borderStyle: 'dashed',
  },
  devLabel: {
    ...BrandTypography.meta,
    color: BrandColors.primarySoft,
    letterSpacing: 0.2,
  },
  previewList: {
    gap: BrandSpacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    paddingHorizontal: BrandSpacing.xl,
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 40, 32, 0.28)',
  },
  modalCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: BrandColors.background,
    padding: BrandSpacing.lg,
    gap: BrandSpacing.md,
    boxShadow: '0 20px 42px rgba(24, 32, 25, 0.16)',
  },
  modalTopBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: BrandColors.danger,
  },
  modalTitle: {
    marginTop: BrandSpacing.xs,
    ...BrandTypography.sectionTitle,
    color: BrandColors.text,
  },
  modalBody: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  modalActions: {
    gap: BrandSpacing.xs,
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: BrandColors.border,
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: '#F4F6F3',
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelLabel: {
    ...BrandTypography.button,
    color: BrandColors.primaryDark,
  },
  modalConfirmButton: {
    borderRadius: BrandRadius.sm,
    borderCurve: 'continuous',
    backgroundColor: BrandColors.danger,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalConfirmLabel: {
    ...BrandTypography.button,
    color: '#FFFFFF',
  },
  tabletContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
});
