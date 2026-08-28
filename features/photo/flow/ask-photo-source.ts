import { ActionSheetIOS, Alert, Platform } from 'react-native';

import type { PhotoSource } from './analyze-photo-request';

const TITLE = '틀린 문제 사진';
const CAMERA_LABEL = '사진 찍기';
const LIBRARY_LABEL = '앨범에서 고르기';
const CANCEL_LABEL = '취소';

/**
 * 찍을지 고를지 묻는다. 취소하면 null — 던지지 않는다.
 *
 * 웹(dasida-proto)에서는 `<input type="file" accept="image/*">` 한 줄에
 * 브라우저가 같은 세 갈래를 얹어준다. 앱은 그게 없어서 직접 낸다.
 *
 * ⚠️ 모든 갈래가 반드시 resolve 해야 한다. 하나라도 새면 use-photo-flow의
 * busyRef가 true로 남아 사진 카드가 영영 안 눌린다.
 */
export function askPhotoSource(): Promise<PhotoSource | null> {
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: TITLE,
          options: [CAMERA_LABEL, LIBRARY_LABEL, CANCEL_LABEL],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) resolve('camera');
          else if (index === 1) resolve('library');
          else resolve(null);
        },
      );
    });
  }

  // 안드로이드엔 시트가 없다 — 같은 세 갈래를 가운데 창으로 낸다.
  // onDismiss가 없으면 바깥을 눌러 닫았을 때 promise가 영영 안 풀린다.
  return new Promise((resolve) => {
    Alert.alert(
      TITLE,
      undefined,
      [
        { text: CAMERA_LABEL, onPress: () => resolve('camera') },
        { text: LIBRARY_LABEL, onPress: () => resolve('library') },
        { text: CANCEL_LABEL, style: 'cancel', onPress: () => resolve(null) },
      ],
      { onDismiss: () => resolve(null) },
    );
  });
}
