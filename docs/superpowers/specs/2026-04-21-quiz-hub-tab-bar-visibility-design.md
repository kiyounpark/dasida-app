# 퀴즈 허브 탭 바 조건부 표시 설계

**날짜:** 2026-04-21  
**상태:** 승인됨

## 목적

학습 여정이 진행 중일 때는 하단 탭 바를 숨겨 몰입감을 높이고, 졸업 이후에는 탭 바를 다시 표시해 다른 탭(내 기록, 설정)으로 이동할 수 있도록 한다.

## 범위

탭 바 표시 여부는 **퀴즈 허브 화면(`(tabs)/quiz/index`)** 에서만 제어한다. 진단·연습·실전 풀이 화면(`app/quiz/diagnostic`, `practice`, `exam/` 등)은 탭 바깥 라우트이므로 이미 탭 바가 없다.

## 졸업 기준

`LearnerProfile.practiceGraduatedAt` 필드가 존재하면 졸업 완료 상태다.  
`getCurrentState()` 함수에서 이 필드를 검사해 `journey_graduated`를 반환한다.

## 탭 바 표시 규칙

| 퀴즈 허브의 여정 상태 | `practiceGraduatedAt` | 탭 바 |
|---|---|---|
| `journey_not_started` | 없음 | 숨김 |
| `result_pending` | 없음 | 숨김 |
| `viewed_pre_practice` | 없음 | 숨김 |
| `journey_complete_pending` | 없음 | 숨김 |
| `journey_graduated` | **있음** | **표시** |

내 기록·설정 탭은 이 변경에 영향받지 않으며 항상 탭 바를 표시한다.

## 구현 위치

`app/(tabs)/_layout.tsx` 한 파일만 수정한다.

```
useCurrentLearner() → profile.practiceGraduatedAt
  ↓
isGraduated = Boolean(practiceGraduatedAt)
  ↓
Tabs.Screen name="quiz"
  tabBarStyle: isGraduated ? defaultTabBarStyle : { display: 'none' }
```

`useCurrentLearner()`는 앱 전역 React Context(`CurrentLearnerProvider`)를 구독하며, 졸업 처리 후 `refresh()`가 자동 실행되어 즉시 반영된다.

## 엣지 케이스

- **로딩 중 (profile === null):** `isGraduated = false` → 탭 바 숨김 유지. 로딩 완료 후 졸업 상태면 자동 표시.
- **졸업 후 리셋:** `practiceGraduatedAt`이 지워지면 자동으로 다시 숨김.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/_layout.tsx` | `useCurrentLearner()` 호출 추가, quiz `Tabs.Screen`의 `tabBarStyle` 조건부 설정 |
