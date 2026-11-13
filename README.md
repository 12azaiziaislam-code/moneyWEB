# بركة | Baraka

> Halal food checker · AI doctor · smart accountant — a mobile-first PWA for the Russian market
> (₽ RUB by default), with Arabic (RTL), Russian and English UI.

Baraka is a single-page React app served from **Cloudflare Pages**, backed by **Pages Functions**
(a single `/api/*` entry point) on **D1**, with an optional **R2** bucket for images.
Every AI call goes through our own worker — the browser never sees the gateway key.

- **حلال** — photograph an ingredient label (incl. Russian `Состав`), a pack or a barcode → OCR →
  E‑numbers / gelatin / animal fat / alcohol / pork analysis → `halal · haram · mashbooh` verdict
  with confidence, reason and "what would settle it", plus a streaming follow‑up chat with «الشيخ AI».
- **الطبيب AI** — classify a photo (medicine / food / receipt / bank / lab) and explain it against
  your health profile. Exercise equivalents are computed **in code** (MET), never by the model.
- **المحاسب AI** — money cycle until payday, daily budget, 3 spending modes (القحط / عادي / مرتاح),
  risk colours, over‑spend redistribution, receipt scanning with an editable review screen,
  duplicate detection, salary confirmations and an accountant chat drawer.
- **PWA** — installable, offline shell, "update available" notice, safe‑area aware, ≤480px layout.

---

## 0. Quick start — one command

Run the whole stack locally (env files → local D1 → build → Pages Functions server → self‑check):

```bash
npm start
```

That prints a step‑by‑step report and ends with a checks table:

```
[OK] SPA shell            (GET / 200 html)              -> 200
[OK] Deep link fallback   (GET /chats 200 html)         -> 200
[OK] PWA manifest         (GET /manifest.webmanifest)   -> 200
[OK] API health + D1      (GET /api/health 200 db:true) -> 200 db=true
[OK] Protected route      (GET /api/me 401)             -> 401
[OK] Guest endpoint       (POST /api/guest/start 201)   -> 201
[OK] Guests cannot read user data (GET /api/finance)    -> 403
```

Then open <http://127.0.0.1:8788/> and press **«جرّب كضيف» → «بيانات تجريبية جاهزة»**
to walk through every screen without Google. `Ctrl+C` stops the server.

| Command | What it does |
| --- | --- |
| `npm start` | full flow: env, D1 migrations, `npm run build` (with typecheck), serve, checks |
| `npm run start:fast` | same but skips typecheck (`vite build` only) |
| `npm start -- --no-build` | reuses the existing `dist/` |
| `npm start -- --fresh` | wipes the local D1 state first |
| `npm start -- --port=8790` | different port |
| `npm run smoke` | only runs the checks against an already‑running server |
| `run.cmd` (Windows) | double‑click wrapper around `npm start` |

On the first run it creates `.dev.vars` from `.dev.vars.example` with a freshly generated
`GUEST_JWT_SECRET` (so guest mode works immediately) and `.env` from `.env.example`.
Both are git‑ignored. Until you paste a real `GATEWAY_API_KEY` / Firebase web config the
AI replies return `503` and the Google button stays disabled — everything else works.

---

## 1. Stack

| Layer | Choice |
| --- | --- |
| UI | Vite 5 · React 18 · TypeScript · Tailwind 3 · react-i18next |
| Hosting | Cloudflare Pages (static `dist/` + Functions) |
| API | Pages Functions (`functions/api/[[path]].ts`) → small router, no heavy deps |
| DB | Cloudflare D1 (SQLite) with numbered migrations |
| Files | R2 (optional) or compressed thumbnails in D1 (`USE_R2=false`) |
| Auth | Firebase Authentication (Google only), ID token verified server‑side with Google JWKS |
| AI | OpenAI‑compatible **Gemma Gateway** (`https://gemma-gateway.pages.dev/v1`) via `GATEWAY_API_KEY` |
| Tests | Vitest (money, paydays, budget engine, JWT verification, model fallback, JSON repair) |

---

## 2. Project structure

