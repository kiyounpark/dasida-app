import * as ImagePicker from 'expo-image-picker';

import { pickPhoto } from '../analyze-photo-request';

jest.mock('expo-image-picker', () => ({
  UIImagePickerPresentationStyle: { FULL_SCREEN: 'fullScreen' },
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const requestLibraryPermission = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const requestCameraPermission = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const launchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
const launchCamera = ImagePicker.launchCameraAsync as jest.Mock;

/**
 * 사진첩을 기본값(Automatic = 카드)으로 띄우면, 학생이 취소하고 돌아왔을 때
 * 헤더 뒤로가기가 터치를 못 받는다 — 화면 본문은 멀쩡한데 헤더만 죽는다.
 * 그러면 학생은 사진 화면에 갇히고, 앱을 껐다 켜는 것 말고는 나갈 길이 없다.
 * (2026.08.26 iPhone 17 시뮬레이터에서 재현 → 전체화면으로 바꿔 해소)
 *
 * 자동 검사로는 못 잡히는 종류라 이 옵션만 지킨다. 카메라도 같은
 * UIImagePickerController를 쓰므로 같은 값을 지킨다.
 */
describe('사진 띄우는 방식', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestLibraryPermission.mockResolvedValue({ granted: true, status: 'granted' });
    requestCameraPermission.mockResolvedValue({ granted: true, status: 'granted' });
    launchLibrary.mockResolvedValue({ canceled: true });
    launchCamera.mockResolvedValue({ canceled: true });
  });

  it('사진첩을 전체화면으로 띄운다 — 카드로 띄우면 닫은 뒤 뒤로가기가 죽는다', async () => {
    await pickPhoto('library');

    expect(launchLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ presentationStyle: 'fullScreen' }),
    );
    expect(launchCamera).not.toHaveBeenCalled();
  });

  it('카메라도 전체화면으로 띄운다 — 같은 컨트롤러라 같은 함정이 있다', async () => {
    await pickPhoto('camera');

    expect(launchCamera).toHaveBeenCalledWith(
      expect.objectContaining({ presentationStyle: 'fullScreen' }),
    );
    expect(launchLibrary).not.toHaveBeenCalled();
  });

  it('카메라를 고르면 카메라 권한을 묻는다 — 사진첩 권한으로는 카메라가 안 열린다', async () => {
    await pickPhoto('camera');

    expect(requestCameraPermission).toHaveBeenCalled();
    expect(requestLibraryPermission).not.toHaveBeenCalled();
  });

  it('학생이 취소하면 null을 돌려주고 던지지 않는다', async () => {
    await expect(pickPhoto('library')).resolves.toBeNull();
    await expect(pickPhoto('camera')).resolves.toBeNull();
  });
});

/**
 * 이 문구들은 업로드 화면 카드에 그대로 찍힌다 — 학생이 읽는 글이다.
 * 아이폰은 한 번 거부하면 다시 안 묻는다. 그래서 안내가 없으면 학생은 여기서
 * 끝난다 — 남은 길(카메라↔앨범)이 멀쩡히 있는데도.
 */
describe('권한을 거부당했을 때 학생이 읽는 글', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestLibraryPermission.mockResolvedValue({ granted: false, status: 'denied' });
    requestCameraPermission.mockResolvedValue({ granted: false, status: 'denied' });
  });

  // 이름이 재는 것보다 크지 않게: 이 둘은 "던지고 안 연다"까지만 잰다.
  // 무슨 글이 나가는지는 아래 셋이 잰다.
  it.each([
    ['camera', launchCamera],
    ['library', launchLibrary],
  ] as const)('%s가 막히면 던지고 열지 않는다', async (source, launcher) => {
    await expect(pickPhoto(source)).rejects.toThrow();
    expect(launcher).not.toHaveBeenCalled();
  });

  it('카메라가 막히면 설정과 앨범 두 길을 다 준다', async () => {
    await expect(pickPhoto('camera')).rejects.toThrow(/설정/);
    await expect(pickPhoto('camera')).rejects.toThrow(/앨범/);
  });

  it('사진첩이 막히면 설정과 카메라 두 길을 다 준다', async () => {
    await expect(pickPhoto('library')).rejects.toThrow(/설정/);
    await expect(pickPhoto('library')).rejects.toThrow(/찍어/);
  });

  it.each(['camera', 'library'] as const)(
    '%s — 상태 코드를 학생한테 안 보여준다',
    async (source) => {
      await expect(pickPhoto(source)).rejects.not.toThrow(/denied|undetermined/);
    },
  );
});
