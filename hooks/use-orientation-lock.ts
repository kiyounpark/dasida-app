import * as ScreenOrientation from 'expo-screen-orientation';

// Serialize all orientation mutations through a single FIFO chain so multiple
// invocations resolve in invocation order. Although tablets/phones now lock
// once at app start, the chain is kept as a defensive utility — its overhead
// is negligible and it preserves correctness if call sites multiply later.
let inFlight: Promise<void> = Promise.resolve();

function enqueue(work: () => Promise<void>): Promise<void> {
  // Use the same handler for fulfilled and rejected so one failed link doesn't
  // poison the chain.
  inFlight = inFlight.then(work, work);
  return inFlight;
}

export function lockToPortrait(): Promise<void> {
  return enqueue(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch (error) {
      console.warn('[orientation-lock] lockToPortrait failed', error);
    }
  });
}

export function lockToLandscape(): Promise<void> {
  return enqueue(async () => {
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } catch (error) {
      console.warn('[orientation-lock] lockToLandscape failed', error);
    }
  });
}
