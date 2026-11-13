import { chromium } from 'playwright';

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
  await page.waitForTimeout(1000);
}

await page.goto('http://127.0.0.1:8788/chats');
await page.waitForTimeout(800);

// Click on the first chat or persona to enter consultation
const sheikhCard = page.getByText(/الشيخ|الشريعة|حلال/i).first();
if (await sheikhCard.isVisible()) {
  await sheikhCard.click();
  await page.waitForTimeout(800);
}

// Check current URL and DOM
console.log('Current URL:', page.url());

// Check aside bounding box
const aside = page.locator('aside');
const asideBox = await aside.boundingBox();
console.log('Aside box:', asideBox);

const main = page.locator('main');
const mainBox = await main.boundingBox();
console.log('Main box:', mainBox);

// Take screenshot before scroll
await page.screenshot({ path: 'tests/desktop-chat-before-scroll.png' });

// Scroll down the window
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(400);

const asideBoxAfter = await aside.boundingBox();
console.log('Aside box after scroll:', asideBoxAfter);

await page.screenshot({ path: 'tests/desktop-chat-after-scroll.png' });
console.log('Saved screenshots.');

await browser.close();