```
.
├─ index.html                 # PWA meta, manifest link, iOS/Apple tags
├─ package.json               # scripts: dev, build, test, deploy, db:migrate…
├─ vite.config.ts             # SPA build → dist/ (+ /api proxy to wrangler on 8788)
├─ vitest.config.ts
├─ tailwind.config.js / postcss.config.js
├─ tsconfig.json              # browser code
├─ tsconfig.functions.json    # worker code (workers-types)
├─ wrangler.toml              # Pages project: D1 (+ optional R2), vars
├─ migrations/
│  ├─ 0001_init.sql           # users, chats, messages, assets, transactions, halal_scans, rate_limits
│  └─ 0002_confirmations_and_usage.sql
├─ schema.sql                 # full snapshot (generated from the migrations)
├─ .env.example               # PUBLIC Vite variables (Firebase web config)
├─ .dev.vars.example          # local secrets for `wrangler pages dev`
├─ functions/api/
│  ├─ [[path]].ts             # the only HTTP entry point
│  └─ _lib/                   # auth(JWT+JWKS), router, schemas(Zod), storage, rateLimit,
│                             # ai/{gateway,structured,schemas,prompts}, handlers/{me,chats,assets,ai,analysis,finance}
├─ shared/                    # pure modules shared by the app, the worker and the tests
│  ├─ types.ts  money.ts  payday.ts  budget.ts  health.ts  constants.ts
├─ src/
│  ├─ i18n/{index.ts,ar.json,ru.json,en.json}
│  ├─ lib/{api,firebase,idb,image,format,pwa}.ts
│  ├─ state/{AuthContext,ToastContext}.tsx
│  ├─ components/{ui,Shell,ChatView,ImagePicker,RichText,HealthForm,FinanceForm}.tsx
│  ├─ content/legal.ts        # privacy policy + terms templates (ar/ru/en)
│  └─ pages/{Login,Onboarding,Halal,Chats,ChatDetail,Doctor,Accountant,Profile,Legal}.tsx
├─ public/
│  ├─ manifest.webmanifest  sw.js  _headers  _redirects
│  └─ icons/ (SVG source + generated PNGs)
├─ scripts/generate-icons.mjs # dependency-free PNG generator (crescent + star)
└─ tests/*.test.ts
```

---

## 3. Quick start (local)

```bash
# 1) install
npm install

# 2) public build-time config (Firebase web keys — PUBLIC by design)
cp .env.example .env         # Windows: copy .env.example .env
#    fill VITE_FIREBASE_* (see §4)

# 3) local worker secrets (never committed)
cp .dev.vars.example .dev.vars
#    fill GATEWAY_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_API_KEY, APP_ORIGIN

# 4) database (local D1)
npx wrangler d1 migrations apply baraka-db --local

# 5) build + run the real stack (SPA + /api) on http://localhost:8788
npm run build
npm run preview:cf
```

UI-only iteration (no API): `npm run dev` → http://localhost:5173 with `/api` proxied to 8788
(start `npm run preview:cf` in a second terminal for a working backend).

Run the tests:

```bash
npm test          # vitest run
npm run typecheck # browser + worker TypeScript projects
```


---

## 4. Firebase (Google sign-in)

1. <https://console.firebase.google.com> → **Add project** (e.g. `baraka-prod`).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**, pick a support email.
3. **Project settings → General → Your apps → Web (`</>`)** → register the app.
   Copy the config values into `.env` (and later into Pages env vars):

   ```
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_AUTH_DOMAIN=baraka-prod.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=baraka-prod
   VITE_FIREBASE_APP_ID=1:…:web:…
   VITE_FIREBASE_MESSAGING_SENDER_ID=…
   VITE_FIREBASE_STORAGE_BUCKET=baraka-prod.appspot.com
   ```

4. **Authentication → Settings → Authorized domains** → add:
   - `localhost`
   - `baraka.pages.dev` (your Pages subdomain)
   - your custom domain (e.g. `baraka.app`)

   Without this the popup/redirect fails with `auth/unauthorized-domain`.

5. Server-side values (`.dev.vars` + Pages secrets/vars):
   - `FIREBASE_PROJECT_ID` — used to verify `aud` and `iss` of the ID token.
   - `FIREBASE_API_KEY` — the **public web API key**, used **only** server-side to call
     `accounts:delete` when the user deletes their account. Without it, account deletion
     returns a clear 503 instead of leaving an orphan account.

