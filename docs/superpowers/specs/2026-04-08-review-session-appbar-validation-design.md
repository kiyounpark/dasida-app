# Review Session: AppBar + 입력 Validation + AI 피드백 URL 설정

**날짜:** 2026-04-08  
**상태:** 기획중

---

## 배경

기억살리기(복습 세션) 화면에 세 가지 문제가 있다:

1. 헤더(AppBar)가 없어서 뒤로가기나 현재 맥락을 알 수 없다.
2. 선택지도 텍스트도 없이 "다음으로"를 누르면 다음 단계로 넘어가버린다 (버그).
3. `.env`에 `EXPO_PUBLIC_REVIEW_FEEDBACK_URL`이 없어서 AI 피드백이 조용히 실패한다.

---

## 범위

### 1. AppBar 추가

- `review-session-screen-view.tsx` ScrollView 위에 커스텀 헤더 View 추가
- 구성: 뒤로가기(←) 버튼 + "오늘의 복습" 타이틀
- 스타일: 흰색 배경, 하단 border (다른 quiz 화면과 동일)
- SafeAreaView로 상단 insets 처리
- 기존 ScrollView의 `paddingTop: insets.top` 제거 (AppBar가 대신 처리)
- `_layout.tsx`는 변경하지 않음 (`headerShown: false` 유지)

### 2. 다음으로 버튼 비활성화

- `use-review-session-screen.ts`에서 `hasInput` 값 계산 후 반환값에 추가
  ```ts
  const hasInput = selectedChoiceIndex !== null || userText.trim().length > 0;
  ```
- `review-session-screen-view.tsx`에서 `hasInput`을 prop으로 받아 버튼 스타일 분기
  - `hasInput === false`: 회색(`primaryBtnDisabled`), `disabled={true}`
  - `hasInput === true`: 초록색, 누를 수 있음
- hook의 기존 dead code 제거:
  ```ts
  // 아래 분기는 버튼이 disabled이므로 실행 불가 → 제거
  if (!hasChoice && !hasText) {
    setStepPhase('feedback');
    return;
  }
  ```

### 3. `.env` / `.env.example` URL 추가

- `.env`에 추가:
  ```
  EXPO_PUBLIC_REVIEW_FEEDBACK_URL=https://asia-northeast3-dasida-app.cloudfunctions.net/reviewFeedback
  ```
- `.env.example`에 추가:
  ```
  EXPO_PUBLIC_REVIEW_FEEDBACK_URL=https://asia-northeast3-your-firebase-project.cloudfunctions.net/reviewFeedback
  ```
- Firebase Function `reviewFeedback`은 이미 배포되어 있음

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `features/quiz/components/review-session-screen-view.tsx` | AppBar View 추가, `hasInput` prop 받아 버튼 스타일 분기 |
| `features/quiz/hooks/use-review-session-screen.ts` | `hasInput` 계산 및 반환, dead code 제거 |
| `.env` | `EXPO_PUBLIC_REVIEW_FEEDBACK_URL` 추가 |
| `.env.example` | `EXPO_PUBLIC_REVIEW_FEEDBACK_URL` 항목 추가 |

---

## 비범위

- AI 피드백 실패 시 fallback 메시지 처리 (별도 이슈)
- 완료 화면(sessionComplete)의 AppBar (현재 뒤로가기는 router.back으로 처리)
- 다른 quiz 화면 헤더 변경

---

## 성공 기준

- 화면 상단에 뒤로가기 버튼과 "오늘의 복습" 타이틀이 보인다
- 선택지도 텍스트도 없으면 "다음으로" 버튼이 회색이고 눌리지 않는다
- 선택지 클릭 또는 텍스트 입력 시 버튼이 초록색으로 활성화된다
- 버튼 누르면 AI 피드백이 화면에 표시된다 (개발 환경 포함)
