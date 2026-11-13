import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8788/halal');
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
  await page.goto('http://127.0.0.1:8788/halal');
  await page.waitForTimeout(600);

  const texts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3, p, button span, button')).map(el => el.innerText.trim()).filter(Boolean);
  });
  console.log('Halal Page Visible Elements:');
  console.log([...new Set(texts)].join('\n'));

  await page.screenshot({ path: 'tests/halal-redesigned-clean.png', fullPage: false });
  console.log('Screenshot saved to tests/halal-redesigned-clean.png');
  await browser.close();
}

main().catch(console.error);
