import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });
  const page = await context.newPage();

  console.log('--- TEST: Money Profile Live Instant Update ---');
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

  // 1. Fill Health first so we are at 80%
  await page.click('button:has-text("الصحة")');
  await page.waitForTimeout(500);
  await page.fill('[role="dialog"] input[type="number"][min="1"]', '21');
  await page.fill('[role="dialog"] input[type="number"][min="60"]', '173');
  await page.fill('[role="dialog"] input[type="number"][step="0.1"]', '78');
  await page.selectOption('[role="dialog"] select', 'male');
  const textareas = await page.$$('[role="dialog"] textarea');
  if (textareas.length >= 2) await textareas[1].fill('Escitalopram');
  await page.click('[role="dialog"] button[type="submit"]');
  await page.waitForTimeout(800);

  let textNow = await page.innerText('body');
  console.log('Completeness after Health save:', textNow.match(/(\d+)%\s*مكتمل/)?.[0]);

  // 2. Open Money sheet
  await page.click('button:has-text("المال")');
  await page.waitForTimeout(500);

  // Check that Save button is sticky visible
  const saveBtn = await page.$('[role="dialog"] button[type="submit"]');
  console.log('Is Money Save button visible?', await saveBtn?.isVisible());

  // Add an income source via the quick preset button
  const addIncomeBtn = await page.$('[role="dialog"] button:has-text("راتب وظيفي")');
  console.log('addIncomeBtn found:', !!addIncomeBtn);
  if (addIncomeBtn) {
    await addIncomeBtn.click();
    await page.waitForTimeout(400);
  }

  // Find amount input
  const amountInputs = await page.$$('[role="dialog"] input[inputmode="decimal"]');
  console.log('Amount inputs found:', amountInputs.length);
  if (amountInputs.length > 0) {
    await amountInputs[0].fill('85000');
  }

  await page.screenshot({ path: 'tests/money-sheet-filled.png' });

  // 3. Click Save in Money sheet
  await saveBtn.click();
  await page.waitForTimeout(800);

  // 4. Verify INSTANT 100% WITHOUT RELOADING
  textNow = await page.innerText('body');
  const finalPercentage = textNow.match(/(\d+)%\s*مكتمل/)?.[0];
  console.log('Completeness IMMEDIATELY after Money save (NO REFRESH):', finalPercentage);

  await page.screenshot({ path: 'tests/profile-100-percent.png' });

  if (finalPercentage === '100% مكتمل') {
    console.log('SUCCESS: Live instant update reached 100% with zero refresh!');
  } else {
    throw new Error('FAILURE: Did not reach 100% immediately!');
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
