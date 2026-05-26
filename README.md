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

### Apply local database schema

Run once after cloning (and again if you delete `.wrangler/`):

```bash
npx wrangler d1 execute oshi-db --local --file=worker/src/db/schema.sql
```

Expected: `5 commands executed successfully.`

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
