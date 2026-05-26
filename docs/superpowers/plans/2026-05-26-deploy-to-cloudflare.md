# Deploy to Cloudflare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the oshi ordering platform running live on Cloudflare Workers + D1 + R2 + Pages.

**Architecture:** The Worker serves both the API and the compiled React SPA via the `ASSETS` binding. D1 holds relational data; R2 holds menu images and payment evidence. A single `npm run deploy` builds the frontend and deploys the Worker.

**Tech Stack:** Cloudflare Workers, D1, R2, Wrangler CLI v3, Node.js / npm

---

## Prerequisites (verify before starting)

- [ ] You have a Cloudflare account with Workers, D1, and R2 enabled (free tier is sufficient)
- [ ] Node.js 18+ and npm are installed (`node -v`, `npm -v`)
- [ ] Wrangler is available (`npx wrangler --version` should print `3.x.x`)
- [ ] You have the real PromptPay QR code image file from your bank (JPEG or PNG)
- [ ] You have chosen a strong merchant secret (e.g. 32-character random string) — write it down now; you will not retrieve it later

---

## File map

| File | Change |
|------|--------|
| `wrangler.toml` | Replace `database_id` placeholder with real D1 ID |
| `frontend/public/promptpay-qr.png` | Replace 1×1 transparent placeholder with real QR |

No new files are created. No code changes are required.

---

## Task 1: Log in to Cloudflare via Wrangler

**Files:** none

This opens a browser window. It must be done by a human or in an environment with a display.

- [ ] **Step 1: Run wrangler login**

```bash
npx wrangler login
```

Expected: Browser opens at `https://dash.cloudflare.com/oauth2/auth`. Approve the permissions. Terminal prints:

```
Successfully logged in.
```

- [ ] **Step 2: Verify authentication**

```bash
npx wrangler whoami
```

Expected output (your account name and email will differ):

```
 ⛅️ wrangler 3.x.x
-------------------
Getting User settings...
👋 You are logged in with an OAuth Token, associated with the email your@email.com!
┌──────────────────────┬──────────────────────────────────┐
│ Account Name         │ Account ID                       │
├──────────────────────┼──────────────────────────────────┤
│ Your Account         │ xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx │
└──────────────────────┴──────────────────────────────────┘
```

If `wrangler whoami` prints an error, re-run `npx wrangler login`.

---

## Task 2: Create the D1 database and update wrangler.toml

**Files:**
- Modify: `wrangler.toml:13` (replace `database_id` value)

- [ ] **Step 1: Create the D1 database**

```bash
npx wrangler d1 create oshi-db
```

Expected output:

```
✅ Successfully created DB 'oshi-db' in region APAC
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "oshi-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` value (the UUID string). You will need it in the next step.

- [ ] **Step 2: Paste the database_id into wrangler.toml**

Open `wrangler.toml`. Replace line 13:

```toml
database_id = "PLACEHOLDER_REPLACE_AFTER_D1_CREATE"
```

With the real ID from the previous step:

```toml
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

- [ ] **Step 3: Verify wrangler.toml is correct**

```bash
grep database_id wrangler.toml
```

Expected: prints the real UUID, not the word `PLACEHOLDER`.

- [ ] **Step 4: Commit the updated wrangler.toml**

```bash
git add wrangler.toml
git commit -m "chore: set D1 database_id for production"
```

---

## Task 3: Apply the database schema to D1

**Files:** none (reads `worker/src/db/schema.sql`)

Must run after Task 2.

- [ ] **Step 1: Apply schema to the remote (production) database**

```bash
npx wrangler d1 execute oshi-db --file=worker/src/db/schema.sql
```

Expected:

```
🌀 Executing on remote database oshi-db (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx):
🌀 To execute on your local development database, remove the --remote flag from your wrangler.toml
Note: if the execution fails to complete, your DB will return to its original state and you can safely retry.
├ 🌀 Uploading SQL...
│ 🌀 Sending batch...
│ 🌀 Parsing results...
└ 🌀 Done!
```

- [ ] **Step 2: Verify the tables were created**

```bash
npx wrangler d1 execute oshi-db --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Expected output includes all four tables:

```
┌─────────────────┐
│ name            │
├─────────────────┤
│ counters        │
├─────────────────┤
│ menu_items      │
├─────────────────┤
│ order_items     │
├─────────────────┤
│ orders          │
└─────────────────┘
```

- [ ] **Step 3: Verify the counter row exists**

```bash
npx wrangler d1 execute oshi-db --command="SELECT * FROM counters;"
```

Expected:

```
┌──────────────┬───────┐
│ key          │ value │
├──────────────┼───────┤
│ order_number │ 0     │
└──────────────┴───────┘
```

---

## Task 4: Create the R2 bucket

**Files:** none

Can run in parallel with Tasks 2 and 3 (only needs Task 1 complete).

- [ ] **Step 1: Create the bucket**

```bash
npx wrangler r2 bucket create oshi-files
```

Expected:

```
Creating bucket oshi-files.
Created bucket oshi-files.
```

- [ ] **Step 2: Verify the bucket exists**

```bash
npx wrangler r2 bucket list
```

Expected: output includes a row with `oshi-files`.

---

## Task 5: Set the MERCHANT_SECRET

**Files:** none (stored as Cloudflare Worker secret, never in files)

Can run in parallel with Tasks 2–4 (only needs Task 1 complete).

