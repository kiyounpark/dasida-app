# DiagnosisMiniCard V1Inline 리디자인 설계

- 작성일: 2026-04-29
- 대상: `features/quiz/exam/components/diagnosis-mini-card.tsx`
- 호출부: `features/quiz/exam/screens/exam-diagnosis-screen.tsx:247` (단일 호출)

## 배경

모의고사 약점분석 흐름에서 문제 풀이 직후 노출되는 `DiagnosisMiniCard`는 현재 큰 초록 블록과 44px 체크서클로 "분석 완료"를 강조하고, 그 안에 패턴 정보를 작은 내부 카드로 묻어둔 구조이다. 사용자에게 가장 중요한 정보(오답 패턴 이름과 설명)가 시각적 위계상 보조 요소로 밀려 있고, `NoteCollectionBar`까지 포함되어 정보 밀도가 높다.

V1Inline 시안은 이 위계를 뒤집는다. "분석 완료"는 작은 인라인 배지(22px 서클 + 텍스트)로 조용히 처리하고, 패턴 카드를 굵은 테두리와 offset shadow를 가진 메인 시각 요소로 끌어올린다. `NoteCollectionBar`는 별도 컴포넌트로 두지 않고 패턴 카드 하단에 작은 노트 태그(B안)로 통합한다.

이 디자인 언어는 직전 커밋(`95170cc`, `e85f69b`)에 이미 정착된 `DiagnosisMilestoneBanner`와 동일 계열이며, 두 컴포넌트가 같은 진단 플로우 안에서 시각 일관성을 가진다.

## 결정 사항

### 적용 범위

- 모의고사 진단 화면 (`exam-diagnosis-screen`)의 mini-card 엔트리 한 곳.
- 다른 화면으로 확장하지 않는다.

### 컴포넌트 교체 방식

기존 `diagnosis-mini-card.tsx`를 직접 수정한다. 새 파일 분리나 variant prop 추가는 하지 않는다.

### Props 인터페이스 (변경 없음)

```ts
type DiagnosisMiniCardProps = {
  problemNumber: number;
  patternName: string;
  patternDescription: string;
  noteCount: number;
  totalNotes: number;
  onPause: () => void;
  onNext: () => void;
  isLastProblem?: boolean;
};
```

호출부([exam-diagnosis-screen.tsx:247](../../../features/quiz/exam/screens/exam-diagnosis-screen.tsx))는 변경하지 않는다.

### View 구조

상단부터 아래로:

1. **`badgeRow`** — 가로 배치
   - 22px 서클 (`#5C8C5A` 배경, `#1A1916` 1.5px 테두리, 흰색 체크 아이콘)
   - "{problemNumber}번 분석 완료" 텍스트 (`#355135`, fontSize 12.5, bold)
2. **`patternCard`** — 메인 시각 요소
   - 배경 `#FFFCF4`, 테두리 2px `#1A1916`, radius 18, `boxShadow: '3px 3px 0 #1A1916'`
   - `patternKicker` — "오답 패턴" uppercase, fontSize 10, `#355135`, letterSpacing 0.1em
   - `patternName` — `{patternName}`, fontSize 20, extrabold, `#1A1916`
   - `patternDesc` — `{patternDescription}`, fontSize 13.5, lineHeight 1.65, `#3A3833`
   - **구분선** (`#ECE4CD` 1px, marginTop 12, paddingTop 9)
   - **`noteRow`** — 가로 배치
     - 노트 아이콘 (lucide `file-text` 11px, `#5C8C5A`)
     - "약점 노트로 정리됨" (`#355135`, fontSize 10.5)
     - 우측 끝 pill — `{noteCount} / {totalNotes}` (배경 `#E5EFE0`, 테두리 `#C9DEC5`)
3. **`buttonRow`** — 가로 배치
   - Ghost 버튼 "잠시 쉬기" (투명 배경, `#ECE4CD` 테두리)
   - Primary 버튼 (`#293B27` 배경, `#1A1916` 2.5px 테두리, `boxShadow: '0 3px 0 #1A1916'`)
     - 라벨: `isLastProblem ? '리포트 보기 →' : '다음 문제 · {nextProblemNumber}번 →'`
     - 단, 현재 props에는 `nextProblemNumber`가 없다. 기존 라벨 형식("다음 문제 →" / "리포트 보기 →")을 유지한다.

### 제거되는 요소

- `completionBlock` 전체 (큰 초록 배경 블록)
- `checkCircle` (44px 녹색 원)
- `<NoteCollectionBar>` 컴포넌트와 import

`NoteCollectionBar` 자체 파일은 다른 곳에서 쓸 수 있으므로 삭제하지 않는다(별도 호출부 확인 필요 — 플랜 단계에서 검증).

