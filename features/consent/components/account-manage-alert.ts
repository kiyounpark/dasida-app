import { Alert } from 'react-native';

import { CONSENT_COPY } from '../consent-copy';

/**
 * 동의 화면의 「계정 관리 >」 — 로그아웃 / 계정 삭제 (1.0.11 1줄).
 * 처리는 프로필과 같은 provider의 signOut·deleteAccount. 문구는 동의 화면처럼 반말(consent-copy).
 * 프로필의 확인 창(DeleteAccountConfirmModal)은 그 파일 밖으로 안 나와 있어 Alert로 따로 띄운다.
 */
export function openAccountManageAlert(actions: {
  onSignOut: () => void;
  onDeleteAccount: () => void;
}) {
  Alert.alert(CONSENT_COPY.accountManageTitle, CONSENT_COPY.accountManageBody, [
    { text: CONSENT_COPY.signOut, onPress: actions.onSignOut },
    {
      text: CONSENT_COPY.deleteAccount,
      style: 'destructive',
      onPress: () => openDeleteAccountConfirm(actions.onDeleteAccount),
    },
    { text: CONSENT_COPY.cancel, style: 'cancel' },
  ]);
}

function openDeleteAccountConfirm(onConfirm: () => void) {
  Alert.alert(CONSENT_COPY.deleteConfirmTitle, CONSENT_COPY.deleteConfirmBody, [
    { text: CONSENT_COPY.cancel, style: 'cancel' },
    { text: CONSENT_COPY.deleteConfirmAction, style: 'destructive', onPress: onConfirm },
  ]);
}
