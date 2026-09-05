# 쇼츠 낙서 밑그림 (Claude가 그려주는 방식)

기윤이 아이패드 메모로 따라 그리는 용도의 밑그림. 기윤 그림체에 맞춘다 — 완성품이 아니라 **따라 그릴 틀**.

## 그림체 규칙 (09.02 확정)

- 검은 선 하나, 흰 배경. 채색 없음
- 선은 손으로 그린 것처럼 살짝 흔들리게 (SVG `q` 곡선으로 직선도 약간 휘게)
- 캐릭터 = **동그라미 얼굴** (눈은 점 두 개 또는 `> <`), 몸은 어깨 곡선 정도만
- 소품은 한 장에 3~4개까지 (노트, 연필, 노트북, 책상, 창문+달, 커피잔, 쓰레기통)
- **글자 없음** — 글자는 캡컷 텍스트가 담당 (손글씨 판독 문제를 처음부터 안 만든다)
- 정사각형 캔버스 1000×1000, stroke-width 6, round cap/join
- 기윤이 따라 그릴 때 순서까지 같이 준다 (얼굴 → 몸 → 소품 → 배경)

## 만드는 법

1. SVG를 손으로 쓴다 (`docs/drafts/sketches/*.svg` 참고 — 복붙해서 소품만 바꾸면 빠름)
2. PNG로 렌더: `qlmanage -t -s 1000 -o . 파일.svg` → `파일.svg.png` 생성
3. 기윤한테 PNG 보내기 (SendUserFile)

## 기윤 그림 정리 (비율 맞추기)

기윤이 아이패드로 그려서 카톡으로 보낸 그림은 위쪽에 쏠려 있고 아래가 비어 있다.
`scripts/sketch-recenter.swift`가 잉크 범위만 잘라 정사각형 흰 캔버스 가운데에 놓는다.

```bash
swift scripts/sketch-recenter.swift 입력.png 출력.png 100
```

마지막 숫자는 여백(px). 작은 점·티끌은 자동으로 무시한다 (연속 20px 미만 잉크는 버림).

**여러 컷을 같은 장면으로 쓸 때는 recenter 금지** — 컷마다 잉크 범위가 달라서 그림이 튄다.
대신 스크린샷에서 같은 사각형을 잘라 정사각형에 놓는 `scripts/sketch-crop-fixed.swift`를 쓴다 (09.05):

```bash
swift scripts/sketch-crop-fixed.swift 입력.png 출력.png x y w h
```

마지막에 티끌 기준(기본 25)을 낮추면 말줄임표 같은 작은 점이 살아남는다 (③은 `4`로 잘랐다).
4호 ②에 쓴 값 = `691 173 1409 1155` (아이패드 메모 스크린샷 2160×1620 기준, 왼쪽 목록·상단 바·하단 펜 도구 제외).

## 파일

| 파일 | 장면 | 내용 |
|---|---|---|
| `shorts4-scene7-night-desk.svg/png` | 4호 ⑦ 구독 유도 | 밤 책상: 창문+달, 동그라미 얼굴, 노트북, 책상, 커피잔 |
| `shorts4-scene4-loop.svg/png` | 4호 ④ 모순 | 순환: 노트+연필 → 찡그린 얼굴 → 쓰레기통 노트 → 다시 노트 |
| `shorts4-scene2-three-say-write.svg/png` · `-v2` | 4호 ② (폐기 후보) | 세 명이 아래 한 명에게 화살표/연필 — 도표라서 접음 (09.05) |
| `shorts4-scene2-stack-preview.svg/png` | 4호 ② 흐름 미리보기 | A안(한 장면에 시간차로 얹기) 4컷 설명용, 따라 그리는 판 아님 |
| `shorts4-scene3-eoryeop.png` | 4호 ③ 증언 | "어렵누…" 캐릭터. 07.19 그림. 원본 파일이 없어 `Downloads/ScreenRecording_07-19-2026 10-57-16_1.MP4` 첫 프레임에서 잘라냄 (09.05) |
| `shorts4-scene2-cut1-base` ~ `cut5-hand.png` | 4호 ② 실제 컷 5장 | 기윤이 09.05 아이패드로 그린 판. 빈 노트 → 풍선 1 → 2 → 3 → 손+연필. `sketch-crop-fixed.swift`로 같은 자리 크롭 |

기윤이 실제로 그린 판: `~/Downloads/shorts4-scene7-night-desk-centered.png`, `shorts4-scene4-loop-centered.png` (원본 KakaoTalk_Photo_2026-09-02-*.png)

## 아이패드 → 맥 전송

에어드랍이 아이패드에서 맥을 못 찾는 문제 있음 (09.02, 맥 설정은 전부 정상 — 원인 미확인).
**카톡 "나와의 채팅"에 원본 체크해서 보내기**로 확정. 캡컷 편집은 맥에서 한다.
