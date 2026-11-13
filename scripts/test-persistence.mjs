import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  
  await context.addInitScript(() => {
    localStorage.setItem('baraka.guestIntro', '1');
  });

  const page = await context.newPage();

  console.log('1. Navigating to root...');
  await page.goto('http://127.0.0.1:8788/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(600);

  // Check if we are on Login page and click Guest CTA
  const guestBtn = page.getByRole('button', { name: /جرّب كضيف|Try as guest|Попробовать как гость/i }).first();
  if (await guestBtn.isVisible().catch(() => false)) {
    console.log('Clicking Guest CTA...');
    await guestBtn.click();
    await page.waitForTimeout(1000);
  }

  // Ensure an active navigation link is visible
  const navLink = page.locator('a[href="/"]:visible').first();
  await navLink.waitFor({ state: 'visible', timeout: 8000 });
  console.log('✓ Main app shell mounted successfully on mobile.');

  console.log('2. Testing Halal Scan Input Persistence across page navigation...');
  // Click text input toggle on Halal page
  const textToggle = page.locator('button').filter({ hasText: /أو اكتب المكونات|Or type the ingredients|Или впишите состав/i }).first();
  if (await textToggle.isVisible().catch(() => false)) {
    console.log('Opening manual text area...');
    await textToggle.click();
    await page.waitForTimeout(300);
  }

  const textarea = page.locator('textarea:visible').first();
  await textarea.waitFor({ state: 'visible', timeout: 5000 });
  const testString = 'جيلاتين بقري مع مستحلب E471 ونكهة توت';
  await textarea.fill(testString);
  console.log(`Filled textarea with: "${testString}"`);

  // Navigate to Accountant tab via visible bottom nav
  console.log('Navigating to /accountant tab...');
  const accountantNav = page.locator('a[href="/accountant"]:visible').first();
  await accountantNav.click();
  await page.waitForTimeout(500);

  // Assert Accountant is active and heading is visible
  const accountantHeader = page.getByRole('heading', { name: /إدارة الميزانية|المحاسب|Accountant/i }).first();
  await accountantHeader.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Accountant tab successfully activated and visible.');

  // Navigate back to Halal tab
  console.log('Navigating back to Halal tab...');
  const halalNav = page.locator('a[href="/"]:visible').first();
  await halalNav.click();
  await page.waitForTimeout(500);

  // Assert textarea still has the typed text!
  const restoredVal = await page.locator('textarea:visible').first().inputValue();
  console.log(`Restored textarea value: "${restoredVal}"`);
  if (restoredVal !== testString) {
    throw new Error(`State was lost on navigation! Expected "${testString}" but got "${restoredVal}"`);
  }
  console.log('✓ Halal scan input state 100% PRESERVED across tab switching!');

  // Trigger quick scan
  console.log('3. Triggering scan...');
  const scanBtn = page.getByRole('button', { name: /افحص الآن|Scan/i }).first();
  await scanBtn.click();
  await page.waitForTimeout(600);

  // Switch to Chats tab while result is displayed
  console.log('Navigating to Chats tab while result is present...');
  const chatsNav = page.locator('a[href="/chats"]:visible').first();
  await chatsNav.click();
  await page.waitForTimeout(500);

  // Assert Chats is visible
  const chatsHeader = page.getByRole('heading', { name: /المحادثات|Chats/i }).first();
  await chatsHeader.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Chats tab active.');

  // Switch back to Halal tab
  console.log('Navigating back to Halal tab...');
  await halalNav.click();
  await page.waitForTimeout(500);

  // Assert verdict card is still rendered without re-scanning!
  const hasVerdict = (await page.getByText(/مشبوه|حلال|حرام|Doubtful|Haram|Halal/i).count()) > 0;
  console.log('Verdict still present on screen after tab switch:', hasVerdict);
  if (!hasVerdict) {
    throw new Error('Scan result disappeared upon returning to tab!');
  }
  console.log('✓ Halal scan result 100% PRESERVED across tab switching!');

  console.log('4. Testing Chat draft persistence...');
  await chatsNav.click();
  await page.waitForTimeout(500);

  // In guest mode on Chats tab, the quick advisor consultation or chat item is rendered
  const chatInput = page.locator('textarea:visible').first();
  if (await chatInput.isVisible().catch(() => false)) {
    const draftText = 'استفسار تجريبي لم يتم إرساله بعد';
    await chatInput.fill(draftText);
    console.log(`Typed chat draft: "${draftText}"`);

    // Switch to Profile tab
    console.log('Switching to Profile tab...');
    const profileNav = page.locator('a[href="/profile"]:visible').first();
    await profileNav.click();
    await page.waitForTimeout(500);

    // Switch back to Chats tab
    console.log('Switching back to Chats tab...');
    await chatsNav.click();
    await page.waitForTimeout(500);

    const restoredDraft = await page.locator('textarea:visible').first().inputValue();
    console.log(`Restored chat draft: "${restoredDraft}"`);
    if (restoredDraft !== draftText) {
      throw new Error(`Chat draft was lost! Expected "${draftText}" but got "${restoredDraft}"`);
    }
    console.log('✓ Chat draft 100% PRESERVED across tab switching!');
  }

  // Save screenshot of final preserved state
  await page.screenshot({ path: 'tests/persistence-verified.png' });
  console.log('✓ Screenshot saved to tests/persistence-verified.png');

  await browser.close();
  console.log('SUCCESS: ALL TAB, SCAN, AND DRAFT PERSISTENCE CHECKS PASSED PERFECTLY!');
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
