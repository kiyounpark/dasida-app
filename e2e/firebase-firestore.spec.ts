import { test, expect } from '@playwright/test';
import { getTestUserCredentials, readFirestoreCollection } from './firebase-admin';

// 에뮬레이터 미실행 시 건너뛰기
const EMULATOR_MODE = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

test.describe.serial('Firebase Firestore 저장 검증', () => {
  test.skip(!EMULATOR_MODE, '에뮬레이터 모드에서만 실행됩니다 (.env.playwright 필요)');

  // ── 테스트 1: Auth 에뮬레이터 — 로그인 버튼 동작 확인 ───────────────────

  test('1. 테스트 계정 로그인 버튼 → quiz 탭 진입', async ({ page }) => {
    await page.goto('/sign-in');

    // 테스트 계정 버튼이 보일 때까지 대기 (에뮬레이터 모드에서만 렌더링)
    await expect(page.getByTestId('sign-in-with-test-account')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('sign-in-with-test-account').click();

    // 인증 후 quiz 탭으로 이동
    await expect(page).toHaveURL(/quiz/, { timeout: 10000 });
  });

  // ── 테스트 2: Functions 에뮬레이터 → Firestore 저장 확인 ─────────────────

  test('2. Cloud Function 호출 → attempts Firestore 저장 확인', async () => {
    const { idToken, accountKey } = await getTestUserCredentials();

    const now = new Date().toISOString();
    const attemptId = `e2e-test-${Date.now()}`;

    const response = await fetch(
      'http://127.0.0.1:5001/dasida-app/asia-northeast3/recordLearningAttempt',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          'x-dasida-account-key': accountKey,
        },
        body: JSON.stringify({
          attempt: {
            attemptId,
            accountKey,
            learnerId: 'e2e-learner',
            source: 'diagnostic',
            sourceEntityId: null,
            gradeSnapshot: 'g3',
            startedAt: now,
            completedAt: now,
            questionCount: 1,
            correctCount: 1,
            wrongCount: 0,
            accuracy: 100,
            primaryWeaknessId: null,
            topWeaknesses: [],
            questions: [
              {
                questionId: 'e2e-q1',
                questionNumber: 1,
                topic: 'E2E 테스트',
                selectedIndex: 0,
                isCorrect: true,
                finalWeaknessId: null,
                methodId: null,
                diagnosisSource: null,
                finalMethodSource: null,
                diagnosisCompleted: false,
                usedDontKnow: false,
                usedAiHelp: false,
              },
            ],
          },
        }),
      },
    );

    expect(response.status).toBe(200);

    // Firestore 검증
    const attempts = await readFirestoreCollection(`users/${accountKey}/attempts`);
    expect(attempts.some((a: any) => a.id === attemptId)).toBe(true);
  });

  // ── 테스트 3: reviewTasks Firestore 저장 확인 ────────────────────────────

  test('3. recordLearningAttempt 응답 → reviewTasks Firestore 저장 확인', async () => {
    const { accountKey } = await getTestUserCredentials();

    // 테스트 2에서 저장된 attempts에 대해 reviewTasks도 생성되었는지 확인
    const reviewTasks = await readFirestoreCollection(`users/${accountKey}/reviewTasks`);
    const day1Tasks = (reviewTasks as any[]).filter((t) => t.stage === 'day1');

    // diagnostic 퀴즈 완료 시 day1 태스크가 생성됨
    expect(day1Tasks.length).toBeGreaterThan(0);
  });
});
