import { chromium } from 'playwright';

async function testLoginDesign() {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://127.0.0.1:8788/');
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({ path: 'tests/login-redesigned-desktop.png', fullPage: true });

  // Mobile
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ar',
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://127.0.0.1:8788/');
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: 'tests/login-redesigned-mobile.png', fullPage: true });

  // Detail crops: Header and Footer
  const header = await desktopPage.locator('header').first();
  await header.screenshot({ path: 'tests/login-redesigned-header.png' });
  const footer = await desktopPage.locator('footer').first();
  await footer.screenshot({ path: 'tests/login-redesigned-footer.png' });

  console.log('Screenshots captured successfully!');
  await browser.close();
}

testLoginDesign().catch(console.error);

