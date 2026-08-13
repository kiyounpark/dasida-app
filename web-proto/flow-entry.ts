// esbuild 번들 진입점 — 앱의 진단 flow 엔진과 데이터를 웹에서 그대로 쓴다.
// 빌드: npx esbuild web-proto/flow-entry.ts --bundle --format=iife --global-name=DasidaFlow --tsconfig=tsconfig.json --outfile=web-proto/flow-bundle.js
export { methodOptions } from '@/data/diagnosisTree';
export { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
// 오답노트 카드의 약점 이름표 — 앱(features/photo)과 같은 통역표를 나눠 쓴다.
// 웹에 사본을 두면 둘이 갈라지고, 갈라진 건 학생 화면에서만 드러난다.
export { diagnosisMap } from '@/data/diagnosisMap';
export { weaknessCandidatesFor } from '@/features/photo/flow/weakness-mistake-type-map';
export {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
} from '@/features/quiz/diagnosis-flow-engine';
