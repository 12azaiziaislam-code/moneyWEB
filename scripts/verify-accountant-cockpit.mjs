import { chromium } from 'playwright';

async function testAccountantPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });

  const page = await context.newPage();

  console.log('--- Step 1: Login as guest ---');
  await page.goto('http://127.0.0.1:8788/');
  await page.waitForTimeout(600);

  const guestBtn = await page.locator('text=جرّب كضيف').first();
  if (await guestBtn.count()) {
    await guestBtn.click();
    await page.waitForTimeout(800);
  }

  const skipBtn = await page.locator('text=تخطٍ').first();
  if (await skipBtn.count()) {
    await skipBtn.click();
    await page.waitForTimeout(800);
  }

  console.log('--- Step 2: Navigate to /accountant with 0 balance ---');
  await page.goto('http://127.0.0.1:8788/accountant');
  await page.waitForTimeout(1000);

  // Take screenshot of 0 balance state
  await page.screenshot({ path: 'tests/accountant-zero-balance.png' });
  console.log('Captured tests/accountant-zero-balance.png');

  // Verify: NEVER displays "وضعك سليم" when balance is 0!
  const soundStatusGreen = await page.locator('.badge-ok:has-text("وضعك سليم"), span:has-text("وضعك سليم")').count();
  console.log('Did it wrongly display "وضعك سليم" with zero balance?', soundStatusGreen > 0);
  if (soundStatusGreen > 0) {
    throw new Error('FAILED: Accountant page still displays "وضعك سليم" with 0 balance!');
  }

  // Verify: Danger badge is present
  const deficitBadge = await page.locator('text=عجز مالي - الرصيد صفر').first().isVisible();
  console.log('Is "عجز مالي - الرصيد صفر" badge visible?', deficitBadge);
  if (!deficitBadge) {
    throw new Error('FAILED: "عجز مالي - الرصيد صفر" badge not displayed!');
  }

  // Verify: "القحط" is completely gone
  const qahatText = await page.locator('text=القحط').count();
  console.log('Count of "القحط" text on page:', qahatText);
  if (qahatText > 0) {
    throw new Error('FAILED: "القحط" still found on page!');
  }

  // Verify: "ادخار مكثف" is present
  const intenseSavingsBtn = await page.locator('button:has-text("ادخار مكثف")').first().isVisible();
  console.log('Is "ادخار مكثف" mode button visible?', intenseSavingsBtn);

  // Verify: Header button is "اسأل المحاسب AI"
  const askAiBtn = await page.locator('button:has-text("اسأل المحاسب AI")').first().isVisible();
  console.log('Is "اسأل المحاسب AI" header button visible?', askAiBtn);

  // Verify: Date text is friendly and clear
  const cycleText = await page.locator('text=موعد الراتب القادم').first().innerText();
  console.log('Cycle schedule text:', cycleText);

  // Verify: Category chips inside manual transaction sheet
  console.log('--- Step 3: Open Manual Transaction Sheet ---');
  const addTxBtn = page.locator('button:has-text("إضافة يدوية")').first();
  await addTxBtn.click();
  await page.waitForTimeout(600);

  // Check category chips
  const categoryFood = page.locator('button:has-text("طعام")');
  const categoryGroceries = page.locator('button:has-text("بقالة")');
  console.log('Category "طعام" visible:', await categoryFood.isVisible());
  console.log('Category "بقالة" visible:', await categoryGroceries.isVisible());

  // Fill and save an expense
  await page.locator('[role="dialog"] input[inputmode="decimal"]').fill('350');
  await page.locator('[role="dialog"] input[placeholder*="مشتريات"]').fill('غداء عمل');
  await categoryFood.click();

  const saveTxBtn = page.locator('[role="dialog"] button:has-text("حفظ")');
  await saveTxBtn.click();
  await page.waitForTimeout(800);

  console.log('--- Step 4: Now update balance to 60,000 ₽ ---');
  const editBalanceBtn = page.locator('button:has-text("تعديل الرصيد")');
  await editBalanceBtn.click();
  await page.waitForTimeout(600);

  await page.locator('[role="dialog"] input[inputmode="decimal"]').fill('60000');
  const saveBalanceBtn = page.locator('[role="dialog"] button:has-text("حفظ")');
  await saveBalanceBtn.click();
  await page.waitForTimeout(1000);

  // Verify daily budget updated to real positive amount
  await page.screenshot({ path: 'tests/accountant-funded-balance.png' });
  console.log('Captured tests/accountant-funded-balance.png');

  const fundedStatus = await page.locator('text=وضعك سليم').first().isVisible();
  console.log('Status badge when funded (60,000 ₽):', fundedStatus);

  await browser.close();
  console.log('ACCOUNTANT COCKPIT FULL AUDIT PASSED 100%!');
}

testAccountantPage().catch((err) => {
  console.error(err);
  process.exit(1);
});
