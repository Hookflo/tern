# Tern + Hono Example

## Setup handler with Tern CLI

```bash
npx @hookflo/tern-cli
```

Choose:
- Framework: `Hono`
- Platform: `Stripe`
- Env var: `STRIPE_WEBHOOK_SECRET`
- Handler path: `examples/hono/src/index.ts`

## Manual setup

```bash
cd examples/hono
npm install
STRIPE_WEBHOOK_SECRET=whsec_xxx npm run dev
```

Endpoint: `POST http://localhost:3000/webhooks/stripe`

## Local test with Stripe CLI

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
stripe trigger payment_intent.succeeded
```

## Deploy notes

- This example runs on Node via `@hono/node-server`.
- Deploy to any Node host (Railway, Render, Fly.io, etc.) and set `STRIPE_WEBHOOK_SECRET`.
