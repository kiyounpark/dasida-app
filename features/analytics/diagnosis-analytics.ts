import { getApp } from 'firebase/app';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';

export type DiagnosisCompletedSource = 'exam' | 'unit';

interface LogDiagnosisCompletedParams {
  accountKey: string; // "user:{firebaseUid}" 형태
  source: DiagnosisCompletedSource;
  weaknessId: string;
  examId?: string;
  problemNumber?: number;
}

export function logDiagnosisCompleted(params: LogDiagnosisCompletedParams): void {
  const uid = params.accountKey.startsWith('user:')
    ? params.accountKey.slice(5)
    : params.accountKey;

  const db = getFirestore(getApp());

  addDoc(collection(db, 'users', uid, 'events'), {
    eventName: 'diagnosis_completed',
    source: params.source,
    weaknessId: params.weaknessId,
    examId: params.examId ?? null,
    problemNumber: params.problemNumber ?? null,
    completedAt: serverTimestamp(),
  }).catch(() => {
    // 리텐션 로깅 실패는 UX에 영향 없이 무시
  });
}
