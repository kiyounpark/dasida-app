import * as ScreenOrientation from 'expo-screen-orientation';

// Serialize all orientation mutations through a single FIFO chain. Without this,
// rapid focus/blur sequences (cleanup's lockToPortrait + next focus's
// unlockAllOrientations) could resolve out of order and leave the device in the
// wrong lock state — e.g. portrait-locked when a tablet screen wanted unlocked.
// FIFO ordering guarantees the *most recently invoked* intent is the final state.
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

export function unlockAllOrientations(): Promise<void> {
  return enqueue(async () => {
    try {
      await ScreenOrientation.unlockAsync();
    } catch (error) {
      console.warn('[orientation-lock] unlockAllOrientations failed', error);
    }
  });
}
