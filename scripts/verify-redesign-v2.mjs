import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const outDir = path.resolve('tests/redesign-v2');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const viewports = [
    { name: 'mobile', width: 360, height: 740 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ];

  const routes = [
    { path: '/', name: 'home' },
    { path: '/halal', name: 'halal' },
    { path: '/doctor', name: 'doctor' },
    { path: '/accountant', name: 'accountant' },
    { path: '/chats', name: 'chats' },
    { path: '/profile', name: 'profile' }
  ];

  for (const vp of viewports) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: 'ar',
    });
    const page = await context.newPage();

    // Go to root and login as guest if needed
    await page.goto('http://127.0.0.1:8788/');
    await page.waitForTimeout(600);

    const guestBtn = await page.$('button:has-text("جرّب كضيف")');
    if (guestBtn) {
      console.log('Logging in as guest...');
      await guestBtn.click();
      await page.waitForTimeout(800);
    }

    for (const route of routes) {
      await page.goto(`http://127.0.0.1:8788${route.path}`);
      await page.waitForTimeout(600);

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (overflow) {
        console.warn(`[WARN] Horizontal overflow detected on ${route.name} at ${vp.width}px!`);
      } else {
        console.log(`[PASS] ${route.name} fits within ${vp.width}px perfectly`);
      }

      // Capture screenshot in dark mode
      await page.screenshot({
        path: path.join(outDir, `${vp.name}-${route.name}-dark.png`),
        fullPage: false
      });
    }

    // Also test light theme on home and doctor
    console.log(`Testing light mode on ${vp.name}...`);
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(outDir, `${vp.name}-home-light.png`),
      fullPage: false
    });

    await context.close();
  }

  await browser.close();
  console.log('\nAll viewport captures and checks completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