- [ ] **Step 1: Set the secret**

```bash
npx wrangler secret put MERCHANT_SECRET
```

Wrangler will prompt:

```
Enter a secret value: ████████████████████████████████
```

Type (or paste) your chosen secret and press Enter. Expected:

```
🌀 Creating the secret for the Worker "oshi"
✨ Success! Uploaded secret MERCHANT_SECRET
```

- [ ] **Step 2: Verify the secret is listed**

```bash
npx wrangler secret list
```

Expected output includes:

```
[
  {
    "name": "MERCHANT_SECRET",
    "type": "secret_text"
  }
]
```

The value is never shown — only the name. This is correct.

---

## Task 6: Replace the PromptPay QR code image

**Files:**
- Replace: `frontend/public/promptpay-qr.png`

The current file is a 1×1 transparent placeholder. The payment page (`/payment/:id`) shows this image to customers.

- [ ] **Step 1: Confirm the placeholder is in place**

```bash
npx wrangler d1 execute oshi-db --command="SELECT 1;" 2>nul && file frontend/public/promptpay-qr.png 2>nul || ls -lh frontend/public/promptpay-qr.png
```

Or simply check file size — the placeholder is 68 bytes:

```bash
# PowerShell
(Get-Item frontend/public/promptpay-qr.png).Length
```

Expected: a very small number (< 200 bytes). If so, it is still the placeholder.

- [ ] **Step 2: Replace with your real QR image**

Copy your bank-provided PromptPay QR image to `frontend/public/promptpay-qr.png`. The filename must stay `promptpay-qr.png` exactly — the `PaymentPage.tsx` references it as `/promptpay-qr.png`.

The image must show:
- The PromptPay logo
- Your phone number or National ID QR payload
- The correct amount or "any amount" depending on your PromptPay setup

Accepted formats: JPEG or PNG. Recommended size: at least 400×400 px for readability on mobile.

- [ ] **Step 3: Verify the file is not a placeholder**

```bash
# PowerShell
(Get-Item frontend/public/promptpay-qr.png).Length
```

Expected: file is larger than 10,000 bytes (a real QR image is typically 20 KB–200 KB).

- [ ] **Step 4: Commit the real QR**

```bash
git add frontend/public/promptpay-qr.png
git commit -m "chore: add real PromptPay QR code"
```

---

## Task 7: Build and deploy

**Files:** none (build output goes to `frontend/dist/`, which is gitignored)

Must run after Tasks 2–6 are all complete.

- [ ] **Step 1: Run all tests to confirm nothing is broken**

```bash
npm test --workspaces
```

Expected:

```
Tests  32 passed (32)    ← worker
Tests  16 passed (16)    ← frontend
```

If any test fails, stop and fix it before deploying.

- [ ] **Step 2: Deploy**

```bash
npm run deploy
```

This runs `cd frontend && npm run build` then `wrangler deploy`. Expected final lines:

```
✨ Compiled Worker successfully
Uploaded oshi (x.xx sec)
Published oshi (x.xx sec)
  https://oshi.<your-subdomain>.workers.dev
```

Copy the URL — this is your live app.

- [ ] **Step 3: Note the live URL**

The URL printed is `https://oshi.<your-subdomain>.workers.dev`. Open it in a browser — you should see the restaurant landing page.

---

## Task 8: Smoke test the live deployment

No code changes. Manual verification of the critical paths.

- [ ] **Step 1: Customer can browse the menu**

Open `https://oshi.<your-subdomain>.workers.dev/` in a browser.

Expected: page loads, shows "ไม่มีรายการอาหาร" (no items yet) or menu items if you added any.

- [ ] **Step 2: Merchant can log in**

Open `https://oshi.<your-subdomain>.workers.dev/merchant`.

Enter the `MERCHANT_SECRET` you set in Task 5.

Expected: redirected to `/merchant/orders` with an empty order list.

- [ ] **Step 3: Merchant can add a menu item**

From `/merchant/menu`, click to add a new item. Fill in name, price, and optionally upload an image.

Expected: item appears in the list. Reload the customer landing page — the item should now appear.

- [ ] **Step 4: Customer can place an order**

On the customer landing page, add the item to cart. Go to checkout. Enter a name and a Thai phone number (e.g. `0812345678`). Submit.

Expected: redirected to `/payment/:id` showing the PromptPay QR and the order total.

- [ ] **Step 5: Payment evidence upload works**

On the payment page, upload any JPEG or PNG file as payment evidence (can be a test screenshot).

Expected: green confirmation panel appears with the order number.

- [ ] **Step 6: Merchant sees the order**

In the merchant panel, the order appears in the list. Open it — all items, total, and the uploaded evidence should be visible.

- [ ] **Step 7: Status transitions work**

From the order detail, mark the order as Preparing, then Ready, then Done.

Expected: each transition succeeds and the status badge updates.

- [ ] **Step 8: Order lookup works**

Open `/orders` in a new browser tab. Enter the phone number used in Step 4.

Expected: the order appears with current status "Done".

---

## Rollback

If the deployment is broken and you need to revert:

```bash
# List recent deployments
npx wrangler deployments list

# Roll back to a previous version
npx wrangler rollback
```

Wrangler will prompt you to confirm which deployment to roll back to. This does NOT roll back D1 schema changes — schema migrations are forward-only.
