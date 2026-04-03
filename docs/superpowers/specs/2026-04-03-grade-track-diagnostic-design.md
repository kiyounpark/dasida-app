# Grade & Track Diagnostic — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Goal

학년(고1/고2/고3)과 고3 트랙(미적분/확통/기하)에 맞는 진단 10문제와 약점 연습 문제를 분리한다.
현재 `problemData.ts`와 `practiceMap.ts`는 고1 전용 콘텐츠로 모든 학년에 동일하게 제공되고 있다.

## Background

- `data/problemData.ts` — 고1 텍스트 기반 진단 10문제. `grade` 필드 없음.
- `data/practiceMap.ts` — 고1 전용 23개 약점 연습문제. `Record<WeaknessId, PracticeProblem>` 구조.
- `data/diagnosisMap.ts` — 현재 23개 `WeaknessId`는 사실상 고1 과목(이차방정식, 집합, 함수 등) 기준.
- `features/learner/types.ts` — `LearnerGrade = 'g1' | 'g2' | 'g3' | 'unknown'` 존재, `track` 없음.
- `features/quiz/hooks/use-exam-selection-screen.ts` — 모의고사 선택은 이미 학년+트랙 필터링 완료 (참고용).

### 2028 수능 변경 사항 (참고)

2028학년도부터 수능 수학 선택과목이 폐지되고 대수+미적분I+확통 통합 출제로 전환된다.
현재 고3(2026 수능), 고2(2027 수능)는 기존 선택과목 체계 적용.
따라서 지금 트랙 선택 기능을 구현하고, 2028년 이후 트랙 로직 제거로 단순화한다.

## Grade & Track 구조

| 학년 | 트랙 | 진단 범위 |
|------|------|----------|
| 고1 (g1) | 없음 | 공통수학 (현재 그대로) |
| 고2 (g2) | 없음 | 공통수학 II (추후 확장 예정) |
| 고3 (g3) | 미적분 / 확통 / 기하 | 수능 선택과목 기준 |

고2는 현재 트랙별 시험 데이터가 없어 공통으로 유지. 추후 고2 트랙 데이터 추가 시 확장.

## 고3 약점 — 빈도 분석 결과

17개 시험(수능+모평+학평) 전수 분석 기반. 시험당 평균 출제 수 기준.

### 공통 (3개 트랙 모두)

| WeaknessId | 한국어 | 미적분 | 확통 | 기하 |
|-----------|--------|--------|------|------|
| `g3_diff` | 미분 | 6.8 | 5.8 | 5.6 |
| `g3_sequence` | 수열 | 4.1 | 3.9 | 3.8 |
| `g3_log_exp` | 지수·로그 | 3.9 | 3.6 | 3.6 |
| `g3_integral` | 적분 | 3.5 | 2.9 | 3.0 |
| `g3_trig` | 삼각함수 | 3.3 | 3.6 | 3.7 |
| `g3_limit` | 극한 | 2.9 | 1.8 | 1.9 |
| `g3_conic` | 이차곡선 | 2.3 | 2.1 | 3.7 |

### 트랙 특화

| WeaknessId | 한국어 | 트랙 | 시험당 평균 |
|-----------|--------|------|------------|
| `g3_counting` | 경우의 수 | 확통 | 2.5 |
| `g3_probability` | 확률 | 확통 | 0.8 |
| `g3_statistics` | 통계 | 확통 | 0.5 |
| `g3_vector` | 벡터 | 기하 | 1.5 |
| `g3_space_geometry` | 공간도형 | 기하 | 0.8 |

## 고3 진단 10문제 구성

진단 문제는 텍스트 기반으로 새로 작성. 실제 시험 원문 복사 아님.

### 미적분 트랙

| # | WeaknessId | 개념 |
|---|-----------|------|
| 1 | `g3_diff` | 다항함수 미분 |
| 2 | `g3_diff` | 합성함수·곱의 미분 |
| 3 | `g3_sequence` | 등차·등비수열 일반항 |
| 4 | `g3_log_exp` | 지수·로그 계산 |
| 5 | `g3_integral` | 정적분 계산 |
| 6 | `g3_trig` | 삼각함수 값 계산 |
| 7 | `g3_limit` | 함수의 극한 |
| 8 | `g3_conic` | 이차곡선 방정식 |
| 9 | `g3_sequence` | 수열의 합 |
| 10 | `g3_diff` | 극값·증감 판단 |

