import { test, expect } from '@playwright/test';

// 헬퍼: dev-guest로 로그인 후 온보딩 화면으로 이동
async function loginAndGoToOnboarding(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByText('개발용 익명으로 계속').click();
  await page.waitForURL(/quiz/);
  await page.goto('/onboarding');
  // 닉네임 입력 필드가 보일 때까지 대기
  await expect(page.getByPlaceholder('불러드릴 이름을 입력해주세요')).toBeVisible({ timeout: 8000 });
}

test.describe('온보딩 — 학년/트랙 선택 UI', () => {
  test('고1 선택 시 트랙 선택 섹션이 표시되지 않는다', async ({ page }) => {
    await loginAndGoToOnboarding(page);

    await page.getByRole('button', { name: '고1 선택' }).click();

    await expect(page.getByText('수능 수학 선택과목')).not.toBeVisible();
  });

  test('고2 선택 시 트랙 선택 섹션이 표시되지 않는다', async ({ page }) => {
    await loginAndGoToOnboarding(page);

    await page.getByRole('button', { name: '고2 선택' }).click();

    await expect(page.getByText('수능 수학 선택과목')).not.toBeVisible();
  });

  test('고3 선택 시 트랙 선택 섹션이 나타난다', async ({ page }) => {
    await loginAndGoToOnboarding(page);

    await page.getByRole('button', { name: '고3 선택' }).click();

    await expect(page.getByText('수능 수학 선택과목')).toBeVisible();
    await expect(page.getByRole('button', { name: '미적분 선택' })).toBeVisible();
    await expect(page.getByRole('button', { name: '확통 선택' })).toBeVisible();
    await expect(page.getByRole('button', { name: '기하 선택' })).toBeVisible();
  });

  test('고3 → 고1로 변경 시 트랙 섹션이 사라진다', async ({ page }) => {
    await loginAndGoToOnboarding(page);

    await page.getByRole('button', { name: '고3 선택' }).click();
    await expect(page.getByText('수능 수학 선택과목')).toBeVisible();

    await page.getByRole('button', { name: '고1 선택' }).click();
    await expect(page.getByText('수능 수학 선택과목')).not.toBeVisible();
  });

  test('고3 + 트랙 미선택 시 시작 버튼이 비활성화 상태다', async ({ page }) => {
    await loginAndGoToOnboarding(page);

    await page.locator('[placeholder="불러드릴 이름을 입력해주세요"]').fill('테스터');
    await page.getByRole('button', { name: '고3 선택' }).click();

    // 트랙을 아직 선택하지 않은 상태
    const ctaButton = page.getByRole('button', { name: '다시다 시작하기' });
    await expect(ctaButton).toBeDisabled();
  });

  test('고3 + 트랙 선택 완료 시 시작 버튼이 활성화된다', async ({ page }) => {
    await loginAndGoToOnboarding(page);

    await page.locator('[placeholder="불러드릴 이름을 입력해주세요"]').fill('테스터');
    await page.getByRole('button', { name: '고3 선택' }).click();
    await page.getByRole('button', { name: '미적분 선택' }).click();

    const ctaButton = page.getByRole('button', { name: '다시다 시작하기' });
    await expect(ctaButton).toBeEnabled();
  });
});
