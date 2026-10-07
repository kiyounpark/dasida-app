import { updateLabelOf } from '../update-label';

const OTA_ID = '0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0';

/** 10.07 — 첫 OTA가 폰에 도착했는지 볼 자리. 받은 업데이트로 돌 때만 줄이 생겨야 「줄이 보이면 받은 것」이 된다 */
describe('updateLabelOf — 설정 버전 줄의 OTA 표시', () => {
  it('받은 업데이트로 돌면 id 앞 8자리', () => {
    expect(updateLabelOf({ isEnabled: true, isEmbeddedLaunch: false, updateId: OTA_ID })).toBe('업데이트 0b1c2d3e');
  });

  it('앱에 들어 있던 코드로 돌면(스토어 설치 첫 실행) 안 붙는다 — 내장본도 id를 가질 수 있어서 이걸로 가른다', () => {
    expect(updateLabelOf({ isEnabled: true, isEmbeddedLaunch: true, updateId: OTA_ID })).toBeNull();
  });

  it('개발 빌드(업데이트 꺼짐)·id 없음이면 안 붙는다', () => {
    expect(updateLabelOf({ isEnabled: false, isEmbeddedLaunch: false, updateId: null })).toBeNull();
    expect(updateLabelOf({ isEnabled: true, isEmbeddedLaunch: false, updateId: null })).toBeNull();
  });
});
