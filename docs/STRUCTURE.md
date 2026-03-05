# DASIDA — 앱 구조 정의
> 파일/화면 구조, 네비게이션 흐름
> 마지막 업데이트: 2026.03.06

---

## 네비게이션 구조
혼합형 구조 (Tabs + Stack)
- 바깥: Tabs (`문제 풀기 / 내 기록 / 설정`)
- 안쪽: `quiz` Stack (`index -> result -> practice -> feedback`)

### 탭 동작 규칙
- `문제 풀기` 탭 재탭 시 현재 화면 유지
- 탭 이동 후 복귀 시 Quiz 스택 상태 유지
- Stack 뒤로가기 허용

---

## 폴더 구조
```text
app/
├── _layout.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── history.tsx
│   ├── profile.tsx
│   └── quiz/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── result.tsx
│       ├── practice.tsx
│       └── feedback.tsx

components/
└── brand/
    ├── DasidaLogo.tsx
    ├── BrandHeader.tsx
    └── BrandButton.tsx

constants/
├── brand.ts
└── theme.ts

features/
└── quiz/
    ├── types.ts
    ├── engine.ts
    └── session.tsx

data/
├── problemData.ts
├── diagnosisMap.ts
├── diagnosisTree.ts
├── practiceMap.ts
└── challengeProblem.ts
```

---

## 화면별 역할

### 1) `index.tsx` — 10문제 풀이 + 오답 진단
- 10문제를 순차 출제
- 제출 즉시 정오답 판정
- 오답이면 같은 화면에서 진단 트리 진행
  - 1차: 풀이법 선택
  - 2차: 세부 실수 선택
- 진단 결과로 `WeaknessId` 점수 누적

### 2) `result.tsx` — 결과 요약
- 총 문제수/정답수/정답률 표시
- 오답 있음: 상위 3개 약점 표시 후 연습 시작
- 전부 정답: 축하 결과 + 심화 1문제 시작

### 3) `practice.tsx` — 약점/심화 연습
- 오답 있음: 상위 3개 약점을 순서대로 1문제씩 풀이
- 전부 정답: 심화 문제 1개 풀이
- 공통 동작: 오답 시 힌트 + 재시도, 정답 시 다음 단계 진행

### 4) `feedback.tsx` — 최종 요약 + 의견 입력
- 정답률, 약점 목록, 연습 완료 상태 표시
- 한 줄 피드백 입력 (MVP 더미 저장)
- 다시 시작 버튼 제공

---

## 상태 관리
- `QuizSessionProvider`가 `quiz/_layout.tsx`에서 Stack 전체를 감쌉니다.
- 관리 상태
  - 현재 문제 인덱스
  - 답안 기록
  - 약점 점수표
  - 상위 약점 3개
  - 연습 진행 인덱스
  - 심화 완료 여부

## 문제 데이터 소스
- 10문제 본문/선택지/정답은 `data/problemData.ts`를 소스오브트루스로 사용
- 2026.03.06 기준 `dasida_mvp_10problems_final.md` 원문 기준으로 반영

---

## 브랜드 UI 계층
- 로고 소스: `index.html` 인라인 SVG를 `components/brand/DasidaLogo.tsx`로 분리
- 공통 헤더: `components/brand/BrandHeader.tsx`
- 공통 버튼: `components/brand/BrandButton.tsx`
- 디자인 토큰: `constants/brand.ts`
- 탭/아이콘 컬러는 `constants/theme.ts` + `app/(tabs)/_layout.tsx`에서 브랜드 그린으로 정렬

---

## 라우트 params 규약
신규
- `weaknessId`: 내부 고정 ID
- `mode`: `weakness | challenge`

호환 (이행기간)
- `weakTag`: 기존 한글 라벨
- `weakTag`가 들어오면 `weaknessId`로 매핑 후 사용

---

## 현재 상태 (2026.03.06)
| 영역 | 파일 | 상태 |
|------|------|------|
| 10문제 풀이 + 진단 | `app/(tabs)/quiz/index.tsx` | ✅ 구현 |
| 결과 요약 | `app/(tabs)/quiz/result.tsx` | ✅ 구현 |
| 약점/심화 연습 | `app/(tabs)/quiz/practice.tsx` | ✅ 구현 |
| 최종 피드백 | `app/(tabs)/quiz/feedback.tsx` | ✅ 구현 |
| 세션/엔진 | `features/quiz/*` | ✅ 구현 |
| 데이터 레이어 | `data/*` | ✅ 구현 |
| 브랜드 UI 계층 | `components/brand/*`, `constants/brand.ts` | ✅ 구현 |