**Popup vs redirect** — the app uses `signInWithPopup` on desktop and `signInWithRedirect` on
mobile (`/Android|iPhone|iPad|iPod|Mobile/`). `getRedirectResult()` runs on every boot, so the
redirect flow completes cleanly. If a browser blocks the popup, the UI asks the user to allow
pop-ups (or to retry).

---

## 5. D1 database

```bash
npx wrangler login
npx wrangler d1 create baraka-db
# → copy the printed database_id into wrangler.toml
npm run db:migrate        # remote (production)
npm run db:migrate:local  # local preview DB
```

This runs `migrations/0001_init.sql` and `migrations/0002_confirmations_and_usage.sql` in order
(wrangler tracks applied migrations in `d1_migrations`).

Tables: `users`, `chats`, `messages`, `assets`, `transactions`, `halal_scans`, `rate_limits`,
`income_confirmations`, `ai_usage`. **Every query filters by `uid`** — see `functions/api/_lib/db.ts`
and the handlers.

`schema.sql` is a full snapshot if you prefer a one-shot bootstrap:

```bash
npx wrangler d1 execute baraka-db --remote --file=./schema.sql
```

---

## 6. R2 (optional)

Images are downscaled to ≤1280px JPEG ≈0.8 **in the browser** before upload, so D1 is enough for a
small user base:

| `USE_R2` | Where images live | Notes |
| --- | --- | --- |
| `false` (default) | `assets.data` BLOB in D1 | zero extra setup, counts against the D1 5 GB limit |
| `true` | R2 bucket `baraka-media`, key `{uid}/{assetId}` | better for many users |

```bash
npx wrangler r2 bucket create baraka-media
# then uncomment the [[r2_buckets]] block in wrangler.toml and set USE_R2="true"
```

Deleting an account purges `{uid}/` from R2 before the D1 rows are removed.

---

## 7. Secrets & variables

```bash
# the gateway key from the Key pool (NOT the enrollment key: enroll_only_key → 403)
npx wrangler pages secret put GATEWAY_API_KEY --project-name baraka

# public Firebase web key, used server-side only for account deletion
npx wrangler pages secret put FIREBASE_API_KEY --project-name baraka
```

`wrangler.toml → [vars]` holds the non-secret values. Recommended production values:

```
FIREBASE_PROJECT_ID = "baraka-prod"
APP_VERSION         = "1.0.0"
USE_R2              = "false"
APP_ORIGIN          = "https://baraka.pages.dev"   # comma-separated allow-list
RATE_LIMIT_PER_HOUR = "30"

---

## 8. Deploy to Cloudflare Pages

### Option A — Git integration (recommended)

1. Push this repo to GitHub/GitLab.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`
4. **Settings → Functions → Compatibility date:** `2024-11-01`
   (and make sure the D1 binding `DB` + `BUCKET` exist — they come from `wrangler.toml`).
5. **Settings → Environment variables:** add every `VITE_*` value (Production *and* Preview),
   plus the `[vars]` from §7. Add the two secrets with
   `wrangler pages secret put …`.
6. Deploy. The first build runs `npm run icons` (generates the PNGs) then `vite build`.

### Option B — CLI

```bash
npm run build
npx wrangler pages project create baraka --production-branch main
npx wrangler pages deploy dist --project-name baraka
```

### Custom domain

Pages → your project → **Custom domains → Set up a domain** → e.g. `baraka.app`.
Then:

- add the domain to **Firebase → Authentication → Authorized domains**;
- add `https://baraka.app` to `APP_ORIGIN` (comma separated) and redeploy;
- keep `VITE_FIREBASE_AUTH_DOMAIN` as `*.firebaseapp.com` (the popup iframe host).

### Why `_headers` / `_redirects`

`public/_headers` sets a strict CSP (`script-src 'self'`, `connect-src` only for Firebase/Google),
HSTS, `X-Frame-Options: DENY`, camera permission for our own origin, `no-store` for `/api/*`.

`public/_redirects` intentionally has **no rewrite rule**: Cloudflare Pages already serves
`/index.html` for any path that does not match a static asset (verified locally with
`wrangler pages dev` — `/doctor` returns the app shell with 200), and the classic
`/* /index.html 200` rule makes wrangler log an "infinite loop" warning. If you ever add a
top-level `404.html`, uncomment the rule inside that file.

> If you add a new external service (analytics, another AI host), you must extend
> `connect-src`/`img-src` in `_headers`, otherwise the browser will block it.

