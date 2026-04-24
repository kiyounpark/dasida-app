"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDiagnosisCompleted = logDiagnosisCompleted;
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
function logDiagnosisCompleted(params) {
    if (!params.accountKey.startsWith('user:')) {
        return; // 익명/게스트 유저는 리텐션 추적 대상이 아님
    }
    const uid = params.accountKey.slice(5);
    const db = (0, firestore_1.getFirestore)((0, app_1.getApp)());
    (0, firestore_1.addDoc)((0, firestore_1.collection)(db, 'users', uid, 'events'), {
        eventName: 'diagnosis_completed',
        source: params.source,
        weaknessId: params.weaknessId,
        examId: params.examId ?? null,
        problemNumber: params.problemNumber ?? null,
        completedAt: (0, firestore_1.serverTimestamp)(),
    }).catch(() => {
        // 리텐션 로깅 실패는 UX에 영향 없이 무시
    });
}
