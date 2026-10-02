import { Alert } from 'react-native';

import { CONSENT_COPY } from '../consent-copy';

/**
 * 동의 화면의 「계정 관리 >」 — 로그아웃 / 계정 삭제 (1.0.11 1줄).
 * 처리는 프로필과 같은 provider의 signOut·deleteAccount. 확인 문구도 프로필 탈퇴 창과 같은 말이다.
 * 프로필의 확인 창(DeleteAccountConfirmModal)은 그 파일 밖으로 안 나와 있어 같은 말을 Alert로 띄운다.
 */
export function openAccountManageAlert(actions: {
  onSignOut: () => void;
  onDeleteAccount: () => void;
}) {
  Alert.alert(CONSENT_COPY.accountManageTitle, undefined, [
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