### What was verified in this repo

```text
npm run build   → icons + 2×tsc + vite build ✅  (dist/ ~530 KB JS total, gzip ~146 KB)
npm test        → 6 files, 68 tests ✅
wrangler pages dev dist --d1 DB
   GET  /                    → 200 text/html
   GET  /doctor              → 200 text/html (SPA fallback)
   GET  /api/health          → 200 {"ok":true,"db":true,"version":"1.0.0","gateway":false}
   POST /api/session         → 401 without a Firebase token
   GET  /api/chats           → 401 without a Firebase token
   GET  /api/unknown         → 404
wrangler d1 migrations apply baraka-db --local → tables created (users, chats, messages,
   assets, transactions, halal_scans, rate_limits, income_confirmations, ai_usage)
```

---

## 9. AI gateway behaviour (what the worker does)

- `POST /api/ai/chat` is the **only** streaming endpoint the browser talks to. It:
  1. verifies the Firebase ID token (RS256, JWKS from Google, cached per isolate),
  2. enforces per-user limits in D1 (`30/hour`, `200/day`, configurable) → `429` + `Retry-After`,
  3. caps the body (`MAX_BODY_BYTES`) and the image size (`MAX_IMAGE_BYTES`),
  4. injects `Authorization: Bearer <GATEWAY_API_KEY>`, `x-app-name: Baraka`, `x-app-version`,
  5. calls the gateway with `stream: true` and pipes the SSE straight to the browser
     (only the final assistant text is kept in memory to persist the message).
- Model ids are **constants** (`functions/api/_lib/ai/gateway.ts`):
  `gemma-4-26b-a4b-it` (fast default), `gemini-2.5-flash-lite` (vision), `gemini-2.5-flash`,
  `gemma-4-31b-it` (deep, 11–60 s). The gateway silently substitutes a default for unknown
  names, so we never rely on errors to discover them.
- Retries: up to 4 attempts with exponential backoff + jitter, `Retry-After` respected,
  120 s timeout, automatic downgrade to `gemma-4-26b-a4b-it` when a slower/vision model fails
  (even with images).
- `max_tokens` is never below 1024 (the models "think" internally and that counts).
- Structured endpoints (`/api/halal/scan`, `/api/doctor/analyze`, `/api/accountant/extract`,
  `/api/accountant/balance`) also stream from the gateway, accumulate the answer, extract the
  first JSON object, validate it with **Zod**, and on failure run **exactly one** repair pass;
  if that also fails the user gets a friendly "try a clearer photo" message (`ai_parse_failed`).
- Errors are mapped: `401` → admin alert + generic message (never the key); `403
  device_pending/device_banned` → shown with the gateway message; `429/5xx/timeout` → retry,
  then `ai_unavailable`.
- **Prompt-injection defence**: every system prompt states that text and images from the user
  (including OCR) are *data*, never instructions, and that commands written inside an image must
  be ignored.
- **Own key mode**: the key lives in the device's IndexedDB only, is sent with each request
  through our worker, is never logged or stored server-side, and the base URL must be HTTPS
  (private/loopback hosts are rejected to prevent SSRF).

### Free-plan limits & how the app behaves

| Resource | Free tier (approx.) | App behaviour |
| --- | --- | --- |
| Workers/Pages Functions | 100k requests/day, 10 ms CPU/req | router has no heavy deps; AI is I/O bound (streaming) not CPU; structured calls use one extra repair max |
| D1 | 5 GB storage, 5M rows read/day | per-user rate counters prevent runaway queries; images only if `USE_R2=false` (browser compression first); `pruneRateLimits` cleans old windows |
| R2 | 10 GB storage, 1M class A ops/month | only used when `USE_R2=true`; one object per scan, one delete per account wipe |
| Gateway | quotas of your key pool | `429` is retried with backoff and then surfaced as a calm message; counts are per user |

When a limit is reached the app degrades gracefully: cached chats/history keep rendering offline,

---

## 10. Security, privacy and legal

- **User isolation**: every SQL statement in `functions/api/_lib/**` contains `WHERE uid = ?`
  (inserts store `uid`, updates/deletes filter by it). Account deletion wipes all tables + R2 prefix.
