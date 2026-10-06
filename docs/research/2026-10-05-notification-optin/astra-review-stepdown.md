# astra — 한 칸 내림 커밋 77d9b245 리뷰 (2026-10-06, gpt-6-astra 54,044토큰)

반드시 고칠 것: 없음

`77d9b245`의 변경 파일 6개와 주변 저장·완료 경로를 읽었으며, 지정한 장애 조건에 해당하는 새 결함은 발견하지 못했습니다.

- 한 칸 내린 뒤 날짜를 오늘로 바꿔 같은 날 재호출 시 추가 하강을 막습니다 — `features/learning/review-scheduler.ts:143`.
- 내려간 id와 겹치는 완료본을 제거하고, 다음 복습 생성 시에도 완료본 자리를 교체합니다 — `features/learning/review-scheduler.ts:161`, `:83`.
- 새 날짜는 서버 datetime 형식에 맞고, id 변경은 diff를 통해 새 문서 저장·옛 문서 삭제로 처리됩니다 — `features/learning/review-scheduler.ts:17`, `functions/src/learning-history.ts:615`, `:1162`.

추가 권고는 없습니다. 파일 수정·테스트 실행·실서버 검증은 하지 않았습니다.
