---
name: dasida-code-structure
description: DASIDA 로컬 코드 구조 스킬. Feature-based architecture, Thin Screen, Custom Hook 기준으로 화면 리팩터링과 구조 정리를 안내합니다.
---

# DASIDA Code Structure

이 스킬은 이 저장소에서 `코드 구조`, `리팩터링`, `커스텀 훅 분리`, `가독성 개선`, `Thin Screen`, `Feature-based architecture` 관련 작업을 할 때 사용합니다.

## 먼저 확인할 문서
- `docs/ARCHITECTURE.md`
- 필요하면 `docs/STRUCTURE.md`

## 외부 참고 기준
- 참고 기준: `wshobson/agents@react-native-architecture`
- 이 외부 기준은 참고용입니다. 이 저장소의 공식 기준은 `docs/ARCHITECTURE.md`입니다.

## 기본 규칙
- `app/**`는 라우트 진입점만 둡니다.
- `features/<domain>/screens/**`는 화면 조합과 view 렌더링만 둡니다.
- `features/<domain>/hooks/use-*-screen.ts`는 상태, 이벤트, 파생 상태, 비동기 흐름을 둡니다.
- `features/<domain>/components/**`는 feature 내부 재사용 UI를 둡니다.
- `components/**`는 feature를 넘는 공용 UI만 둡니다.
- provider/repository/store는 저장, 외부 연동, 전역 상태를 둡니다.
- 순수 계산은 hook/screen이 아니라 domain/util로 이동합니다.

## 기본 작업 순서
1. 현재 route 파일이 파라미터 해석 외 책임을 들고 있는지 확인합니다.
2. `screen`과 `view`를 분리할지 확인합니다.
3. 상태/핸들러/비동기 흐름을 `use-*-screen.ts`로 이동합니다.
4. feature 내부 재사용 UI를 `features/<domain>/components/**`로 옮깁니다.
5. 화면 길이와 책임 경계가 기준을 만족하는지 확인합니다.

## hook 분리 기준
- 아래 중 하나라도 만족하면 hook 분리를 기본값으로 적용합니다.
- `useState/useEffect/useMemo/useCallback`가 3개 이상
- 이벤트 핸들러가 3개 이상
- 비동기 로직이 포함됨
- 로딩/에러/복구 분기가 2개 이상
- `app` route가 80줄 초과
- `screen` 파일이 200줄 초과

## Quiz 작업 기본값
- `quiz/index.tsx` -> `quiz-hub-screen.tsx` + `use-quiz-hub-screen.ts`
- `quiz/result.tsx` -> `quiz-result-screen.tsx` + `use-result-screen.ts`
- `quiz/practice.tsx` -> `quiz-practice-screen.tsx` + `use-practice-screen.ts`
- `diagnostic-screen.tsx` -> thin screen wrapper + pager/workspace/ai-help hooks

## 체크리스트
- route 파일이 얇은가
- 화면 로직이 hook으로 모였는가
- 공용 UI와 feature UI가 섞여 있지 않은가
- 순수 계산이 view에 남아 있지 않은가
- 새 파일 이름이 kebab-case인가
- 기존 사용자 기능을 바꾸지 않았는가
