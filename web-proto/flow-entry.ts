// esbuild 번들 진입점 — 앱의 진단 flow 엔진과 데이터를 웹에서 그대로 쓴다.
// 빌드: npx esbuild web-proto/flow-entry.ts --bundle --format=iife --global-name=DasidaFlow --tsconfig=tsconfig.json --outfile=web-proto/flow-bundle.js
export { methodOptions } from '@/data/diagnosisTree';
export { diagnosisMethodRoutingCatalog } from '@/data/diagnosis-method-routing';
export {
  advanceFromCheck,
  advanceFromChoice,
  advanceFromExplain,
  createDiagnosisFlowDraft,
  getDiagnosisFlow,
  getNode,
} from '@/features/quiz/diagnosis-flow-engine';
