import * as ScreenOrientation from 'expo-screen-orientation';

export async function lockToPortrait(): Promise<void> {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (error) {
    console.warn('[orientation-lock] lockToPortrait failed', error);
  }
}

export async function unlockAllOrientations(): Promise<void> {
  try {
    await ScreenOrientation.unlockAsync();
  } catch (error) {
    console.warn('[orientation-lock] unlockAllOrientations failed', error);
  }
}
