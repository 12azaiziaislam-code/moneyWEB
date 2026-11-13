import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem('baraka.guestIntro', '1');
  });

  await page.goto('http://127.0.0.1:8788/');
  await page.waitForTimeout(600);

  const guestBtn = page.getByRole('button', { name: /جرّب كضيف|Try as guest|Попробовать как гость/i }).first();
  if (await guestBtn.isVisible().catch(() => false)) {
    await guestBtn.click();
    await page.waitForTimeout(800);
  }

  // Go to halal scan
  const textarea = page.locator('button').filter({ hasText: /أو اكتب المكونات/i }).first();
  if (await textarea.isVisible().catch(() => false)) {
    await textarea.click();
    await page.waitForTimeout(200);
    await page.locator('textarea:visible').first().fill('مكرونة مع جبنة شيدر');
    await page.getByRole('button', { name: /افحص الآن/i }).click();
    await page.waitForTimeout(800);
    
    // Click discuss
    const discussBtn = page.getByRole('button', { name: /ناقش مع الشيخ|ناقش|Discuss/i }).first();
    if (await discussBtn.isVisible().catch(() => false)) {
      console.log('Clicking discuss...');
      await discussBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  console.log('Current URL after discuss:', page.url());
  
  // Fill user question to make chat long
  const chatInput = page.locator('textarea:visible').first();
  if (await chatInput.isVisible()) {
    await chatInput.fill('كيف حكمت على انه مشبوه ما هذا الغباء');
    await page.keyboard.press('Enter');
    console.log('Sent message. Waiting for stream...');
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: 'tests/reproduced-chat-desktop.png' });
  console.log('Saved tests/reproduced-chat-desktop.png');

  // Now scroll the window
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/reproduced-chat-desktop-scrolled.png' });
  console.log('Saved tests/reproduced-chat-desktop-scrolled.png');

  await browser.close();
}

test().catch(e => console.error(e));

