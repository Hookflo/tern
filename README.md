# Tern — Webhook Verification for Every Platform

**When Stripe, Shopify, Clerk or any other platform sends a webhook to your server, how do you know it's real and not a forged request?** Tern checks the signature for you — one simplified TypeScript SDK, any provider, no boilerplate.

[![npm version](https://img.shields.io/npm/v/@hookflo/tern)](https://www.npmjs.com/package/@hookflo/tern)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

Stop writing webhook verification from scratch. **Tern** handles signature verification for Stripe, GitHub, Clerk, Shopify, and 15+ more platforms — with one consistent API.

```bash
npm install @hookflo/tern
```

> The same framework powering webhook verification at [Hookflo](https://hookflo.com).

⭐ Star this repo to help others discover it · 💬 [Join our Discord](https://discord.com/invite/SNmCjU97nr)

<img width="1200" height="630" alt="Tern – Webhook Verification Framework" src="https://tern.hookflo.com/og-image.webp" style="border-radius: 10px; margin-top: 16px;" />

**Navigation**

[The Problem](#the-problem) · [Quick Start](#quick-start) · [Framework Integrations](#framework-integrations) · [Supported Platforms](#supported-platforms) · [Custom Config](#custom-platform-configuration) · [API Reference](#api-reference) · [Contributing](#contributing)

---

## The Problem

Every webhook provider has a different signature format. You end up writing — and maintaining — the same verification boilerplate over and over:

```typescript
// ❌ Without Tern — different logic for every provider
const stripeSignature = req.headers['stripe-signature'];
const parts = stripeSignature.split(',');
// ... 30 more lines just for Stripe

const githubSignature = req.headers['x-hub-signature-256'];
// ... completely different 20 lines for GitHub
```

```typescript
// ✅ With Tern — one API for everything
const result = await WebhookVerificationService.verify(request, {
  platform: 'stripe',
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
});
```

## Quick Start

### Verify a single platform

```typescript
import { WebhookVerificationService } from '@hookflo/tern';

const result = await WebhookVerificationService.verify(request, {
  platform: 'stripe',
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
  toleranceInSeconds: 300,
});

if (result.isValid) {
  console.log('Verified!', result.eventId, result.payload);
} else {
  console.log('Failed:', result.error, result.errorCode);
}
```

### Auto-detect platform

```typescript
const result = await WebhookVerificationService.verifyAny(request, {
  stripe: process.env.STRIPE_WEBHOOK_SECRET,
  github: process.env.GITHUB_WEBHOOK_SECRET,
  clerk: process.env.CLERK_WEBHOOK_SECRET,
});

console.log(`Verified ${result.platform} webhook`);
```

## Framework Integrations

### Express.js

```typescript
import { createWebhookMiddleware } from '@hookflo/tern/express';

app.post(
  '/webhooks/stripe',
  createWebhookMiddleware({
    platform: 'stripe',
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),
  (req, res) => {
    const event = (req as any).webhook.payload;
    res.json({ received: true });
  },
);
```

### Next.js App Router

```typescript
import { createWebhookHandler } from '@hookflo/tern/nextjs';

export const POST = createWebhookHandler({
  platform: 'github',
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
  handler: async (payload) => ({ received: true }),
});
```

### Cloudflare Workers

```typescript
import { createWebhookHandler } from '@hookflo/tern/cloudflare';

const handleStripe = createWebhookHandler({
  platform: 'stripe',
  secretEnv: 'STRIPE_WEBHOOK_SECRET',
  handler: async (payload) => ({ received: true }),
});
```

> All built-in platforms work across Express, Next.js, and Cloudflare adapters. You only change `platform` and `secret` per route.

## Supported Platforms

| Platform | Algorithm | Status |
|---|---|---|
| **Stripe** | HMAC-SHA256 | ✅ Tested |
| **GitHub** | HMAC-SHA256 | ✅ Tested |
| **Clerk** | HMAC-SHA256 (base64) | ✅ Tested |
| **Shopify** | HMAC-SHA256 (base64) | ✅ Tested |
| **Dodo Payments** | HMAC-SHA256 | ✅ Tested |
| **Paddle** | HMAC-SHA256 | ✅ Tested |
| **Lemon Squeezy** | HMAC-SHA256 | ✅ Tested |
| **Polar** | HMAC-SHA256 | ✅ Tested |
| **WorkOS** | HMAC-SHA256 | ✅ Tested |
| **ReplicateAI** | HMAC-SHA256 | ✅ Tested |
| **GitLab** | Token-based | ✅ Tested |
| **fal.ai** | ED25519 | ✅ Tested |
| **Sentry** | HMAC-SHA256 | ✅ Tested |
| **Grafana** | HMAC-SHA256 | ✅ Tested |
| **Doppler** | HMAC-SHA256 | ✅ Tested |
| **Sanity** | HMAC-SHA256 | ✅ Tested |
| **Razorpay** | HMAC-SHA256 | 🔄 Pending |
| **Vercel** | HMAC-SHA256 | 🔄 Pending |

> Don't see your platform? [Use custom config](#custom-platform-configuration) or [open an issue](https://github.com/Hookflo/tern/issues).

### Note on fal.ai

fal.ai uses **ED25519** signing. When using Tern with fal.ai, pass an **empty string** as the webhook secret — the public key is resolved automatically via JWKS from fal's infrastructure.

```typescript
export const POST = createWebhookHandler({
  platform: 'falai',
  secret: '', // fal.ai resolves the public key automatically
  handler: async (payload, metadata) => ({ received: true, requestId: metadata.requestId }),
});
```

## Key Features

- **Algorithm Agnostic** — HMAC-SHA256, HMAC-SHA1, HMAC-SHA512, ED25519, and custom algorithms
- **Zero Dependencies** — no bloat, no supply chain risk
- **Framework Agnostic** — works with Express, Next.js, Cloudflare Workers, Deno, and any runtime with Web Crypto
- **Body-Parser Safe** — reads raw bodies correctly to prevent signature mismatch
- **Strong TypeScript** — strict types, full inference, comprehensive type definitions
- **Stable Error Codes** — `INVALID_SIGNATURE`, `MISSING_SIGNATURE`, `TIMESTAMP_TOO_OLD`, and more
- **Alerting** — built-in Slack + Discord alerts via adapter

## Custom Platform Configuration

Not built-in? Configure any webhook provider without waiting for a library update.

```typescript
const result = await WebhookVerificationService.verify(request, {
  platform: 'acmepay',
  secret: 'acme_secret',
  signatureConfig: {
    algorithm: 'hmac-sha256',
    headerName: 'x-acme-signature',
    headerFormat: 'raw',
    timestampHeader: 'x-acme-timestamp', // optional — only if provider sends timestamp separately
    timestampFormat: 'unix',
    payloadFormat: 'timestamped',
  },
});
```

### Svix / Standard Webhooks format (Clerk, Dodo Payments, etc.)

```typescript
const svixConfig = {
  platform: 'my-svix-platform',
  secret: 'whsec_abc123...',
  signatureConfig: {
    algorithm: 'hmac-sha256',
    headerName: 'webhook-signature',
    headerFormat: 'raw',
    timestampHeader: 'webhook-timestamp',
    timestampFormat: 'unix',
    payloadFormat: 'custom',
    customConfig: {
      payloadFormat: '{id}.{timestamp}.{body}',
      idHeader: 'webhook-id',
    },
  },
};
```

See the [SignatureConfig type](https://tern.hookflo.com) for all options.

## Alerting (Slack + Discord)

```typescript
import { createWebhookHandler } from '@hookflo/tern/nextjs';

export const POST = createWebhookHandler({
  platform: 'stripe',
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
  alerts: {
    slack: { webhookUrl: process.env.SLACK_WEBHOOK_URL! },
    discord: { webhookUrl: process.env.DISCORD_WEBHOOK_URL! },
  },
  handler: async (payload) => ({ ok: true }),
});
```

## API Reference

### `WebhookVerificationService`

| Method | Description |
|---|---|
| `verify(request, config)` | Verify with full config object |
| `verifyWithPlatformConfig(request, platform, secret, tolerance?)` | Shorthand for built-in platforms |
| `verifyAny(request, secrets, tolerance?)` | Auto-detect platform and verify |
| `verifyTokenAuth(request, webhookId, webhookToken)` | Token-based verification |

### `WebhookVerificationResult`

```typescript
interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  errorCode?: 'INVALID_SIGNATURE' | 'MISSING_SIGNATURE' | 'TIMESTAMP_TOO_OLD' | string;
  platform: WebhookPlatform;
  payload?: any;
  eventId?: string;        // canonical: 'stripe:evt_123'
  metadata?: {
    timestamp?: string;
    id?: string | null;
    [key: string]: any;
  };
}
```

## Troubleshooting

**`Module not found: Can't resolve "@hookflo/tern/nextjs"`**

```bash
npm i @hookflo/tern@latest
rm -rf node_modules package-lock.json .next
npm i
```

**Signature verification failing?**

Make sure you're passing the **raw** request body — not a parsed JSON object. Tern's framework adapters handle this automatically. If you're using the core service directly, ensure body parsers aren't consuming the stream before Tern does.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add platforms, write tests, and submit PRs.

```bash
git clone https://github.com/Hookflo/tern.git
cd tern
npm install
npm test
```

## Support

Have a question, running into an issue, or want to request a platform? We're happy to help.

Join the conversation on [Discord](https://discord.com/invite/SNmCjU97nr) or [open an issue](https://github.com/Hookflo/tern/issues) on GitHub — all questions, bug reports, and platform requests are welcome.

## Links

[Detailed Usage & Docs](https://tern.hookflo.com) · [npm Package](https://www.npmjs.com/package/@hookflo/tern) · [Discord Community](https://discord.com/invite/SNmCjU97nr) · [Issues](https://github.com/Hookflo/tern/issues)

## License

MIT © [Hookflo](https://hookflo.com)