- **Auth**: RS256 only, `aud`/`iss`/`exp`/`sub` checked, 60 s clock skew, JWKS cached with the
  Google `Cache-Control` TTL and refreshed once on `unknown_kid` (key rotation).
- **Input validation**: Zod schemas for every body (`functions/api/_lib/schemas.ts`), image magic
  byte sniffing, MIME whitelist, size caps, base64 data-URL validation.
- **No secrets in the client**: only `VITE_FIREBASE_*` (public by design) is bundled.
  `GATEWAY_API_KEY` / `FIREBASE_API_KEY` exist only as worker secrets.
- **No sensitive logging**: `logEvent`/`logAlert` receive event names + status codes only; error
  strings pass through `maskSecret()` which redacts `Bearer …`, `sk…`, `gwk…`, `AIza…`.
- **Headers**: see §8. Camera is allowed for our origin only; microphone/geolocation are disabled.
- **Money correctness**: integer minor units everywhere (`shared/money.ts`), no floats in storage.
- **Health/legal disclaimers** are permanent UI elements: نهي عن الفتوى، الطوارئ 112، لا استشارة ملزمة.

### ⚖️ Russia 152-FZ (важно)

If you operate from / target Russia, personal data of Russian citizens must generally be stored
and processed on servers located in Russia (Federal Law No. 152-FZ, art. 18). Cloudflare's global
edge is **not** a data-localisation solution by itself. Before a commercial launch:

- talk to a lawyer about 152-FZ (and the localisation + consent requirements),
- consider a Russian region/DB for primary storage, or a RU-hosted deployment,
- keep the consent screen (implemented in onboarding) and the export/delete flows (implemented).

The texts in `src/content/legal.ts` are **templates** — have them reviewed before publishing.
Nothing in this repository is legal advice.

---

## 11. Pre-launch checklist

- [ ] `npm run typecheck` and `npm test` are green.
- [ ] `npm run build` produces `dist/` with `manifest.webmanifest`, `sw.js`, `_headers`, `_redirects`.
- [ ] `.env` filled with the 6 `VITE_FIREBASE_*` values; the same values exist in Pages env vars.
- [ ] Firebase: Google provider enabled, **Authorized domains** include the Pages domain + custom domain.
- [ ] `wrangler.toml`: real `database_id`, `FIREBASE_PROJECT_ID`, `APP_ORIGIN`, optional R2 block.
- [ ] `wrangler pages secret put GATEWAY_API_KEY` (from the Key pool, **not** the enrollment key).
- [ ] `wrangler pages secret put FIREBASE_API_KEY` (needed for real account deletion).
- [ ] `npm run db:migrate` applied to production D1.
- [ ] `GET /api/health` returns `{"ok":true,"db":true,"gateway":true}`.
- [ ] Sign in with Google on desktop (popup) **and** on a phone (redirect).
- [ ] Halal scan with a Russian label (contains `Состав`) → verdict + reason.
- [ ] Doctor: incomplete health profile → gate appears; complete it → medicine photo works.
- [ ] Accountant: set balance → daily budget appears; receipt scan → review screen → save.
- [ ] Overspend today → yellow/orange alert; force a red case → run-out date + rescue steps.
- [ ] Rate limit: 31 requests/hour → `429` with a calm message.
- [ ] Delete account → Firebase user gone (try signing in again), D1/R2 empty.
- [ ] Lighthouse: installable, `apple-touch-icon` present, standalone launch, safe areas.
- [ ] Privacy policy + terms reviewed by a lawyer; 152-FZ handled.
- [ ] Backups/export: `/api/me/export` returns your data as JSON.

---

## 12. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `auth/unauthorized-domain` | Add the exact domain (no `https://`) to Firebase → Authorized domains |
| Sign-in popup closes instantly on mobile | Expected: mobile uses redirect. Make sure `authDomain` matches Firebase |
| Blank page after deploy, CSP errors in console | Extend `connect-src`/`frame-src` in `public/_headers` for the blocked host |
| `401 invalid_token` from our API | Token expired or wrong Firebase project; sign out/in. Check `FIREBASE_PROJECT_ID` |
| `502 ai_auth_failed` | `GATEWAY_API_KEY` wrong/expired → rotate the secret. The key is never shown to users |
| `403 device_pending` | The gateway enrolment was not approved for this key/device — the message is shown as-is |
| `429 rate_limited` | Per-user limit reached (see `RATE_LIMIT_*`), `Retry-After` is returned |
| AI answers look truncated | Raise `max_tokens` (never below 1024) or the `timeoutMs` for the deep model |
| Images not loading offline | `/api/assets/*` is intentionally network-only (private data); cached chats still work |
| `d1 migrations apply` fails | `wrangler login`, correct `database_id`, and unique migration file names |
| Account deletion returns 503 | `FIREBASE_API_KEY` secret missing (public web key) |

