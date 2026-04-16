# 구현 계획: 허브 화면 진단 상태 stale 버그 수정

**날짜**: 2026-04-16  
**슬러그**: hub-stale-diagnostic-state  
**설계 문서**: `docs/superpowers/specs/2026-04-16-hub-stale-diagnostic-state-design.md`  
**브랜치**: `claude/brainstorm-superpowers-z93wA`  
**커밋**: `316cf37`

---

## 구현 상태

이 플랜의 구현은 커밋 `316cf37`에서 완료되었습니다.  
이 문서는 구현 검증을 위한 기준으로 사용됩니다.

---

## 변경 파일

```
features/learning/firebase-learning-history-repository.ts
```

---

## Task 1: loadCurrentSummary 서버 null 처리 수정

### 파일: `features/learning/firebase-learning-history-repository.ts`

**수정 전** (lines 125-131):
```typescript
if (payload.summary) {
  await this.cache.cacheSummary(accountKey, payload.summary);
} else {
  await this.cache.cacheSummary(accountKey, createEmptyLearnerSummary(accountKey));
}
return payload.summary;
```

**수정 후** (lines 125-137):
```typescript
if (payload.summary) {
  await this.cache.cacheSummary(accountKey, payload.summary);
  return payload.summary;
}

// Server returned null (eventual consistency — e.g. just after recordAttempt POST).
// Fall back to local cache which may have correct data from a recent cacheRecord.
const cachedSummary = await this.cache.loadCurrentSummary(accountKey);
if (cachedSummary) {
  return cachedSummary;
}

return null;
```

**검증 체크리스트**:
- [ ] `payload.summary` truthy → 캐시 업데이트 후 서버 데이터 반환
- [ ] `payload.summary` null + 로컬 캐시 있음 → 로컬 캐시 반환 (캐시 덮어쓰기 없음)
- [ ] `payload.summary` null + 로컬 캐시 없음 → null 반환
- [ ] catch 분기 변경 없음 (네트워크 오류 fallback 동작 유지)
- [ ] `createEmptyLearnerSummary` import 유지 (catch 분기에서 여전히 사용)

---

## Task 2: 검증 시나리오 매핑

### 시나리오 A — 버그 재현 흐름 (핵심)
```
recordAttempt(diagnostic) POST → cacheRecord → 로컬 캐시 latestDiagnosticSummary ✓
refresh() → loadCurrentSummary GET → 서버 null 반환
  → 수정 전: cacheSummary(empty) → null 반환 → hub "첫 진단 시작하기" ← 버그
  → 수정 후: loadCurrentSummary(cache) → cachedSummary 반환 → hub 올바른 단계 ← 수정됨
```

### 시나리오 B — 신규 유저
```
서버 null + 로컬 캐시 없음 → null 반환
→ buildSnapshotForSession: createEmptyLearnerSummary 사용
→ getCurrentStep: 'diagnostic' → "첫 진단 시작하기" ← 정상
```

### 시나리오 C — 서버 데이터 있음
```
payload.summary 있음 → cacheSummary + return payload.summary
→ 이전과 동일한 경로 ← 정상
```

### 시나리오 D — 네트워크 오류
```
throw LearningHistoryApiError(NETWORK_ERROR/TIMEOUT/HTTP_ERROR)
→ catch: shouldUseLearningHistoryCacheFallback → loadCurrentSummary(cache)
→ 이전과 동일한 경로 ← 정상 (변경 없음)
```

### 시나리오 E — UNAUTHORIZED
```
throw LearningHistoryApiError(UNAUTHORIZED)
→ withAuthorizedRequest: token refresh 후 재시도
→ 이전과 동일한 경로 ← 정상 (변경 없음)
```

---

## 검증 기준 (서브에이전트용)

### Spec Compliance Review 기준

1. 서버 null 응답 시 `createEmptyLearnerSummary`로 로컬 캐시를 덮어쓰지 않는가?
2. 서버 null + 로컬 캐시 있음 → 로컬 캐시를 반환하는가?
3. 서버 null + 로컬 캐시 없음 → null을 반환하는가?
4. 서버 데이터 있음 → 기존과 동일하게 캐시 업데이트 후 서버 데이터 반환하는가?
5. catch 분기 (네트워크 오류 fallback) 동작이 변경되지 않았는가?
6. `createEmptyLearnerSummary` import가 여전히 필요하고 사용되는가?

### Code Quality Review 기준

1. 로직이 명확하고 주석이 의도를 설명하는가?
2. 불필요한 캐시 쓰기(덮어쓰기)가 제거되었는가?
3. 타입 안전성 — `LearnerSummaryCurrent | null` 반환 타입이 모든 분기에서 올바른가?
4. 비동기 처리 — `await` 누락 없는가?
5. 다른 메서드 패턴과의 일관성 (recordAttempt, saveFeaturedExamState 등)
6. 회귀 위험 — 다른 호출자에서 예상치 못한 동작 변경이 있는가?
