import { test, expect } from '@playwright/test';

async function loginAsDevGuest(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByText('개발용 익명으로 계속').click();
  await page.waitForURL(/quiz/);
}

async function seedAndGoToQuiz(
  page: import('@playwright/test').Page,
  seedLabel: string,
) {
  await page.goto('/profile');
  await page.getByText(seedLabel).click();
  await page.waitForTimeout(800);
  await page.goto('/quiz');
}

test.describe('여정 보드 표시 조건', () => {
  test('1. 신규 유저(fresh) → 여정 보드 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '첫 설치');

    await expect(page.getByText('학습 여정', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('2. 진단 완료 상태 → 여정 보드 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '진단 완료');

    await expect(page.getByText('학습 여정', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('3. 약점 연습 완료(practice-graduated) → 여정 보드 숨김', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '약점 연습 완료');

    await expect(page.getByText('학습 여정', { exact: true })).not.toBeVisible({ timeout: 8000 });
  });
});
