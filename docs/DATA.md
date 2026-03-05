# DASIDA — 데이터 구조 정의
> problemData, practiceMap, diagnosisMap, diagnosisTree 명세
> 마지막 업데이트: 2026.03.06

---

## 1. 약점 키 전략 (중요)
- 내부 키는 **고정 ID(`WeaknessId`)**로 사용합니다.
- 화면 문구는 `labelKo`로 분리합니다.
- 즉, 문구 변경이 필요해도 내부 키는 바꾸지 않습니다.

```ts
export type WeaknessId =
  | 'formula_understanding'
  | 'calc_repeated_error'
  | 'min_value_read_confusion'
  | 'vertex_formula_memorization'
  | 'coefficient_sign_confusion'
  | 'derivative_calculation'
  | 'solving_order_confusion'
  | 'max_min_judgement_confusion'
  | 'basic_concept_needed';
```

---

## 2. diagnosisMap
- 파일: `data/diagnosisMap.ts`
- 구조: `id`, `labelKo`, `desc`, `tip`
- 용도: 결과/피드백/연습 화면 공통 참조

예시
```ts
export const diagnosisMap = {
  calc_repeated_error: {
    id: 'calc_repeated_error',
    labelKo: '계산 실수 반복',
    desc: '개념은 알고 있지만 부호/사칙연산에서 반복 실수가 발생했습니다.',
    tip: '음수 계산 구간을 분리해서 검산하고 마지막 한 줄을 다시 확인하세요.',
  },
};
```

---

## 3. problemData (10문제)
- 파일: `data/problemData.ts`
- 구조

```ts
export type Problem = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  topic: string;
};
```

- 현재 구현: `dasida_mvp_10problems_final.md` 원문 기준 10문제 반영 완료 (2026.03.06)
- 원칙: 텍스트 수정이 필요해도 문제 ID와 타입 계약은 유지

---

## 4. diagnosisTree (오답 진단 트리)
- 파일: `data/diagnosisTree.ts`
- 1차: 풀이법 선택 (`cps | vertex | diff | unknown`)
- 2차: 세부 실수 선택
- 출력: `WeaknessId`

---

## 5. practiceMap (약점 연습)
- 파일: `data/practiceMap.ts`
- 키: `Record<WeaknessId, PracticeProblem>`
- 동작: 약점별 1문제 + 힌트 + 해설

```ts
export type PracticeProblem = {
  id: string;
  weaknessId: WeaknessId;
  question: string;
  choices: string[];
  answerIndex: number;
  hint: string;
  explanation: string;
};
```

---

## 6. challengeProblem (전부 정답용)
- 파일: `data/challengeProblem.ts`
- 10문제 올정답 시 심화 1문제 제공

---

## 7. 호환 규칙 (점진 전환)
- 신규 params: `weaknessId`
- 구 params: `weakTag` (한글 라벨)
- 전환 기간 동안 `weakTag -> weaknessId` 매핑 fallback 지원

---

## 8. 교체 계획
| 시점 | 교체 대상 | 원칙 |
|------|-----------|------|
| 지금 (MVP) | `problemData`, `practiceMap` | 하드코딩 유지 |
| 문제 원문 확정 후 | `problemData` 텍스트 | ID/타입 고정 |
| 1차 확장 | 수능 공통 데이터 | `WeaknessId` 재사용 |
| 2차 확장 | 선택과목 데이터 | 동일 구조 확장 |
