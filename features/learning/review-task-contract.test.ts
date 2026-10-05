import { readFileSync } from 'fs';
import { join } from 'path';

// 1.0.12 서버 과제 모양 (가) — 종류를 가르는 약속 파일. 동작은 functions/tests/review-task-contract.test.ts가 본다.
describe('review-task-contract', () => {
  it('약속 파일은 아무것도 import하지 않는다 — 서버 의존이 앱 번들에 섞이지 않게', () => {
    const source = readFileSync(join(__dirname, '../../functions/src/review-task-contract.ts'), 'utf8');
    const importLines = source.split('\n').filter((line) => /^\s*import\s/.test(line) || /\brequire\(/.test(line));
    expect(importLines).toEqual([]);
  });
});
