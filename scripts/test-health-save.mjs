import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });
  const page = await context.newPage();

  console.log('--- TEST: Health Form Save & Persistence ---');
  await page.goto('http://127.0.0.1:8788/');
  await page.waitForTimeout(500);

  // If login screen, click "جرّب كضيف"
  const guestBtn = await page.$('button:has-text("جرّب كضيف")');
  if (guestBtn) {
    await guestBtn.click();
    await page.waitForTimeout(800);
  }

  // If onboarding screen, click "تخطٍ"
  const skipBtn = await page.$('button:has-text("تخطٍ")');
  if (skipBtn) {
    await skipBtn.click();
    await page.waitForTimeout(800);
  }

  // Navigate explicitly to /profile
  await page.goto('http://127.0.0.1:8788/profile');
  await page.waitForTimeout(1000);
  console.log('URL at /profile:', page.url());

  // 1. Initial completion percentage
  const initialText = await page.innerText('body');
  const initialPercentage = initialText.match(/(\d+)%\s*مكتمل/)?.[0] ?? 'not found';
  console.log('Initial profile completeness in text:', initialPercentage);

  // 2. Open Health Sheet
  const healthDrawerBtn = await page.$('button:has-text("الصحة")');
  if (!healthDrawerBtn) {
    throw new Error('Health drawer button not found');
  }
  await healthDrawerBtn.click();
  await page.waitForTimeout(500);

  // 3. Verify Save button inside dialog is visible in viewport
  const saveBtn = await page.$('[role="dialog"] button[type="submit"]');
  if (!saveBtn) throw new Error('Save button inside dialog not found');
  
  const isSaveBtnVisible = await saveBtn.isVisible();
  console.log('Is Save button immediately visible in viewport?', isSaveBtnVisible);
  
  const saveBtnBox = await saveBtn.boundingBox();
  console.log('Save button bounding box:', saveBtnBox);

  // 4. Fill in the exact fields the user filled in:
  // Age: 21, Height: 173, Weight: 78, Sex: male, Medication: Escitalopram
  const ageInput = await page.$('[role="dialog"] input[type="number"][min="1"]');
  if (ageInput) await ageInput.fill('21');

  const heightInput = await page.$('[role="dialog"] input[type="number"][min="60"]');
  if (heightInput) await heightInput.fill('173');

  const weightInput = await page.$('[role="dialog"] input[type="number"][step="0.1"]');
  if (weightInput) await weightInput.fill('78');

  const sexSelect = await page.$('[role="dialog"] select');
  if (sexSelect) await sexSelect.selectOption('male');

  const textareas = await page.$$('[role="dialog"] textarea');
  console.log('Number of dialog textareas found:', textareas.length);
  if (textareas.length >= 2) {
    await textareas[1].fill('Escitalopram');
  }

  await page.screenshot({ path: 'tests/health-form-filled.png' });

  // 5. Click Save
  await saveBtn.click();
  await page.waitForTimeout(1000);

  // 6. Verify modal is closed
  const dialogAfterSave = await page.$('[role="dialog"]');
  console.log('Is dialog closed after save?', dialogAfterSave === null);

  // 7. Check updated completion percentage
  const updatedText = await page.innerText('body');
  const updatedPercentage = updatedText.match(/(\d+)%\s*مكتمل/)?.[0];
  console.log('Updated profile completeness:', updatedPercentage);
  await page.screenshot({ path: 'tests/profile-after-health-save.png' });

  // 8. Re-open Health drawer and verify fields are NOT empty
  const healthDrawerBtn2 = await page.$('button:has-text("الصحة")');
  await healthDrawerBtn2.click();
  await page.waitForTimeout(500);

  const reloadedAge = await page.$eval('[role="dialog"] input[type="number"][min="1"]', el => el.value);
  const reloadedHeight = await page.$eval('[role="dialog"] input[type="number"][min="60"]', el => el.value);
  const reloadedWeight = await page.$eval('[role="dialog"] input[type="number"][step="0.1"]', el => el.value);
  const reloadedSex = await page.$eval('[role="dialog"] select', el => el.value);
  const textareas2 = await page.$$('[role="dialog"] textarea');
  const reloadedMed = textareas2.length >= 2 ? await textareas2[1].inputValue() : '';

  console.log('Reloaded Age:', reloadedAge);
  console.log('Reloaded Height:', reloadedHeight);
  console.log('Reloaded Weight:', reloadedWeight);
  console.log('Reloaded Sex:', reloadedSex);
  console.log('Reloaded Medication:', reloadedMed);

  await page.screenshot({ path: 'tests/health-reopened-with-data.png' });

  if (reloadedAge === '21' && reloadedHeight === '173' && reloadedWeight === '78' && reloadedSex === 'male' && reloadedMed.includes('Escitalopram')) {
    console.log('SUCCESS: All health data was preserved and reloaded perfectly!');
  } else {
    throw new Error('FAILURE: Health data was not preserved!');
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
