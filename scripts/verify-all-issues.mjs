import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // Test 1: Desktop Chat Layout
  console.log('--- TEST 1: Desktop Chat Layout ---');
  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });
  const pageDesk = await contextDesktop.newPage();
  
  await pageDesk.goto('http://127.0.0.1:8788/chats');
  await pageDesk.waitForTimeout(500);

  // Click "جرّب كضيف" if present
  const guestBtn = await pageDesk.$('button:has-text("جرّب كضيف")');
  if (guestBtn) {
    await guestBtn.click();
    await pageDesk.waitForTimeout(600);
  }

  // Check Aside geometry
  const asideBox = await pageDesk.evaluate(() => {
    const aside = document.querySelector('aside');
    if (!aside) return null;
    const rect = aside.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      windowScrollY: window.scrollY,
      windowHeight: window.innerHeight,
    };
  });
  console.log('Desktop Aside Box before scroll:', asideBox);

  // Navigate to a consultation
  const chatLink = await pageDesk.$('a[href^="/chats/"]');
  if (chatLink) {
    await chatLink.click();
    await pageDesk.waitForTimeout(600);
  }

  // Scroll window
  await pageDesk.evaluate(() => window.scrollTo(0, 1000));
  const asideBoxScrolled = await pageDesk.evaluate(() => {
    const aside = document.querySelector('aside');
    if (!aside) return null;
    const rect = aside.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      windowScrollY: window.scrollY,
    };
  });
  console.log('Desktop Aside Box after window.scrollTo(0, 1000):', asideBoxScrolled);

  await pageDesk.screenshot({ path: 'tests/verify-desktop-chat-locked.png' });

  // Test 2: Profile Page on Desktop (check Health sheet and i18n keys)
  console.log('\n--- TEST 2: Desktop Profile & Modals ---');
  await pageDesk.goto('http://127.0.0.1:8788/profile');
  await pageDesk.waitForTimeout(500);

  // Check for any raw i18n keys on the page
  const pageTextDesk = await pageDesk.innerText('body');
  const rawKeyMatches = (pageTextDesk.match(/[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]+/g) || [])
    .filter(k => !k.includes('@') && !k.includes('http') && !k.includes('.com') && !k.includes('.json') && !k.startsWith('v1.'));
  console.log('Any raw dot-notation keys in Desktop Profile page:', rawKeyMatches);

  // Open Health Sheet on Desktop
  const healthBtn = await pageDesk.$('button:has-text("الصحة")');
  if (healthBtn) {
    await healthBtn.click();
    await pageDesk.waitForTimeout(400);
    
    const sheetInfo = await pageDesk.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return null;
      const rect = dialog.getBoundingClientRect();
      const bottomNav = document.querySelector('nav[aria-label]');
      return {
        dialogRect: { top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width },
        bottomNavVisible: bottomNav ? getComputedStyle(bottomNav).display !== 'none' : false,
      };
    });
    console.log('Health Sheet on Desktop:', sheetInfo);
    await pageDesk.screenshot({ path: 'tests/verify-desktop-profile-health-sheet.png' });

    // Close sheet
    const closeBtn = await pageDesk.$('button[aria-label="إغلاق"]');
    if (closeBtn) await closeBtn.click();
    await pageDesk.waitForTimeout(300);
  }

  // Test 3: Mobile Viewport (390x844) Profile & Sheet
  console.log('\n--- TEST 3: Mobile Profile & Modals ---');
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ar',
  });
  const pageMobile = await contextMobile.newPage();
  await pageMobile.goto('http://127.0.0.1:8788/profile');
  await pageMobile.waitForTimeout(500);

  const guestBtnMobile = await pageMobile.$('button:has-text("جرّب كضيف")');
  if (guestBtnMobile) {
    await guestBtnMobile.click();
    await pageMobile.waitForTimeout(600);
  }

  // Check raw i18n keys on mobile
  const pageTextMobile = await pageMobile.innerText('body');
  const rawKeyMatchesMobile = (pageTextMobile.match(/[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]+/g) || [])
    .filter(k => !k.includes('@') && !k.includes('http') && !k.includes('.com') && !k.includes('.json') && !k.startsWith('v1.'));
  console.log('Any raw dot-notation keys in Mobile Profile page:', rawKeyMatchesMobile);

  // Open Money Sheet on mobile
  const moneyBtn = await pageMobile.$('button:has-text("المال")');
  if (moneyBtn) {
    await moneyBtn.click();
    await pageMobile.waitForTimeout(400);

    const mobileSheetInfo = await pageMobile.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const nav = document.querySelector('nav[aria-label]');
      const dialogPortal = dialog ? dialog.closest('.fixed.inset-0') : null;
      const dialogZ = dialogPortal ? window.getComputedStyle(dialogPortal).zIndex : null;
      const navZ = nav ? window.getComputedStyle(nav).zIndex : null;
      const dialogRect = dialog ? dialog.getBoundingClientRect() : null;
      const navRect = nav ? nav.getBoundingClientRect() : null;
      return {
        dialogZ,
        navZ,
        isDialogAboveNav: parseInt(dialogZ || '0') > parseInt(navZ || '0'),
        dialogRect,
        navRect,
      };
    });
    console.log('Mobile Sheet Z-Index Comparison:', mobileSheetInfo);
    await pageMobile.screenshot({ path: 'tests/verify-mobile-profile-money-sheet.png' });
  }

  await browser.close();
  console.log('\nAll Playwright verification completed successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
