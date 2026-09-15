# Ops

Where Vizzy lives, and which env vars belong where. Do not put secrets in this file.

Next reads **`apps/share/.env.local`**, not the repo-root `.env.local`. Root `.env.local` is for the Convex CLI (`npx convex dev`). Template: [`.env.example`](../.env.example).

## Dashboards

| What | URL |
| --- | --- |
| Site (Vercel) | https://vizzy-ruddy.vercel.app |
| Domain | https://vizzy.run (DNS may still be pending) |
| GitHub | https://github.com/bytesofconnor/vizzy |
| Actions | https://github.com/bytesofconnor/vizzy/actions |
| Action secrets | https://github.com/bytesofconnor/vizzy/settings/secrets/actions |
| Vercel project | https://vercel.com/connors-projects-408eaae2/vizzy |
| Vercel env | https://vercel.com/connors-projects-408eaae2/vizzy/settings/environment-variables |
| Vercel domains | https://vercel.com/connors-projects-408eaae2/vizzy/settings/domains |
| Convex **dev** | https://dashboard.convex.dev/d/beloved-fennec-81 |
| Convex **prod** | https://dashboard.convex.dev/d/cautious-sheep-629 |
| Convex env | Dashboard → the deployment → Settings → Environment Variables. Or `npx convex env list` / `npx convex env set NAME` from the repo root. |
| Stripe **sandbox** (Vizzy) | https://dashboard.stripe.com/acct_1UFzEgPc4hlkd27T/test/dashboard |
| Stripe **live** (Vizzy) | https://dashboard.stripe.com/acct_1UFzEaB54ZEn5Ro5 |
| Stripe products (sandbox) | https://dashboard.stripe.com/acct_1UFzEgPc4hlkd27T/test/products |
| Stripe webhooks (sandbox) | https://dashboard.stripe.com/acct_1UFzEgPc4hlkd27T/test/webhooks |
| Google Auth (Vizzy project) | https://console.cloud.google.com/auth/clients?project=vizzy-508717 |
| Google Auth (new client) | https://console.cloud.google.com/auth/clients/create?project=vizzy-508717 |
| Resend | https://resend.com/api-keys |

Use the **Vizzy** Stripe account.

Local shortcuts:

```bash
npx convex dashboard
npx convex env list
gh secret list
```

## Variables

Same names, different places. After a value changes, update every column that has a check.

| Variable | `apps/share/.env.local` | Convex env | Vercel | GitHub Actions | Notes |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | | prod: `https://vizzy.run` or the Vercel URL | CI sets `http://127.0.0.1:3456` | |
| `NEXT_PUBLIC_CONVEX_URL` | yes | | yes | secret | Dev: `https://beloved-fennec-81.convex.cloud`. Prod deployment is `cautious-sheep-629`. |
| `CONVEX_URL` | yes | | optional | secret | Same as Convex URL. Root `.env.local` also has this for the CLI. |
| `CONVEX_DEPLOYMENT` | | | | | Root `.env.local` only. `dev:beloved-fennec-81`. |
| `COMPOSE_SERVER_SECRET` | yes | **yes** | yes | secret | Must match on Next and Convex. |
| `COMPOSE_SALT` | yes | | yes | | Cookie / IP hashing. |
| `OWNER_EMAILS` | local e2e | **yes** | if you want prod owner | secret | Comma-separated. Convex is the source of truth for the meter. |
| `E2E_OWNER_EMAIL` | yes | | | secret | Playwright owner test. |
| `STRIPE_SECRET_KEY` | yes (`sk_test_…`) | | live: `sk_live_…` | secret (`sk_test_…` for CI) | CI must stay test mode. |
| `STRIPE_PRICE_ID` | yes | | live price when you copy the $8 product | secret | Sandbox: `price_1UFzkNPc4hlkd27T24QfgKel`. |
| `STRIPE_WEBHOOK_SECRET` | yes (`stripe listen`) | | from the Vizzy live webhook | | Forward to `/api/stripe/webhook`. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | yes | | yes | | Web client in project `vizzy-508717`. Origins: `http://localhost:3456`, `https://vizzy.run`. |
| `RESEND_API_KEY` | when email works | | yes | | Restore link. Not required for checkout. |
| `RESEND_FROM` | when email works | | yes | | |

GitHub Actions e2e reads secrets listed in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It runs on **push to `main`**. Unit tests run on PRs too.

```bash
npm test          # core / react / mcp
npm run test:e2e  # Playwright; reuses local :3456 if it is up
```

## Who owns what

- **Wallets, credits, owner meter** — Convex `wallets` on the deployment Next points at.
- **Money** — Stripe Checkout + webhook. Product is 25 charts / $8.
- **This browser** — cookie `vizzy_wallet` set by share.
- **Google** — optional bind after Checkout (`vizzy_paid` cookie, then `/api/save/google`).
- **Restore** — Terms, checkout email. Resend when configured.
