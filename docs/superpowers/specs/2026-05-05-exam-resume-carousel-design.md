# 모의고사 분석 이어보기 캐러셀

**Date:** 2026-05-05
**Status:** Approved
**Type:** UX + 데이터 모델 변경

## Goal

홈 화면의 "이어서 분석하기" 카드를 단일 시험 → 최근 N건 시험 캐러셀로 확장한다. 사용자가 시험 A 약점 분석을 도중에 나간 뒤 시험 B를 새로 풀어도 시험 A의 이어서 분석 진입점이 홈에서 유지된다.

## Background

### 현재 동작

홈 화면의 `ExamAnalysisResumeCard`는 `latest-exam-attempt-store.ts`가 보관하는 단일 `LatestExamAttemptSummary`를 기반으로 렌더된다.

```
key: dasida/latest-exam-attempt/${accountKey}
value: LatestExamAttemptSummary | null
```

`saveLatestExamAttempt`가 호출되면 직전 값을 그대로 덮어쓴다. 따라서 시험 A 분석을 미완료 상태로 두고 시험 B를 새로 응시하면 홈 카드 포인터는 시험 B로 교체되고, 시험 A는 홈에서 사라진다.

### 데이터 유실 여부

실제 진단 progress 데이터는 유실되지 않는다. `exam-diagnosis-progress.ts`는 다음 키 구조로 응시별 별도 저장한다.

```
key: dasida/exam-diagnosis/{examId}/{YYYY-MM-DD}-{attemptId}
```

따라서 시험 A의 진단 데이터는 그대로 남아 있고, 시험 탭 → 시험 결과 화면 경로로 진입하면 이어서 분석 가능하다. 다만 그 경로는 3-4 탭 깊이여서 발견되기 어렵고, 홈 화면 카드 포인터에서만 사라진다.

### 결론

데이터 유실 문제가 아닌 **디스커버빌리티 문제**다. 홈 카드 포인터를 단수 → 배열로 확장해 최근 미완료 분석 시험들을 모두 노출한다.

## Approach

### 데이터 모델

`features/quiz/exam/latest-exam-attempt-store.ts`의 저장 단위를 단일 객체 → 배열로 변경한다.

```ts
// before
LatestExamAttemptSummary | null

// after
LatestExamAttemptSummary[]   // 빈 배열이 "없음"을 의미
```

배열 정책:
- 정렬: `attemptDateISO` 내림차순 (최신이 인덱스 0)
- 최대 길이: 3
- 신규 attempt 저장: 동일 `attemptId`가 있으면 in-place 업데이트, 없으면 prepend → `slice(0, 3)`
- 분석 완료 시: 해당 attempt를 배열에서 제거 (모든 진단이 끝나면 더 이상 카드로 노출할 필요 없음)

길이 3을 초과해 drop된 attempt도 `exam-diagnosis-progress`에는 별도 키로 남는다. 시험 탭 → 시험 결과 화면 경로로 여전히 접근 가능하므로 진정한 데이터 유실은 아니다.

### 마이그레이션

기존 키(`dasida/latest-exam-attempt/${accountKey}`)와 legacy 키(`dasida/latest-exam-attempt`)에 저장된 단일 객체를 첫 read 시 배열로 wrap한다.

```ts
function parseStored(raw: string): LatestExamAttemptSummary[] {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed.filter(isValid);
  if (parsed && typeof parsed === 'object') {
    const single = normalize(parsed);
    return single ? [single] : [];
  }
  return [];
}
```

write 시는 항상 배열로 직렬화한다. 한 번 read되어 배열로 전환되면 이후엔 배열 분기만 사용된다. 단일 객체 분기는 마이그레이션 호환을 위해 유지하되, 신규 코드 경로에서는 발생하지 않는다.

### 상태 계산

`features/quiz/exam/exam-analysis-in-progress.ts`의 시그니처를 변경한다.

```ts
// before
type AnalysisInProgressInput = {
  latestAttempt: LatestExamAttemptSummary | null;
  diagnosedProblems: Record<number, WeaknessId>;
};
type AnalysisInProgressState =
  | { isInProgress: false }
  | { isInProgress: true; examId; attemptId; noteCount; totalNotes; diagnosedNotes };

// after
type AnalysisInProgressInput = {
  latestAttempts: LatestExamAttemptSummary[];
  diagnosedProblemsByAttempt: Record<string /* attemptId */, Record<number, WeaknessId>>;
};
type AnalysisInProgressState =
  | { isInProgress: false }
  | { isInProgress: true; items: AnalysisInProgressItem[] };  // items.length >= 1

type AnalysisInProgressItem = {
  examId: string;
  attemptId: string;
  examTitle: string;
  noteCount: number;
  totalNotes: number;
  diagnosedNotes: DiagnosedNote[];
};
```

각 attempt별로 자체 진단 progress를 조회해야 하므로 `diagnosedProblems`도 attemptId 키 맵으로 변경한다. 이미 진단이 모두 끝난 attempt는 `items`에서 제외한다 (`diagnosedNotes.length >= totalNotes`).

호출 측은 다음 패턴으로 attempt별 progress를 모은다.

```ts
const progressByAttempt: Record<string, ExamDiagnosisProgress> = {};
for (const attempt of latestAttempts) {
  progressByAttempt[attempt.attemptId] = await getDiagnosisProgress({
    examId: attempt.examId,
    attemptId: attempt.attemptId,
    attemptDateISO: attempt.attemptDateISO,
  });
}
```

