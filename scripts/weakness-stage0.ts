#!/usr/bin/env tsx
/**
 * 0단계 — 약점 빈 칸을 채우기 전에 코드로 먼저 거른다.
 *
 * 설계는 `docs/weakness-routine-v2-2026-09-20.md` 2절. 세 모델(Fable · gpt-5.6-sol · gpt-6-astra)에
 * 걸어서 정한 항목이다.
 *
 * ⚠️ **코드가 온전히 막는 건 09.16에 깨진 4건 중 「공식 기억」 하나뿐이다.**
 * 나머지는 경고와 누락 확인까지고, 수학은 `math-checker` 자리다.
 * 여기서 "통과"가 나와도 그 칸을 만들 수 있다는 뜻이 아니다 — 못 만들 칸이 아니라는 뜻이다.
 *
 * 쓰는 법
 *   tsx scripts/weakness-stage0.ts <풀이법id>          판 시작 전. A(칸 상태) + B(기존 재료)
 *   tsx scripts/weakness-stage0.ts --set <세트.json>    세트가 나올 때마다. C + D + E
 *   tsx scripts/weakness-stage0.ts --methods           풀이법 id 목록만 보기
 *
 * --set 이 받는 json (weakness-author가 낸 세트를 옮겨 적은 것)
 *   { "weaknessId": "g3_seq_sum_multiply_slip",
 *     "labelKo": "...", "desc": "...", "tip": "...",
 *     "choiceText": "선택지 문장", "methodId": "sequence" }
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { diagnosisMap, weaknessOrder, type WeaknessId } from '../data/diagnosisMap';
import { diagnosisTree, methodOptions, type SolveMethodId } from '../data/diagnosisTree';
import { practiceMap } from '../data/practiceMap';
import { reviewContentMap } from '../data/review-content-map';
import { remedialFlows } from '../data/review-remedial-flows';
import { MISTAKE_TYPE_IDS } from '../features/photo/types';
import {
  weaknessCandidatesFor,
  weaknessMistakeType,
} from '../features/photo/flow/weakness-mistake-type-map';

const ROOT = join(__dirname, '..');

/** 실수 유형 한글 이름 — features/photo/flow/mistake-types.ts와 같은 값 */
const TYPE_LABEL: Record<string, string> = {
  concept_gap: '개념 구멍',
  formula_recall: '공식 기억',
  setup_error: '식 세우기',
  calc_slip: '계산 손실수',
  procedure_miss: '절차 누락',
  answer_read: '마무리 해석',
};

/**
 * D — 마음가짐 문구 단어표.
 * 알려진 표현만 잡는 블랙리스트다. 경고까지고 탈락 근거가 아니다.
 * 처방은 손으로 할 동작 하나라는 규칙(커밋 a76a9db)을 기계로 반만 본 것이다.
 */
const MINDSET_WORDS = ['기억하세요', '반드시', '다시 확인', '명심', '주의하세요', '잊지 마'];

/**
 * D — 학생 행동 단정 정규식.
 * 사진 흐름이 학생에게 묻는 건 "이 줄에서 틀린 게 맞아?" 하나뿐이다
 * (features/photo/hooks/use-photo-flow.ts:337). 왜 틀렸는지는 안 묻는다.
 */
const ASSERTION_PATTERNS = [/[가-힣]했는데/, /[가-힣]썼는데/, /알고 있지만/, /알고 있는데/];

function line(char = '─', n = 62) {
  return char.repeat(n);
}

/**
 * `weaknessCandidatesFor`가 걸러내는 두루뭉술 약점.
 * 원본이 export를 안 해서 옮겨 적었다 — `weakness-mistake-type-map.ts:98`.
 * 바뀌면 여기도 같이 고친다.
 *
 * 이게 왜 중요하냐 — 후보가 두루뭉술한 것뿐인 칸은 **차 있는 게 아니다.**
 * 거기에 구체적 약점을 하나 넣으면 그게 두루뭉술한 걸 밀어내서 후보가 여전히 1개다.
 * 즉 primary가 안 죽는다. 오히려 채워야 할 칸이다 (Fable 검수 2026.09.20에서 잡힘).
 */
