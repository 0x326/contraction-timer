import { expect, test } from '@playwright/test';

// Verify that timer state syncs across clients and leadership can change after disconnects

test('timer state survives leader disconnect', async ({ browser }) => {
  const lobby = `e2e-${Date.now()}`;

  const page1 = await browser.newPage();
  const page2 = await browser.newPage();

  await page1.goto(`http://localhost:3000/${lobby}?role=recorder`);
  await page2.goto(`http://localhost:3000/${lobby}?role=recorder`);

  await page1.click('text=Become leader');
  await expect(page1.locator('text=Leader')).toBeVisible();

  await page1.click('button[aria-label="Start"]');

  await expect.poll(async () => {
    const data = await page2.evaluate(() => localStorage.getItem('redux'));
    return data ? JSON.parse(data).timer.running : false;
  }).toBe(true);

  await page1.close();

  const page3 = await browser.newPage();
  await page3.goto(`http://localhost:3000/${lobby}?role=recorder`);

  await page2.click('text=Become leader');
  await expect(page2.locator('text=Leader')).toBeVisible();

  await page2.click('button[aria-label="Stop"]');

  await expect.poll(async () => {
    const data = await page3.evaluate(() => localStorage.getItem('redux'));
    return data ? JSON.parse(data).timer.running : null;
  }).toBe(false);
});
