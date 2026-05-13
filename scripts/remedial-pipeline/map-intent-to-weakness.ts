import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { weaknessKeywords } from './keywords';
import type { WeaknessId } from '../../data/diagnosisMap';

type Explanation = {
  number: number;
  intent: string;
  text: string;
  formulas: unknown[];
  imageKey: string | null;
};

type Bundle = { examId: string; explanations: Explanation[] };

type MappedCase = {
  weaknessId: WeaknessId;
  examId: string;
  problemNumber: number;
  intent: string;
  matchedKeywords: string[];
};

const EXAM_DIR = join(__dirname, '..', '..', 'data', 'exam');
const OUTPUT = join(__dirname, 'intent-weakness-map.json');

function loadBundles(): Bundle[] {
  const subdirs = readdirSync(EXAM_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const bundles: Bundle[] = [];
  for (const sub of subdirs) {
    const file = join(EXAM_DIR, sub, 'explanations.json');
    try {
      const raw = readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw) as Bundle;
      bundles.push(parsed);
    } catch {
      // 파일 없음/파싱 실패는 무시 (extraction_report에서 잡힘)
    }
  }
  return bundles;
}

function mapBundle(bundle: Bundle): MappedCase[] {
  const out: MappedCase[] = [];
  for (const expl of bundle.explanations) {
    for (const [weaknessId, keywords] of Object.entries(weaknessKeywords)) {
      const matched = (keywords ?? []).filter((kw) => expl.intent.includes(kw));
      if (matched.length > 0) {
        out.push({
          weaknessId: weaknessId as WeaknessId,
          examId: bundle.examId,
          problemNumber: expl.number,
          intent: expl.intent,
          matchedKeywords: matched,
        });
      }
    }
  }
  return out;
}

const bundles = loadBundles();
const cases = bundles.flatMap(mapBundle);

const grouped: Partial<Record<WeaknessId, MappedCase[]>> = {};
for (const c of cases) {
  (grouped[c.weaknessId] ??= []).push(c);
}

writeFileSync(OUTPUT, JSON.stringify(grouped, null, 2), 'utf8');

console.log(`매핑 완료: ${OUTPUT}`);
for (const [weaknessId, list] of Object.entries(grouped)) {
  console.log(`  ${weaknessId}: ${(list as MappedCase[]).length}건`);
}