const VAGUE_WEAKNESSES: string[] = ['calc_repeated_error', 'basic_concept_needed'];

/** 걸러지기 전 후보 — 그 칸에 실제로 달린 것 전부 */
function rawCandidates(methodId: SolveMethodId, mistakeType: string): WeaknessId[] {
  const choices = diagnosisTree[methodId]?.choices ?? [];
  const seen = new Set<WeaknessId>();
  for (const c of choices) {
    if (weaknessMistakeType[c.weaknessId] === mistakeType) seen.add(c.weaknessId);
  }
  return [...seen];
}

function isSolveMethodId(v: string): v is SolveMethodId {
  return Object.prototype.hasOwnProperty.call(diagnosisTree, v);
}

// ────────────────────────────────────────────────────────────────
// A — 대상 풀이법의 6칸 상태
// ────────────────────────────────────────────────────────────────

type CellState = {
  mistakeType: string;
  label: string;
  candidates: WeaknessId[];
  raw: WeaknessId[];
  verdict: 'empty' | 'vague-only' | 'single' | 'multiple';
};

function cellStates(methodId: SolveMethodId): CellState[] {
  return MISTAKE_TYPE_IDS.map((mistakeType) => {
    const candidates = weaknessCandidatesFor(methodId, mistakeType);
    const raw = rawCandidates(methodId, mistakeType);
    const allVague =
      candidates.length > 0 && candidates.every((id) => VAGUE_WEAKNESSES.includes(id));

    let verdict: CellState['verdict'];
    if (candidates.length === 0) verdict = 'empty';
    else if (allVague) verdict = 'vague-only';
    else if (candidates.length === 1) verdict = 'single';
    else verdict = 'multiple';

    return { mistakeType, label: TYPE_LABEL[mistakeType] ?? mistakeType, candidates, raw, verdict };
  });
}

function printA(methodId: SolveMethodId) {
  const states = cellStates(methodId);
  const methodLabel = methodOptions.find((m) => m.id === methodId)?.labelKo ?? methodId;

  console.log(`\n## A — ${methodLabel} (${methodId}) 6칸 상태\n`);

  const MARK = {
    empty: '⬜ 빈 칸    ',
    'vague-only': '🟨 두루뭉술만',
    single: '🚫 차 있음  ',
    multiple: '⚠️ 여럿     ',
  } as const;

  for (const s of states) {
    const ids = s.candidates.length ? s.candidates.join(', ') : '—';
    const hidden = s.raw.length > s.candidates.length
      ? `   (걸러진 것: ${s.raw.filter((r) => !s.candidates.includes(r)).join(', ')})`
      : '';
    console.log(`  ${MARK[s.verdict]}  ${s.label.padEnd(7)} ${ids}${hidden}`);
  }

  const blocked = states.filter((s) => s.verdict === 'single' || s.verdict === 'multiple');
  const open = states.filter((s) => s.verdict === 'empty' || s.verdict === 'vague-only');

  console.log('');
  if (blocked.length) {
    console.log('🚫 **손대지 마라** — 아래 칸은 이미 차 있다.');
    for (const s of blocked) {
      if (s.verdict === 'single') {
        console.log(
          `   ${s.label} — 여기 하나 더 넣으면 후보가 2개가 되고 primaryWeaknessId가 null로 떨어진다`,
        );
        console.log(`     (features/photo/hooks/use-photo-flow.ts:491)`);
      } else {
        console.log(`   ${s.label} — 이미 후보가 ${s.candidates.length}개라 primary가 이미 null이다`);
      }
    }
    console.log('');
  }

  const vague = states.filter((s) => s.verdict === 'vague-only');
  if (vague.length) {
    console.log('🟨 **채울 수 있다** — 아래 칸은 두루뭉술한 것만 달려 있다.');
    for (const s of vague) {
      console.log(
        `   ${s.label} — 지금은 ${s.candidates.join(', ')}뿐이다. 구체적인 걸 하나 넣으면`,
      );
      console.log(
        `     그게 두루뭉술한 걸 밀어내서 후보는 여전히 1개다 (weakness-mistake-type-map.ts:136-138)`,
      );
    }
    console.log('');
  }

  console.log(`✅ 열린 칸 ${open.length}개: ${open.map((s) => s.label).join(' · ') || '없음'}`);
  console.log(
    '\n⚠️ 열렸다는 건 구조적 사실일 뿐이다. 만들 수 있다는 뜻도, 만들어야 한다는 뜻도 아니다.',
  );
}

