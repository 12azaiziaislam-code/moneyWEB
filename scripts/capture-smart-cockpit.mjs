import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:8788/');
  await page.waitForTimeout(500);

  const guestBtn = await page.$('button:has-text("جرّب كضيف")');
  if (guestBtn) {
    await guestBtn.click();
    await page.waitForTimeout(800);
  }

  const skipBtn = await page.$('button:has-text("تخطٍ")');
  if (skipBtn) {
    await skipBtn.click();
    await page.waitForTimeout(800);
  }

  await page.goto('http://127.0.0.1:8788/profile');
  await page.waitForTimeout(800);

  // Open Money sheet
  await page.click('button:has-text("المال")');
  await page.waitForTimeout(500);

  // Click "+ راتب وظيفي"
  await page.click('button:has-text("راتب وظيفي")');
  await page.waitForTimeout(300);

  // Fill salary 85000
  const amountInputs = await page.$$('[role="dialog"] input[inputmode="decimal"]');
  if (amountInputs.length > 0) {
    await amountInputs[0].fill('85000');
  }

  // Add Rent 25000
  await page.click('button:has-text("إيجار")');
  await page.waitForTimeout(300);
  const allAmountInputs = await page.$$('[role="dialog"] input[inputmode="decimal"]');
  if (allAmountInputs.length > 1) {
    await allAmountInputs[1].fill('25000');
  }

  // Add electricity
  await page.click('button:has-text("كهرباء")');
  await page.waitForTimeout(300);
  const allAmountInputs2 = await page.$$('[role="dialog"] input[inputmode="decimal"]');
  if (allAmountInputs2.length > 2) {
    await allAmountInputs2[2].fill('3500');
  }

  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/smart-accounting-cockpit.png' });

  // Save
  await page.click('[role="dialog"] button[type="submit"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'tests/profile-after-smart-save.png' });

  console.log('Screenshots captured successfully!');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