### 확통 트랙

| # | WeaknessId | 개념 |
|---|-----------|------|
| 1 | `g3_diff` | 다항함수 미분 |
| 2 | `g3_diff` | 합성함수·곱의 미분 |
| 3 | `g3_sequence` | 등차·등비수열 |
| 4 | `g3_log_exp` | 지수·로그 계산 |
| 5 | `g3_trig` | 삼각함수 계산 |
| 6 | `g3_integral` | 정적분 |
| 7 | `g3_counting` | 순열·조합 |
| 8 | `g3_conic` | 이차곡선 |
| 9 | `g3_limit` | 함수의 극한 |
| 10 | `g3_probability` | 조건부확률 |

### 기하 트랙

| # | WeaknessId | 개념 |
|---|-----------|------|
| 1 | `g3_diff` | 다항함수 미분 |
| 2 | `g3_diff` | 합성함수·곱의 미분 |
| 3 | `g3_sequence` | 등차·등비수열 |
| 4 | `g3_trig` | 삼각함수 계산 |
| 5 | `g3_conic` | 이차곡선 (포물선·타원·쌍곡선) |
| 6 | `g3_log_exp` | 지수·로그 계산 |
| 7 | `g3_integral` | 정적분 |
| 8 | `g3_limit` | 함수의 극한 |
| 9 | `g3_vector` | 벡터의 연산 |
| 10 | `g3_space_geometry` | 공간도형·정사영 |

## 변경 파일

| 파일 | 변경 종류 | 내용 |
|------|----------|------|
| `features/learner/types.ts` | Modify | `LearnerTrack` 타입 추가, `LearnerProfile`에 `track?` 필드 |
| `data/diagnosisMap.ts` | Modify | 고3 `WeaknessId` 11개 추가, `DiagnosisItem` 정의 |
| `data/problemData.ts` | Modify | `Problem`에 `grade` 필드 추가, 고3 트랙별 진단 10문제 × 3 추가 |
| `data/practiceMap.ts` | Modify | 구조를 `Record<LearnerGrade, Record<WeaknessId, PracticeProblem>>`으로 변경, 고3 약점별 연습문제 추가 |
| `features/quiz/engine.ts` | Modify | `profile.grade` + `profile.track` 기반 진단 문제 선택 로직 |
| `app/onboarding.tsx` / `features/onboarding/` | Modify | 고3 선택 시 트랙 선택 스텝 추가 |

## 온보딩 흐름

```
닉네임 입력
  → 학년 선택 (고1 / 고2 / 고3)
      → 고3 선택 시: 트랙 선택 (미적분 / 확률과통계 / 기하)
  → 완료
```

`profile.track`은 고1/고2면 `null` 또는 `undefined`.
고3이고 `track`이 없으면 트랙 선택 화면으로 리다이렉트.

## 진단 문제 선택 로직

```ts
function getDiagnosticProblems(grade: LearnerGrade, track?: LearnerTrack): Problem[] {
  return problemData.filter(p => {
    if (p.grade !== grade) return false;
    if (grade === 'g3' && p.track !== track) return false;
    return true;
  });
}
```

`grade === 'unknown'` 또는 `grade === 'g2'`이면 `g1` 문제 세트 fallback (고2 전용 콘텐츠 추가 전까지).

## Out of Scope

- 고2 트랙별 진단 (데이터 없음, 추후 확장)
- 2028 수능 통합형 대응 (추후 트랙 로직 제거로 단순화)
- `diagnosisTree.ts` 고3 분기 (진단 엔진 알고리즘 확장은 별도)
- 고3 AI 해설 연동

## Future

2028 수능 통합형 전환 시:
- 온보딩에서 고3 트랙 선택 스텝 제거
- `profile.track` 필드 deprecated
- 진단 문제를 대수+미적분I+확통 통합 세트로 교체
