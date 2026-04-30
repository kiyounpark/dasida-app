# 약점 등장 기록 날짜 표시

## 목적

약점 상세 화면의 "등장 기록" 섹션에서 각 항목 옆에 날짜를 표시한다. 사용자가 언제 해당 약점이 등장했는지 한눈에 확인할 수 있게 한다.

## 변경 범위

- `features/quiz/components/weakness-detail-appearances.tsx` — UI 수정 (유일한 변경 파일)
- 타입, 데이터 레이어 변경 없음 (`WeaknessAppearance.attemptedAt` 필드가 이미 존재)

## UI 디자인

각 등장 기록 row에 날짜를 오른쪽 끝에 정렬한다.

```
· 2024년 수능                    11월 14일
· 2024년 11월 학력평가            11월 19일
· 2024년 3월 진단                 3월 2일
```

- 날짜 텍스트: font-size 11, color `rgba(72,67,58,0.5)` (기존 bullet 색상 계열)
- `flex-shrink: 0`으로 날짜가 잘리지 않도록 고정
- 레이블은 `flex: 1`로 남은 공간 차지

## 날짜 포맷 로직

`attemptedAt` (ISO 타임스탬프)를 KST로 변환한 뒤:

| 조건 | 표시 형식 | 예시 |
|------|-----------|------|
| 현재 연도와 같음 | `M월 D일` | `3월 2일` |
| 다른 연도 | `YYYY년 M월 D일` | `2024년 11월 14일` |

KST 변환은 `weakness-appearances.ts`의 `formatYearMonthKst`와 동일한 방식 (`UTC + 9시간`) 을 따른다. 단, 이 컴포넌트에서는 일(day)까지 필요하므로 별도 헬퍼 함수 `formatAppearanceDateKst`를 컴포넌트 파일 내에 정의한다.

## 구현 방법

`formatAppearanceDateKst(iso: string): string` 함수를 `weakness-detail-appearances.tsx` 상단에 추가한다.

```ts
function formatAppearanceDateKst(iso: string): string {
  const kstMs = new Date(iso).getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const nowKstMs = Date.now() + 9 * 60 * 60 * 1000;
  const currentYear = new Date(nowKstMs).getUTCFullYear(); // KST 기준으로 비교
  if (year === currentYear) return `${month}월 ${day}일`;
  return `${year}년 ${month}월 ${day}일`;
}
```

row 렌더링에서 `<Text style={styles.date}>{formatAppearanceDateKst(a.attemptedAt)}</Text>`를 추가하고, `styles.row`에 `justifyContent: 'space-between'`을 추가한다.

## 테스트 고려사항

- 올해 날짜: 연도 없이 `M월 D일` 형식인지 확인
- 작년 이전 날짜: `YYYY년 M월 D일` 형식인지 확인
- 등장 기록이 없을 때: 빈 상태 메시지 그대로 유지
