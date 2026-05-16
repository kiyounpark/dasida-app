/**
 * 매핑 점검용 추출 스크립트 (1회성 감사 도구)
 *
 * 진단 트리가 만들어낼 수 있는 모든 (풀이법 → 선택지 → weaknessId → 보충흐름)
 * 매핑을 한 줄씩 펼쳐, 매핑 검사 친구가 적절성을 채점할 수 있는 표를 만든다.
 *
 * 실행: npx tsx scripts/remedial-pipeline/extract-mapping-audit.ts
 * 결과: scripts/remedial-pipeline/mapping-audit-input.json
 *
 * gates.ts / state.json 과 무관. 자동 루틴을 건드리지 않는다.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { diagnosisTree, methodOptions } from '../../data/diagnosisTree';
import { detailedDiagnosisFlows } from '../../data/detailedDiagnosisFlows';
import { diagnosisMap } from '../../data/diagnosisMap';
import { remedialFlows } from '../../data/review-remedial-flows';

/**
 * methodFallbackWeakness 는 export 되지 않으므로, 생성된 흐름의
 * `*_fallback_final` FinalNode 에서 풀이법별 폴백 weaknessId 를 역추출한다.
 */
function fallbackWeaknessByMethod(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [methodId, flow] of Object.entries(
    detailedDiagnosisFlows as Record<string, any>,
  )) {
    for (const node of Object.values(flow.nodes ?? {}) as any[]) {
      if (
        node.kind === 'final' &&
        typeof node.id === 'string' &&
        node.id.endsWith('_fallback_final')
      ) {
        out[methodId] = node.weaknessId;
        break;
      }
    }
  }
  return out;
}

type Row = {
  rowId: string;
  source: 'choice' | 'fallback';
  methodId: string;
  methodLabel: string;
  /** 학생이 진단에서 실제로 누르는 문구 (fallback 은 "확인문제 연속 실패") */
  studentSaid: string;
  weaknessId: string;
  weaknessLabel: string;
  weaknessDesc: string;
  /** 보충흐름이 실제로 보여주는 첫 설명 카드들의 제목 (없으면 표시) */
  remedialTitles: string[];
  remedialMissing: boolean;
};

function remedialTitlesOf(weaknessId: string): { titles: string[]; missing: boolean } {
  const flow = (remedialFlows as Record<string, any>)[weaknessId];
  if (!flow || !flow.nodes) return { titles: [], missing: true };
  const titles: string[] = [];
  for (const node of Object.values(flow.nodes) as any[]) {
    if ((node.kind === 'explain' || node.kind === 'summary') && node.title) {
      titles.push(String(node.title));
    }
    if (titles.length >= 5) break;
  }
  return { titles, missing: false };
}

const rows: Row[] = [];
const methodLabelOf = (id: string) =>
  methodOptions.find((m) => m.id === id)?.labelKo ?? id;

// 1. 진단 트리 선택지 매핑 (학생이 직접 누르는 분기)
for (const [methodId, def] of Object.entries(diagnosisTree as Record<string, any>)) {
  for (const choice of def.choices ?? []) {
    const wId = choice.weaknessId as string;
    const w = (diagnosisMap as Record<string, any>)[wId] ?? {};
    const { titles, missing } = remedialTitlesOf(wId);
    rows.push({
      rowId: `${methodId}/${choice.id}`,
      source: 'choice',
      methodId,
      methodLabel: methodLabelOf(methodId),
      studentSaid: choice.text,
      weaknessId: wId,
      weaknessLabel: w.labelKo ?? '(diagnosisMap 없음)',
      weaknessDesc: w.desc ?? '',
      remedialTitles: titles,
      remedialMissing: missing,
    });
  }
}

// 2. 풀이법별 폴백 매핑 (확인문제 연속 실패 시 떨어지는 자리)
for (const [methodId, wId] of Object.entries(fallbackWeaknessByMethod())) {
  const w = (diagnosisMap as Record<string, any>)[wId] ?? {};
  const { titles, missing } = remedialTitlesOf(wId);
  rows.push({
    rowId: `${methodId}/__fallback__`,
    source: 'fallback',
    methodId,
    methodLabel: methodLabelOf(methodId),
    studentSaid: `[폴백] ${methodLabelOf(methodId)} 풀이법 선택 후 확인문제를 연속으로 틀림`,
    weaknessId: wId,
    weaknessLabel: w.labelKo ?? '(diagnosisMap 없음)',
    weaknessDesc: w.desc ?? '',
    remedialTitles: titles,
    remedialMissing: missing,
  });
}

const outPath = join(
  process.cwd(),
  'scripts/remedial-pipeline/mapping-audit-input.json',
);
writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8');

const choiceN = rows.filter((r) => r.source === 'choice').length;
const fbN = rows.filter((r) => r.source === 'fallback').length;
const missingN = rows.filter((r) => r.remedialMissing).length;
console.log(`총 매핑 행: ${rows.length}개 (선택지 ${choiceN} + 폴백 ${fbN})`);
console.log(`보충흐름 없음(빈 구멍): ${missingN}개`);
console.log(`출력: ${outPath}`);
