import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/brand/BrandHeader';
import { BrandColors, BrandRadius, BrandSpacing } from '@/constants/brand';
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
  isAnonymousSession,
  isImporting,
  isReady,
  manualImportCandidate,
  migrationPrompt,
  noticeMessage,
  previewStates,
  profile,
  session,
  showAuthSection,
  supportedAuthProviders,
  onCloseMigrationPrompt,
  onConfirmMigrationPrompt,
  onImportLocalHistory,
  onResetLocalProfile,
  onSeedPreview,
  onSignIn,
  onSignOut,
  onUpdateGrade,
}: UseProfileScreenResult) {
  return (
    <View style={styles.screen}>
      <BrandHeader compact />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text selectable style={styles.title}>
            설정
          </Text>
          <Text selectable style={styles.subtitle}>
            익명 사용자는 이 기기 로컬 저장만 사용하고, 로그인 사용자는 계정 서버 기록을
            사용합니다.
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
                로그인 방식: {formatProviderLabel(session.provider)}
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

        {showAuthSection ? (
          <View style={styles.card}>
            <Text selectable style={styles.cardTitle}>
              계정 연결
            </Text>
            {session?.status === 'authenticated' ? (
              <>
                <Text selectable style={styles.body}>
                  서버 기록과 여러 기기 동기화가 켜져 있습니다. 로그아웃하면 새 익명 세션으로
                  전환됩니다.
                </Text>
                {manualImportCandidate ? (
                  <View style={styles.importCard}>
                    <Text selectable style={styles.importTitle}>
                      이 기기의 로컬 기록 가져오기
                    </Text>
                    <Text selectable style={styles.body}>
                      아직 계정으로 옮기지 않은 학습 기록 {manualImportCandidate.recordCount}건이
                      남아 있습니다.
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
              </>
            ) : (
              <>
                <Text selectable style={styles.body}>
                  로그인하면 학습 기록이 계정 서버에 저장되고, 다른 기기에서도 이어서 볼 수
                  있습니다.
                </Text>
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
              </>
            )}
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

        {isAnonymousSession ? (
          <View style={[styles.card, styles.devCard]}>
            <Text selectable style={styles.devLabel}>
              개발용 상태 미리보기
            </Text>
            <Text selectable style={styles.body}>
              익명 로컬 모드에서 허브 히어로와 리뷰 상태를 빠르게 전환합니다.
            </Text>
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
              label={busyAction === 'reset-local' ? '초기화 중...' : '로컬 상태 초기화'}
              disabled={busyAction !== null}
              subtle
              onPress={() => void onResetLocalProfile()}
            />
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(migrationPrompt)} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text selectable style={styles.modalTitle}>
              기록 가져오기
            </Text>
            <Text selectable style={styles.modalBody}>
              {migrationPrompt
                ? `이 기기의 학습 기록 ${migrationPrompt.recordCount}건을 계정에 저장할까요?`
                : ''}
            </Text>
            <View style={styles.modalActions}>
              <ActionButton
                label="나중에"
                disabled={isImporting}
                subtle
                onPress={onCloseMigrationPrompt}
              />
              <ActionButton
                label={isImporting ? '저장 중...' : '저장하기'}
                disabled={isImporting}
                onPress={() => void onConfirmMigrationPrompt()}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(18, 24, 19, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: BrandSpacing.lg,
  },
  modalCard: {
    borderRadius: BrandRadius.lg,
    backgroundColor: '#FFFFFF',
    padding: BrandSpacing.lg,
    gap: BrandSpacing.md,
  },
  modalTitle: {
    ...BrandTypography.cardTitle,
    color: BrandColors.text,
  },
  modalBody: {
    ...BrandTypography.body,
    color: BrandColors.mutedText,
  },
  modalActions: {
    gap: BrandSpacing.xs,
  },
});