### 색상 토큰 정책

`BrandColors.*` 매핑이 V1Inline 의도와 정확히 일치하지 않으므로(예: `success`는 의도보다 밝고, `examSoftGreen`은 의도보다 진하다), `DiagnosisMilestoneBanner`와 동일하게 raw hex를 사용한다.

| 용도 | 값 |
|---|---|
| 카드 배경 (paper) | `#FFFCF4` |
| 진단 화면 배경 | `#F6F2EA` (이미 `BrandColors.background`) |
| 카드 테두리 / 그림자 (ink) | `#1A1916` |
| 본문 텍스트 (inkSoft) | `#3A3833` |
| 보조 텍스트 (inkMute) | `#6B675E` |
| 패턴 키커 / 배지 텍스트 (forest700) | `#355135` |
| 배지 서클 / 노트 아이콘 (forest500) | `#5C8C5A` |
| 노트 태그 배경 (forest100) | `#E5EFE0` |
| 노트 태그 테두리 (forest200) | `#C9DEC5` |
| Primary 버튼 배경 (forest800) | `#293B27` |
| Ghost 버튼 테두리 / 카드 구분선 (paperEdge) | `#ECE4CD` |
| Primary 버튼 텍스트 (cream) | `#FAF6EC` |

### 그림자 구현

`boxShadow` CSS 문자열을 사용한다 (React Native 0.76+ 지원).

```ts
boxShadow: '3px 3px 0 #1A1916'  // 패턴 카드
boxShadow: '0 3px 0 #1A1916'    // Primary 버튼
```

이미 `DiagnosisMilestoneBanner`가 같은 방식으로 채택했으므로 iOS/Android 호환성은 검증된 상태이다. `shadowOffset`/`elevation` 분기는 사용하지 않는다.

### 타이포그래피

`FontFamilies` 매핑:

- 배지 텍스트, 키커, 패턴명, Primary 버튼 → `FontFamilies.extrabold` 또는 `FontFamilies.bold`
- 본문 설명 → `FontFamilies.medium`
- Ghost 버튼, 보조 텍스트 → `FontFamilies.medium`

기존 컴포넌트와 milestone-banner의 사용 패턴을 따른다.

### 아이콘

노트 아이콘은 `lucide-react-native`의 `FileText` 컴포넌트를 사용한다(이미 프로젝트에 도입된 라이브러리인지 플랜 단계에서 검증). 만약 lucide가 없다면 milestone-banner처럼 raw `<View>` 합성으로 처리하거나 텍스트 이모지(📝)를 임시로 사용한다.

체크 아이콘(배지 안)은 milestone-banner와 동일하게 처리한다 — 기존 코드에서 사용하는 방식 확인 후 결정.

## 회귀 위험

- **호출부**: 단 한 곳, props 인터페이스 동일 → 회귀 위험 낮음.
- **노트 진행률 UI 손실**: 기존 `NoteCollectionBar`는 막대 진행률을 시각화했으나 새 디자인은 `N/M` 텍스트 pill만 남는다. 사용자 피드백에 따라 진행률 강조가 다시 필요해지면 별도 작업으로 복원.
- **`NoteCollectionBar` 컴포넌트 자체**: 다른 호출부가 없다면 dead code가 된다. 플랜 단계에서 grep으로 확인 후 삭제 여부 결정.
- **Android `boxShadow` 렌더링**: milestone-banner에서 검증되었으나 디바이스별 실측 확인은 필수.

## 테스트

- 기존 `diagnosis-mini-card-text.test.ts`는 텍스트 빌더 함수를 테스트하므로 영향 없음.
- 컴포넌트 자체는 view-only이며 단위 테스트가 없다. 시각 검증은 iOS 시뮬레이터 + Android 에뮬레이터에서 직접 확인한다.
- 검증 시나리오:
  - 일반 문제 (`isLastProblem=false`): "다음 문제 →" 라벨
  - 마지막 문제 (`isLastProblem=true`): "리포트 보기 →" 라벨
  - `noteCount=0, totalNotes=6`: pill에 "0 / 6" 표시
  - `noteCount=6, totalNotes=6`: pill에 "6 / 6" 표시
  - 긴 `patternName` (예: 8자 이상): 두 줄로 줄바꿈되거나 한 줄에 적절히 들어가는지

## 비범위

- `NoteCollectionBar` 컴포넌트 삭제는 dead code 확인 후 별도 판단.
- 진단 흐름의 다른 화면(milestone, 워크스페이스 등) 디자인 변경 없음.
- 컴포넌트 props 변경 없음 (예: `nextProblemNumber` 추가 등).
