# Tern Framework Examples

All examples are standalone packages and depend on the local repo build via `"@hookflo/tern": "../../"`.

## Setup handler with Tern CLI (recommended)

```bash
npx @hookflo/tern-cli
```

Then choose framework + Stripe platform, set `STRIPE_WEBHOOK_SECRET`, and use generated file path for your framework.

## Quick starts

- **Hono**: `cd examples/hono && npm install && STRIPE_WEBHOOK_SECRET=whsec_xxx npm run dev`
- **Next.js**: `cd examples/nextjs && npm install && STRIPE_WEBHOOK_SECRET=whsec_xxx npm run dev`
- **Cloudflare Workers**: `cd examples/cloudflare-workers && npm install && STRIPE_WEBHOOK_SECRET=whsec_xxx npm run dev`
- **Express**: `cd examples/express && npm install && STRIPE_WEBHOOK_SECRET=whsec_xxx npm run dev`

## Stripe CLI testing

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
stripe trigger payment_intent.succeeded
```

Use the printed `whsec_...` secret as `STRIPE_WEBHOOK_SECRET`.

See per-example READMEs for deployment notes.
