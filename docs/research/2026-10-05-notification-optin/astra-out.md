**Q0. 가를 권합니다. ②를 작게 끝내고 1.0.12 제출 → 두 스토어 공개 → 앱 초대. ⑴은 심사를 기다리는 동안 바로 착수하세요.**

②는 이름이 정해진 사진 노트에만 도움이 됩니다. 이름 없는 노트는 과제 생성 조건을 통과하지 못하고, 알림도 과제가 있어야 갑니다. **②를 ‘사진 학생 전체의 재방문 대책’으로 보면 안 됩니다.** [use-photo-flow.ts:254](/Users/baggiyun/dev/dasida-app/features/photo/hooks/use-photo-flow.ts:254) · [send-review-reminders.ts:49](/Users/baggiyun/dev/dasida-app/functions/src/send-review-reminders.ts:49)

그래도 ⑴을 출시 조건으로 붙이지 않겠습니다. 가까운 관문은 **앱에서 다른 날 두 번째 사진을 올린 학생 3명, 현재 0명**입니다(사용자 제공 수치·문서 기록이며 운영 재집계는 안 함). 복습 화면의 완성과 두 번째 사진 업로드는 별개이고, 현재 자료로는 ⑴의 효과가 초대 지연을 상쇄한다고 판단할 수 없습니다. [초대 검토:34](/Users/baggiyun/dev/dasida-app/docs/research/2026-10-05-invite-before-review-floor-astra-fable.md:34)

이름이 붙는 **운영 비율은 모릅니다.** 통역표의 칸 비율을 학생 비율로 바꿔 말할 수 없습니다. 반면 저장 재료와 서버 준비는 끝났고, ⑴에는 아직 화면 작업과 기윤의 대사 검수가 남아 있습니다. 그래서 **먼저 제출하고, 다음 개발은 ⑴**이라는 판단입니다. [STATUS.md:13](/Users/baggiyun/dev/dasida-app/docs/STATUS.md:13) · [설계:78](/Users/baggiyun/dev/dasida-app/docs/research/2026-10-04-review-floor-design.md:78)

**답이 바뀌는 조건:** ⑴의 대사·구현·검증까지 마쳐도 ②만 넣는 안과 제출일이 같다면 나로 바꿉니다. 지금 그 소요 시간은 모릅니다.

**Q1. 홈에 저장된 「내일 복습」 카드가 처음 보일 때, 그 아래에서 묻겠습니다.**

노트는 먼저 표시되고 과제 저장은 별도로 실패할 수 있습니다. 홈의 다음 복습 카드는 저장된 과제가 있을 때만 나오므로, 실제 일정에 붙여 안내할 수 있습니다. [use-photo-flow.ts:236](/Users/baggiyun/dev/dasida-app/features/photo/hooks/use-photo-flow.ts:236) · [no-review-day-card.tsx:54](/Users/baggiyun/dev/dasida-app/features/quiz/components/no-review-day-card.tsx:54)

제안 문구는 **“내일 복습할 때 알려드릴게요.” → [알림 켜기] [나중에]**입니다. **[알림 켜기]를 눌러야 시스템 창**을 띄웁니다. 기존 훅도 버튼에서 권한을 요청하므로 이 흐름을 재사용합니다. [use-notification-opt-in.ts:128](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-notification-opt-in.ts:128)

조건은 ‘약점 있음’ 대신 **‘저장된 미완료 복습 과제 있음’**으로 잡습니다. 그러면 ⑴ 출시 뒤 이름 없는 과제에도 같은 안내를 쓸 수 있습니다. 이미 허용했으면 등록만, 거절했으면 자동 재요청 없이 설정 진입만 제공합니다. ‘나중에’ 선택도 기억해 홈을 열 때마다 묻지 않도록 합니다. 현재 선택은 컴포넌트 상태에만 남습니다. [use-notification-opt-in.ts:96](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-notification-opt-in.ts:96) · [동 파일:142](/Users/baggiyun/dev/dasida-app/features/quiz/hooks/use-notification-opt-in.ts:142)

**Q2. 이번 빌드에는 놓친 복습 추가 알림을 넣지 않겠습니다. 추가 발송 횟수는 0회라는 제안입니다.**

현재 서버에는 당일 아침·저녁 발송 경로가 있고, 놓친 과제는 다음에 홈을 열면 남아 있습니다. 실제 발송·반응은 이번에 확인하지 않았으므로, 추가 독촉이 필요한지는 모릅니다. [send-review-reminders.ts:134](/Users/baggiyun/dev/dasida-app/functions/src/send-review-reminders.ts:134) · [STATUS.md:20](/Users/baggiyun/dev/dasida-app/docs/STATUS.md:20)

우선 ②로 기존 알림을 받을 길을 연결하고 ⑴로 과제 없는 학생을 연결하세요. 연체 알림을 나중에 시험한다면 **놓친 다음 날 한 번만, 당일 정규 알림과 합쳐 발송**하는 안을 권합니다. 이는 검증된 최적 횟수가 아니라 시험 범위 제안입니다.
