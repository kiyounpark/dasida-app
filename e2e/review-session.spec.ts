import { test, expect } from '@playwright/test';

// ── 헬퍼 ───────────────────────────────────────────────────────────────────

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

// ── 테스트 ─────────────────────────────────────────────────────────────────

test.describe('복습 세션 흐름', () => {
  test('1. review-available 시드 → ReviewHomeCard 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('오늘 안 하면 리셋')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible();
  });

  test('2. 카운트다운 완료 후 CTA 활성화 → 복습 세션 진입', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });

    // __DEV__ ? 1 : 10 — 개발 환경에서 1초 카운트다운
    await page.waitForTimeout(1500);

    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });
  });

  test('3. 입력 없이 다음으로 → AI 호출 없이 다음 단계 버튼 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });

    await expect(page.getByText('다음으로')).toBeVisible({ timeout: 5000 });
    await page.getByText('다음으로').click();

    // AI 피드백 없이 즉시 다음 단계 버튼 표시 (URL 미설정 → AI 호출 없음)
    await expect(page.getByText(/다음 단계 →|완료 →/)).toBeVisible({ timeout: 3000 });
  });

  test('4. 모든 단계 완료 → 완료 화면 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, '오늘 복습 있음');

    await expect(page.getByText('사고 흐름 확인하기')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByText('사고 흐름 확인하기').click();
    await expect(page).toHaveURL(/review-session/, { timeout: 5000 });

    // 최대 10단계 반복 (실제는 약점에 따라 3단계 전후)
    for (let i = 0; i < 10; i++) {
      const isDone = await page.getByText('모든 단계 완료!').isVisible();
      if (isDone) break;
      const hasNext = await page.getByText('다음으로').isVisible();
      if (hasNext) {
        await page.getByText('다음으로').click();
        await expect(page.getByText(/다음 단계 →|완료 →/)).toBeVisible({ timeout: 3000 });
      }
      const hasContinue = await page.getByText(/다음 단계 →|완료 →/).isVisible();
      if (hasContinue) {
        await page.getByText(/다음 단계 →|완료 →/).click();
        await page.waitForTimeout(200);
      }
    }

    await expect(page.getByText('모든 단계 완료!')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('✓ 기억났어요!')).toBeVisible();
    await expect(page.getByText('🤔 다시 볼게요')).toBeVisible();
  });

  test('5. day3 시드 → ReviewHomeCard에 DAY 3 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, 'DAY 3 복습 있음');

    await expect(page.getByText('DAY 3')).toBeVisible({ timeout: 8000 });
  });

  test('6. day7 시드 → ReviewHomeCard에 DAY 7 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, 'DAY 7 복습 있음');

    await expect(page.getByText('DAY 7')).toBeVisible({ timeout: 8000 });
  });

  test('7. day30 시드 → ReviewHomeCard에 DAY 30 표시', async ({ page }) => {
    await loginAsDevGuest(page);
    await seedAndGoToQuiz(page, 'DAY 30 복습 있음');

    await expect(page.getByText('DAY 30')).toBeVisible({ timeout: 8000 });
  });
});
