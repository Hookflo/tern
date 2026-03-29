# Tern + Cloudflare Workers Example

## Setup handler with Tern CLI

```bash
npx @hookflo/tern-cli
```

Choose:
- Framework: `Cloudflare Workers`
- Platform: `Stripe`
- Env var: `STRIPE_WEBHOOK_SECRET`
- Handler path: `examples/cloudflare-workers/src/index.ts`

## Manual setup

```bash
cd examples/cloudflare-workers
npm install
STRIPE_WEBHOOK_SECRET=whsec_xxx npm run dev
```

Endpoint: `POST http://localhost:8787/webhooks/stripe`

## Local test with Stripe CLI

```bash
stripe listen --forward-to localhost:8787/webhooks/stripe
stripe trigger payment_intent.succeeded
```

## Deploy

```bash
cd examples/cloudflare-workers
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler deploy
```
