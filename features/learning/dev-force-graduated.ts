/**
 * 여정 졸업 상태 미리보기 스위치 (개발용)
 * =====================================
 *
 * 이 값을 `true`로 바꾸면 실제 `profile.practiceGraduatedAt` 값과 무관하게
 * 앱이 "여정을 졸업한 상태"인 것처럼 화면을 그린다.
 * "여정을 걷어내면 홈이 어떻게 보이는지"를 폰에서 눈으로 확인하려고 만든 스위치다.
 *
 * ## 켜는 법
 * 아래 상수를 `true`로 바꾸고 앱을 다시 로드한다. 끌 때는 `false`로 되돌린다.
 * **기본값은 반드시 `false`로 커밋한다.**
 *
 * ## 켜면 달라지는 곳 (전부 화면 표시만)
 * - `features/learning/home-journey-state.ts` — `getCurrentState`가 `journey_graduated` 반환
 *   → 홈에서 여정 히어로/보드/CTA가 사라지고, 브랜드 헤더·약점 섹션·복습 카드가 나온다.
 * - `app/(tabs)/_layout.tsx` — 홈·기출 탭의 탭바가 보이게 된다.
 *
 * ## 하지 않는 것
 * DB/Firestore에 아무것도 쓰지 않는다. `graduateToPractice()`도 호출하지 않는다.
 * 실제 졸업 기록을 남기고 싶으면 설정 화면의 `practice-graduated` 프리뷰 시드를 쓴다
 * (`features/learner/current-learner-controller.ts:823`).
 *
 * ## 걸지 않은 곳 (의도적)
 * `features/quiz/hooks/can-graduate.ts`는 실제 `practiceGraduatedAt`만 본다.
 * 스위치를 켜도 연습 화면의 "졸업하기" 버튼은 그대로 보인다 — 그 버튼은 DB에 쓰기 때문에
 * 표시용 스위치와 섞지 않았다.
 */
export const DEV_FORCE_GRADUATED = false;
