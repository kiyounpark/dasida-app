import { getApps, initializeApp } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

export { diagnoseMethod } from './diagnosis-method';
export { explainDiagnosisNode } from './explain-diagnosis-node';
