# Design: 알림 권한 요청 타이밍 재배치 (rev2)

**Status**: DRAFT
**Date**: 2026-05-06 (rev2)
**Branch**: `claude/keen-swartz-defc0c`
**Mode**: Startup (앱 출시 후 홍보 전 마지막 점검 단계)
**Supersedes**: rev1 — "약점 학습 완료 직후 트리거" 안. 폐기 사유 하단 참조.

## Problem Statement

진단 결과 저장 직후 `requestNotificationPermission()`이 무음으로 OS 다이얼로그를 띄운다 ([use-result-screen.ts:188-200](../../../features/quiz/hooks/use-result-screen.ts#L188-L200)). 사용자는 앱이 준비한 맥락 설명 없이 "다시다이가 알림을 보내도록 허용?" 한 줄만 본다. 거절율 상승 가능성이 크다.

iOS는 한 번 거절받으면 앱에서 OS 다이얼로그를 다시 띄울 수 없다. 사용자가 직접 설정으로 가야 한다. 타이밍·맥락이 틀리면 영구 손실이다.

## Premises (확정)

1. **iOS 한 번 기회**: `denied` 상태에서 `requestPermissionsAsync()`는 다이얼로그를 다시 띄우지 않는다. 첫 거절 = 영구 손실.
2. **분석을 보는 행위 자체가 미니 복습**: 사용자가 결과 화면에서 자기 약점을 라벨링·인식하는 것 = retrieval/elaboration. 인지심리학적으로 복습 메커니즘의 일부.
3. **결과 화면이 알림 가치와 정렬됨**: "내 약점이 뭔가" 모드 ↔ "내일도 이걸 기억하려면 알림" 메시지가 자연스럽게 이어짐.
4. **약점 학습 완료 화면은 forward mode**: "이제 새로운 시작이에요!"는 다음으로 가자는 인지 — 알림 욕구와 어긋남. (rev1 폐기 이유)
5. **약점 학습 중도 트리거는 위험**: 한 세션에 여러 번 노출 가능 → 첫 거절 시 iOS 기회 영구 손실.
6. **priming 카드 → OS 다이얼로그 두 단계 필수**: OS 다이얼로그를 갑자기 띄우는 게 아니라 사용자가 [켜기]를 탭한 결과로 띄워야 거절율 최소화 + iOS 기회 보존.

## 변경 포인트

### 1. 묵음 OS 다이얼로그 제거

**파일**: [features/quiz/hooks/use-result-screen.ts](../../../features/quiz/hooks/use-result-screen.ts)
**대상**: 188-200라인 `useEffect` 전체 삭제
**연관 정리**: 사용 안 하게 되는 import (`requestNotificationPermission`, `scheduleReviewNotifications`, `resultScreenReviewStore`) 제거 또는 새 핸들러로 이전.

### 2. 결과 화면에 옵트인 카드 추가

**파일**: `features/quiz/components/quiz-result-screen-view.tsx` (카드는 별도 컴포넌트로 분리 권장: `notification-opt-in-card.tsx`)

**배치**: 약점 리스트 아래, "약점 학습 시작하기" CTA 위.

**카드 구조**:
```
┌────────────────────────────────────────┐
│ 🔔 복습 알림 받기                       │
│ {약점라벨1}, {약점라벨2} —              │
│ 내일이면 절반 이상 잊혀져요             │
│                                        │
│         [켜기]      [나중에]            │
└────────────────────────────────────────┘
```

**노출 조건** (모두 만족 시에만):
- `getPermissionsAsync()` 결과가 `undetermined`
- `liveSummary.weaknesses.length >= 1`
- `session?.accountKey` 존재
- 같은 세션에서 [나중에]로 닫지 않음

`granted`면 카드를 보여주지 않고 백그라운드에서 `scheduleReviewNotifications`만 실행. `denied`면 아무 것도 하지 않음.

### 3. [켜기] 핸들러

```ts
const onEnableNotifications = async () => {
  if (!session?.accountKey) return;
  setCardState('requesting');
  const granted = await requestNotificationPermission().catch(() => false);
  if (granted) {
    setCardState('granted');
    await scheduleReviewNotifications(session.accountKey, resultScreenReviewStore)
      .catch(console.warn);
  } else {
    setCardState('denied');
  }
};
```

### 4. [나중에] 핸들러

```ts
const onDismissCard = () => {
  setCardState('dismissed');
  // 세션-단위 dismiss만. OS 다이얼로그 안 띄움 → iOS 기회 보존.
};
```

세션 간 영구 dismiss는 하지 않는다. 다음 진단 사이클의 결과 화면에서 다시 기회를 준다.

## 카피 가이드 (디자인의 핵심)

**데이터 박기**: 약점 라벨 1-2개 직접 노출.

**망각 곡선 hook**: "내일이면 절반 이상 잊혀져요" / "지금 3분 vs 내일 30분"

**버튼 단어**:
- [켜기] (짧고 행동 명확) vs [알림 켜기] — 디자인 단계에서 결정
- [나중에] (친절) vs ✕ (드라이) — 디자인 단계에서 결정

**약점 0개 케이스**: 카드를 아예 안 보여주는 게 정답. 약점 없는 사용자는 알림 가치가 약함 → 거절 위험.

## Edge Cases

| 케이스 | 처리 |
|---|---|
| 약점 0개 (전체 정답) | 카드 노출 안 함 |
| 권한 이미 `granted` | 카드 안 보여주고 `scheduleReviewNotifications`만 실행 |
| 권한 이미 `denied` | 카드 안 보여줌. 설정 deep-link은 out of scope |
| [나중에] 후 같은 세션 재진입 | 카드 다시 노출 안 함 |
| [나중에] 후 다음 진단 사이클 | 새 결과 화면 → 카드 다시 노출. iOS 기회 살아있음 |
| [켜기] 후 OS에서 거절 | `denied` 상태로 전환. iOS 기회 소진. 카드는 사라지거나 안내 문구로 전환 |
| `persistResult` 실패 | 카드 노출은 저장과 독립. 약점 데이터만 있으면 노출 가능 |
| Android | 채널 설정은 `requestNotificationPermission` 내부에서 매번 실행 — 변경 없음 |

## Out of Scope

- `canAskAgain` 활용한 설정 앱 deep-link
- denied 상태에서 사용자에게 "설정 > 알림" 안내 UX
- A/B 테스트 인프라
- 결과 화면 외 다른 진입점(홈, 설정 등)에서의 알림 옵트인
- 약점 학습 스킵 사용자 별도 트리거

## Approaches Considered

| 접근 | 채택 여부 | 사유 |
|---|---|---|
| **Z. 결과 화면 + 옵트인 카드 (priming → OS 다이얼로그)** | **선택** | 한 번만 노출, 데이터 명확, 인지 모드 정렬, iOS 기회 보존 |
| Y. 약점 학습 완료 화면 (rev1) | 폐기 | "함께 실전 시작하기" = forward mode. 알림 욕구와 어긋남 |
| X. 약점 학습 중 2번 틀린 직후 | 폐기 | 한 세션 다중 노출 → 첫 거절 시 iOS 영구 손실 |
| W. 결과 저장 직후 묵음 OS 다이얼로그 (현재) | 폐기 | priming 없음, 맥락 없음, 거절율 높음 |

## Success Criteria

- [ ] [use-result-screen.ts](../../../features/quiz/hooks/use-result-screen.ts) 188-200라인 묵음 호출 제거
- [ ] 결과 화면에 옵트인 카드 노출 — `undetermined` AND 약점 ≥ 1개일 때만
- [ ] [켜기] → OS 다이얼로그 → 허용 시 `scheduleReviewNotifications` 실행
- [ ] [나중에] → OS 다이얼로그 안 뜸 → `getPermissionsAsync().status === 'undetermined'` 유지 (시뮬레이터 재현)
- [ ] 약점 0개 케이스에서 카드 미노출
- [ ] 권한 `granted`면 카드 미노출, 스케줄링만 실행
- [ ] 권한 `denied`면 카드 미노출, OS 다이얼로그 다시 안 뜸

## Open Questions

1. **카드 위치**: 약점 리스트 위 / 아래 / CTA 옆 — wireframe으로 검토 필요
2. **버튼 카피**: [켜기]/[나중에] vs 다른 단어 — UX writing 단계
3. **denied 후 안내 UX**: 별도 spec으로 분리할지 결정 필요

## Verification

1. **Happy path**: 진단 → 분석 → 결과 화면 (카드 노출) → [켜기] → OS 다이얼로그 → 허용 → `getAllScheduledNotificationsAsync()`로 morning/evening 2건 확인
2. **나중에 path**: 카드 노출 → [나중에] → 카드 사라짐 → OS 다이얼로그 안 뜸 → 권한 상태 `undetermined` 유지
3. **이미 허용 path**: 사전 허용 → 결과 화면 → 카드 미노출 → 스케줄링 동작 확인
4. **이미 거절 path**: 사전 거절 → 카드 미노출 → 다이얼로그 다시 안 뜸
5. **약점 0개 path**: 진단 전체 정답 → 결과 화면 → 카드 미노출
6. **다음 사이클 재노출**: [나중에] 누른 후 다른 진단 완료 → 새 결과 화면에서 카드 다시 노출 확인

## rev1 폐기 사유 (참고)

rev1은 "약점 학습 완료 후 step-complete 화면에서 권한 요청"이었다. 두 가지 결함:

1. **인지 모드 불일치**: "이제 새로운 시작이에요!" 화면은 사용자가 forward mode로 들어가는 시점. "내일 다시 보고 싶다" 감정과 어긋남.
2. **약점 학습 흐름의 본질**: 약점 학습은 그 자리에서 답을 끌어내는 과정 (틀리면 힌트 → 또 틀리면 해설 → 정답으로 넘어감). 끝나면 모두가 "어떻게든 다 푼" 상태 → "당신은 X개 틀렸어요" 데이터가 의미 없음. 알림이 약속하는 "풀이 복습" ≠ 약점 학습.

rev2는 결과 화면을 다시 트리거 지점으로 선택하되, 묵음 OS 다이얼로그가 아니라 priming 카드 + [켜기]/[나중에] 두 단계로 가져간다. 이게 핵심 변경.
