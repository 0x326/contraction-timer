import { expect, test } from '@playwright/test';

// Verify that timer state syncs across clients and leadership can change after disconnects

test('timer state survives leader disconnect', async ({ browser }) => {
  const lobby = `e2e-${Date.now()}`;

  const page1 = await browser.newPage();
  const page2 = await browser.newPage();

  await page1.goto(`http://localhost:3000/?lobby=${lobby}&role=recorder`);
  await page2.goto(`http://localhost:3000/?lobby=${lobby}&role=recorder`);
  await page1.evaluate(() => document.querySelectorAll('iframe').forEach((f) => f.remove()));
  await page1.click('text=Become leader');
  await expect(page1.locator('text=Leader')).toBeVisible();

  await page1.click('button[aria-label="Start"]');

  await expect.poll(async () => {
    const data = await page2.evaluate(() => localStorage.getItem('redux'));
    return data ? JSON.parse(data).timer.running : false;
  }).toBe(true);

  await page1.close();

  const page3 = await browser.newPage();
  await page3.goto(`http://localhost:3000/?lobby=${lobby}&role=recorder`);

  await page2.click('text=Become leader');
  await expect(page2.locator('text=Leader')).toBeVisible();

  await page2.click('button[aria-label="Stop"]');

  await expect(page3.locator('button[aria-label="Start"]')).toBeVisible({ timeout: 15000 });
});

test('leader keeps leadership across reconnects', async ({ browser }) => {
  const lobby = `e2e-reconnect-${Date.now()}`;
  const context = await browser.newContext();
  const leaderPage = await context.newPage();
  const follower = await browser.newPage();

  await leaderPage.goto(`http://localhost:3000/?lobby=${lobby}&role=recorder`);
  await follower.goto(`http://localhost:3000/?lobby=${lobby}&role=monitor`);
  await leaderPage.evaluate(() => document.querySelectorAll('iframe').forEach((f) => f.remove()));
  await leaderPage.click('text=Become leader');
  await expect(leaderPage.locator('text=Leader')).toBeVisible();

  await leaderPage.click('button[aria-label="Start"]');

  await leaderPage.close();

  const reconnect = await context.newPage();
  await reconnect.goto(`http://localhost:3000/?lobby=${lobby}&role=recorder`);

  await expect(reconnect.locator('text=Leader')).toBeVisible();

  await reconnect.click('button[aria-label="Stop"]');

  await expect(follower.locator('button[aria-label="Start"]')).toBeVisible({ timeout: 15000 });
});

test('old socket is demoted when same client opens new tab', async ({ browser }) => {
  const lobby = `e2e-dup-${Date.now()}`;
  const context = await browser.newContext();
  const first = await context.newPage();
  await first.goto(`http://localhost:3000/?lobby=${lobby}&role=recorder`);
  await first.evaluate(() => document.querySelectorAll('iframe').forEach((f) => f.remove()));
  await first.click('text=Become leader');
  await expect(first.locator('text=Leader')).toBeVisible();

  const second = await context.newPage();
  await second.goto(`http://localhost:3000/?lobby=${lobby}&role=recorder`);
  await second.evaluate(() => document.querySelectorAll('iframe').forEach((f) => f.remove()));

  await expect(second.locator('text=/^Leader$/')).toBeVisible();
  await expect(first.locator('text=/^Leader$/')).not.toBeVisible();
  await expect(first.locator('text=Become leader')).toBeVisible();
});
