# 온보딩 완료 후 여정 보드 숨기기

**날짜**: 2026-04-06

## 배경

홈 화면의 여정 보드(JourneyBoard)는 신규 사용자를 진단 → 약점 분석 → 복습 흐름으로 안내하는 온보딩 요소다. 약점 연습까지 완료한 사용자에게는 더 이상 안내가 필요 없으므로 여정 보드를 숨긴다.

## 목표

약점 연습을 완료한 사용자가 홈 화면에 돌아왔을 때 여정 보드가 표시되지 않는다.

## 조건

`LearnerProfile.practiceGraduatedAt`이 설정되어 있으면 여정 보드를 숨긴다.

| 상태 | 여정 보드 |
|---|---|
| `practiceGraduatedAt = undefined` | 표시 |
| `practiceGraduatedAt = "2026-..."` | 숨김 |

## 설계 결정

### 왜 practiceGraduatedAt인가?

처음에는 `latestDiagnosticSummary`(진단 완료)나 별도 플래그(`analysisViewed`) 등을 검토했다. 최종적으로 `practiceGraduatedAt`을 선택한 이유:

- 사용자가 원하는 "온보딩 완료" 기준은 약점 분석 리포트 확인이 아닌 **약점 연습 완료**다.
- `LearnerProfile`에 이미 존재하는 필드로, 새로운 필드 추가가 불필요하다.
- Firebase에 저장되어 기기 간 동기화가 보장된다 (모바일 + 태블릿 동일 동작).
- 정규화를 해치지 않는다 — 중복 데이터가 아니며 계산으로 도출할 수 없는 고유한 사실이다.

## 변경 범위

### 변경 파일

- `features/quiz/components/quiz-hub-screen-view.tsx`
  - `JourneyBoard` 렌더링에 조건 추가: `profile.practiceGraduatedAt`이 없을 때만 표시

### 변경 없는 파일

- `LearnerProfile` 타입 — `practiceGraduatedAt` 이미 존재
- Firebase / 서버 코드 — 건드릴 필요 없음
- `use-quiz-hub-screen.ts` — `profile`이 이미 전달되고 있음

## 엣지 케이스

- **앱 재설치**: `LearnerProfile`은 Firebase에 저장되므로 재설치 후에도 유지된다. 로그인하면 여정 보드가 다시 나타나지 않는다.
- **비로그인 게스트**: `practiceGraduatedAt`이 AsyncStorage 기반 로컬 프로필에 저장된다. 기기 간 동기화는 안 되지만 게스트는 단일 기기 사용으로 간주한다.
- **온보딩 후 복습 없는 날**: 여정 보드도 없고 복습 카드도 없어 홈이 비어 보일 수 있다. 이 상태의 홈 콘텐츠는 별도 작업으로 다룬다.

## 테스트 계획

- `practiceGraduatedAt` 없는 상태 → 여정 보드 표시 확인
- `practiceGraduatedAt` 있는 상태(시드) → 여정 보드 미표시 확인
- 복습 카드 + `practiceGraduatedAt` 있는 상태 → 복습 카드만 표시 확인
