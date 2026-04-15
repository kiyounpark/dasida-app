# 설정 화면 정리 — 설계 문서

**날짜**: 2026-04-15
**목적**: 설정 화면에서 개발용 항목 제거, 학년 설정 개선(G3 트랙 선택 + 기록 초기화 확인), subtitle 문구 수정

---

## 배경

실기기 수동 탐색 중 설정 화면에 개발 전용 항목들이 노출되고 있음. 이 항목들은 개발 과정에서 유용했으나 프로덕션 유저에게 불필요하고 혼란을 줌. 학년 설정은 온보딩 실수 수정을 위해 유지하되, G3 선택 시 트랙도 함께 선택할 수 있도록 개선.

---

## 제거할 항목 (6개)

모두 `isDevBuild` 조건부로 렌더링되는 개발 전용 카드. 코드에서 완전히 삭제.

| 항목 | 현재 위치 |
|------|----------|
| 현재 학습자 상태 카드 | `isDevBuild` 없이 항상 표시됨 → 삭제 |
| 소셜 로그인 테스트 카드 | `isDevBuild` 조건부 → 삭제 |
| 온보딩 화면으로 이동 카드 | `isDevBuild` 조건부 → 삭제 |
| 개발용 알림 테스트 카드 | `isDevBuild` 조건부 → 삭제 |
| 개발 허브로 이동 카드 | `isDevBuild` 조건부 → 삭제 |
| 개발용 상태 미리보기 카드 | `isDevBuild` 조건부 → 삭제 |

---

## Subtitle 문구 수정

```
변경 전: "연결된 계정, 학년 설정, 이 기기 기록 가져오기를 관리합니다."
변경 후: "계정과 학습 환경을 설정합니다."
```

개발용 익명 세션 조건 분기(`isGuestDevSession`)도 함께 제거. 단일 문구로 통일.

---

## 학년 설정 개선

### 현재 동작
- 학년 칩(고1/고2/고3) 선택 시 즉시 `updateGrade()` 호출
- 트랙 선택 없음
- 기록 초기화 없음

### 변경 후 동작

**1단계 — 학년 선택**
- 고1/고2/고3 칩 표시 (현재와 동일)

**2단계 — 트랙 선택 (고3 선택 시에만)**
- 고3 선택 시 트랙 칩 추가 표시: 미적분 / 확률과통계 / 기하
- 고1/고2는 트랙 없이 바로 확인 모달로

**3단계 — 확인 모달**
- 현재 학년과 다른 학년을 선택했을 때만 표시
- 문구: "학년을 변경하면 기존 진단 및 복습 기록이 초기화됩니다. 계속하시겠어요?"
- 확인 시: 학습 기록 초기화 + `updateOnboardingProfile(nickname, newGrade, newTrack)` 호출
- 취소 시: 선택 되돌림

### 컴포넌트 변경
- `ProfileScreenView`: 트랙 선택 UI 추가, 확인 모달 추가
- `useProfileScreen`: `onUpdateGrade` → `onUpdateGradeAndTrack(grade, track?)` 으로 확장. 확인 모달 상태 관리.
- `use-profile-screen.ts`에서 `updateOnboardingProfile` 사용 (기존 `updateGrade` 대신)

### 정리되는 Props (view에서 제거)
제거 항목에 더 이상 필요 없는 props:
- `isDevBuild`
- `isGuestDevSession`
- `onGoToDevHub`
- `onGoToOnboarding`
- `onTestNotification`
- `onSeedPreview`
- `onPullReviewDueDates`
- `onResetLocalProfile`
- `previewStates`
- `supportedAuthProviders`
- `onSignIn` (소셜 로그인 테스트용)

---

## 최종 설정 화면 카드 구성

1. heroCard — "설정" 제목 + 새 subtitle
2. FoundingMemberCard (조건부)
3. 에러/성공 알림 (조건부)
4. 계정 관리 — 계정 이메일, 이 기기 기록 가져오기, 로그아웃, 회원 탈퇴
5. 학년 설정 — 개선된 학년+트랙 선택 + 확인 모달
6. 앱 정보 — 버전, 개인정보처리방침
