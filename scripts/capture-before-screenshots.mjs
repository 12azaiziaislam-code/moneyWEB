/**
 * Captures comprehensive "before" screenshots of Baraka using Playwright.
 * Covers: 390x844 (mobile) and 1440x900 (desktop) across ar/ru/en in light & dark.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = join(process.cwd(), 'tests', 'screenshots', 'before');

mkdirSync(OUT_DIR, { recursive: true });

function waitPort(port, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`);
        if (res.ok || res.status === 200 || res.status === 404) return resolve(true);
      } catch {}
      if (Date.now() - start > timeoutMs) reject(new Error('Timeout waiting for preview server'));
      else setTimeout(check, 300);
    };
    check();
  });
}

async function run() {
  console.log('Building app for preview...');
  const build = spawn('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
  await new Promise((resolve, reject) => {
    build.on('close', (code) => (code === 0 ? resolve(true) : reject(new Error('Build failed'))));
  });

  console.log('Connecting to preview server at', BASE_URL);
  let server = null;
  try {
    const res = await fetch(`${BASE_URL}/`);
    if (res.ok) console.log('Found running preview server.');
  } catch {
    console.log('Starting vite preview server...');
    server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
      stdio: 'pipe',
      shell: true,
    });
    server.stderr.on('data', (d) => console.error(d.toString()));
    await waitPort(PORT);
  }

  try {
    console.log('Preview server ready at', BASE_URL);

    const browser = await chromium.launch();

    const viewports = [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'desktop', width: 1440, height: 900 },
    ];

    const locales = ['ar', 'en', 'ru'];
    const themes = ['dark', 'light'];

    for (const vp of viewports) {
      for (const loc of locales) {
        for (const th of themes) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            locale: loc === 'ar' ? 'ar-SA' : loc === 'ru' ? 'ru-RU' : 'en-US',
          });

          // 1. Login Page
          const page = await context.newPage();
          await page.addInitScript(({ loc, th }) => {
            localStorage.setItem('i18nextLng', loc);
            localStorage.setItem('baraka.theme', th);
          }, { loc, th });

          await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
          await page.screenshot({
            path: join(OUT_DIR, `login_${vp.name}_${loc}_${th}.png`),
            fullPage: false,
          });

          // 2. Onboarding Page (Guest intro not seen)
          await page.addInitScript(({ loc, th }) => {
            localStorage.setItem('baraka.guestIntro', '0');
            localStorage.setItem('i18nextLng', loc);
            localStorage.setItem('baraka.theme', th);
          }, { loc, th });
          // Click "Try as guest" or trigger guest
          try {
            const guestBtn = page.locator('button:has-text("كضيف"), button:has-text("guest"), button:has-text("гость")').first();
            if (await guestBtn.isVisible()) {
              await guestBtn.click();
              await page.waitForTimeout(500);
              await page.screenshot({
                path: join(OUT_DIR, `onboarding_${vp.name}_${loc}_${th}.png`),
              });
            }
          } catch {}

          // 3. Authenticated Guest Pages
          const appPages = [
            { path: '/', name: 'halal' },
            { path: '/chats', name: 'chats' },
            { path: '/doctor', name: 'doctor' },
            { path: '/accountant', name: 'accountant' },
            { path: '/profile', name: 'profile' },
          ];

          for (const ap of appPages) {
            const appPage = await context.newPage();
            await appPage.addInitScript(({ loc, th }) => {
              localStorage.setItem('baraka.guestIntro', '1');
              localStorage.setItem('i18nextLng', loc);
              localStorage.setItem('baraka.theme', th);
              localStorage.setItem('baraka.guestData', JSON.stringify({
                profile: { onboardingDone: true, locale: loc },
                settings: { locale: loc, theme: th },
              }));
            }, { loc, th });

            try {
              await appPage.goto(`${BASE_URL}${ap.path}`, { waitUntil: 'networkidle' });
              // If still on login, click guest button
              const guestBtn = appPage.locator('button:has-text("كضيف"), button:has-text("guest"), button:has-text("гость")').first();
              if (await guestBtn.isVisible()) {
                await guestBtn.click();
                await appPage.waitForTimeout(600);
                if (ap.path !== '/') await appPage.goto(`${BASE_URL}${ap.path}`, { waitUntil: 'networkidle' });
              }
              await appPage.waitForTimeout(300);
              await appPage.screenshot({
                path: join(OUT_DIR, `${ap.name}_${vp.name}_${loc}_${th}.png`),
              });
            } catch (err) {
              console.error(`Failed ${ap.name} ${vp.name} ${loc}:`, err.message);
            } finally {
              await appPage.close();
            }
          }

          await page.close();
          await context.close();
        }
      }
    }

    await browser.close();
    console.log('✓ All before screenshots captured successfully in', OUT_DIR);
  } finally {
    if (server) server.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
