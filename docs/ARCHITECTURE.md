# DASIDA 아키텍처 기준
> 코드 구조, 화면 분리, 훅 분리 규칙
> 마지막 업데이트: 2026.03.15

---

## 공식 기본값
- DASIDA는 `Feature-based architecture + Thin Screen + Custom Hook`를 공식 기본값으로 사용합니다.
- 외부 참고 기준은 `wshobson/agents@react-native-architecture`이지만, 이 저장소의 소스오브트루스는 이 문서와 `.agents/skills/dasida-code-structure/SKILL.md`입니다.
- Expo 공식 스킬은 계속 1차 레이어로 유지하고, 코드 구조/리팩터링/커스텀 훅 분리 작업은 로컬 구조 스킬을 먼저 확인합니다.

## 계층 원칙

### `app/**`
- 라우트 진입점만 둡니다.
- 허용 책임: 파라미터 해석, provider 연결, navigation shell, feature screen 연결
- 목표 길이: `80줄 이하`
- 화면 UI, 복잡한 상태, 도메인 계산, 재사용 컴포넌트 정의를 넣지 않습니다.

### `features/<domain>/screens/**`
- 화면 조합과 view 렌더링만 둡니다.
- 화면별 hook 결과를 받아 view로 넘기는 얇은 screen wrapper를 기본값으로 사용합니다.
- 목표 길이: `200줄 이하`

### `features/<domain>/hooks/use-*-screen.ts`
- 화면 상태, 이벤트 핸들러, 파생 상태, 비동기 흐름을 둡니다.
- 화면 파일에서 `useState/useEffect/useMemo/useCallback`가 늘어나기 시작하면 먼저 이 계층으로 이동합니다.

### `features/<domain>/components/**`
- 해당 feature 내부에서만 재사용하는 UI를 둡니다.
- view 파일, 카드, 셀, 폼 블록, 화면 내부 조각 컴포넌트가 여기에 속합니다.

### `components/**`
- feature 경계를 넘는 공용 UI만 둡니다.
- 특정 domain 문맥에 묶인 UI는 넣지 않습니다.

### `provider/repository/store`
- 비동기 저장, 외부 연동, 전역 세션 상태를 둡니다.
- 화면에서 직접 저장/네트워크 세부 구현을 들고 있지 않도록 합니다.

### `domain/util`
- 순수 계산과 포맷팅은 hook이나 screen이 아니라 별도 함수로 둡니다.
- 입력이 같으면 결과가 같은 계산, 맵핑, 포맷팅, 라우팅 규칙은 여기로 이동합니다.

## 분리 기준
- 아래 중 하나라도 만족하면 custom hook 분리를 기본값으로 적용합니다.
- `useState/useEffect/useMemo/useCallback`가 3개 이상
- 이벤트 핸들러가 3개 이상
- 비동기 로직이 포함됨
- 로딩/에러/복구 분기가 2개 이상
- 파일 길이가 목표를 초과함

## 기본 화면 패턴
```text
app/(tabs)/quiz/result.tsx
  -> params parsing
  -> features/quiz/screens/quiz-result-screen.tsx
     -> features/quiz/hooks/use-result-screen.ts
     -> features/quiz/components/quiz-result-screen-view.tsx
```

## 예외 규칙
- 작은 placeholder 화면, 문서성 화면, 정적 카피 화면은 hook을 강제하지 않습니다.
- 규칙을 의도적으로 깨야 하면 파일 상단에 짧은 주석으로 이유를 남깁니다.

## 현재 우선 적용 대상
- `app/(tabs)/quiz/index.tsx`
- `app/(tabs)/quiz/result.tsx`
- `app/(tabs)/quiz/practice.tsx`
- `features/quiz/screens/diagnostic-screen.tsx`

## 설명 문구
- 공식 설명 문구는 아래로 고정합니다.
- `Feature-based architecture를 사용하고, 화면 파일은 얇게 유지하며 화면 로직은 custom hook으로 분리한다.`
