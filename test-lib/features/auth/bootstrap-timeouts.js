"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNER_BOOTSTRAP_TIMEOUT_MS = exports.FIREBASE_AUTH_READY_TIMEOUT_MS = void 0;
exports.FIREBASE_AUTH_READY_TIMEOUT_MS = 10_000;
// Keep a small buffer so auth startup can fall back first, then the provider
// can make a final decision if bootstrap still has not completed.
exports.LEARNER_BOOTSTRAP_TIMEOUT_MS = exports.FIREBASE_AUTH_READY_TIMEOUT_MS + 5_000;