### 홈 화면 UI

홈 화면에서 `ExamAnalysisResumeCard`를 호출하는 자리만 수정한다.

- `items.length === 0` (`isInProgress: false`): 카드 영역 비표시 (현재와 동일)
- `items.length === 1`: 단일 카드 렌더 (현재와 동일, 도트 인디케이터 없음 → 회귀 0)
- `items.length >= 2`: horizontal swipe 캐러셀 + 카드 아래 도트 인디케이터

캐러셀 구현은 `features/quiz/exam/screens/exam-diagnosis-session-screen.tsx`의 패턴을 그대로 재사용한다.

```tsx
<FlatList
  horizontal
  pagingEnabled
  bounces={false}
  showsHorizontalScrollIndicator={false}
  data={items}
  keyExtractor={(it) => it.attemptId}
  renderItem={({ item }) => <ExamAnalysisResumeCard {...item} onPress={...} />}
/>
<DotIndicator count={items.length} active={activeIndex} />
```

`ExamAnalysisResumeCard` 컴포넌트 자체는 무수정. 캐러셀 컨테이너와 도트 인디케이터만 신규다.

## Scope

### 변경 파일

- `features/quiz/exam/latest-exam-attempt-store.ts` — 단일 → 배열, 마이그레이션 로직, 3건 cap, 동일 attemptId in-place update, 완료된 attempt 제거 함수 추가
- `features/quiz/exam/exam-analysis-in-progress.ts` — 입출력 시그니처 배열화
- `features/quiz/exam/__tests__/latest-exam-attempt-store.test.ts` — 마이그레이션, prepend, cap, in-place update, 제거 케이스 추가
- 홈 화면에서 `ExamAnalysisResumeCard` 사용처 (위치는 implementation phase에서 grep으로 정확히 식별) — 캐러셀로 wrapping
- `recordAttempt` 후 `saveLatestExamAttempt`를 호출하는 자리 — 신규 시그니처 (배열 prepend)에 맞게 호출 갱신

### 신규 컴포넌트

- 도트 인디케이터 (caroulsel paging dot) — 작은 inline 컴포넌트로 시작. 다른 곳에서 재사용 필요해지면 그때 분리.

### 비변경 파일

- `ExamAnalysisResumeCard` 컴포넌트 자체
- `exam-diagnosis-progress.ts` 키 구조와 저장 로직
- 시험 탭, 시험 선택 화면, 시험 결과 화면

## Migration & Rollback

### Migration

- 기존 단일 객체 저장값은 첫 read 시 자동으로 `[obj]` 배열로 변환되고 다음 write에서 배열로 영속화된다.
- legacy 키(`dasida/latest-exam-attempt`)도 동일하게 처리한다 (이미 다중 계정 키로 옮긴 마이그레이션 분기 유지).
- 데이터 손실 없음. 기존 유저는 release 후 첫 홈 화면 진입에서 카드 1개를 그대로 보게 된다.

### Rollback

- 코드 revert 시 단일 분기에서 `Array.isArray(parsed)`를 만나면 첫 원소만 사용하도록 fallback을 가능하게 두면 안전. 다만 이는 rollback 시 latest 1건만 살아남고 나머지는 다음 새 attempt에 의해 자연 도태됨을 의미한다 (실 데이터는 `exam-diagnosis-progress`에 있으므로 유실 아님).

## Testing Plan

### Unit

- `latest-exam-attempt-store.test.ts`
  - migration: 기존 단일 객체 read → `[obj]` 배열 반환
  - migration: legacy 키 단일 객체 → 배열 변환 후 정상 키로 이전, legacy 키 삭제
  - prepend: 신규 attemptId → 배열 맨 앞 삽입, 길이 3 cap
  - in-place update: 동일 attemptId → 배열 위치 유지하되 값 갱신
  - removal: 분석 완료 attempt 제거 → 배열에서 빠짐
  - 빈 배열 read → 정상

- `exam-analysis-in-progress.test.ts`
  - 0건 입력 → `isInProgress: false`
  - 1건 입력, 진단 미완 → `items.length === 1`
  - 3건 입력, 그중 1건이 모두 진단 완료 → `items.length === 2` (완료된 건 제외)
  - 모든 건 진단 완료 → `isInProgress: false`

### 수동 검증

- 시험 A 응시 → 약점 분석 일부 수행 → 홈 복귀 → 시험 B 응시 → 약점 분석 일부 수행 → 홈 복귀
- 홈 화면에 시험 B 카드가 첫 페이지, 시험 A 카드가 두 번째 페이지로 노출되는지 확인
- 시험 A 카드를 탭해 분석을 끝까지 완료 → 홈 복귀 시 시험 A 카드가 사라지고 시험 B 카드만 단일 표시
- 마이그레이션: 본 변경 직전 빌드의 단일 저장값을 가진 시뮬레이터에서 신 빌드 진입 → 동일 카드가 1개로 보존

## Out of Scope

- 시험 탭 UI 변경 (분석 진행 배지 추가 등)
- 미완료 분석 전용 신규 라우트/화면
- 분석 완료 통계 또는 히스토리 화면
- 4건 이상 미완료 시험을 추적하는 기능 (3건 cap 초과분은 `exam-diagnosis-progress`에 남아 있고 시험 결과 화면 경로로 접근 가능)
- 카드 정렬 옵션 (recency 단일 정책)
- 사용자 dismiss 액션 (수동으로 카드 숨기기)
