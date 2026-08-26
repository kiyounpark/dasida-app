import * as ImagePicker from 'expo-image-picker';

import { pickPhoto } from '../analyze-photo-request';

jest.mock('expo-image-picker', () => ({
  UIImagePickerPresentationStyle: { FULL_SCREEN: 'fullScreen' },
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const requestPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

/**
 * 사진첩을 기본값(Automatic = 카드)으로 띄우면, 학생이 취소하고 돌아왔을 때
 * 헤더 뒤로가기가 터치를 못 받는다 — 화면 본문은 멀쩡한데 헤더만 죽는다.
 * 그러면 학생은 사진 화면에 갇히고, 앱을 껐다 켜는 것 말고는 나갈 길이 없다.
 * (2026.08.26 iPhone 17 시뮬레이터에서 재현 → 전체화면으로 바꿔 해소)
 *
 * 자동 검사로는 못 잡히는 종류라 이 옵션만 지킨다.
 */
describe('사진첩 띄우는 방식', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestPermission.mockResolvedValue({ granted: true, status: 'granted' });
    launchLibrary.mockResolvedValue({ canceled: true });
  });

  it('전체화면으로 띄운다 — 카드로 띄우면 닫은 뒤 뒤로가기가 죽는다', async () => {
    await pickPhoto();

    expect(launchLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ presentationStyle: 'fullScreen' }),
    );
  });

  it('학생이 취소하면 null을 돌려주고 던지지 않는다', async () => {
    await expect(pickPhoto()).resolves.toBeNull();
  });
});
