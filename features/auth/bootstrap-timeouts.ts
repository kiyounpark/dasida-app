export const FIREBASE_AUTH_READY_TIMEOUT_MS = 10_000;

// Keep a small buffer so auth startup can fall back first, then the provider
// can make a final decision if bootstrap still has not completed.
export const LEARNER_BOOTSTRAP_TIMEOUT_MS = FIREBASE_AUTH_READY_TIMEOUT_MS + 5_000;
