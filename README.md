<div align="center">

<img width="2172" height="724" alt="tern" src="https://github.com/user-attachments/assets/580bb928-c12b-465d-9b4d-8a40bf8df1b8" />

### One unified API to verify webhooks from 20+ platforms.

Stripe, GitHub, Clerk, Shopify and 15+ more. One call in, one typed result out, whichever provider sent it. Zero dependencies.

[![npm version](https://img.shields.io/npm/v/@hookflo/tern?style=flat-square)](https://www.npmjs.com/package/@hookflo/tern)
[![installs](https://img.shields.io/npm/dt/@hookflo/tern?style=flat-square&logo=npm&label=installs&color=111827)](https://www.npmjs.com/package/@hookflo/tern)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](#license)

[Docs](https://tern.hookflo.com) · [Discord](https://discord.com/invite/SNmCjU97nr) · [Issues](https://github.com/Hookflo/tern/issues) · [npm](https://www.npmjs.com/package/@hookflo/tern)

</div>

---

## Why Tern?

Every webhook provider signs requests differently: different headers, different algorithms, different timestamp rules. Without a library you end up maintaining a pile of provider-specific code.

```typescript
// ❌ Without Tern: different logic per provider
const parts = req.headers["stripe-signature"].split(",");
// ...30 more lines for Stripe, then a different 20 for GitHub, and so on
```

```typescript
// ✅ With Tern: one call, any provider
const result = await WebhookVerificationService.verify(request, {
  platform: "stripe",
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
});
```

Change `platform` and `secret`, and nothing else.

```bash
npm install @hookflo/tern
```

```typescript
import { WebhookVerificationService } from "@hookflo/tern";

const result = await WebhookVerificationService.verify(request, {
  platform: "stripe",
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
});

if (!result.isValid) {
  return new Response(result.error, { status: 400 });
}

console.log(result.eventId, result.payload);
```

Switching providers is a one-line change:

```typescript
// Stripe
await WebhookVerificationService.verify(request, { platform: "stripe", secret: STRIPE_SECRET });

// GitHub
await WebhookVerificationService.verify(request, { platform: "github", secret: GITHUB_SECRET });

// Clerk
await WebhookVerificationService.verify(request, { platform: "clerk", secret: CLERK_SECRET });
```

Same call. Same `WebhookVerificationResult` back.

## Features

- **Unified API**: one `verify()` for every provider.
- **Auto-detection**: `verifyAny()` figures out which provider sent the request.
- **Framework adapters**: Express, Next.js, Cloudflare Workers, Hono. Core works on Deno, Bun and any runtime with Web Crypto.
- **Zero dependencies**: no bloat, no supply chain risk.
- **Strict TypeScript**: full inference and typed results.
- **Body-parser safe**: reads the raw body so signatures don't break.
- **Stable error codes**: `INVALID_SIGNATURE`, `MISSING_SIGNATURE`, `TIMESTAMP_EXPIRED` and more.
- **Custom providers**: add any provider with a small config, no library update needed.
- **Optional reliable delivery**: retries, DLQ and replay via Upstash QStash, plus Slack and Discord alerts.

## Framework adapters

Each adapter works with every supported platform. Only `platform` and `secret` change per route.

<details open>
<summary><b>Next.js (App Router)</b></summary>

```typescript
import { createWebhookHandler } from "@hookflo/tern/nextjs";

export const POST = createWebhookHandler({
  platform: "github",
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
  handler: async (payload, metadata) => ({
    received: true,
    delivery: metadata.delivery,
  }),
});
```

</details>

<details>
<summary><b>Express</b></summary>

```typescript
import express from "express";
import { createWebhookMiddleware } from "@hookflo/tern/express";

const app = express();

app.post(
  "/webhooks/stripe",
  express.raw({ type: "*/*" }),
  createWebhookMiddleware({
    platform: "stripe",
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),
  (req, res) => {
    res.json({ received: true, event: (req as any).webhook?.payload });
  },
);
```

</details>

<details>
<summary><b>Hono</b></summary>

```typescript
import { Hono } from "hono";
import { createWebhookHandler } from "@hookflo/tern/hono";

const app = new Hono();

app.post(
  "/webhooks/stripe",
  createWebhookHandler({
    platform: "stripe",
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
    handler: async (payload, metadata, c) =>
      c.json({ received: true, eventId: metadata.id, payload }),
  }),
);
```

</details>

<details>
<summary><b>Cloudflare Workers</b></summary>

```typescript
import { createWebhookHandler } from "@hookflo/tern/cloudflare";

export const onRequestPost = createWebhookHandler({
  platform: "stripe",
  secretEnv: "STRIPE_WEBHOOK_SECRET",
  handler: async (payload) => ({ received: true, payload }),
});
```

</details>

<details>
<summary><b>Any runtime (core SDK)</b></summary>

Works anywhere the Web `Request` API exists: Deno, Bun, edge runtimes and more.

```typescript
import { WebhookVerificationService } from "@hookflo/tern";

const verified = await WebhookVerificationService.verifyWithPlatformConfig(
  request,
  "workos",
  process.env.WORKOS_WEBHOOK_SECRET!,
  300, // tolerance in seconds
);

if (!verified.isValid) {
  return new Response(JSON.stringify({ error: verified.error }), { status: 400 });
}
```

</details>

## Auto-detect the provider

Receiving webhooks from several providers on one endpoint? Pass all your secrets and let Tern work out the sender.

```typescript
const result = await WebhookVerificationService.verifyAny(request, {
  stripe: process.env.STRIPE_WEBHOOK_SECRET,
  github: process.env.GITHUB_WEBHOOK_SECRET,
  clerk: process.env.CLERK_WEBHOOK_SECRET,
});

console.log(`Verified ${result.platform} webhook`);
```

On failure, `verifyAny` returns diagnostics so you can see why each provider didn't match.

## Supported providers

| Provider | Algorithm | Status |
| --- | --- | --- |
| Stripe | HMAC-SHA256 | ✅ Tested |
| GitHub | HMAC-SHA256 | ✅ Tested |
| Clerk | HMAC-SHA256 (base64) | ✅ Tested |
| Shopify | HMAC-SHA256 (base64) | ✅ Tested |
| Dodo Payments | HMAC-SHA256 | ✅ Tested |
| Paddle | HMAC-SHA256 | ✅ Tested |
| Lemon Squeezy | HMAC-SHA256 | ✅ Tested |
| Polar | HMAC-SHA256 | ✅ Tested |
| WorkOS | HMAC-SHA256 | ✅ Tested |
| ReplicateAI | HMAC-SHA256 | ✅ Tested |
| GitLab | Token-based | ✅ Tested |
| fal.ai | ED25519 | ✅ Tested |
| Sentry | HMAC-SHA256 | ✅ Tested |
| Grafana | HMAC-SHA256 | ✅ Tested |
| Doppler | HMAC-SHA256 | ✅ Tested |
| Sanity | HMAC-SHA256 | ✅ Tested |
| Svix | HMAC-SHA256 | ✅ Tested |
| Standard Webhooks | HMAC-SHA256 | ✅ Tested |
| Linear | HMAC-SHA256 | ✅ Tested |
| Webflow | HMAC-SHA256 | ✅ Tested |
| Razorpay | HMAC-SHA256 | 🔄 Pending |
| Vercel | HMAC-SHA256 | 🔄 Pending |

Missing a provider? [Add it with a custom config](#custom-providers) or [request it](https://github.com/Hookflo/tern/issues).

**Provider notes**

- **Standard Webhooks**: Clerk, Dodo Payments, Polar and ReplicateAI follow this spec. Their secrets usually start with `whsec_`. Tern handles both `webhook-*` and `svix-*` headers via the `standardwebhooks` platform.
- **ReplicateAI**: paste the signing secret from your Replicate webhook settings directly as `secret`.
- **fal.ai**: uses ED25519. Pass `secret: ""` and Tern resolves the public key automatically via JWKS. You can also pass a PEM public key.

```typescript
export const POST = createWebhookHandler({
  platform: "falai",
  secret: "", // public key resolved automatically
  handler: async (payload, metadata) => ({ received: true, requestId: metadata.requestId }),
});
```

## Handling results

Every call returns the same shape, whatever the provider:

```typescript
interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string; // e.g. INVALID_SIGNATURE, MISSING_SIGNATURE, TIMESTAMP_EXPIRED
  platform: WebhookPlatform;
  payload?: any;
  eventId?: string;
  metadata?: {
    timestamp?: string;
    id?: string | null;
    [key: string]: any;
  };
}
```

Use `toleranceInSeconds` to control how old a timestamped webhook can be before it's rejected:

```typescript
await WebhookVerificationService.verify(request, {
  platform: "stripe",
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
  toleranceInSeconds: 300,
});
```

## Custom providers

Not built in? Describe its signature format and Tern does the rest.

```typescript
const result = await WebhookVerificationService.verify(request, {
  platform: "acmepay",
  secret: "acme_secret",
  signatureConfig: {
    algorithm: "hmac-sha256",
    headerName: "x-acme-signature",
    headerFormat: "raw",
    timestampHeader: "x-acme-timestamp",
    timestampFormat: "unix",
    payloadFormat: "timestamped",
  },
});
```

<details>
<summary><b>Custom Standard Webhooks headers</b></summary>

```typescript
import {
  createStandardWebhooksConfig,
  STANDARD_WEBHOOKS_BASE,
} from "@hookflo/tern";

const signatureConfig = createStandardWebhooksConfig({
  id: "webhook-id",
  timestamp: "webhook-timestamp",
  signature: "webhook-signature",
  idAliases: ["svix-id"],
  timestampAliases: ["svix-timestamp"],
  signatureAliases: ["svix-signature"],
});

const result = await WebhookVerificationService.verify(request, {
  platform: "standardwebhooks",
  secret: process.env.STANDARD_WEBHOOKS_SECRET!,
  signatureConfig: { ...STANDARD_WEBHOOKS_BASE, ...signatureConfig },
});
```

See the [SignatureConfig docs](https://tern.hookflo.com) for all options.

</details>

## Reliable delivery & alerts (optional)

Verification works on its own. If you also want retries, a dead-letter queue and replay, turn on queue mode. It runs on **your own Upstash QStash account** (bring your own key).

**1. Get your keys** from [console.upstash.com/qstash](https://console.upstash.com/qstash): `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`.

**2. Add `queue: true`:**

```typescript
export const POST = createWebhookHandler({
  platform: "stripe",
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
  queue: true,
  handler: async (payload, metadata) => ({ processed: true, eventId: metadata.id }),
});
```

Or pass an explicit config:

```typescript
queue: {
  token: process.env.QSTASH_TOKEN!,
  signingKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  retries: 5,
}
```

**3. Add alerts** (works with or without queue mode):

```typescript
export const POST = createWebhookHandler({
  platform: "stripe",
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
  alerts: {
    slack: { webhookUrl: process.env.SLACK_WEBHOOK_URL! },
    discord: { webhookUrl: process.env.DISCORD_WEBHOOK_URL! },
  },
  handler: async () => ({ ok: true }),
});
```

**Inspect the DLQ and replay failures:**

```typescript
import { createTernControls } from "@hookflo/tern/upstash";

const controls = createTernControls({
  token: process.env.QSTASH_TOKEN!,
  notifications: {
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  },
});

const dlq = await controls.dlq();
if (dlq.length > 0) {
  await controls.alert({
    dlq: true,
    dlqId: dlq[0].dlqId,
    severity: "warning",
    message: "Replay attempted for failed event",
  });
}
```

## API reference

### `WebhookVerificationService`

| Method | Description |
| --- | --- |
| `verify(request, config)` | Verify with a full config object |
| `verifyWithPlatformConfig(request, platform, secret, tolerance?)` | Shorthand for built-in platforms |
| `verifyAny(request, secrets, tolerance?)` | Auto-detect the platform and verify |
| `verifyTokenAuth(request, webhookId, webhookToken)` | Token-based verification (alias: `verifyTokenBased`) |
| `handleWithQueue(request, options)` | Queue receive/process helper |

### `@hookflo/tern/upstash`

| Export | Description |
| --- | --- |
| `createTernControls(config)` | Read DLQ/events, replay, send alerts |
| `handleQueuedRequest(request, options)` | Route a request between receive and process modes |
| `handleReceive(request, platform, secret, queueConfig, tolerance)` | Verify a webhook and enqueue it to QStash |
| `handleProcess(request, handler, queueConfig)` | Verify the QStash signature and process the payload |
| `resolveQueueConfig(queue)` | Resolve `queue: true` from env or an explicit object |

## Troubleshooting

**Signature verification keeps failing**
Verification needs the **raw** request body, not parsed JSON. Tern's framework adapters handle this for you. With the core service, make sure no body parser has consumed the stream first.

**`Module not found: Can't resolve "@hookflo/tern/nextjs"`**

```bash
npm i @hookflo/tern@latest
rm -rf node_modules package-lock.json .next
npm i
```

## Contributing

New providers, tests and fixes are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
git clone https://github.com/Hookflo/tern.git
cd tern
npm install
npm test
```

## Community

Questions, bugs or provider requests? Join [Discord](https://discord.com/invite/SNmCjU97nr) or [open an issue](https://github.com/Hookflo/tern/issues). If Tern saves you time, a ⭐ helps others find it.

Tern powers webhook verification at [Hookflo](https://hookflo.com).

## License

MIT © [Hookflo](https://hookflo.com)
