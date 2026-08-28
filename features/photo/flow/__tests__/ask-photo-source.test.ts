import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { askPhotoSource } from '../ask-photo-source';

type AlertButton = { text?: string; style?: string; onPress?: () => void };

const showActionSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions');
const alert = jest.spyOn(Alert, 'alert');

/**
 * 이 창의 모든 갈래는 반드시 resolve 해야 한다. 하나라도 새면
 * use-photo-flow의 busyRef가 true로 남아 사진 카드가 영영 안 눌린다.
 * 08.26에 학생이 사진 화면에 갇힌 것과 같은 종류의 사고다.
 */
describe('찍을지 고를지 묻는 창', () => {
  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  describe('아이폰 — 아래에서 올라오는 시트', () => {
    it('세 갈래를 순서대로 낸다 — 찍기, 앨범, 취소', async () => {
      showActionSheet.mockImplementation(() => {});
      askPhotoSource();

      expect(showActionSheet).toHaveBeenCalledWith(
        expect.objectContaining({
          options: ['사진 찍기', '앨범에서 고르기', '취소'],
          cancelButtonIndex: 2,
        }),
        expect.any(Function),
      );
    });

    it.each([
      [0, 'camera'],
      [1, 'library'],
      [2, null],
    ])('%i번을 누르면 %s', async (index, expected) => {
      showActionSheet.mockImplementation((_options, callback) => callback(index));

      await expect(askPhotoSource()).resolves.toBe(expected);
    });
  });

  describe('안드로이드 — 가운데 창', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    });

    it.each([
      ['사진 찍기', 'camera'],
      ['앨범에서 고르기', 'library'],
      ['취소', null],
    ])('%s를 누르면 %s', async (label, expected) => {
      alert.mockImplementation((_title, _message, buttons) => {
        (buttons as AlertButton[]).find((b) => b.text === label)?.onPress?.();
      });

      await expect(askPhotoSource()).resolves.toBe(expected);
    });

    it('바깥을 눌러 닫아도 풀린다 — 안 풀리면 사진 카드가 영영 안 눌린다', async () => {
      alert.mockImplementation((_title, _message, _buttons, options) => {
        (options as { onDismiss?: () => void }).onDismiss?.();
      });

      await expect(askPhotoSource()).resolves.toBeNull();
    });
  });
});