---

## 13. Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server (UI; `/api` proxied to `127.0.0.1:8788`) |
| `npm run build` | icons → typecheck (browser + worker) → `vite build` |
| `npm run preview:cf` | `wrangler pages dev dist` with local D1/R2 bindings |
| `npm run deploy` | build + `wrangler pages deploy dist` |
| `npm run db:migrate[:local]` | apply D1 migrations |
| `npm test` / `npm run typecheck` | Vitest suites / TypeScript projects |
| `npm run icons` | regenerate PWA icons from `scripts/generate-icons.mjs` |

---

## 14. What you must provide (credentials)

1. **Firebase web config** (6 values) + the public **web API key** for server-side account deletion.
2. **Gateway API key** from the Key pool (`GATEWAY_API_KEY`) — *not* the enrollment key.
3. Optional: an R2 bucket name if you enable `USE_R2=true`.

Everything else (D1 id, Pages project name, domain) is created by the commands above.

`/api` failures show a retry card, and AI limits show "try again in N seconds".

RATE_LIMIT_PER_DAY  = "200"
MAX_BODY_BYTES      = "6000000"
MAX_IMAGE_BYTES     = "1200000"
GATEWAY_BASE_URL    = "https://gemma-gateway.pages.dev/v1"
```

> The gateway key is read **only** in the worker (`env.GATEWAY_API_KEY`), never sent to the client,
> never stored in the repo, and masked in every log line that could echo a payload.
> `.dev.vars` is git-ignored; `.dev.vars.example` only contains placeholders.

---

## Guest mode (anonymous trial)

Guests can use every screen without Google. The worker issues a 24h HS256 token and
**never writes guest content to D1** — the browser keeps chats, transactions and the
health/money profile in IndexedDB; only the text/image of the request being processed
is sent once.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GUEST_MODE_ENABLED` | `false` | Master switch. Off ⇒ `/api/guest/start` returns 403 and the UI hides the button. |
| `GUEST_JWT_SECRET` | — | HMAC key (≥ 32 chars). Guest tokens are rejected when it is missing. |
| `GUEST_LIMIT_PER_HOUR` | `4` | AI requests per guest token per hour. |
| `GUEST_LIMIT_PER_DAY` | `10` | AI requests per guest token per day. |
| `GUEST_IP_LIMIT_PER_DAY` | `30` | AI requests per hashed IP per day (abuse guard). |
| `GUEST_TOKENS_PER_IP_HOUR` | `6` | How many guest tokens one network may mint per hour. |
| `GUEST_MAX_IMAGE_BYTES` | `700000` | Inline photo cap for guests (smaller than signed-in uploads). |
| `TURNSTILE_SECRET` | — | Optional Cloudflare Turnstile secret; when set, `POST /api/guest/start` requires `turnstileToken`. |

Set them like any other secret:

```bash
wrangler pages secret put GUEST_JWT_SECRET --project-name baraka
wrangler pages secret put GUEST_MODE_ENABLED --project-name baraka   # value: true
```

**Disabling before launch:** blank/remove `GUEST_MODE_ENABLED` (or set `false`).
No migration is needed; existing local guest data simply cannot be refreshed and the
login screen stops showing “Try as guest”.

**Upgrade path:** after a guest signs in, `POST /api/guest/import` copies local chats,
transactions and profiles into the account (transaction de-duplication by `hash`,
30-minute window), then the local copy is erased. Guests never get export, account
deletion or cross-device sync — the UI says so explicitly.

### Guest limits by design

* Model restriction: guests never reach the heavy model (60s timeout, 3 attempts).
* No `/api/uploads`, `/api/chats`, `/api/finance` or `/api/me*` for guests (403).
* Rate limits live in `rate_limits` as counters only: `guest:<id>` and `ip_<hash>`.
