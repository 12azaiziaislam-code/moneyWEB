import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:8788/chats');
await page.waitForTimeout(500);

const buttons = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()));
console.log('Buttons:', buttons);

const guestBtn = await page.$('button:has-text("جرّب كضيف")');
console.log('guestBtn found:', !!guestBtn);
if (guestBtn) {
  await guestBtn.click();
  await page.waitForTimeout(1000);
}

console.log('URL after click:', page.url());
console.log('Has aside:', await page.$('aside') !== null);
if (await page.$('aside')) {
  const box = await page.$eval('aside', el => el.getBoundingClientRect());
  console.log('Aside box:', box);
}

await browser.close();

