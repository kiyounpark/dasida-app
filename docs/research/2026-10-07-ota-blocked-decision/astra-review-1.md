# astra 리뷰 1 — OTA 그림 한도 A안 변경 (`024f9287`) · 2026-10-08

> 모델 `gpt-6-astra`(codex stderr `model:` 줄) · 34,726토큰 · 질문 `q-review.md` 그대로 · 읽기만(exec 5회 — `git show 024f9287`, 결정 폴더 3개, `exportAssets.js`·`exportApp.js`, 스크래치패드 증거 JSON을 python으로 읽음)

반드시 고칠 것: 없음

권고: 실제 스토어 설치본에서 OTA 수신 후 오프라인 기출 그림 표시를 확인하고, 배포 빌드의 `app.manifest`를 보관하세요. 로컬 재생성 manifest 대조는 통과했지만 실제 배포 바이너리 대조와는 구분해야 합니다.

안 본 것: 실제 EAS 배포 바이너리 내부 자산, 스토어 설치 기기의 OTA 수신·그림 표시·롤백 동작.
