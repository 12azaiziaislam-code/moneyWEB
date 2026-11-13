import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  const page = await context.newPage();
  
  await page.goto('http://127.0.0.1:8788/doctor');
  await page.waitForTimeout(600);
  
  const guestBtn = await page.$('button:has-text("جرّب كضيف")');
  if (guestBtn) {
    await guestBtn.click();
    await page.waitForTimeout(800);
  }
  const skipBtn = await page.$('button:has-text("تخطٍ"), button:has-text("تخطٍ الآن")');
  if (skipBtn) {
    await skipBtn.click();
    await page.waitForTimeout(800);
  }

  await page.goto('http://127.0.0.1:8788/doctor');
  await page.waitForTimeout(600);

  // Type in inquiry
  await page.click('button:has-text("كتابة")');
  await page.waitForTimeout(300);
  await page.fill('textarea', 'مرحبا كيف حالك');
  await page.waitForTimeout(300);

  // Take screenshot before submit
  await page.screenshot({ path: 'tests/doctor-inquiry-ready.png' });
  console.log('Saved tests/doctor-inquiry-ready.png');

  await browser.close();
}

main().catch(console.error);

