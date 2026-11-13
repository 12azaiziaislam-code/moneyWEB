import { chromium } from 'playwright';

async function testDoctorTextInquiry() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar',
  });

  const page = await context.newPage();

  console.log('--- Step 1: Register unique test user ---');
  await page.goto('http://127.0.0.1:8788/');
  await page.waitForTimeout(600);

  // Switch to Register tab
  const registerTab = page.locator('button:has-text("إنشاء حساب")').first();
  if (await registerTab.count()) {
    await registerTab.click();
    await page.waitForTimeout(400);

    const testId = Date.now();
    // Fill username, email, password
    const inputs = page.locator('form input');
    await inputs.nth(0).fill(`user_${testId}`);
    await inputs.nth(1).fill(`user_${testId}@example.com`);
    await inputs.nth(2).fill('ValidPass123!');
    
    // Submit registration
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);
  }

  // Handle onboarding skip if present
  const skipBtn = page.locator('text=تخطٍ').first();
  if (await skipBtn.count()) {
    await skipBtn.click();
    await page.waitForTimeout(600);
  }

  console.log('--- Step 2: Complete Health Profile ---');
  await page.goto('http://127.0.0.1:8788/profile');
  await page.waitForTimeout(800);

  const healthDrawerBtn = page.locator('button:has-text("الصحة")').first();
  await healthDrawerBtn.click();
  await page.waitForTimeout(600);

  await page.locator('[role="dialog"] input[type="number"][min="1"]').fill('21');
  await page.locator('[role="dialog"] input[type="number"][min="60"]').fill('173');
  await page.locator('[role="dialog"] input[type="number"][step="0.1"]').fill('78');

  const saveBtn = page.locator('[role="dialog"] button[type="submit"]');
  await saveBtn.click();
  await page.waitForTimeout(800);

  console.log('--- Step 3: Go to /doctor and enter user inquiry ---');
  await page.goto('http://127.0.0.1:8788/doctor');
  await page.waitForTimeout(1000);

  // Intercept the API response to test frontend presentation deterministically
  await page.route('**/api/doctor/analyze', async (route) => {
    console.log('Intercepted /api/doctor/analyze request!');
    const reqBody = route.request().postDataJSON();
    console.log('Request body text:', reqBody.text);
    console.log('Has image in request:', Boolean(reqBody.imageDataUrl));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          type: 'unclear',
          confidence: 0.9,
          summary: 'بناءً على بياناتك المسجلة (العمر 21 سنة، الطول 173 سم، والوزن 78 كجم)، فإن مؤشر كتلة الجسم (BMI) الخاص بك هو 26.1.\n\nوهذا الرقم يقع في فئة زيادة الوزن الطفيفة (Overweight) ولكن بفارق بسيط عن النطاق الطبيعي المثالي (18.5 - 24.9).\n\nالنصيحة الطبية والتغذوية: لا تحتاج إلى حميات قاسية أو إنقاص وزن حاد؛ بل يكفي تعديل بسيط في النشاط البدني مع التركيز على بناء الكتلة العضلية وتناول وجبات متوازنة.',
          emergency: false,
          createdAt: new Date().toISOString(),
        }
      })
    });
  });

  const textarea = page.locator('textarea');
  await textarea.fill('هل وزني طبيعي بالنسبة لطولي و عمري ام احتاج لكي انحف');
  await page.waitForTimeout(500);

  // Click submit
  const submitDoctorBtn = page.locator('button:has-text("بدء الفحص الصحي الفوري الآن")');
  await submitDoctorBtn.click();

  // Check busy button text
  await page.waitForTimeout(150);
  const busyButtonText = await page.locator('button:has-text("جارٍ فحص الاستفسار")').first().isVisible();
  console.log('Is busy button displaying "جارٍ فحص الاستفسار الطبي ومطابقته…"?', busyButtonText);

  // Wait for result card
  const resultCard = page.locator('text=نتيجة التقييم الصحي');
  await resultCard.waitFor({ timeout: 5000 });
  console.log('Result card visible!');

  // Check the title of the result
  const title = await page.locator('h3').innerText();
  console.log('Result card title header:', title);
  if (title.toLowerCase().includes('unclear')) {
    throw new Error('FAILED: Title header displayed raw "unclear" instead of localized Arabic title!');
  }

  // Check the discuss button
  const sheikhBtn = await page.locator('button:has-text("ناقش الشيخ")').count();
  console.log('Count of "ناقش الشيخ" buttons on Doctor page:', sheikhBtn);
  if (sheikhBtn > 0) {
    throw new Error('FAILED: "ناقش الشيخ" button found on Doctor page!');
  }

  const doctorDiscussBtn = page.locator('button:has-text("استشارة الطبيب")');
  const doctorBtnVisible = await doctorDiscussBtn.isVisible();
  console.log('Is "استشارة الطبيب" button visible?', doctorBtnVisible);
  if (!doctorBtnVisible) {
    throw new Error('FAILED: "استشارة الطبيب" button not found on result card!');
  }

  // Click "استشارة الطبيب" to verify chat transition
  console.log('Clicking "استشارة الطبيب" to verify chat navigation...');
  await doctorDiscussBtn.click();
  await page.waitForTimeout(1000);
  console.log('Current URL after discuss:', page.url());

  await page.screenshot({ path: 'tests/doctor-text-inquiry-fixed.png' });
  console.log('Captured tests/doctor-text-inquiry-fixed.png');

  await browser.close();
  console.log('DOCTOR TEXT INQUIRY FULL TEST PASSED 100%!');
}

testDoctorTextInquiry().catch((err) => {
  console.error(err);
  process.exit(1);
});
