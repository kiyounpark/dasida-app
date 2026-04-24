# DiagnosisIntroScreen 제거 스펙

**날짜:** 2026-04-24  
**상태:** 승인됨

## 배경

퀴즈 10문제 완료 후 약점 분석 시작 전에 `DiagnosisIntroScreen`이 표시된다. 이 화면에는 졸업모자를 쓴 박스 머리 캐릭터 이미지가 포함되어 있으며, 사용자가 "AI 느낌이 너무 난다"는 이유로 제거를 요청했다.

## 현재 플로우

```
퀴즈 10문제 완료
    ↓
step-complete ("진단 완료!" + 3초 카운트다운)
    ↓  router.back()
DiagnosisIntroScreen ("고생했어요!" + 캐릭터 이미지 + "심층 약점 분석 시작하기" 버튼)
    ↓  버튼 클릭
DiagnosisConversationPage (약점 분석 시작)
```

## 변경 후 플로우

```
퀴즈 10문제 완료
    ↓
step-complete ("진단 완료!" + 3초 카운트다운)
    ↓  router.back() — 3초가 충분한 전환 역할을 함
DiagnosisConversationPage (약점 분석 즉시 시작)
```

## 결정 근거

- `step-complete` 화면의 3초 카운트다운("N초 후 자동으로 넘어가요")이 이미 전환 신호를 제공한다.
- `DiagnosisIntroScreen`은 순수 UI 화면으로 API 호출, 데이터 변환 등의 로직이 없다.
- 캐릭터 이미지(`diagnostic-intro-character-transparent.png`, 3MB)를 포함한 화면 전체를 제거하는 것이 일부만 제거하는 것보다 코드가 깔끔하다.

## 변경 범위

### 삭제 파일

| 파일 | 설명 |
|---|---|
| `features/quiz/components/diagnosis-intro-screen.tsx` | 화면 컴포넌트 전체 |
| `assets/quiz/diagnostic-intro-character-transparent.png` | 캐릭터 이미지 (3MB, 1718×1053px) |

### 수정 파일

**`features/quiz/components/diagnostic-screen-view.tsx`**
- `DiagnosisIntroScreen` import 제거
- `hasSeenDiagnosisIntro` prop 제거
- `onStartDiagnosisIntro` prop 제거
- `isDiagnosing && !hasSeenDiagnosisIntro` 조건 블록 제거 → `isDiagnosing`이면 바로 `DiagnosisConversationPage` 렌더링

**`features/quiz/hooks/use-diagnostic-screen.ts`**
- `hasSeenDiagnosisIntro` useState 제거
- `onStartDiagnosisIntro` 콜백 제거
- `hasSeenDiagnosisIntro` reset 로직 제거 (state.hasStarted 변경 시 초기화하던 부분)
- 반환 객체에서 두 값 제거

## 보존되는 것

- `step-complete-screen-view.tsx` — 변경 없음
- `DiagnosisConversationPage` — 변경 없음
- 말풍선 SVG 컴포넌트(`HandDrawnSpeechBubble`) — 다른 곳에서 사용 여부 확인 후 삭제 여부 결정 (현재는 `diagnosis-intro-screen.tsx` 내부에만 정의됨)

## 검증 항목

- [ ] 퀴즈 10문제 완료 → step-complete 3초 → 분석 화면 즉시 진입 동작 확인
- [ ] 분석 완료 → step-complete ("분석 완료!") → result 화면 정상 이동
- [ ] 분석 중 뒤로가기(exit modal) 동작 정상
- [ ] 진단 재개(resume) 시 분석 화면 바로 복귀 확인
- [ ] iOS/Android 양쪽 네비게이션 스택 정상

## 범위 외

- step-complete 화면 텍스트 보강 — 3초 카운트다운으로 충분하므로 불필요
- 다른 캐릭터 이미지 교체 — 이번 스펙 범위 아님
