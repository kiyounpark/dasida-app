# Feedback Screen Simplification — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Goal

피드백 화면에서 죽은 코드(TextInput, 피드백 state)를 제거하고, 학습 요약만 보여주는 단순한 완료 화면으로 정리한다.

## Background

`app/(tabs)/quiz/feedback.tsx`는 약점 연습 완료 후 표시되는 화면이다. 원래 사용자 피드백 텍스트를 수집하는 목적으로 설계됐으나, 입력된 텍스트가 어디에도 저장되지 않는 더미 상태로 남아있다. 저장 인프라를 갖추기보다 화면을 솔직하게 단순화하기로 결정했다.

## Scope

변경 파일: `app/(tabs)/quiz/feedback.tsx` 단일 파일.

## Design

### 제거

| 항목 | 이유 |
|------|------|
| `feedback` useState | 아무 데도 쓰이지 않음 |
| `submitted` useState | 버튼이 단일 동작만 하므로 불필요 |
| `TextInput` 컴포넌트 및 `input` 스타일 | 피드백 수집 안 함 |
| `<Text style={styles.prompt}>` ("이번 학습 경험을 한 줄로...") | TextInput과 함께 제거 |
| "제출하기" BrandButton | "처음부터 다시 시작"과 동작이 동일해짐 |
| "처음부터 다시 시작" BrandButton | 위와 동일한 동작이 중복됨 |
| `buttonGap` 스타일 | 버튼 래퍼가 모두 제거되므로 함께 제거 |

### 추가

| 항목 | 내용 |
|------|------|
| "홈으로 이동" BrandButton | variant="primary", onPress: `resetSession()` + `router.replace('/(tabs)/quiz')` |

### 유지

- 학습 요약 섹션 (정답률, 약점 목록, 연습 모드)
- 화면 제목 "학습 피드백" (이번 변경 범위 외)
- `BrandHeader`, `ScrollView` 구조

## 완료 후 화면 구조

```
학습 피드백
  └── 이번 학습 요약 카드
        ├── 정답률: X% (Y/Z)
        ├── 연습 모드
        └── 약점 목록 (또는 "모든 문제 정답")
  └── [홈으로 이동] 버튼
```

## 네비게이션 흐름

약점 연습 완료 → `/quiz/feedback` → "홈으로 이동" → `/(tabs)/quiz` (스택에서 제거)

## Out of Scope

- 화면 제목 변경 ("학습 피드백" → "학습 완료" 등)
- `use-feedback-screen.ts` hook 추출
- 피드백 저장 인프라 구축
