# Deployment Instructions

Two environments: **beta** (auto-deploys on every push to `main`) and **production** (manual via GitHub Actions).

---

## Prerequisites

- Cloudflare account with Workers, D1, and R2 enabled
- `wrangler` CLI available — `npx wrangler` works, no global install required
- Logged in: `npx wrangler login`

---

## First-time Setup

Run these steps once per environment before the first deploy.

### Beta environment

```bash
# 1. Create D1 database
npx wrangler d1 create oshi-beta-db
# → Copy the database_id and paste into wrangler.toml under [env.beta]

# 2. Apply schema
npx wrangler d1 execute oshi-beta-db --remote --env beta --file=worker/src/db/schema.sql

# 3. Create R2 bucket
npx wrangler r2 bucket create oshi-beta-files

# 4. Set merchant secret
npx wrangler secret put MERCHANT_SECRET --env beta
```

### Production environment

```bash
# 1. Create D1 database
npx wrangler d1 create oshi-production-db
# → Copy the database_id and paste into wrangler.toml under [env.production]

# 2. Apply schema
npx wrangler d1 execute oshi-production-db --remote --env production --file=worker/src/db/schema.sql

# 3. Create R2 bucket
npx wrangler r2 bucket create oshi-production-files

# 4. Set merchant secret
npx wrangler secret put MERCHANT_SECRET --env production
```

### PromptPay QR

Replace `frontend/public/promptpay-qr.png` with the actual QR code image from your bank. Both environments share the same frontend build.

---

## GitHub Actions secrets

Add these secrets to the GitHub repository (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers, D1, and R2 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (from the Cloudflare dashboard URL) |

**Creating the API token:** Cloudflare dashboard → My Profile → API Tokens → Create Token → use the **"Edit Cloudflare Workers"** template, then add D1 and R2 edit permissions.

---

## Deployments

### Beta (automatic)

Every push to `main` triggers `.github/workflows/deploy-beta.yml`:
1. Builds the frontend
2. Runs D1 schema migration against `oshi-beta-db`
3. Deploys to the `oshi-beta` Worker

Live at: `https://oshi-beta.<your-subdomain>.workers.dev`

### Production (manual)

Go to **Actions → Deploy — Production → Run workflow** on GitHub.

When prompted, type `deploy` in the confirmation field to proceed. The workflow:
1. Builds the frontend
2. Runs D1 schema migration against `oshi-production-db`
3. Deploys to the `oshi-production` Worker

Live at: `https://oshi-production.<your-subdomain>.workers.dev`

> Tip: Set up a GitHub **environment** named `production` (Settings → Environments) with required reviewers to add an approval gate before production deploys run.

---

## Schema migrations

Migrations run automatically as part of every deployment (both beta and production). The schema uses `CREATE TABLE IF NOT EXISTS`, so re-running it is always safe.

To run a migration manually:

```bash
# Beta
npx wrangler d1 execute oshi-beta-db --remote --env beta --file=worker/src/db/schema.sql

# Production
npx wrangler d1 execute oshi-production-db --remote --env production --file=worker/src/db/schema.sql
```

---

## Local Development

Create `.dev.vars` in the repo root (gitignored):

```
MERCHANT_SECRET=dev-secret-change-me
```

Apply schema to local D1 (run once after cloning):

```bash
npx wrangler d1 execute oshi-db --local --file=worker/src/db/schema.sql
```

Then open two terminals:

```bash
# Terminal 1 — Worker API (port 8787)
npm run dev:worker

# Terminal 2 — Frontend (port 5173)
npm run dev:frontend
```

Open `http://localhost:5173`. The frontend proxies `/api` requests to the Worker.
