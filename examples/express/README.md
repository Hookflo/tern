# Tern + Express Example

## Setup handler with Tern CLI

```bash
npx @hookflo/tern-cli
```

Choose:
- Framework: `Express`
- Platform: `Stripe`
- Env var: `STRIPE_WEBHOOK_SECRET`
- Handler path: `examples/express/src/index.ts`

## Manual setup

```bash
cd examples/express
npm install
STRIPE_WEBHOOK_SECRET=whsec_xxx npm run dev
```

Endpoint: `POST http://localhost:3002/webhooks/stripe`

## Local test with Stripe CLI

```bash
stripe listen --forward-to localhost:3002/webhooks/stripe
stripe trigger payment_intent.succeeded
```

## Deploy notes

- Set `STRIPE_WEBHOOK_SECRET` in your host env vars.
- Keep webhook route registration before `app.use(express.json())`.
