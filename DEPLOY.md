# Deployment Instructions

## Prerequisites
- Cloudflare account with Workers, D1, and R2 enabled
- `wrangler` installed globally or via npx
- Run `wrangler login` before deploying

## First-time Setup

### 1. Create D1 database
```bash
wrangler d1 create oshi-db
```
Copy the `database_id` from output and update `wrangler.toml`.

### 2. Apply schema
```bash
wrangler d1 execute oshi-db --local --file=worker/src/db/schema.sql
wrangler d1 execute oshi-db --file=worker/src/db/schema.sql
```

### 3. Create R2 bucket
```bash
wrangler r2 bucket create oshi-files
```

### 4. Set the merchant secret
```bash
wrangler secret put MERCHANT_SECRET
```
Enter a strong secret when prompted.

### 5. Add PromptPay QR
Replace `frontend/public/promptpay-qr.png` with the actual PromptPay QR code image from your bank.

## Deploy
```bash
npm run deploy
```

## Local Development
Create `.dev.vars`:
```
MERCHANT_SECRET=dev-secret-change-me
```

Then:
```bash
# Terminal 1 — Frontend dev server
cd frontend && npm run dev

# Terminal 2 — Worker dev server  
wrangler dev --local
```

The frontend dev server proxies `/api` requests to the Worker on port 8787.