// ────────────────────────────────────────────────────────────────
// B — 기존 재료 덤프 (판정하지 않는다. 건네기만 한다)
// ────────────────────────────────────────────────────────────────

function printB(methodId: SolveMethodId) {
  const step = diagnosisTree[methodId];
  const attached = [...new Set(step.choices.map((c) => c.weaknessId))];

  console.log(`\n${line()}\n## B — 이 풀이법에 이미 달린 재료\n`);
  console.log('판정하지 않는다. weakness-author가 읽을 재료를 그대로 옮긴 것이다.\n');

  console.log(`### 선택지 ${step.choices.length}개\n`);
  for (const c of step.choices) {
    console.log(`  [${c.id}] → ${c.weaknessId}`);
    console.log(`    "${c.text}"`);
  }

  console.log(`\n### 달린 약점 ${attached.length}개\n`);
  for (const id of attached) {
    const info = diagnosisMap[id];
    if (!info) {
      console.log(`  ${id} — ⚠️ diagnosisMap에 없다`);
      continue;
    }
    const tag = weaknessMistakeType[id];
    console.log(`  ${id}  [${TYPE_LABEL[tag] ?? tag}]`);
    console.log(`    이름 — ${info.labelKo}`);
    console.log(`    설명 — ${info.desc}`);
    console.log(`    처방 — ${info.tip}`);

    const review = reviewContentMap[id];
    if (review) {
      console.log(`    복습 첫 질문 — ${review.heroPrompt}`);
      // 자르지 않는다 — 에이전트가 "이미 가르치고 있나"를 보려면 본문이 온전해야 한다
      review.thinkingSteps.forEach((s, i) => {
        console.log(`    복습 ${i + 1}단계 — ${s.title}`);
        for (const l of s.body.split('\n')) console.log(`      ${l}`);
        if (s.example) console.log(`      예제: ${s.example}`);
        for (const c of s.choices ?? []) {
          const flow = c.remedialFlowStartNodeId ? ` → ${c.remedialFlowStartNodeId}` : '';
          console.log(`      ${c.correct ? '○' : '·'} ${c.text}${flow}`);
        }
      });
    } else {
      console.log(`    복습 콘텐츠 — 없음`);
    }
    console.log(`    보충 흐름 — ${remedialFlows[id] ? '있음' : '없음'}`);
    console.log('');
  }

  console.log(
    '⚠️ "복습 단계가 이미 가르치고 있나"는 여기서 판정하지 않는다. 09.16 「공식 기억」이 그 자리였다.',
  );
}

// ────────────────────────────────────────────────────────────────
// C — 선택지 문장 중복
// ────────────────────────────────────────────────────────────────

