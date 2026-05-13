# 복습 보완 콘텐츠 작성 파이프라인 설계 (초안)

**작성일**: 2026-05-13
**상태**: 기획중 (1페이지 메모 단계 — 시범 약점 1개 풀 사이클 완료 후 정식 spec으로 확장)
**대상**: `data/remedial-flows/*`, `data/review-remedial-flows.ts`, `data/review-content-map.ts`

> 본 문서는 의도적으로 짧게 시작한다. 시범 약점 1개(`discriminant_calculation`)를 풀 사이클로 돌려본 후 실측치·합격선·프롬프트·도구 사용법을 채워 정식 spec으로 확장한다. 현재는 무엇을 풀려는지와 6단계 파이프라인 골격까지만 정의한다.

---

## 1. 배경

[2026-05-12 routed-chat spec §10.1](2026-05-12-review-session-routed-chat-design.md)에 따르면 복습 세션의 보완(remedial) 노드 그래프는 `formula_understanding` 한 약점만 구현돼 있고, 나머지 **약점 56개**(`basic_concept_needed` 폴백 제외)는 비어있다. spec은 약점 1개당 4단계 작업을 정의한다:

> **(a) 노드 그래프 설계 → (b) 본문 작성 → (c) `summary` / `triggers` 메타데이터 → (d) 검증**

본 spec은 이 4단계를 **수포자 창업자가 직접 수학 판단 없이 운영 가능한 6단계 파이프라인**으로 확장한다.

---

## 2. 핵심 제약 조건

- 작성자는 수학적 판단 능력이 없다 (자칭 수포자). 콘텐츠 정확성·교육 효과성을 직접 검증 못 함.
- 외부 인력(수학 교사·실제 학생) 활용 불가.
- Codex 미결제. Claude Code(Opus 4.7)만 사용 가능.

→ 결론: **검증을 시스템(서브에이전트 + 결정론적 도구 + 신뢰 출처)에 위임**한다. 작성자는 파이프라인 운영자 역할만 수행.

---

## 3. 신뢰 출처: 기존 시험 풀이 데이터

[data/exam/](../../data/exam/)에 이미 추출된 자료:
- **57개 시험 × 약 30문제 = 약 1,700 풀이 데이터**
- 수능·학력평가·모의고사 공식 출제 (EBS·학원 자료보다 신뢰도 높음)
- 한글 풀이 흐름(`intent` 필드)은 살아있고 수식은 깨짐 → 흐름만 활용, 수식은 sympy로 별도 검증

활용: 약점별로 관련 문제 풀이를 묶어 Claude의 생성 컨텍스트로 주입.

---

## 4. 6단계 파이프라인

```
[0] 약점 ↔ 시험 문제 매핑
    1,700 풀이의 intent 텍스트를 56개 약점으로 분류
    → 약점당 평균 사례 묶음 확보
                ↓
[1] 메인 Claude가 약점 1개의 노드 그래프 + 본문 + 메타데이터 생성
    - 입력: 약점 ID, 매핑된 풀이 사례, formula_understanding 패턴
    - 출력: data/remedial-flows/<weaknessId>.ts 초안
                ↓
[2] Opus 서브에이전트 1 — "수학 교사 페르소나"
    - 수식·논리 정확성 검수
    - 통과 기준: TBD (시범 1개 후 결정)
                ↓
[3] Opus 서브에이전트 2 — "수포자 학생 페르소나"
    - 이해 가능성 검수 ("이 설명을 보면 알 것 같다 / 막힌다")
    - 통과 기준: TBD
                ↓
[4] sympy(Bash 도구) — 수식 결정론적 검증
    - 노드 내 수식·전개·항등식을 기호 연산으로 검증
    - 통과 기준: 모든 식이 결정론적으로 True
                ↓
[5] 3개 게이트(교사·학생·sympy) 다 통과 → 채택
    하나라도 NG → [1]로 피드백 루프
                ↓
[6] 채택 시 메타데이터 기록
    - 약점 ID, 출처 examId 목록, 검증 통과 시각
    - data/review-content-map.ts 의 Choice에 remedialFlowStartNodeId + weaknessId 연결
    - data/review-remedial-flows.ts 의 remedialFlows 객체에 등록
```

---

## 5. 시범 약점

**`discriminant_calculation`** (이차방정식 판별식)

선정 이유:
- 시험 매핑 자료가 풍부 (고1·고2 학평 + 고3 미적분 인접 자료)
- 콘텐츠 톤이 이미 검증된 약점 (현 `review-content-map.ts` 안)
- 파이프라인 검증 목적에 가장 적합한 난이도

---

## 6. 시범 1개 풀 사이클의 성공 기준

다음 항목을 모두 만족하면 파이프라인이 작동한다고 본다:

- [ ] [0] 매핑: `discriminant_calculation`에 매핑된 시험 풀이 사례가 **최소 10개 이상** 확보
- [ ] [1] 생성: Claude가 `data/remedial-flows/discriminant_calculation.ts` 초안 생성
- [ ] [2] 교사 페르소나가 명확한 판정(승인/거절+사유) 반환
- [ ] [3] 학생 페르소나가 명확한 판정 반환
- [ ] [4] sympy가 모든 수식 검증 (또는 검증 불가 항목 명시적 보고)
- [ ] [5] 3개 게이트 + 피드백 루프가 실제로 수렴 (무한 루프 아님)
- [ ] [6] 최종 채택본이 `review-remedial-flows.ts`에 등록 + 무결성 테스트 통과
- [ ] 토큰값 측정: 약점 1개당 평균 토큰 비용 기록
- [ ] 실제 시뮬레이터(`npx expo run:ios`)에서 `__mock__` 태스크로 흐름 1회 점검

---

## 7. TBD (시범 1개 돌리면서 채울 항목)

- Opus 서브에이전트 페르소나 프롬프트 본문 (수학 교사 / 수포자 학생)
- 합격선 정의 (어느 수준의 응답이면 "통과"인가)
- sympy 호출 형식 (어떤 수식 표현을 받을지, 무엇을 검증할지)
- 매핑 알고리즘 ([0]단계 분류 방식 — keyword? embedding? LLM 분류?)
- 피드백 루프 재시도 횟수 상한 (무한 루프 방지)
- 토큰값 실측치 + 56개 확장 시 예상 비용
- 결과 추적: 채택본의 출처 메타데이터 형식

---

## 8. 범위 밖 (Non-goals, 본 phase)

- 실제 학생·교사 검증 (현 제약상 불가)
- 학생 사용 로그 기반 콘텐츠 튜닝 (출시 후 별도 phase)
- `basic_concept_needed`(폴백 약점) 콘텐츠 작성
- Phase 2 routed-chat 라우터 튜닝 (별도 phase)

---

## 9. 다음 행동

1. 본 spec을 `git add` + commit (상태: 기획중)
2. Notion "DASIDA 개발 기록"에 초안 페이지 생성 (CLAUDE.md 규칙)
3. 시범 약점 1개 풀 사이클 실행 (`discriminant_calculation`)
4. 결과를 본 spec의 §7 TBD 항목에 채워 정식 spec으로 확장
5. spec이 채워지면 implementation plan(writing-plans) 작성 → 3개 → 56개 확장
