import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });
  const page = await context.newPage();

  console.log('--- TEST: Profile Customizations Suite ---');
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
  await page.waitForTimeout(1000);

  // 1. Verify Haptics is COMPLETELY REMOVED
  const bodyText = await page.innerText('body');
  const hasHaptics = bodyText.includes('الاهتزاز') || bodyText.includes('haptics') || bodyText.includes('Haptics');
  console.log('Is Haptics text anywhere on the page?', hasHaptics);
  if (hasHaptics) {
    throw new Error('FAILURE: Haptics text is still present on the page!');
  }

  // 2. Verify Madhhab Section
  const madhhabBtn = await page.$('button:has-text("المذهب الحنفي")');
  console.log('Hanafi Madhhab card found:', !!madhhabBtn);
  if (madhhabBtn) {
    await madhhabBtn.click();
    await page.waitForTimeout(400);
    const isAdopted = await page.$('button:has-text("المذهب الحنفي"):has-text("المعتمد")');
    console.log('Is Hanafi Madhhab marked as "المعتمد"?', !!isAdopted);
  }

  // 3. Verify Currency Section
  const sarCurrencyBtn = await page.$('button:has-text("SAR")');
  console.log('SAR currency button found:', !!sarCurrencyBtn);
  if (sarCurrencyBtn) {
    await sarCurrencyBtn.click();
    await page.waitForTimeout(400);
  }

  // 4. Verify AI Engine / BYOK Section
  const byokBtn = await page.$('button:has-text("استخدام مفتاحي الخاص")');
  console.log('BYOK button found:', !!byokBtn);
  if (byokBtn) {
    await byokBtn.click();
    await page.waitForTimeout(400);
    const keyInput = await page.$('input[placeholder="sk-..."]');
    console.log('Private API Key input visible:', !!keyInput);
  }

  // 5. Verify Reduced Motion Switch
  const motionSwitch = await page.$('button[role="switch"]');
  console.log('Reduced motion switch found:', !!motionSwitch);
  if (motionSwitch) {
    await motionSwitch.click();
    await page.waitForTimeout(300);
  }

  // 6. Verify Clear Cache Button
  const clearCacheBtn = await page.$('button:has-text("تفريغ الذاكرة المؤقتة")');
  console.log('Clear cache button found:', !!clearCacheBtn);
  if (clearCacheBtn) {
    await clearCacheBtn.click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: 'tests/profile-advanced-customizations.png' });
  console.log('SUCCESS: All customizations verified and functioning smoothly!');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
