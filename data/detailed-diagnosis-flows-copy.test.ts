import { detailedDiagnosisFlows } from '@/data/detailedDiagnosisFlows';

/**
 * 학생 화면에 나가는 수학 문장을 지킨다.
 *
 * 이차함수에서 a > 0 이면 아래로 볼록(∪)이라 최솟값을, a < 0 이면 위로 볼록(∩)이라
 * 최댓값을 가진다. `diff_judge`의 body가 이 대응을 뒤집어 쓴 채로 나가고 있었다
 * (2026.08.13 발견 → 08.27 수정, 그 사이 14일).
 *
 * 하필 같은 항목의 remedialBody("a > 0이면 최솟값, a < 0이면 최댓값")는 맞아서,
 * 한 화면 안에서 두 문장이 서로 반대말을 하고 있었다.
 *
 * 타입 검사도 기존 테스트 564개도 이런 종류는 못 잡는다 — 문장이 참인지는
 * 사람이 읽어야 알고, 사람은 12일을 지나쳤다. 그래서 여기에 박아둔다.
 */
const allCopy = JSON.stringify(detailedDiagnosisFlows);

describe('진단 보충 설명 — 볼록 방향과 최대·최소의 대응', () => {
  it('뒤집힌 문장이 남아 있지 않다', () => {
    expect(allCopy).not.toContain('위로 볼록이면 최솟값');
    expect(allCopy).not.toContain('아래로 볼록이면 최댓값');
  });

  it('올바른 대응으로 적혀 있다', () => {
    expect(allCopy).toContain('아래로 볼록이면 최솟값');
    expect(allCopy).toContain('위로 볼록이면 최댓값');
  });

  it('a의 부호 기준이 볼록 방향 설명과 같은 말을 한다', () => {
    // a > 0 = 아래로 볼록 = 최솟값. 위 문장과 어긋나면 학생이 한 화면에서 두 답을 본다.
    expect(allCopy).toContain('a > 0이면 최솟값, a < 0이면 최댓값');
  });
});
