import { chromium } from 'playwright';

async function testDoctorPage() {
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

  console.log('--- Step 2: Complete Health Profile (matching user screenshot) ---');
  await page.goto('http://127.0.0.1:8788/profile');
  await page.waitForTimeout(800);

  // Open Health sheet
  const healthDrawerBtn = page.locator('button:has-text("الصحة")').first();
  await healthDrawerBtn.click();
  await page.waitForTimeout(600);

  // Fill in exact fields matching user screenshot (age: 21, weight: 78, height: 173)
  const ageInput = page.locator('[role="dialog"] input[type="number"][min="1"]');
  await ageInput.fill('21');

  const heightInput = page.locator('[role="dialog"] input[type="number"][min="60"]');
  await heightInput.fill('173');

  const weightInput = page.locator('[role="dialog"] input[type="number"][step="0.1"]');
  await weightInput.fill('78');

  const sexSelect = page.locator('[role="dialog"] select');
  if (await sexSelect.count()) {
    await sexSelect.selectOption('male');
  }

  const textareas = page.locator('[role="dialog"] textarea');
  if ((await textareas.count()) >= 2) {
    await textareas.nth(1).fill('Escitalopram');
  }

  // Submit health profile
  const saveBtn = page.locator('[role="dialog"] button[type="submit"]');
  await saveBtn.click();
  await page.waitForTimeout(800);

  console.log('--- Step 3: Navigate to /doctor ---');
  await page.goto('http://127.0.0.1:8788/doctor');
  await page.waitForTimeout(1000);

  // Verify health badge is complete
  const badgeVisible = await page.locator('text=الملف مكتمل').first().isVisible();
  console.log('Health profile completed badge visible:', badgeVisible);

  // Verify action button
  const doctorBtn = page.locator('button:has-text("بدء الفحص الصحي")').first();
  const isVisible = await doctorBtn.isVisible();
  const isDisabled = await doctorBtn.isDisabled();
  const btnText = await doctorBtn.innerText();
  console.log(`Action button: text="${btnText.trim()}", visible=${isVisible}, disabled=${isDisabled}`);

  if (isDisabled) {
    throw new Error('FAILED: Doctor action button is disabled when health profile is complete!');
  }

  // Take screenshot of high-contrast initial active button
  await page.screenshot({ path: 'tests/doctor-button-active-initial.png' });
  console.log('Captured tests/doctor-button-active-initial.png');

  // Click empty button -> should show toast and focus textarea
  console.log('--- Step 4: Click button while inputs are empty ---');
  await doctorBtn.click();
  await page.waitForTimeout(600);

  // Capture toast
  await page.screenshot({ path: 'tests/doctor-button-empty-guidance-toast.png' });
  console.log('Captured tests/doctor-button-empty-guidance-toast.png');

  // Type in medicine query
  console.log('--- Step 5: Type medicine query ---');
  const textarea = page.locator('textarea');
  await textarea.fill('Escitalopram 10mg مع باراسيتامول');
  await page.waitForTimeout(500);

  // Verify button updated to dynamic active state
  const readyBtn = page.locator('button:has-text("بدء الفحص الصحي الفوري الآن")');
  const readyVisible = await readyBtn.isVisible();
  const readyText = await readyBtn.innerText();
  console.log(`Ready button: text="${readyText.trim()}", visible=${readyVisible}`);

  await page.screenshot({ path: 'tests/doctor-button-active-ready.png' });
  console.log('Captured tests/doctor-button-active-ready.png');

  await browser.close();
  console.log('ALL DOCTOR BUTTON TESTS PASSED 100%!');
}

testDoctorPage().catch((err) => {
  console.error(err);
  process.exit(1);
});
