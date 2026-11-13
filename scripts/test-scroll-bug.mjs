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
  await page.waitForTimeout(800);
}

// Apply the fix via DOM style to test
await page.evaluate(() => {
  // AppShell root
  const rootDiv = document.querySelector('aside')?.parentElement;
  if (rootDiv) {
    rootDiv.classList.remove('min-h-[100dvh]');
    rootDiv.classList.add('h-[100dvh]', 'max-h-[100dvh]', 'overflow-hidden');
  }
  const aside = document.querySelector('aside');
  if (aside) {
    aside.classList.remove('sticky', 'top-0', 'h-[100dvh]');
    aside.classList.add('h-full', 'overflow-y-auto');
  }
  const mainWrapper = aside?.nextElementSibling;
  if (mainWrapper) {
    mainWrapper.classList.add('h-full', 'overflow-y-auto');
  }

  // Inject 20 long messages
  const main = document.querySelector('main');
  if (main) {
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'p-6 my-4 bg-surface border border-line rounded-2xl';
      p.innerText = 'رسالة تجريبية طويلة رقم ' + i + ' لاختبار سلوك التمرير وموضع القائمة الجانبية على الشاشات الكبيرة.';
      main.appendChild(p);
    }
  }
});

await page.waitForTimeout(500);

// Now scroll the main wrapper (the content area)
await page.evaluate(() => {
  const aside = document.querySelector('aside');
  const mainWrapper = aside?.nextElementSibling;
  if (mainWrapper) {
    mainWrapper.scrollBy(0, 800);
  }
});
await page.waitForTimeout(500);

// Inspect aside
const asideInfoFixed = await page.evaluate(() => {
  const aside = document.querySelector('aside');
  if (!aside) return null;
  const rect = aside.getBoundingClientRect();
  return {
    top: rect.top,
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
  };
});
console.log('Aside info with fixed architecture:', JSON.stringify(asideInfoFixed, null, 2));

await page.screenshot({ path: 'tests/fixed-architecture-test.png' });
console.log('Saved tests/fixed-architecture-test.png');

await browser.close();
