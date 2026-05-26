# Node 24 + Wrangler 4 + README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin the minimum Node.js version to 24, upgrade Wrangler from v3 to v4, and write a README.md for the repository.

**Architecture:** Three independent changes — engine constraints in `package.json` files, a wrangler dependency bump with smoke-test, and a new `README.md` document. Tasks 1 and 3 can run in parallel; Task 2 should follow Task 1 so the engine constraint is already committed when the wrangler upgrade is tested.

**Tech Stack:** Node.js 24, Wrangler CLI v4, npm workspaces, Vitest

---

## File map

| File | Change |
|------|--------|
| `package.json` | Add `"engines"` field and `"packageManager"` field |
| `worker/package.json` | Add `"engines"` field, bump `wrangler` to `^4.94.0`, bump `@cloudflare/workers-types` to `^4.20250525.0` |
| `frontend/package.json` | Add `"engines"` field |
| `.nvmrc` | Create with content `24` |
| `README.md` | Create with project overview and usage guide |

---

## Task 1: Enforce Node.js ≥ 24 across the monorepo

**Files:**
- Modify: `package.json`
- Modify: `worker/package.json`
- Modify: `frontend/package.json`
- Create: `.nvmrc`

- [ ] **Step 1: Add `engines` to root `package.json`**

Current `package.json`:
```json
{
  "name": "oshi",
  "private": true,
  "workspaces": ["worker", "frontend"],
  "scripts": {
    "dev:worker": "cd worker && wrangler dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "deploy": "npm run build && wrangler deploy"
  }
}
```

Replace with:
```json
{
  "name": "oshi",
  "private": true,
  "engines": {
    "node": ">=24.0.0",
    "npm": ">=10.0.0"
  },
  "workspaces": ["worker", "frontend"],
  "scripts": {
    "dev:worker": "cd worker && wrangler dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "deploy": "npm run build && wrangler deploy"
  }
}
```

- [ ] **Step 2: Add `engines` to `worker/package.json`**

Current `worker/package.json`:
```json
{
  "name": "oshi-worker",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "hono": "^4.4.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240524.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "wrangler": "^3.60.0"
  }
}
```

Replace with (engines only — wrangler version is updated in Task 2):
```json
{
  "name": "oshi-worker",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=24.0.0"
  },
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "hono": "^4.4.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240524.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "wrangler": "^3.60.0"
  }
}
```

- [ ] **Step 3: Add `engines` to `frontend/package.json`**

Current `frontend/package.json`:
```json
{
  "name": "oshi-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.24.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.0",
    "vite": "^5.3.0",
    "vitest": "^1.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.1.0"
  }
}
```

Replace with:
```json
{
  "name": "oshi-frontend",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.24.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.0",
    "vite": "^5.3.0",
    "vitest": "^1.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.1.0"
  }
}
```

- [ ] **Step 4: Create `.nvmrc`**

Create file `.nvmrc` at the repo root with exactly this content (one line, no trailing spaces):

```
24
```

This allows `nvm use` (or `fnm use`) to automatically select Node 24 when entering the directory.

- [ ] **Step 5: Verify Node version satisfies the constraint**

```bash
node -v
```

Expected: prints `v24.x.x`. If it prints anything lower than `v24.0.0`, install Node 24 before continuing.

- [ ] **Step 6: Reinstall to pick up the engines field**

```bash
npm install
```

Expected: no errors. npm 7+ enforces the `engines` field and will warn (or error with `--engine-strict`) if Node is too old.

- [ ] **Step 7: Run all tests**

```bash
npm test --workspaces
```

Expected:
```
Tests  32 passed (32)
Tests  16 passed (16)
```

- [ ] **Step 8: Commit**

```bash
git add package.json worker/package.json frontend/package.json .nvmrc
git commit -m "chore: require Node.js >=24 across all packages"
```

---

## Task 2: Upgrade Wrangler from v3 to v4

**Files:**
- Modify: `worker/package.json` (wrangler and workers-types versions)

Wrangler v4 requires Node.js ≥ 18.20 or ≥ 20 — Node 24 (Task 1) satisfies this. v4 is the current major version as of 2026-05-26 (v4.94.0).

- [ ] **Step 1: Update wrangler and workers-types in `worker/package.json`**

Open `worker/package.json`. Change the two devDependency versions:

```json
{
  "name": "oshi-worker",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=24.0.0"
  },
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "hono": "^4.4.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250525.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "wrangler": "^4.94.0"
  }
}
```

- [ ] **Step 2: Install the updated packages**

```bash
npm install
```

Expected: lockfile updated. The output will contain a line like:

```
added x packages, changed y packages, audited z packages in Ns
```

No error. If npm prints a peer-dependency conflict, read it — most wrangler v4 peer conflicts are safe to ignore for a Worker project (wrangler is a dev CLI, not a runtime peer).

- [ ] **Step 3: Confirm the installed version**

```bash
npx wrangler --version
```

Expected: prints `4.x.x` (e.g. `4.94.0`). If it still prints `3.x.x`, delete `node_modules` and re-run `npm install`.

- [ ] **Step 4: Run worker tests**

```bash
cd worker && npm test
```

Expected:
```
 ✓ tests/menu.test.ts (5 tests)
 ✓ tests/orders.test.ts (7 tests)
 ✓ tests/files.test.ts (10 tests)
 ✓ tests/merchant.test.ts (10 tests)

 Test Files  4 passed (4)
 Tests       32 passed (32)
```

