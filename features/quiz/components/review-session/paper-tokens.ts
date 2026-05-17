// 종이 노트 테마 토큰. 복습 세션 화면 전체에서 공유.
//
// v2 변경:
// - cream 은 그대로 유지 (다른 화면의 액센트 톤 영향 X)
// - 새로 pageBg 토큰 추가 → 복습 세션 페이지 배경만 어둡게.
//   카드(paper #FFFFFF) ↔ 페이지(pageBg #F4EEDC) 대비 +60% 확보.
// - paperWarm 추가: Explain·Summary 같은 강조 카드의 warm 변형 배경.
//
// 적용 범위:
//   - review-session-screen-view.tsx: screen/appBar 의 backgroundColor
//     `Paper.cream` → `Paper.pageBg` 로 3곳 교체 (아래 주석 참고)
//   - 그 외 cream 참조는 변경 불필요.
export const Paper = {
  paper: '#FFFFFF',         // v2 NEW: 카드 배경을 더 밝게 (FFFCF4 → FFFFFF)
  paperWarm: '#FFFCF4',     // v2 NEW: warm 카드 변형 (Explain·Summary)
  pageBg: '#F4EEDC',        // v2 NEW: 복습 세션 페이지/앱바 배경만 어둡게

  cream: '#FAF6EC',         // 유지: 작은 액센트(예시 박스, 버튼 텍스트, badge)에서 사용
  creamDeep: '#F2EDDC',     // 유지
  edge: '#ECE4CD',          // 유지
  ink: '#1A1916',
  inkSoft: '#3A3833',
  inkMute: '#6B675E',
  inkFaint: '#A8A296',
  forest800: '#293B27',
  forest700: '#355135',
  forest500: '#5C8C5A',
  forest300: '#AECBAA',
  forest200: '#C9DEC5',
  forest100: '#E5EFE0',
  honey: '#E8C46B',
  honeyTape: 'rgba(232,196,107,0.55)',
  honeyTapeBorder: 'rgba(26,25,22,0.18)',
  rust: '#C95A3F',
  rustSoft: '#F4DCD3',
  rustDeep: '#7A2E1F',
  marginRed: 'rgba(220, 80, 70, 0.22)',
} as const;
