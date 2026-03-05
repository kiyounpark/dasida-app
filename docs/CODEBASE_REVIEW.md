# DASIDA 코드베이스 전체 파악 리포트

> 작성일: 2026-03-05  
> 목적: 문서 중심으로 현재 구현 상태를 빠르게 파악하고, 실제 코드와 일치 여부를 검증하기 위한 요약

---

## 1) 한 줄 요약

현재 저장소는 **Expo Router 기반 React Native 앱**으로, 핵심 구현은 `문제 풀이 -> 오답 진단 -> 약점 연습/심화 -> 최종 피드백`의 MVP 흐름에 맞춰 완성되어 있습니다.

---

## 2) 기술 스택/실행

- 런타임: React 19 + React Native 0.81 + Expo 54
- 라우팅: `expo-router` (파일 기반)
- 상태관리: React Context + `useReducer` (`features/quiz/session.tsx`)
- 데이터: 하드코딩 타입 데이터 (`data/*`)
- 백엔드 연동: 아직 없음 (문서상 Firebase/OpenAI 예정)

### 확인 명령

```bash
npm run start
npm run lint
```

---

## 3) 문서와 코드의 정합성

문서(`PROJECT.md`, `docs/STRUCTURE.md`, `docs/DATA.md`, `docs/PROGRESS.md`)가 현재 코드 구조와 대체로 잘 맞습니다.

- 문서에서 정의한 핵심 화면 4개(`index/result/practice/feedback`)는 실제로 존재합니다.
- `WeaknessId` 기반 내부 키 전략과 `weakTag` 호환 fallback 전략도 코드에 반영되어 있습니다.
- 진행 로그 기준으로도 `Firebase/OpenAI`는 미연동 상태이며, 실제 코드도 동일합니다.

---

## 4) 실제 코드 구조

```text
app/
  (tabs)/
    quiz/
      index.tsx      # 10문제 풀이 + 오답 진단 트리
      result.tsx     # 결과 요약 + 분기
      practice.tsx   # 약점 연습/심화 문제
      feedback.tsx   # 최종 요약 + 한 줄 피드백 입력

features/quiz/
  types.ts           # 세션 상태/결과 타입
  engine.ts          # 약점 점수 계산, 상위 약점 추출, 결과 집계
  session.tsx        # Context + reducer

data/
  problemData.ts     # 본문 10문제
  diagnosisMap.ts    # 약점 ID/설명/팁 + fallback resolver
  diagnosisTree.ts   # 오답 진단 2단계 트리
  practiceMap.ts     # 약점별 연습 문제
  challengeProblem.ts# 올정답 심화 문제
```

---

## 5) 사용자 플로우(코드 기준)

1. `quiz/index.tsx`
   - 문제를 순차 제출
   - 정답이면 바로 다음 문제
   - 오답이면 동일 화면에서 `방법 선택 -> 세부 실수 선택`으로 `WeaknessId` 확정
2. `features/quiz/session.tsx`
   - 답안 누적 및 약점 점수 누적
   - 마지막 문제 제출 시 결과 자동 계산 (`buildQuizResult`)
3. `quiz/result.tsx`
   - 정답률/상위 약점 3개 표시
   - 전부 정답이면 `challenge` 분기, 아니면 `weakness` 분기
4. `quiz/practice.tsx`
   - 약점 연습 또는 심화 문제 진행
   - 오답 시 힌트, 정답 시 해설 + 다음 단계
5. `quiz/feedback.tsx`
   - 요약 정보 + 피드백 텍스트 입력(현재 더미 제출)
   - 재시작 가능

---

## 6) 강점

- **타입 계약이 명확함**: `WeaknessId`/`QuizSessionState`/`PracticeProblem` 타입이 흐름을 단단히 고정함.
- **UI-도메인 분리**: 계산 로직(`engine.ts`)과 UI 라우트 파일이 분리되어 확장에 유리함.
- **호환성 고려**: `weaknessId` 신규 파라미터와 `weakTag` 레거시 파라미터를 모두 처리함.
- **브랜드 일관성**: 공통 토큰(`constants/brand.ts`)과 공통 컴포넌트(`BrandHeader`, `BrandButton`) 적용.

---

## 7) 현재 공백(문서와 동일)

- Firestore 저장 미연동 (피드백 제출이 실제 저장 아님)
- OpenAI 판정 미연동 (현재는 선택지 기반 내부 판정)
- 기록/설정 탭 기능 미구현 (placeholder)
- 테스트 코드 부재

---

## 8) 다음 우선순위 제안

1. **테스트 우선 도입**
   - `features/quiz/engine.ts`에 순수 함수 단위 테스트 추가
   - `quiz/session reducer` 상태 전이 테스트 추가
2. **Firebase 연결**
   - `feedback.tsx` 제출 버튼을 Firestore 쓰기로 연결
3. **AI 연동 경계 분리**
   - OpenAI 호출 모듈을 `features/quiz` 밖 서비스 계층으로 분리
4. **기록 탭 실체화**
   - 최근 결과/정답률/약점 추이 조회 화면 구현

---

## 9) 리스크 메모

- 데이터가 하드코딩이라 문제 수 확장 시 빌드/배포 의존도가 큼
- 진단 트리 변경 시 `WeaknessId` 계약 불일치가 발생하면 연습 매핑이 깨질 수 있음
- 세션 상태가 메모리 기반이라 앱 종료 시 진행 상태가 보존되지 않음

---

## 10) 결론

현재 MVP 기준으로 **핵심 학습 플로우는 구현 완료 상태**이며, 다음 단계는 문서에 적힌 대로 **외부 연동(Firebase/OpenAI) + 테스트 도입**이 가장 가치가 큽니다.
