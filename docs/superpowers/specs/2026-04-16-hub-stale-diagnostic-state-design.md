# 설계 문서: 허브 화면 진단 상태 stale 버그 수정

**날짜**: 2026-04-16  
**슬러그**: hub-stale-diagnostic-state  
**상태**: 기획중

---

## 문제 정의

### 증상

인증된 사용자가 다음 시나리오를 수행하면 허브 화면이 "첫 진단 시작하기" CTA를 표시한다:

1. 처음 로그인
2. 10문제 약점진단 완료
3. 약점 연습문제 풀기
4. "홈으로 이동" 버튼 클릭
5. **허브 화면이 여전히 "첫 진단 시작하기"를 표시** ← 버그

### 기대 동작

진단 완료 후 허브는 다음 단계(분석/복습/시험)를 표시해야 한다.

---

## 근본 원인 분석

### 데이터 흐름

```
[진단 완료]
  → result-screen: recordAttempt(diagnostic) POST
      → 서버 성공 → cacheRecord(payload) → 로컬 캐시에 latestDiagnosticSummary 저장
      → context setState 업데이트 (liveSummary 올바름)

[연습문제 완료]
  → practice-screen: recordAttempt(practice) POST
      → 완료 후 feedback으로 이동

[홈으로 이동]
  → feedback → router.replace('/(tabs)/quiz') → resetSession()
  → hub gains focus
  → useFocusEffect → refresh()
  → loadCurrentSummary() GET 호출
      → 서버가 { summary: null } 반환 (Eventual Consistency)
      → [버그] else 분기: cacheSummary(createEmptyLearnerSummary()) 로컬 캐시 덮어씌움
      → null 반환
  → buildSnapshotForSession: null → createEmptyLearnerSummary() 사용
  → getCurrentStep(summary): latestDiagnosticSummary 없음 → 'diagnostic'
  → JourneyBoard: "첫 진단 시작하기" 표시
```

### 핵심 버그 위치

`features/learning/firebase-learning-history-repository.ts`  
`loadCurrentSummary` 메서드 — 서버 null 응답 처리 분기:

```typescript
// 수정 전 (버그)
if (payload.summary) {
  await this.cache.cacheSummary(accountKey, payload.summary);
} else {
  // 로컬 캐시를 빈 상태로 덮어씌움 ← 버그
  await this.cache.cacheSummary(accountKey, createEmptyLearnerSummary(accountKey));
}
return payload.summary; // null → upstream이 빈 summary 사용
```

**문제점**:
- `recordAttempt` 성공 후 `cacheRecord(payload)`로 로컬 캐시에 올바른 데이터가 저장되어 있음
- 그런데 서버 GET이 eventual consistency로 null을 반환하면 해당 캐시를 파괴함

---

## 설계 결정

### 검토된 접근 방식

| 접근 | 설명 | 장점 | 단점 | 결정 |
|------|------|------|------|------|
| **접근 1** | `useFocusEffect` refresh 제거/비활성화 | 간단 | 앱 재진입 시 stale 데이터 방치, 기능 퇴행 | 기각 |
| **접근 2** | `loadCurrentSummary`에서 서버 null 시 로컬 캐시 우선 반환 | 저장소 계층에서 흡수, 모든 호출자에 적용 | — | **채택** |
| **접근 3** | UI 레이어에서 `liveSummary` 우선 유지 | 빠른 패치 | 저장소 캐시 오염 미해결, 재발 가능 | 기각 |

### 채택된 설계 (접근 2)

**서버 null 응답 처리 정책**:

현재 API 계약에서 `{ summary: null }`의 의미:
- 신규 유저 (한 번도 recordAttempt 없음) — 로컬 캐시도 없음
- Eventual Consistency — 로컬 캐시에 `cacheRecord`가 저장한 올바른 데이터 있음

두 케이스를 `accountKey` 기반 로컬 캐시 유무로 자연스럽게 구분 가능.

**수정 후 로직**:

```typescript
if (payload.summary) {
  await this.cache.cacheSummary(accountKey, payload.summary);
  return payload.summary;
}

// 서버 null: 로컬 캐시 우선 확인 (recent cacheRecord가 있을 수 있음)
const cachedSummary = await this.cache.loadCurrentSummary(accountKey);
if (cachedSummary) {
  return cachedSummary;
}

return null; // 로컬도 없으면 null (신규 유저 시나리오)
```

**핵심 변경**:
1. 서버 null 시 `createEmptyLearnerSummary`로 캐시를 덮어쓰지 않음
2. 로컬 캐시 확인 후 있으면 반환 (eventual consistency 흡수)
3. 로컬도 없으면 null 반환 (신규 유저 시나리오 정상 처리)

---

## 영향 범위

- **변경 파일**: `features/learning/firebase-learning-history-repository.ts` (1개)
- **영향 경로**: `loadCurrentSummary` 호출자 모두
  - `CurrentLearnerController.buildSnapshotForSession`
  - `useQuizHubScreen` → `refresh()` → `buildSnapshotForSession`
- **플랫폼**: iOS / Android 동일
- **익명 유저**: 영향 없음 (LocalLearningHistoryRepository 사용)

---

## 검증 시나리오

1. **버그 시나리오**: 진단 → 연습 → 홈 이동 → 허브가 올바른 단계 표시
2. **신규 유저**: 최초 진입 시 "첫 진단 시작하기" 정상 표시
3. **캐시 없는 서버 null**: 로컬 캐시도 없을 때 null 반환 → 빈 상태 정상 처리
4. **네트워크 오류 fallback**: 기존 catch 분기 동작 유지 (변경 없음)
5. **서버 데이터 있음**: payload.summary 있으면 캐시 업데이트 후 반환 (기존과 동일)
