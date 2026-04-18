# StepCompleteScreenView 브랜드 컬러 교체

**날짜:** 2026-04-18
**상태:** 기획완료
**대상 파일:** `features/quiz/components/step-complete-screen-view.tsx`

## 배경

약점진단 흐름(진단 → 분석 → 연습)의 각 단계 완료 시 풀스크린으로 표시되는 `StepCompleteScreenView`가 DASIDA 브랜드와 무관한 외부 컬러(인디고, 앰버, 초록)를 사용하고 있다. 앱의 나머지 화면과 이질감이 생기고, `BrandColors` 상수를 사용하지 않아 브랜드 변경 시 수동 수정이 필요하다.

## 목표

- 모든 컬러를 `BrandColors` 상수로 교체
- 세 단계가 각각 다른 감정을 가지되 같은 DASIDA 브랜드 언어 안에 있도록 설계
- raw hex 값을 파일에서 완전히 제거

## 컬러 매핑

### STEP_CONFIG 액센트/배경 교체

| 단계 | 감정 | accentColor (현재 → 교체) | backgroundColor (현재 → 교체) |
|---|---|---|---|
| `diagnostic` | 발견·긴장 | `'#6366f1'` → `BrandColors.warning` (`#D98E04`) | `'#f5f3ff'` → `BrandColors.background` (`#F6F2EA`) |
| `analysis` | 성장·명료 | `'#f59e0b'` → `BrandColors.primarySoft` (`#4A7C59`) | `'#fffbeb'` → `BrandColors.background` (`#F6F2EA`) |
| `practice` | 도착·자부심 | `'#22c55e'` → `BrandColors.primary` (`#293B27`) | `'#f0fdf4'` → `BrandColors.background` (`#F6F2EA`) |

**설계 의도:** 배경은 DASIDA 크림(`#F6F2EA`)으로 통일해 항상 같은 앱 안에 있는 느낌을 준다. 버튼 액센트만 앰버 → 미디엄 그린 → 다크 그린으로 진해지며 "여정을 완성해가는 느낌"을 연출한다.

### StyleSheet 텍스트 컬러 교체

| 스타일 키 | 현재 값 | 교체 후 |
|---|---|---|
| `title.color` | `'#1a1a1a'` | `BrandColors.text` |
| `body.color` | `'#555'` | `BrandColors.mutedText` |
| `countdown.color` | `'#888'` | `BrandColors.mutedText` |
| `buttonText.color` | `'#ffffff'` | `'#ffffff'` (유지) |

## 구현 범위

- **변경 파일:** `features/quiz/components/step-complete-screen-view.tsx` 단 하나
- **비변경:** hook(`use-step-complete-screen.ts`), screen 래퍼, 라우트 파일 — 컬러만 바꾸는 작업이므로 로직 변경 없음
- **타입:** `StepConfig.accentColor: string`, `backgroundColor: string` 유지 (BrandColors 값이 string이므로 호환)

## 검증

- iOS 시뮬레이터에서 진단 → 분석 → 연습 완료 화면 세 가지 시각 확인
- 각 화면 배경이 크림, 버튼 컬러가 의도한 브랜드 색인지 확인
- 기존 자동전진(autoAdvanceSeconds) 동작 변화 없음 확인
