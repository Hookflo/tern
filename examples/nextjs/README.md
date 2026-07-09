# Tern + Next.js (App Router) Example

## Setup handler with Tern CLI

```bash
npx @hookflo/tern-cli
```

Choose:
- Framework: `Next.js (App Router)`
- Platform: `Stripe`
- Env var: `STRIPE_WEBHOOK_SECRET`
- Handler path: `examples/nextjs/app/api/webhooks/route.ts`

## Manual setup

```bash
cd examples/nextjs
npm install
STRIPE_WEBHOOK_SECRET=whsec_xxx npm run dev
```

Endpoint: `POST http://localhost:3001/api/webhooks`

## Local test with Stripe CLI

```bash
stripe listen --forward-to localhost:3001/api/webhooks
stripe trigger payment_intent.succeeded
```

## Deploy notes

- Deploy to Vercel or any Node-compatible host for Next.js.
- Add `STRIPE_WEBHOOK_SECRET` in project environment variables.
