import {
  REVIEW_PHOTO_RETENTION_DAYS,
  type ConsentKind,
} from '@/functions/src/photo-store-contract';

/**
 * 동의 화면 문구 — 한 곳에 모은다 (1.0.11 1줄, lanes 초안 🔒 10.02 오후).
 * [선택] 줄은 10.02 기윤 확정: "(30일 뒤 지워)" → "(30일 뒤 삭제)" — 주어 없는 "지워"가
 * "내 노트가 지워지나?"나 시키는 말로 읽혔다(target-student).
 * 줄 순서·[필수]/[선택]은 약속 파일 CONSENT_KINDS·CONSENT_REQUIRED가 정한다 — 여기엔 글만.
 * 30은 버킷 수명 규칙·방침과 같은 숫자(REVIEW_PHOTO_RETENTION_DAYS)에서 온다.
 */
export const CONSENT_COPY = {
  all: '전체 동의',
  requiredTag: '[필수]',
  optionalTag: '[선택]',
  kinds: {
    analysis: '사진을 분석하려고 다시다 서버·OpenAI(미국)로 보내',
    store: '내 노트, 계정에 저장 — 다른 폰·아이패드에서도 보여',
    review: `내 사진으로 분석 정확도 높이기 (${REVIEW_PHOTO_RETENTION_DAYS}일 뒤 삭제)`,
  } satisfies Record<ConsentKind, string>,
  next: '다음',
  accountManage: '계정 관리 >',

  // 계정 관리 > 를 눌렀을 때 — 프로필의 로그아웃·탈퇴와 같은 말
  accountManageTitle: '계정 관리',
  signOut: '로그아웃',
  deleteAccount: '계정 삭제',
  cancel: '취소',
  deleteConfirmTitle: '정말 탈퇴하시겠어요?',
  deleteConfirmBody: '모든 학습 기록이 삭제되며\n복구할 수 없습니다.',
  deleteConfirmAction: '탈퇴',
  deleteFailedPrefix: '탈퇴에 실패했습니다.',
  genericError: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const;
