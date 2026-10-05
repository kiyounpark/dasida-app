사진 짚기 정확도 손글씨 측정을 이어서 해 줘. 오늘 안에 1일차를 돌리고 싶어.

먼저 읽을 것(끝까지):
1. `docs/research/2026-10-05-handwriting-photo-accuracy.md` — 10.03~05에 한 일 전체와 결론
2. `~/dev/dasida-measure/2026-10-05-hard-handwriting/README.md` — 맨 위 「👉 다음 세션은 여기부터」 6단계
3. `~/dev/dasida-measure/2026-10-05-hard-handwriting/fable-out-2.md` — 이번에 돌릴 변형 `carry`의 지시문 원문·스키마·측정 단계·관문(astra·Fable → Fable 최종으로 이미 정해짐)

할 일:
- README 6단계 순서대로: `prompts/carry.cjs` → 연습 전용 판정기 `judge-carry.cjs`(기제 확인 자동) → `day1-carry.sh`
- 돌리기 전에 나한테 OpenAI 잔액을 물어봐 줘(잔액 ≥ 그날 쓸 돈 + $5). 10.05에 이미 $3.68 썼어.
- 1일차 결과를 관문 G1″ 그대로 판정해서 알려 줘. 통과면 2일차로 갈지 물어봐 줘.

지킬 것:
- 운영 지시문(`functions/src/openai-client.ts`)은 안 바꾼다 — 관문 다 통과하고 내가 "배포"라고 할 때만.
- 시험용(H1B·H2B·H3B, 1C~6C) 정답지·결과는 판정 전에 열지 않는다. astra·Fable에게는 연습 전용 파일만 준다.
- 사진은 `~/dev/dasida-measure/` 두 폴더의 `raw/`·`img/`에 이미 다 있다 — 새로 받을 사진 없음.