If any test fails, read the error. Wrangler v4 does not affect Vitest — tests run in the `node` environment using plain Hono mocks, so failures here are unlikely and indicate a regression unrelated to the wrangler bump.

- [ ] **Step 5: Run a wrangler type-check dry run**

```bash
npx wrangler deploy --dry-run --outdir dist-check
```

Expected: no fatal errors. Wrangler v4 may emit new warnings — read them but do not fail the task unless the output says `Error:` (not `Warning:`).

If you see:
```
Error: The `[assets]` configuration has changed in Wrangler v4.
```
then open `wrangler.toml` and update the `[assets]` block. The v4 syntax is identical to what we use:
```toml
[assets]
directory = "./frontend/dist"
binding = "ASSETS"
```
If that error appears, it means a different format is needed — check the Wrangler v4 changelog at `https://developers.cloudflare.com/workers/wrangler/migration/`.

- [ ] **Step 6: Clean up dry-run output**

```bash
# PowerShell
Remove-Item -Recurse -Force dist-check -ErrorAction SilentlyContinue
```

- [ ] **Step 7: Commit**

```bash
git add worker/package.json package-lock.json
git commit -m "chore: upgrade wrangler to v4 and workers-types to latest"
```

---

## Task 3: Write README.md

**Files:**
- Create: `README.md`

This task is fully independent — run it in parallel with Tasks 1 and 2 if desired.

- [ ] **Step 1: Create `README.md` at the repo root**

Create the file with this exact content:

````markdown
# oshi — Food Ordering Platform

Single-restaurant food ordering platform deployed on Cloudflare's edge infrastructure. Customers browse a menu, add items to a cart, pay via PromptPay QR, and track their order by phone number. Merchants manage orders and menus from a protected panel.

## Tech stack

| Layer | Technology |
|-------|------------|
| Backend | Cloudflare Workers + [Hono](https://hono.dev) v4 |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 |
| Frontend | React 18 + Vite + React Router v6 + Tailwind CSS v3 |
| Language | TypeScript (strict) |
| Tests | Vitest |
| Deploy | Wrangler v4 |
| Runtime | Node.js ≥ 24 |

## Project structure

```
oshi/
├── worker/       Cloudflare Worker (API)
│   ├── src/
│   │   ├── index.ts          Entry point
│   │   ├── types.ts          Shared types + Bindings
│   │   ├── middleware/       Auth middleware
│   │   ├── routes/           menu, orders, merchant, files
│   │   └── db/schema.sql     D1 database schema
│   └── tests/                Vitest tests (32 tests)
├── frontend/     React SPA
│   └── src/
│       ├── App.tsx           Route declarations
│       ├── pages/            8 page components
│       ├── components/       Shared UI components
│       ├── lib/              api.ts, cart.ts
│       └── context/          CartContext
├── wrangler.toml             Cloudflare deployment config
├── DEPLOY.md                 First-time deployment guide
├── AGENTS.md                 Conventions for AI agents
└── CLAUDE.md                 Points to AGENTS.md
```

## Local development

### Prerequisites

- Node.js ≥ 24 ([nvm](https://github.com/nvm-sh/nvm): `nvm use`, [fnm](https://github.com/Schniz/fnm): `fnm use`)
- npm ≥ 10

### Setup

```bash
git clone git@github.com:bakamitai456/oshi.git
cd oshi
npm install
```

Create a `.dev.vars` file in the repo root (gitignored):

```
MERCHANT_SECRET=dev-secret-change-me
```

### Run

Open two terminals:

```bash
# Terminal 1 — Worker API (port 8787)
npm run dev:worker

# Terminal 2 — Frontend (port 5173)
npm run dev:frontend
```

Open `http://localhost:5173`. The frontend proxies `/api` requests to the Worker.

Merchant panel: `http://localhost:5173/merchant` — enter the value from `.dev.vars`.

### Test

```bash
npm test --workspaces
```

Expected: 32 worker tests + 16 frontend tests, all passing.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the full first-time setup guide (D1, R2, secrets, PromptPay QR).

Quick deploy after first-time setup:

```bash
npm run deploy
```

## Architecture notes

- **No CORS** — the Worker serves both the API and the compiled SPA via the `ASSETS` binding. Same origin in production; Vite proxy in dev.
- **Money is satang** — all monetary values are integers in satang (THB × 100). Display with `formatTHB(satang)` from `frontend/src/components/MenuItemCard.tsx`.
- **Merchant auth** — static `MERCHANT_SECRET` stored as a Cloudflare Worker Secret. Sets two cookies: `merchant_token` (HttpOnly, for API) and `merchant_logged_in=1` (readable by JS, for frontend route guard).
- **Soft delete** — menu item deletion sets `is_available = 0` so historical order references remain valid.
- **R2 write safety** — always write new file → update DB → delete old file. Never delete before confirming the write succeeded.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Customer menu + cart |
| `/checkout` | Name + phone number |
| `/payment/:id` | PromptPay QR + evidence upload |
| `/orders` | Order lookup by phone |
| `/merchant` | Merchant login |
| `/merchant/orders` | Order list with status filter |
| `/merchant/orders/:id` | Order detail + status transitions |
| `/merchant/menu` | Menu CRUD |
````

- [ ] **Step 2: Verify the file renders correctly**

```bash
# Check the file exists and has content
(Get-Item README.md).Length
```

Expected: larger than 2000 bytes.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Final step: push all commits

After all three tasks are committed:

```bash
git push
```

Expected:
```
To github.com:bakamitai456/oshi.git
   f380a46..xxxxxxx  main -> main
```