/** 공백·문장부호를 걷어내 비교한다 — 글자만 다르고 같은 문장을 잡으려고 */
function normalize(s: string) {
  return s.replace(/[\s.,·…"'()]/g, '');
}

type ChoiceRef = { methodId: string; choiceId: string; text: string; weaknessId: string };

function allChoices(): ChoiceRef[] {
  const out: ChoiceRef[] = [];
  for (const [methodId, step] of Object.entries(diagnosisTree)) {
    for (const c of step.choices)
      out.push({ methodId, choiceId: c.id, text: c.text, weaknessId: c.weaknessId });
  }
  return out;
}

/** selfId — 이미 코드에 들어간 약점을 다시 검사할 때 자기 선택지를 겹침으로 세지 않으려고 */
function printC(newText?: string, selfId?: string) {
  console.log(`\n${line()}\n## C — 선택지 문장 중복\n`);
  const choices = allChoices();

  if (newText) {
    const norm = normalize(newText);
    const hits = choices.filter(
      (c) => normalize(c.text) === norm && !(selfId && c.weaknessId === selfId),
    );
    if (hits.length) {
      console.log('🚫 겹침:');
      for (const h of hits) console.log(`   ${h.methodId}/${h.choiceId} — "${h.text}"`);
    } else {
      console.log('✅ 겹치는 문장 없음');
    }
    console.log('');
  }

  // 기존 트리 안의 중복도 같이 본다. 2026.09.20 기준 0건이다 —
  // v2 문서가 한때 "4건 있다"고 적었는데 재현이 안 됐다 (astra 검수에서 잡힘)
  const seen = new Map<string, ChoiceRef[]>();
  for (const c of choices) {
    const k = normalize(c.text);
    seen.set(k, [...(seen.get(k) ?? []), c]);
  }
  const dupes = [...seen.values()].filter((v) => v.length > 1);
  if (dupes.length) {
    console.log(`참고 — 기존 트리 안에도 똑같은 문장이 ${dupes.length}쌍 있다:`);
    for (const group of dupes) {
      console.log(`   "${group[0].text}"`);
      console.log(`     ${group.map((g) => `${g.methodId}/${g.choiceId}`).join(' · ')}`);
    }
  }

  console.log('\n⚠️ 글자만 본다. 뜻이 겹치는 건 못 잡는다 — 그건 사람이 본다.');
}

// ────────────────────────────────────────────────────────────────
// D — 문장 린트 (경고만. 게이트가 아니다)
// ────────────────────────────────────────────────────────────────

type LintHit = { field: string; rule: string; matched: string[]; text: string };

/**
 * 필드마다 거는 규칙이 다르다.
 * - tip = 처방이라 마음가짐 문구를 본다
 * - desc = 앱이 학생에게 하는 말이라 행동 단정을 본다
 * - 선택지 문장은 **학생이 자기 입으로 고르는 말**이라 행동 단정을 안 건다.
 *   "Sₙ으로 aₙ을 구했는데…"는 학생 자기보고지 앱의 단정이 아니다 (astra 검수에서 잡힘)
 * - labelKo는 검사하지 않는다 — "계산 금지"가 09.19에 무효가 됐다
 */
const FIELD_RULES: Record<string, ('mindset' | 'assertion')[]> = {
  tip: ['mindset'],
  desc: ['assertion'],
};

function lint(fields: { field: string; text: string }[]): LintHit[] {
  const hits: LintHit[] = [];
  for (const { field, text } of fields) {
    if (!text) continue;
    const rules = FIELD_RULES[field] ?? [];

    if (rules.includes('mindset')) {
      const found = MINDSET_WORDS.filter((w) => text.includes(w));
      if (found.length) hits.push({ field, rule: '마음가짐 문구', matched: found, text });
    }
    if (rules.includes('assertion')) {
      const found = ASSERTION_PATTERNS.map((re) => text.match(re)?.[0]).filter(
        (m): m is string => Boolean(m),
      );
      if (found.length) hits.push({ field, rule: '학생 행동 단정', matched: found, text });
    }
  }
  return hits;
}

function printD(fields: { field: string; text: string }[]) {
  console.log(`\n${line()}\n## D — 문장 린트 (경고만)\n`);
  const hits = lint(fields);
  if (!hits.length) {
    console.log('✅ 걸린 것 없음');
  } else {
    for (const h of hits) {
      console.log(`⚠️ ${h.field} — ${h.rule}: ${h.matched.map((m) => `"${m}"`).join(', ')}`);
      console.log(`   ${h.text}`);
    }
  }
  console.log(`\n검사한 자리: ${Object.entries(FIELD_RULES).map(([f, r]) => `${f}(${r.join('·')})`).join(' · ')}`);
  console.log('⚠️ 알려진 표현만 잡는 단어표다. 안 걸렸다고 괜찮다는 뜻이 아니고,');
  console.log('   걸렸다고 탈락도 아니다. 판단은 사람이 한다.');
}

// ────────────────────────────────────────────────────────────────
// E — 착지 완결성 (새 id가 8곳에 다 있나)
// ────────────────────────────────────────────────────────────────

/**
 * functions는 별도 패키지라 import가 안 된다 — 텍스트로 읽는다.
 *
 * ⚠️ 파일 전체에서 찾으면 안 된다. `solveMethodIds`에도 'sequence' 같은 값이 있어서
 * 약점이 아닌 id가 통과한다 (learning-history.ts:42). 그래서 해당 블록만 잘라 그 안에서 본다.
 */
function serverHas(weaknessId: string): { inOrder: boolean; inLabels: boolean } {
  const p = join(ROOT, 'functions/src/learning-history.ts');
  if (!existsSync(p)) return { inOrder: false, inLabels: false };
  const src = readFileSync(p, 'utf8');

  const orderBlock = src.match(/const weaknessOrder\s*=\s*\[([\s\S]*?)\]\s*as const;/)?.[1] ?? '';
  const labelBlock = src.match(/const weaknessLabels[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';

  // 쉼표가 없는 마지막 줄도 잡히게 — 따옴표로 감싼 값 자체를 본다
  const inOrder = new RegExp(`['"]${weaknessId}['"]`).test(orderBlock);
  // 키는 따옴표가 있을 수도 없을 수도 있다
  const inLabels = new RegExp(`^\\s*['"]?${weaknessId}['"]?\\s*:`, 'm').test(labelBlock);

  return { inOrder, inLabels };
}

/** 빠진 곳 개수를 돌려준다 — 호출부가 종료 코드로 쓴다 */
function printE(weaknessId: string, methodId?: string): number {
  console.log(`\n${line()}\n## E — 착지 완결성: ${weaknessId}\n`);

  const id = weaknessId as WeaknessId;
  const server = serverHas(weaknessId);
  const flowFile = join(ROOT, 'data/remedial-flows', `${weaknessId}.ts`);

  // union은 타입이라 런타임에 안 보인다 — 텍스트로 읽는다
  const mapSrc = readFileSync(join(ROOT, 'data/diagnosisMap.ts'), 'utf8');
  const unionBlock = mapSrc.match(/export type WeaknessId =([\s\S]*?);/)?.[1] ?? '';

  const checks: { where: string; ok: boolean; note?: string }[] = [
    {
      where: 'diagnosisMap — WeaknessId union',
      ok: new RegExp(`\\|\\s*['"]${weaknessId}['"]`).test(unionBlock),
      note: '타입이라 런타임엔 안 보인다. 빠지면 tsc가 잡는다',
    },
    { where: 'diagnosisMap — weaknessOrder', ok: weaknessOrder.includes(id) },
    { where: 'diagnosisMap — 본문', ok: Boolean(diagnosisMap[id]) },
    { where: 'weaknessMistakeType — 태그', ok: Boolean(weaknessMistakeType[id]) },
    {
      where: 'diagnosisTree — 선택지',
      ok: Object.values(diagnosisTree).some((s) => s.choices.some((c) => c.weaknessId === id)),
    },
    { where: 'practiceMap — 확인 문제', ok: Boolean(practiceMap[id]), note: 'Record라 tsc도 잡는다' },
    {
      where: 'review-content-map — heroPrompt·thinkingSteps',
      ok: Boolean(reviewContentMap[id]),
      note: '⚠️ Partial이라 빠져도 컴파일이 안 깨진다',
    },
    {
      where: `remedial-flows/${weaknessId}.ts 파일`,
      ok: existsSync(flowFile),
    },
    {
      where: 'review-remedial-flows — 등록',
      ok: Boolean(remedialFlows[id]),
      note: '⚠️ 파일만 만들고 등록을 빠뜨리면 오답을 눌러도 보충 화면이 안 뜬다',
    },
    { where: 'functions — weaknessOrder (zod enum)', ok: server.inOrder, note: '없으면 서버가 거부' },
    {
      where: 'functions — weaknessLabels',
      ok: server.inLabels,
      note: 'Record라 빠지면 functions tsc가 깨진다',
    },
  ];

  for (const c of checks) {
    const mark = c.ok ? '✅' : '❌';
    console.log(`  ${mark} ${c.where}${c.ok ? '' : c.note ? `  — ${c.note}` : ''}`);
  }

  const missing = checks.filter((c) => !c.ok);
  console.log('');
  if (missing.length === 0) {
    console.log(`✅ ${checks.length}곳 다 있다`);
  } else {
    console.log(`❌ ${missing.length}곳 빠짐 — 이대로 넣으면 반쪽이다`);
  }

  if (methodId && isSolveMethodId(methodId)) {
    const tag = weaknessMistakeType[id];
    if (tag) {
      const after = weaknessCandidatesFor(methodId, tag);
      console.log(
        `\n넣고 난 뒤 ${methodId} × ${TYPE_LABEL[tag] ?? tag} 칸: 후보 ${after.length}개 ` +
          `→ primaryWeaknessId ${after.length === 1 ? `'${after[0]}'` : 'null'}`,
      );
    }
  }

  return missing.length;
}

// ────────────────────────────────────────────────────────────────

function printMethods() {
  console.log('\n풀이법 id 목록\n');
  for (const m of methodOptions) {
    if (m.id === 'unknown') continue;
    const empty = cellStates(m.id).filter(
      (s) => s.verdict === 'empty' || s.verdict === 'vague-only',
    ).length;
    console.log(`  ${m.id.padEnd(24)} ${m.labelKo}   (빈 칸 ${empty}/6)`);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`0단계 — 약점 빈 칸을 채우기 전에 코드로 먼저 거른다.

  tsx scripts/weakness-stage0.ts <풀이법id>        판 시작 전 (A + B)
  tsx scripts/weakness-stage0.ts --set <세트.json>  세트 검사 (C + D + E)
  tsx scripts/weakness-stage0.ts --methods         풀이법 목록

설계: docs/weakness-routine-v2-2026-09-20.md 2절`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  if (args[0] === '--methods') {
    printMethods();
    return;
  }

  if (args[0] === '--set') {
    const path = args[1];
    if (!path) {
      console.error('세트 json 경로를 주세요.');
      process.exit(1);
    }
    if (!existsSync(path)) {
      console.error(`파일이 없습니다: ${path}`);
      process.exit(1);
    }
    const set = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
    if (!set.weaknessId) {
      console.error('세트 json에 weaknessId가 없습니다.');
      process.exit(1);
    }

    console.log(`\n${line('━')}\n0단계 · 세트 검사 — ${set.weaknessId}\n${line('━')}`);
    printC(set.choiceText, set.weaknessId);
    printD([
      { field: 'labelKo', text: set.labelKo ?? '' },
      { field: 'desc', text: set.desc ?? '' },
      { field: 'tip', text: set.tip ?? '' },
      { field: '선택지 문장', text: set.choiceText ?? '' },
    ]);
    const missing = printE(set.weaknessId, set.methodId);
    console.log(`\n${line('━')}`);
    console.log('수학은 여기서 안 본다. 반례·거짓·범위는 math-checker 자리다.');
    // 붙여넣기용이라 출력이 본체지만, 나중에 루프에 넣을 때 신호가 없으면 안 된다
    if (missing > 0) process.exit(1);
    return;
  }

  const methodId = args[0];
  if (!isSolveMethodId(methodId)) {
    console.error(`모르는 풀이법 id: ${methodId}`);
    console.error('--methods 로 목록을 보세요.');
    process.exit(1);
  }

  console.log(`\n${line('━')}\n0단계 · 판 시작 전 — ${methodId}\n${line('━')}`);
  printA(methodId);
  printB(methodId);
  console.log(`\n${line('━')}`);
  console.log('이 결과를 weakness-author의 「받는 것」 2·3번으로 그대로 넘긴다.');
}

main();
