# iPad 가로 — 학습 여정 화면 좌우 분할 — Design Spec

- **Date**: 2026-05-09
- **Branch**: claude/vigorous-einstein-6e7f9e
- **Status**: 기획중
- **선행 spec**: `docs/superpowers/specs/2026-05-09-ipad-landscape-only-design.md` (§5.2 후속 작업으로 명시된 항목 중 "허브 홈 / 여정보드 가로 기준 재설계"의 첫 번째 spec)

## 1. 배경 / 동기

iPad/Android 태블릿을 가로 고정으로 전환한 이후 (2026-05-09 landscape-only spec 적용 직후), 학습 여정 화면(허브 홈)이 가로에서 어색하게 보인다. 실기 사진(IMG_2081)으로 확인된 문제:

- **여정보드가 거의 무너짐**: STEP 1~4 노드/SVG path가 화면 가운데 좁은 영역에 압축되어 표시됨. 텍스트만 보이고 노드 그림이 거의 안 보일 정도
- **양옆 약 30% 공백**: 가로 폭 1194pt(iPad 11") 기준, 보드와 CTA가 가운데 좁게 모이고 좌우는 휑함
- **약점 섹션이 보이지 않음**: `HomeWeaknessSection`이 보드 아래에 있는데, 보드가 화면 height를 거의 다 먹어 사실상 안 보임

**근본 원인:** `journey-board-layout.ts`의 `calcJourneyBoardWidth`가 height-based max(`availableHeight × 768/960`)로 보드 폭을 제한한다. 가로 화면에서 hero(약 250pt) + CTA footer(약 100pt) + padding을 빼면 availableHeight가 작아지고, 768:960 portrait 비율 SVG가 좁게 압축되며 노드(STEP 1~4 이미지)가 점처럼 작아진다.

이번 spec은 **허브 홈을 좌우 분할 레이아웃으로 전환**하여 위 문제를 해소한다.

## 2. 적용 범위

**대상 디바이스/방향:**
- iPad (가로 고정 — 이미 적용)
- Android 태블릿 (가로 고정 — 이미 적용)
- iPhone / Android 폰 (portrait) — **변경 없음**, 현재 세로 stack + 화면 footer CTA 유지

**대상 화면:** `features/quiz/components/quiz-hub-screen-view.tsx` 만.

**범위 밖 (후속 spec):**
- 히스토리 화면 가로 전용 레이아웃
- 프로필 화면 가로 전용 레이아웃
- 여정보드 자체를 가로 비율(landscape viewBox)로 재디자인

## 3. 레이아웃 구조 (태블릿 가로)

```
┌─────────────────────────────────────────────────────────────┐
│  [BrandHeader (compact, 졸업 후 모드일 때만)]                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │   [포스터 배너]       │    │  [STEP 카드 (적응형)]    │  │
│  │   "학습 여정"        │    │                           │  │
│  │                      │    │  [분석 재개 카루셀]      │  │
│  │   [여정보드]          │    │  (조건부)                │  │
│  │   STEP 1~4          │    │                           │  │
│  │   손그림 path        │    │  [약점 카드]             │  │
│  │                      │    │  (조건부)                │  │
│  │   (portrait 비율    │    │                           │  │
│  │    768:960 유지)    │    │  [복습 카드]             │  │
│  │                      │    │  (조건부)                │  │
│  │                      │    │  ───────────             │  │
│  │                      │    │  [CTA 버튼]              │  │
│  └──────────────────────┘    └──────────────────────────┘  │
│      좌측 (flex: 1.3)             우측 (flex: 1)            │
└─────────────────────────────────────────────────────────────┘
```

**주요 결정:**

| 항목 | 결정 |
|---|---|
| 좌우 비율 | 좌측 1.3 : 우측 1 (보드 위주) |
| 좌측 컬럼 안 보드 width | 컬럼 폭의 82~85% (정확한 수치는 plan에서 실측) |
| 보드 비율 | portrait 768:960 그대로 유지 (재디자인 X) |
| 보드 height 제약 | **풀어줌** — 좌측 컬럼 폭 기반으로만 width 계산. height 압박 없음 |
| CTA 위치 | 우측 패널 안 하단 (footer 컴포넌트 X) |
| 우측 스크롤 | 우측 패널만 세로 스크롤. 좌측은 고정 |
| AuthNotice (인증 알림 pill) | 좌측 컬럼 상단(포스터 배너 위 또는 아래)에 인라인 배치. overlay 방식 X |
| 폰(portrait) | 위 구조 사용 안 함. 현재 세로 stack + 화면 footer CTA 유지 |

**기존 split-layout 컨벤션 참고:** `features/quiz/components/quiz-solve-layout.tsx` 정신을 참고. 새 컴포넌트로 분리할지 인라인할지는 plan에서 확정.

## 4. STEP 카드의 적응형 동작 (핵심 인터랙션)

우측 패널의 "지금 STEP 카드"는 단계와 데이터 유무에 따라 본문 풍부함이 변한다.

### 4.1 모드 판별

- **rich 모드**: 우측 패널에 약점 카드/분석 재개 카루셀이 모두 없는 경우
  - 즉, `homeState.weakness` 데이터 없음 AND `analysisState.isInProgress === false`
  - 일반적으로 STEP 1 시작 전 처음 사용자 케이스
  - 우측 패널이 휑해지지 않도록 STEP 카드가 그 공간을 메움
- **compact 모드**: 약점 카드 또는 분석 재개 카루셀이 표시되는 경우
  - STEP 카드는 자리를 양보하고 본문이 짧아짐

### 4.2 모드별 렌더 차이

| 영역 | rich 모드 | compact 모드 |
|---|---|---|
| 라벨 ("지금 단계") | ✓ | ✓ |
| STEP 제목 | 큰 폰트 | 작은 폰트 |
| 본문 설명 | 2줄 | 1줄 |
| 메타 정보 (예상 시간 · 난이도 · 문항 수) | ✓ | ✗ |
| "진단 후 →" 미리보기 한 줄 | ✓ | ✗ |

### 4.3 STEP 4개 카드 카피 (초안)

| STEP | 제목 | 본문 (rich 모드) | 메타 |
|---|---|---|---|
| 1 | 10문제 빠른 진단 | 짧고 가벼운 10문제로 너의 출발점을 잡아볼게. | 약 8분 · 기본 · 10문제 |
| 2 | 오답 약점 분석 | 진단에서 놓친 문항을 함께 살펴보자. | (사실상 항상 compact) |
| 3 | 맞춤 약점 복습 | 너에게 잘 안 맞았던 영역만 골라서 다시. | (사실상 항상 compact) |
| 4 | 완벽 마스터 | 마지막 점검. 흔들림 없이 가보자. | (사실상 항상 compact) |

**메타 정보 출처:** STEP별 정적 카피 4개. 코드 어디에 둘지(상수 파일 vs 화면 인라인)는 plan에서 결정.

**fallback 안전망:** STEP 2~4도 데이터가 비어있으면 rich 모드로 fallback (휑한 우측 패널 방지).

## 5. 우측 패널 카드 순서 / 조건부 표시

```
1. STEP 카드 (항상 표시, rich/compact 자동)
2. 분석 재개 카루셀 (analysisState.isInProgress 일 때만)
3. 약점 카드 (homeState.weakness 데이터 있을 때만)
4. 복습 카드 (homeState.nextReviewTask 있을 때만)
   ─── 스크롤 영역 끝 ───
5. CTA 버튼 (하단 고정, 우측 패널 footer)
```

**현재 코드와 차이점:**
- 현재는 `showAnalysisResumeCard` 분기로 두 가지 모드(분석 진행 중 / 일반)를 갈라 다른 컴포넌트 트리를 그림 → 태블릿에서는 **이 분기를 우측 패널 안에서만 처리**, 좌측(보드)은 항상 동일하게 표시
- `HomeWeaknessSection`은 보드 아래 → 우측 패널로 이동
- `ReviewHomeCard` / `NoReviewDayCard` → 우측 패널로 이동
- `JourneyCtaButton`의 footer 컴포넌트는 폰에서만 사용. 태블릿은 우측 패널 안 인라인

## 6. 사용자 상태별 우측 패널 시나리오

| # | 상태 조건 | 우측 패널 구성 |
|---|---|---|
| ① | 처음 사용자 (진단 전, 약점 없음, 분석 진행 안 함) | STEP 카드(rich) + CTA |
| ② | 분석 진행 중 | STEP 카드(compact) + 분석 재개 카루셀 + CTA |
| ③ | 학습 진행 중 (약점 데이터 쌓임) | STEP 카드(compact) + 약점 카드 + 복습 카드 + CTA |

## 7. 좌우 분할을 적용하지 않는 예외 상태

다음 상태에서는 split layout을 적용하지 않고 **현재 구조를 그대로 유지**한다.

| 상태 | 처리 |
|---|---|
| 로딩 중 (`!isReady`) | 가운데 정렬 안내 카드 (현행 `feedbackScreen`) 그대로 |
| 데이터 못 불러옴 (`!profile \|\| !homeState \|\| !session \|\| !journey`) | 가운데 정렬 안내 카드 + 다시 불러오기 버튼 (현행) 그대로 |
| 졸업 후 (`showJourneyBoard === false`) | 보드 자체가 없으니 split의 의미 없음. 현재 stack 구조 유지 |

## 8. 코드 변경 범위 (개략)

정확한 변경 지점은 plan에서 확정. spec 단계에서는 영향받는 영역만 명시.

**변경/확장 가능성:**
- `features/quiz/components/quiz-hub-screen-view.tsx` — 태블릿 분기로 split layout 컨테이너 추가
- `features/quiz/components/journey-board-layout.ts` 또는 `journey-board.tsx` — height 제약을 좌측 컬럼 폭 기반으로 재계산하도록 옵션 추가 (휴대폰 동작은 그대로)
- `features/quiz/components/poster-title-banner.tsx` — 태블릿 가로에서 사이즈/위치 조정 (좌측 컬럼 폭 기준)
- 새 STEP 카드 컴포넌트 — rich/compact 두 가지 렌더링 (또는 props 기반)
- 우측 패널 컴포넌트 — STEP 카드 + 조건부 카드들 + CTA 인라인 footer

**안 건드리는 영역:**
- `JourneyBoard` 내부 SVG path / 노드 좌표 / `nodeRectStyle` — portrait 비율 그대로
- 폰 portrait 렌더링 경로

## 9. 검증 항목

### 9.1 회귀 검증

**iPhone / Android 폰 (portrait)**
- [ ] 학습 여정 화면 변경 없음 (현재 모습 그대로)
- [ ] CTA가 화면 하단 footer에 위치 (변경 없음)
- [ ] 스크롤 동작 변경 없음

**iPad — 다음 디바이스 모두**
- [ ] iPad mini (1133×744 가로)
- [ ] iPad 11" (1194×834 가로)
- [ ] iPad Pro 12.9" (1366×1024 가로)

**Android 태블릿**
- [ ] 가로 모드에서 동일 동작

### 9.2 사용자 상태별 (iPad 가로 기준)

- [ ] ① 처음 사용자 — STEP 1 카드(rich) + CTA. 우측 패널 휑하지 않음
- [ ] ② 분석 진행 중 — STEP 카드(compact) + 분석 재개 카루셀 + CTA
- [ ] ③ 학습 진행 중 — STEP 카드(compact) + 약점 카드 + 복습 카드 + CTA
- [ ] 약점 카드만 있고 분석 재개 없음 — 정상 렌더
- [ ] 분석 재개만 있고 약점 없음 — 정상 렌더

### 9.3 예외 상태

- [ ] 로딩 중(`!isReady`) — 가운데 정렬 카드 (split 적용 X)
- [ ] 데이터 못 불러옴 — 가운데 정렬 + 다시 불러오기 버튼 (split 적용 X)
- [ ] 졸업 후(`!showJourneyBoard`) — 현재 stack 구조 유지

### 9.4 시각/레이아웃

- [ ] 좌측 보드가 height 압박을 받지 않고, 좌측 컬럼 폭 기준으로 표시됨
- [ ] STEP 1~4 노드 이미지/SVG path가 정상 크기로 보임
- [ ] 우측 패널만 세로 스크롤, 좌측은 고정
- [ ] AuthNotice 인증 알림이 좌측 컬럼 안에 자연스럽게 배치
- [ ] BrandHeader (졸업 후 모드) 정상 표시

### 9.5 코드 검증

- [ ] 타입 체크 통과 (`tsc --noEmit`)
- [ ] 단위 테스트 통과 (`jest`)
- [ ] 폰 경로(현재 stack)와 태블릿 경로(split)의 분기가 명확히 분리

### 9.6 빌드 검증

- [ ] `npx expo prebuild --clean` 성공 (네이티브 변경 없음 예상)
- [ ] `npx expo run:ios` (iPad 시뮬레이터) 정상

## 10. 의식적으로 수용하는 트레이드오프

1. **보드 비율은 portrait(768:960) 유지** — 좌측 컬럼 안에 세로로 길쭉한 모양. 가로에 100% 최적은 아니지만, 보드 자체 재디자인 비용(SVG path 재설계, 노드 좌표 재정의, 손그림 자산 재제작)을 피하는 합리적 선택. 보드 자체 재디자인은 별도 후속 spec.

2. **STEP 카드 메타 정보는 정적 카피** — 실제 진단 시간/난이도와 어긋날 수 있음. 동적 산출은 비용 큼. 카피만 정확히 맞추면 충분.

3. **rich/compact 자동 전환 트리거가 단순함** — "약점/분석 재개 둘 다 없으면 rich" 라는 단순 규칙. 더 정교한 모드 전환(예: STEP별 강제 모드)은 yagni.

## 11. 후속 작업 (사용자에게 리마인드 필요)

> ⚠️ 본 spec 구현 완료 후 다음을 사용자(박기윤)에게 리마인드한다.

1. **히스토리 화면 가로 전용 레이아웃 spec**
2. **프로필 화면 가로 전용 레이아웃 spec**
3. **여정보드 가로 비율 재디자인 spec** (지금은 portrait 유지)

리마인드 방법:
- `docs/PROGRESS.md`에 본 spec 완료 기록 시 "후속 작업 필요" 섹션 함께 남김
- Notion "DASIDA 개발 기록"의 본 페이지 본문 `## 후속 작업` 섹션에 위 항목 명시 (구현완료 페이지 업데이트 시)

## 12. 참고

- 선행 spec: `docs/superpowers/specs/2026-05-09-ipad-landscape-only-design.md` — 본 spec은 그 §5.2 후속 작업의 첫 spec
- 코드 참고: `features/quiz/components/quiz-solve-layout.tsx` — 시험풀기/진단 화면의 split-layout 컨벤션
- 실기 사진: IMG_2081.HEIC (iPad 가로에서 보드가 무너진 상태)
- Visual companion mockups (자료): `.superpowers/brainstorm/40920-1778298181/content/`
  - `layout-comparison.html` — 현재 vs 좌우 분할 비교
  - `cta-placement.html` — CTA 위치 옵션
  - `early-stage-panel.html` — 초반 단계 적응형 STEP 카드
  - `right-panel-states.html` — 사용자 상태별 우측 패널
