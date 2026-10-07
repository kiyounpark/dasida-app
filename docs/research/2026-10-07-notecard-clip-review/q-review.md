# 리뷰 질문 — 노트 카드 「왜」 마지막 줄 잘림 고침 (2026-10-07)

목적: 이번 변경 검증. 학생 화면이 바뀌는 코드라 astra·Fable 둘에게 같은 질문을 건다(`docs/how-we-decide.md`).

## 대상

- 저장소(worktree): `/Users/baggiyun/dev/dasida-app/.claude/worktrees/notecard-clip`
- 브랜치 `fix/notecard-why-clip` · 커밋 `9744a5d4` (main `551fd993` 위 한 커밋)
- 앱: Expo SDK 54 · React Native 0.81.5 · New Architecture(Fabric) · iOS
- 바뀐 파일 둘
  - `features/photo/components/photo-note-card.tsx` — `ROW_LINE_HEIGHT = 22.01`을 `label`·`rowText` 줄 높이에 (전에는 22)
  - `features/photo/components/__tests__/photo-note-card.test.tsx` — 「행 줄 높이 여유」 테스트 2개
- 직접 읽을 것: `git -C <저장소> show 9744a5d4`, 위 두 파일, `components/math/MathText.tsx`,
  `features/photo/screens/photo-flow-screen.tsx`, `features/photo/components/photo-chat-thread.tsx`,
  `node_modules/react-native/ReactCommon/react/renderer/textlayoutmanager/platform/ios/react/renderer/textlayoutmanager/RCTTextLayoutManager.mm`
  (측정 끝 `ceil` 389~391줄 · 그리기 `drawAttributedString` 69~92줄 · 컨테이너 `_textStorageAndLayoutManagerWithAttributesString` 221~250줄),
  `node_modules/react-native/React/Fabric/Mounting/ComponentViews/Text/RCTParagraphComponentView.mm` (`drawRect` 382~416줄)

## 증상

10.07 아이폰 17 Pro 시뮬레이터(iOS 26.5 · 개발 빌드)에서 사진 흐름 끝 노트 카드(variant `flow`)의 「왜」 칸이
3줄만 보이고 넷째 줄 자리가 빈 채 「다음엔」이 이어졌다. 셋째 줄은 「…숫자 한 개」로 끝났다.
글: 「합 공식은 더하는 항의 개수랑 지수가 맞아야 해. 여기선 그 자리를 하나 덜 넣어서 식이 달라졌어. 등비수열은 숫자 한 개만 바뀌어도 뒤가 전부 흔들려.」 (숫자·영문 없음 → MathText가 조각을 안 만든다)

## 실측 (Claude, 시뮬레이터 · `onLayout`/`onTextLayout` 임시 로그 · 사진 분석은 앱 안 가짜 답으로 0장)

1. 흐름 끝 카드 「왜」: `onLayout` height `87.9998779296875`(= 88 − 2⁻¹³), width 218. `onTextLayout` 3줄 —
   셋째 줄 text가 「서 식이 달라졌어. 등비수열은 숫자 한 개만 바뀌어도 뒤가 전부 흔들려.」 전부, width 218.
2. 실험 ① 같은 흐름에서 NoteRow를 일반 `Text`(selectable 없음·MathText 없음)로 → 같은 높이 87.9998779296875, 같은 잘림.
3. 실험 ② 같은 화면·같은 자리(Fast Refresh로 그 자리 다시 그림)에서 `rowText` lineHeight만 22.01 →
   height `88.3333740234375`, `onTextLayout` 4줄, 화면에 4줄.
4. 「지난 오답노트」 목록(variant `list`, 카드가 화면 위쪽): 같은 노트 height `88.00003051757812`, 안 잘림.
   목록 좌우 여백을 흐름과 같게(폭 218) 바꿔도 안 잘림.
5. 합성 화면(ScrollView 안 1100pt 아래, 같은 글 30줄, marginTop i/3)에선 30줄 모두 정확히 88 — 재현 실패.
   다른 합성 화면에서 한 줄이 `87.99996948242188`(2⁻¹⁵ 부족)이었는데 4줄 다 그려졌다.
6. 고친 뒤 새로 돌린 흐름 끝 카드 4줄 · 목록 5장 전부 끝까지(5줄짜리 아래쪽 노트 포함) — 스크린샷
   `~/dev/dasida-measure/2026-10-07-notecard-clip/`.
7. tsc 0 · jest 999/999(두 번째 전체 실행. 첫 실행은 photo 화면 3묶음 실패 → 따로 돌리면 79/79, 다시 전체 999/999 — 흔들림, 원인 안 봄).

Claude의 원인 설명: Yoga가 픽셀 격자 반올림 뒤 위치를 float32로 돌려줘서, 화면 좌표가 큰 자리에선 텍스트 높이가
1 ulp 작게 나올 수 있다. RN은 측정 높이를 화소 칸으로 올림(ceil)하지만 줄 높이 22면 4줄 = 88로 이미 칸에 맞아
여유가 0이다. 그리기는 프레임 크기를 그대로 NSTextContainer로 쓰고, TextKit은 다 안 들어가는 마지막 줄을 배치하지 않는다.
22.01이면 4줄 = 88.04 → 측정 88.3333 → 여유 약 0.29. (2⁻¹⁵ 부족은 그려진 걸 보면 TextKit에 작은 허용치가 있는 듯 — 짐작)

## 질문

1. 위 원인 설명이 코드·실측과 맞나? 틀린 데·빠진 데를 근거(파일:줄)와 함께.
2. 이 고침이 이 칸의 잘림을 막는가? 못 막는 경우(줄 수, 화소 배율 2x/3x, 화면 좌표 크기, 수식 조각이 섞인 줄 — `rowMath`는 GowunBatang-Bold 16pt, 라벨 13pt 등)가 있나?
3. 회귀: 같은 NoteRow를 쓰는 「✂️ 갈라진 지점」(수식 강조)·「다음엔」, 흐름 끝(`flow`)·목록(`list`)에 영향이 있나? 라벨과 본문 첫 줄 맞춤은?
4. 대안 비교 — (A) 이 커밋 그대로 (B) RN 네이티브 패치(patch-package — 그리기 컨테이너 높이에 여유) · 새 스토어 빌드 필요, OTA 불가 (C) 다른 JS 방법.
   1.0.12가 두 스토어에 뜨는 날 PR #57과 같은 OTA에 무엇을 실어야 하나?
5. 테스트가 의미 있나? 더 나은 고정 방법이 있나?

## 답 형식

- 「반드시 고칠 것」(머지 전에 안 고치면 학생이 잘못 보거나 앱이 깨지는 것)과 「권고(기록만)」를 나눈다. 없으면 「반드시 고칠 것: 없음」.
- 모든 주장에 파일:줄 근거. 근거 없는 주장은 짐작이라고 적는다.
- 코드는 읽기만 한다. 파일을 고치지 않는다.
