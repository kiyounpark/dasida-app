import { PhotoFlowScreen } from '@/features/photo/screens/photo-flow-screen';

import PhotoRoute from '../photo';

/**
 * 학생용 사진 주소(app/photo.tsx)를 잠근다.
 *
 * 왜 필요한가: 이 주소는 08.26에 새로 냈고, 학생이 사진 오답노트에 닿는 유일한 문이다.
 * 개발자 주소(app/dev/photo-flow.tsx)는 출시 빌드에서 홈으로 되돌려보내므로 대체가 안 된다.
 * 파일이 지워지거나 다른 화면을 가리키게 되면 학생은 문 없는 기능을 갖게 되는데,
 * 그건 앱을 실제로 돌려보기 전에는 안 보인다.
 */
describe('학생용 사진 주소', () => {
  it('사진 오답노트 화면을 그대로 가리킨다', () => {
    expect(PhotoRoute).toBe(PhotoFlowScreen);
  });
});
