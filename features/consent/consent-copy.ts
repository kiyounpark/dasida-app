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
  // 초안에 없던 줄(10.02 줄 0 리뷰로 생김) — 서버 저장이 실패하면 넘어가지 않고 이 줄을 띄운다. target-student 검토 전
  saveFailed: '저장 못 했어. 인터넷 연결 확인하고 다시 눌러줘',

  // 계정 관리 > 를 눌렀을 때 — 동의 화면처럼 반말(10.02 target-student: 존댓말 창 + 빨간 삭제가
  // "동의 안 하면 다 지워진다"로 읽혔다). 그냥 나가는 길이 로그아웃이라는 걸 본문 한 줄로 먼저 말한다.
  // 로그아웃은 노트를 안 지운다(firebase-auth-client signOut — 동의 사본만 지움). 프로필 탈퇴 창은 합니다체 그대로.
  accountManageTitle: '계정 관리',
  accountManageBody: '동의 안 하고 나가려면 로그아웃을 눌러. 노트는 안 지워져.',
  signOut: '로그아웃',
  deleteAccount: '계정 삭제',
  cancel: '취소',
  deleteConfirmTitle: '정말 계정을 삭제할까?',
  deleteConfirmBody: '노트랑 복습 기록이 전부 지워지고\n되돌릴 수 없어.',
  deleteConfirmAction: '삭제',
  deleteFailedPrefix: '탈퇴에 실패했습니다.',
  genericError: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const;
