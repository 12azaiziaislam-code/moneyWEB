#!/usr/bin/env node
/**
 * Baraka - one-command local runner.
 *   npm start | npm start -- --fast | --no-build | --fresh | --port=8790
 *   npm run smoke   (checks only, against a running server)
 * Everything stays local: D1 in .wrangler/state, secrets in .dev.vars/.env.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const PORT = Number(value('port', '8788'));
const BASE = `http://127.0.0.1:${PORT}`;
const USE_COLOR = !process.env.NO_COLOR;
const paint = (code) => (text) => (USE_COLOR ? `\x1b[${code}m${text}\x1b[0m` : String(text));
const bold = paint('1');
const dim = paint('2');
const green = paint('32');
const red = paint('31');
const yellow = paint('33');
const cyan = paint('36');

let step = 0;
const stepLine = (title) => {
  step += 1;
  process.stdout.write(`\n${cyan(bold(`[${step}]`))} ${bold(title)}\n`);
};
const ok = (message) => process.stdout.write(`  ${green('[OK]')} ${message}\n`);
const info = (message) => process.stdout.write(`  ${dim('[-]')} ${message}\n`);
const warn = (message) => process.stdout.write(`  ${yellow('[!]')} ${message}\n`);
const bad = (message) => process.stdout.write(`  ${red('[X]')} ${message}\n`);

function fail(message, hint) {
  process.stdout.write(`\n${red(bold('[X] ' + message))}\n`);
  if (hint) process.stdout.write(`${dim(hint)}\n`);
  process.exit(1);
}

/** Spawn a command; streams output unless `capture` is set. */
function run(command, args, { capture = false, allowFail = false } = {}) {
  return new Promise((resolve, reject) => {
    // A single command string keeps Node from warning about shell + args arrays.
    const line = [command, ...args]
      .map((part) => (/[\s"]/.test(part) ? `"${part.replace(/"/g, '\\"')}"` : part))
      .join(' ');
    const child = spawn(line, {
      cwd: ROOT,
      shell: true,
      env: { ...process.env, FORCE_COLOR: USE_COLOR ? '1' : '0' },
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let output = '';
    if (capture) {
      child.stdout?.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        output += chunk.toString();
      });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && !allowFail) {
        const error = new Error(`${command} ${args.join(' ')} exited with ${code}`);
        error.output = output;
        reject(error);
      } else {
        resolve({ code, output });
      }
    });
  });
}

function parseEnv(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match) map[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return map;
}

const looksPlaceholder = (value) =>
  !value || /your-|replace_with|put_your|xxxx|0000-0000|abcdef/i.test(value);

// ---------------------------------------------------------------------------
// Environment files
// ---------------------------------------------------------------------------
function ensureEnvFiles() {
  stepLine('Preparing local environment files');

  const devVarsPath = path.join(ROOT, '.dev.vars');
  const devVarsExample = path.join(ROOT, '.dev.vars.example');
  if (!existsSync(devVarsExample)) fail('.dev.vars.example is missing');

  if (!existsSync(devVarsPath)) {
    let text = readFileSync(devVarsExample, 'utf8');
    const secret = randomBytes(48).toString('base64');
    text = text
      .replace(/^GUEST_JWT_SECRET=.*$/m, `GUEST_JWT_SECRET=${secret}`)
      .replace(/^APP_ORIGIN=.*$/m, `APP_ORIGIN=http://127.0.0.1:${PORT},http://localhost:${PORT},http://localhost:5173`);
    writeFileSync(devVarsPath, text, 'utf8');
    ok('.dev.vars created from the example (guest secret generated)');
  } else {
    ok('.dev.vars already present');
  }

  const envPath = path.join(ROOT, '.env');
  const envExample = path.join(ROOT, '.env.example');
  if (!existsSync(envPath) && existsSync(envExample)) {
    const blank = readFileSync(envExample, 'utf8').replace(/^(VITE_FIREBASE_[A-Z_]+)=.*$/gm, '$1=');
    writeFileSync(envPath, blank, 'utf8');
    ok('.env created from the example (Firebase left empty until you add your config)');
  } else if (existsSync(envPath)) {
    ok('.env already present');
  }

  // Placeholder Firebase values would enable the Google button and then fail at
  // click time. Blank them so the UI honestly shows "not configured yet".
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, 'utf8');
    const current = parseEnv(text);
    if (looksPlaceholder(current.VITE_FIREBASE_API_KEY) && current.VITE_FIREBASE_API_KEY !== '') {
      writeFileSync(envPath, text.replace(/^(VITE_FIREBASE_[A-Z_]+)=.*$/gm, '$1='), 'utf8');
      info('placeholder Firebase values in .env were cleared (Google button disabled until real keys)');
    }
  }

  const vars = parseEnv(readFileSync(devVarsPath, 'utf8'));
  const client = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
  const guestOn = String(vars.GUEST_MODE_ENABLED ?? '').toLowerCase() === 'true';
  const guestSecretOk = (vars.GUEST_JWT_SECRET ?? '').length >= 32;

  if (guestOn && guestSecretOk) ok('guest mode is ON (every screen can be tested without Google)');
  else {
    warn('guest mode is OFF - only Google sign-in would be available');
    info('enable it with GUEST_MODE_ENABLED=true and GUEST_JWT_SECRET (>=32 chars) in .dev.vars');
  }

  if (looksPlaceholder(vars.GATEWAY_API_KEY)) {
    warn('GATEWAY_API_KEY is a placeholder - AI answers return 503 (the UI shows a friendly error)');
  } else ok('gateway key detected');

  if (looksPlaceholder(client.VITE_FIREBASE_API_KEY) || looksPlaceholder(client.VITE_FIREBASE_PROJECT_ID)) {
    warn('Firebase is not configured in .env - the Google button stays disabled');
    info('guest mode still opens: halal scan, chats, doctor, accountant, profile');
  } else ok('Firebase web config detected');

  const databaseId = (readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8').match(/database_id\s*=\s*"([^"]+)"/) ?? [])[1];
  if (looksPlaceholder(databaseId)) info('wrangler.toml still has the placeholder database_id - fine locally, required for deploy');

  return { guestOn, guestSecretOk };
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------
async function ensureDependencies() {
  stepLine('Checking dependencies');
  if (!existsSync(path.join(ROOT, 'node_modules'))) {
    info('node_modules missing - running npm install (may take a few minutes)');
    await run('npm', ['install', '--no-audit', '--no-fund']);
  }
  ok('node_modules ready');
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) warn(`Node ${process.versions.node} detected, Node >= 20 is recommended`);
  else ok(`Node ${process.versions.node}`);
}

// ---------------------------------------------------------------------------
// Local D1
// ---------------------------------------------------------------------------
async function migrateLocalDatabase() {
  stepLine('Applying D1 migrations (local only)');

  if (flag('fresh') && existsSync(path.join(ROOT, '.wrangler', 'state'))) {
    rmSync(path.join(ROOT, '.wrangler', 'state'), { recursive: true, force: true });
    info('local D1 state wiped (--fresh)');
  }

  const result = await run(
    'npx',
    ['wrangler', 'd1', 'migrations', 'apply', 'baraka-db', '--local', '--persist-to', '.wrangler/state'],
    { capture: true, allowFail: true },
  );
  const output = result.output.replace(/\x1b\[[0-9;]*m/g, '');
  if (result.code !== 0) {
    warn('could not apply migrations automatically');
    info(output.split('\n').filter(Boolean).slice(-6).join('\n  '));
    info('run manually: npm run db:migrate:local');
  } else if (/No migrations to apply/i.test(output)) {
    ok('schema already up to date');
  } else {
    ok('migrations applied to the local database');
  }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
async function buildApp() {
  stepLine('Building the app (PWA + worker bundle)');
  const started = Date.now();

  if (flag('no-build')) {
    if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) fail('dist/ is missing', 'Remove --no-build so the SPA gets built.');
    ok('reusing the existing dist/ (--no-build)');
    return;
  }

  const script = flag('fast') ? 'build:fast' : 'build';
  try {
    await run('npm', ['run', script]);
  } catch (error) {
    bad(`build failed (${script})`);
    fail('The build stopped. Fix the first error above and re-run `npm start`.');
  }

  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) fail('dist/index.html was not produced');
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  ok(`build finished in ${seconds}s -> dist/`);
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
async function isUp() {
  try {
    const response = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

function startServer() {
  stepLine('Starting the local server (Cloudflare Pages + Functions + D1)');
  const line = [
    'npx',
    'wrangler',
    'pages',
    'dev',
    'dist',
    '--port',
    String(PORT),
    '--ip',
    '127.0.0.1',
    '--persist-to',
    '.wrangler/state',
    '--compatibility-date',
    '2024-11-01',
  ].join(' ');
  const child = spawn(line, {
    cwd: ROOT,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, BROWSER: 'none' },
  });

  const stop = () => {
    if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  };
  process.on('SIGINT', () => {
    stop();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    stop();
    process.exit(0);
  });
  process.on('exit', stop);
  return child;
}

async function waitForServer(child) {
  const deadline = Date.now() + 90_000;
  let exited = false;
  child.once('exit', (code) => {
    exited = true;
    if (code !== 0) fail(`wrangler exited with code ${code}`, 'Scroll up: the first red line explains why.');
  });

  while (Date.now() < deadline) {
    if (exited) return;
    if (await isUp()) {
      ok(`server is answering on ${BASE}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  fail('the server did not become ready in 90s', 'Check the wrangler output above.');
}

// ---------------------------------------------------------------------------
// Smoke test
// ---------------------------------------------------------------------------
async function hit(pathname, init) {
  const response = await fetch(`${BASE}${pathname}`, { ...init, signal: AbortSignal.timeout(15_000) });
  const text = await response.text();
  return { status: response.status, text, type: response.headers.get('content-type') ?? '' };
}

async function smokeTest(guestOn) {
  stepLine('Checking that everything works');
  const results = [];
  const check = (name, passed, expectation, actual) => {
    results.push({ name, passed, expectation, actual });
    const line = `${name} ${dim(`(${expectation})`)} -> ${actual}`;
    if (passed) ok(line);
    else bad(line);
  };

  try {
    const html = await hit('/');
    check('SPA shell', html.status === 200 && html.text.includes('id="root"'), 'GET / 200 html', String(html.status));

    const deep = await hit('/chats');
    check('Deep link fallback', deep.status === 200 && deep.text.includes('id="root"'), 'GET /chats 200 html', String(deep.status));

    const manifest = await hit('/manifest.webmanifest');
    check('PWA manifest', manifest.status === 200, 'GET /manifest.webmanifest 200', String(manifest.status));

    const worker = await hit('/sw.js');
    check('Service worker', worker.status === 200, 'GET /sw.js 200', String(worker.status));

    const health = await hit('/api/health');
    let payload = {};
    try {
      payload = JSON.parse(health.text);
    } catch {
      payload = {};
    }
    const dbOk = payload?.checks?.db === true || payload?.db === true;
    check('API health + D1', health.status === 200 && dbOk, 'GET /api/health 200 db:true', `${health.status} db=${dbOk}`);

    const unauthorized = await hit('/api/me');
    check('Protected route', unauthorized.status === 401, 'GET /api/me 401', String(unauthorized.status));

    const scan = await hit('/api/halal/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'gelatin' }),
    });
    check('AI route is gated', scan.status === 401, 'POST /api/halal/scan 401', String(scan.status));

    const missing = await hit('/api/does-not-exist');
    check('Unknown API 404', missing.status === 404, 'GET /api/nope 404', String(missing.status));

    const guest = await hit('/api/guest/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    check(
      'Guest endpoint',
      guestOn ? guest.status === 201 || guest.status === 429 : guest.status === 403,
      guestOn ? 'POST /api/guest/start 201' : 'POST /api/guest/start 403',
      String(guest.status),
    );

    if (guest.status === 201) {
      let token = '';
      try {
        token = JSON.parse(guest.text)?.token ?? '';
      } catch {
        token = '';
      }
      const finance = await hit('/api/finance', { headers: { authorization: `Bearer ${token}` } });
      check('Guests cannot read user data', finance.status === 403, 'GET /api/finance (guest) 403', String(finance.status));
    }
  } catch (error) {
    bad(`smoke test crashed: ${error.message}`);
    results.push({ name: 'smoke', passed: false, expectation: 'no crash', actual: 'crash' });
  }

  const failed = results.filter((entry) => !entry.passed);
  return { passed: results.length - failed.length, total: results.length, failed };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function banner(guestOn) {
  process.stdout.write(`\n${bold('-'.repeat(58))}\n`);
  process.stdout.write(`${bold('  App')}      ${cyan(`${BASE}/`)}\n`);
  process.stdout.write(`${bold('  Health')}   ${BASE}/api/health\n`);
  process.stdout.write(`${bold('  Guest')}    ${guestOn ? green('ON') : yellow('OFF')} ${dim('-> "Try as guest" on the login screen')}\n`);
  process.stdout.write(`${bold('  D1')}       ${dim('local .wrangler/state')}\n`);
  process.stdout.write(`${bold('-'.repeat(58))}\n`);
}

async function main() {
  process.stdout.write(`\n${bold('Baraka')} ${dim('| local verification')}\n`);

  if (flag('smoke-only')) {
    if (!(await isUp())) fail(`nothing is listening on ${BASE}`, 'Start it first with `npm start`.');
    const { passed, total, failed } = await smokeTest(true);
    process.stdout.write(`\n${bold(`${passed}/${total} checks passed`)}\n`);
    process.exit(failed.length ? 1 : 0);
  }

  const { guestOn } = ensureEnvFiles();
  await ensureDependencies();
  await migrateLocalDatabase();
  await buildApp();

  if (await isUp()) {
    warn(`something is already listening on ${BASE} - checking it instead of starting a new server`);
    const { passed, total, failed } = await smokeTest(guestOn);
    banner(guestOn);
    process.stdout.write(`\n${bold(`${passed}/${total} checks passed`)}\n`);
    process.exit(failed.length ? 1 : 0);
  }

  const child = startServer();
  await waitForServer(child);

  const { passed, total, failed } = await smokeTest(guestOn);
  banner(guestOn);

  if (failed.length) {
    process.stdout.write(`\n${red(bold(`${failed.length} check(s) failed`))}\n`);
    for (const entry of failed) {
      process.stdout.write(`  ${red('[X]')} ${entry.name}: expected ${entry.expectation}, got ${entry.actual}\n`);
    }
    process.stdout.write(`${dim('\nThe server is still running so you can inspect it. Ctrl+C to stop.\n')}`);
  } else {
    process.stdout.write(`\n${green(bold(`All ${total} checks passed`))}\n`);
    process.stdout.write(`${dim('Open the App URL, then: "Try as guest" -> "Fill with demo data" to see every screen.\n')}`);
    process.stdout.write(`${dim('Doctor needs a health profile (Profile -> Health); accountant needs money data (Profile -> Money).\n')}`);
    process.stdout.write(`${dim('AI answers need GATEWAY_API_KEY in .dev.vars (currently a placeholder -> 503).\n')}`);
    process.stdout.write(`${dim('Press Ctrl+C to stop the server.\n')}`);
  }

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((error) => {
  process.stdout.write(`\n${red(String(error?.message ?? error))}\n`);
  process.exit(1);
});
