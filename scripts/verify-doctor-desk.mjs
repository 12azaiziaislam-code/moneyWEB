import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  
  await page.goto('http://127.0.0.1:8788/doctor');
  await page.waitForTimeout(600);

  const guestBtn = await page.$('button:has-text("جرّب كضيف")');
  if (guestBtn) {
    await guestBtn.click();
    await page.waitForTimeout(600);
  }

  const skipBtn = await page.$('button:has-text("تخطٍ")');
  if (skipBtn) {
    await skipBtn.click();
    await page.waitForTimeout(600);
  }

  await page.goto('http://127.0.0.1:8788/doctor');
  await page.waitForTimeout(600);

  // Focus and type into textarea
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.fill('مرحبا كيف حالك، هل وزني 78 كغ مناسب لطولي 173 سم؟');
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: 'tests/doctor-desk-verified.png' });
  console.log('Saved tests/doctor-desk-verified.png');

  await browser.close();
}

main().catch(console.error);

