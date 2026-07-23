import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { detailedDiagnosisFlows } from '../src/flow/detailedDiagnosisFlows';
import { methodOptions } from '../src/flow/diagnosisTree';
import { diagnosisMethodRoutingCatalog } from '../src/method-catalog';

// 사본 드리프트 감시 — 앱 원본과 functions 사본이 어긋나면 여기서 잡는다.
// (functions는 앱 코드를 import할 수 없어 사본을 두는 구조라, 이 테스트가 유일한 자동 안전망이다)

const FUNCTIONS_ROOT = path.join(__dirname, '..', '..');
const APP_ROOT = path.join(FUNCTIONS_ROOT, '..');

function vendoredBody(name: string): string {
  const raw = readFileSync(path.join(FUNCTIONS_ROOT, 'src', 'flow', `${name}.ts`), 'utf8');
  // 상단 사본 헤더 3줄(// 사본: …)을 제외한 본문
  return raw.split('\n').slice(3).join('\n');
}
function appOriginal(name: string): string {
  return readFileSync(path.join(APP_ROOT, 'data', `${name}.ts`), 'utf8');
}

for (const name of ['diagnosisMap', 'diagnosisTree', 'detailedDiagnosisFlows']) {
  test(`사본 동기화: functions/src/flow/${name}.ts === data/${name}.ts`, () => {
    assert.equal(
      vendoredBody(name),
      appOriginal(name),
      `사본이 원본과 다릅니다. 갱신: cp data/${name}.ts functions/src/flow/${name}.ts 후 헤더 3줄 복원`,
    );
  });
}

test('트리 무결성: 모든 노드 참조(nextNodeId)가 실제 존재한다 (dangling 0)', () => {
  for (const [methodId, flow] of Object.entries(detailedDiagnosisFlows)) {
    const ids = new Set(Object.keys(flow.nodes));
    assert.ok(ids.has(flow.startNodeId), `${methodId}: startNodeId 없음`);
    for (const node of Object.values(flow.nodes)) {
      const refs: string[] = [];
      if (node.kind === 'choice') node.options.forEach((o) => refs.push(o.nextNodeId));
      if (node.kind === 'explain') refs.push(node.primaryNextNodeId, node.secondaryNextNodeId);
      if (node.kind === 'check') {
        node.options.forEach((o) => refs.push(o.nextNodeId));
        refs.push(node.dontKnowNextNodeId);
      }
      for (const ref of refs) {
        assert.ok(ids.has(ref), `dangling: ${methodId}/${node.id} → ${ref}`);
      }
    }
  }
});

test('트리 무결성: 모든 flow에 final 노드가 있다', () => {
  for (const [methodId, flow] of Object.entries(detailedDiagnosisFlows)) {
    assert.ok(
      Object.values(flow.nodes).some((n) => n.kind === 'final'),
      `${methodId}: final 노드 없음`,
    );
  }
});

test('사본 간 일치: methodOptions의 모든 id가 카탈로그(method-catalog)에 있다', () => {
  // diagnoseFlow.matchText가 두 사본을 조인하므로, id 집합이 어긋나면 라우팅이 누락된다.
  const catalogIds = new Set(Object.keys(diagnosisMethodRoutingCatalog));
  for (const m of methodOptions) {
    assert.ok(catalogIds.has(m.id), `카탈로그에 없는 method id: ${m.id}`);
  }
});

test('사본 간 일치: methodOptions 수와 flow 수가 같다', () => {
  assert.equal(methodOptions.length, Object.keys(detailedDiagnosisFlows).length);
});
