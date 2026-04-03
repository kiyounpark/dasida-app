import { test, expect } from '@playwright/test';

test('dev-guest 로그인 후 퀴즈 홈 진입', async ({ page }) => {
  await page.goto('/');
  await page.getByText('개발용 익명으로 계속').click();
  await expect(page).toHaveURL(/quiz/);
});
