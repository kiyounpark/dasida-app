# astra — 1.0.12 빌드 go/no-go (2026-10-06 저녁, gpt-6-astra 98,969토큰)

**빌드 전에 이것만**

**1. 빌드 전 반드시**

- `version`을 **1.0.12로 변경**. 현재 1.0.11이며 runtime도 이 값을 따릅니다. 빌드 번호 자동 증가는 앱 버전을 바꾸지 않습니다. [app.config.js:7](/Users/baggiyun/dev/dasida-app/app.config.js:7) · [eas.json:44](/Users/baggiyun/dev/dasida-app/eas.json:44)
- 아래 **알림→복습 진입 오류를 수정하고 연결 테스트를 통과**시킨 뒤 빌드하세요.
- 지정한 설정·패키지 diff는 비어 있습니다. 이번 변경 때문에 별도 `prebuild --clean`을 할 필요는 없습니다.
- 서버 선배포를 추가할 근거는 발견하지 못했습니다. 운영 배포 상태는 사용자 제공 정보 기준입니다.

**2. 커밋끼리 부딪히는 곳 — 반드시 고칠 것**

**① 한 칸 내림 × ② 놓친 복습 알림: 옛 과제 ID로 들어가면 로딩에서 멈춥니다.**

- 재현 순서: 놓친 day7 알림 수신 → 앱 아이콘으로 홈 진입 → day3으로 내림 → 알림센터의 기존 알림 탭.
- 내림은 ID를 바꾸고 서버에서 옛 문서를 삭제합니다. [review-scheduler.ts:142](/Users/baggiyun/dev/dasida-app/features/learning/review-scheduler.ts:142) · [learning-history.ts:1169](/Users/baggiyun/dev/dasida-app/functions/src/learning-history.ts:1169)
- 알림은 옛 ID로 직행하고, 세션은 ID가 정확히 같은 과제만 찾습니다. 없으면 계속 로딩입니다. [notification-route.ts:12](/Users/baggiyun/dev/dasida-app/features/quiz/notifications/notification-route.ts:12) · [use-review-session-screen.ts:200](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-review-session-screen.ts:200) · [화면:124](/Users/baggiyun/dev/dasida-app/features/quiz/components/review-session-screen-view.tsx:124)
- **실제 스케줄러·라우팅 함수를 메모리에서 실행해 `day3 저장 / day7 조회 null` 확인.** 폰 재현은 하지 않았습니다.
- 수정 조건: 알림 진입에서도 내림을 먼저 마친 뒤 현재 과제로 연결하고, 사라진 ID는 홈으로 복구. 앱 종료·실행 중 진입 모두 검증해야 합니다.

**3. 빌드 뒤·제출 전 폰 확인 — 최소**

- **아이폰:** 실제 사진으로 쪽지·재도전까지 진행 → 노트의 서버 저장 성공 → 지난 노트에서 다시 확인. 사진첩·카메라를 닫은 뒤 `< 홈`도 확인. [저장 경로:229](/Users/baggiyun/dev/dasida-app/features/photo/hooks/use-photo-flow.ts:229)
- **안드:** 새 설치에서 사진 과제가 생긴 뒤 허락 카드 → 시스템 알림 창 → 허용 후 카드 사라짐. 카메라 복귀·상단 겹침·기기 뒤로도 확인. [허락 처리:114](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-notification-opt-in.ts:114)
- **양쪽:** 위 ‘옛 알림’ 순서로 복습 진입 → 완료 → 홈 복귀까지. Dev에서 노트가 안 생긴 원인은 아직 모릅니다.

**4. 제출·초대 전 남은 것**

- **나중·제출 전:** 실제 사진에서 생성된 `retryQuiz`·`concept`가 서버 문서에도 남는지 확인. 화면에 노트가 보이는 것만으로는 부족합니다. [전송 필드:58](/Users/baggiyun/dev/dasida-app/features/photo/cloud/save-note-remote.ts:58)
- **나중·제출:** iOS What's New 작성. Android는 internal 업로드 뒤 프로덕션 승격·검토 전송, 다음 날 제출 활동 확인. [제출 기록:4598](/Users/baggiyun/dev/dasida-app/docs/PROGRESS.md:4598) · [eas.json:14](/Users/baggiyun/dev/dasida-app/eas.json:14)
- **나중·공개일:** 결정대로 두 스토어 공개 확인 후 알림 함수 배포·수신 확인, 영상 초대 시작. ⑴ 화면은 초대 뒤 그대로입니다. [확정 범위:8](/Users/baggiyun/dev/dasida-app/docs/research/2026-10-05-invite-before-review-floor-astra-fable.md:8)
- EAS 잔여 한도는 **미확인**입니다. 빌드 직전 계정 사용량에서 확인하세요.

파일 수정 없음. 전체 테스트는 재실행하지 않았으며, 시작·완료 Slack 알림은 네트워크 오류로 실패했습니다.
