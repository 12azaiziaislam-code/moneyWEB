import { chromium } from 'playwright';

async function testGenderUI() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('baraka.guestIntro', '1');
  });

  await page.goto('http://127.0.0.1:8788/profile');
  await page.waitForTimeout(600);

  const guestBtn = page.getByRole('button', { name: /جرّب كضيف/i }).first();
  if (await guestBtn.isVisible().catch(() => false)) {
    await guestBtn.click();
    await page.waitForTimeout(800);
    await page.goto('http://127.0.0.1:8788/profile');
    await page.waitForTimeout(600);
  }

  // Open Health Sheet
  const healthCard = page.locator('text=الصحة').first();
  await healthCard.click();
  await page.waitForTimeout(600);

  // Check the sheet
  const sheet = page.locator('div[role="dialog"]').first();
  console.log('Dialog visible:', await sheet.isVisible());

  // Click 'ذكر'
  const maleBtn = page.getByRole('button', { name: 'ذكر', exact: true }).first();
  if (await maleBtn.isVisible()) {
    await maleBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/gender-male-selected.png' });
    console.log('Clicked male, saved tests/gender-male-selected.png');
  }

  // Click 'أنثى'
  const femaleBtn = page.getByRole('button', { name: 'أنثى', exact: true }).first();
  if (await femaleBtn.isVisible()) {
    await femaleBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'tests/gender-female-selected.png' });
    console.log('Clicked female, saved tests/gender-female-selected.png');
  }

  await browser.close();
}

testGenderUI().catch(console.error);

