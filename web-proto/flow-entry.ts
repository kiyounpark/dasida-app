// esbuild 번들 진입점 — 앱의 진단 flow 엔진과 데이터를 웹에서 그대로 쓴다.
// 빌드: npm run build:proto (deploy:proto가 먼저 부른다 — esbuild는 package.json에 고정)
export { methodOptions } from '@/data/diagnosisTree';
export { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
// 오답노트 카드의 약점 이름표 — 앱(features/photo)과 같은 통역표를 나눠 쓴다.
// 웹에 사본을 두면 둘이 갈라지고, 갈라진 건 학생 화면에서만 드러난다.
export { diagnosisMap } from '@/data/diagnosisMap';
export { weaknessCandidatesFor } from '@/features/photo/flow/weakness-mistake-type-map';
// 받침에 따라 '로/으로'를 고른다 — 여기도 사본 금지. 앱이 09.02에 고친 걸(23a119e) 그대로 쓴다.
export { ro } from '@/features/photo/flow/korean-particle';
// 수식 글자(위·아래첨자·× 등) — 앱 MathText와 같은 함수. 웹 fmtMath가 이걸 부른다.
export { formatMathText } from '@/components/math/format-math-text';
export {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
} from '@/features/quiz/diagnosis-flow-engine';
