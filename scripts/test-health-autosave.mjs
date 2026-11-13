import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });
  const page = await context.newPage();

  console.log('--- TEST: Auto-Save on Close (X button) ---');
  await page.goto('http://127.0.0.1:8788/');
  await page.waitForTimeout(500);

  const guestBtn = await page.$('button:has-text("جرّب كضيف")');
  if (guestBtn) {
    await guestBtn.click();
    await page.waitForTimeout(800);
  }

  const skipBtn = await page.$('button:has-text("تخطٍ")');
  if (skipBtn) {
    await skipBtn.click();
    await page.waitForTimeout(800);
  }

  await page.goto('http://127.0.0.1:8788/profile');
  await page.waitForTimeout(800);

  // Open Health sheet
  await page.click('button:has-text("الصحة")');
  await page.waitForTimeout(500);

  // Change age to 25 and add note
  await page.fill('[role="dialog"] input[type="number"][min="1"]', '25');
  const textareas = await page.$$('[role="dialog"] textarea');
  // Last textarea is notes
  await textareas[textareas.length - 1].fill('ملاحظة تجريبية لحفظ تلقائي');

  // Instead of clicking Save, click the "X" button to close!
  const closeBtn = await page.$('[role="dialog"] button[aria-label="إغلاق"]');
  if (!closeBtn) throw new Error('Close button not found');
  await closeBtn.click();
  await page.waitForTimeout(1000);

  // Re-open Health sheet
  await page.click('button:has-text("الصحة")');
  await page.waitForTimeout(500);

  const reloadedAge = await page.$eval('[role="dialog"] input[type="number"][min="1"]', el => el.value);
  const textareas2 = await page.$$('[role="dialog"] textarea');
  const reloadedNote = await textareas2[textareas2.length - 1].inputValue();

  console.log('Reloaded Age after close with X:', reloadedAge);
  console.log('Reloaded Note after close with X:', reloadedNote);

  if (reloadedAge === '25' && reloadedNote.includes('ملاحظة تجريبية لحفظ تلقائي')) {
    console.log('SUCCESS: Auto-save on modal close protected user from data loss!');
  } else {
    throw new Error('FAILURE: Data was lost when closing modal with X!');
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
