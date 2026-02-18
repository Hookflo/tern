# Tern - Algorithm Agnostic Webhook Verification Framework

A robust, algorithm-agnostic webhook verification framework that supports multiple platforms with accurate signature verification and payload retrieval.
The same framework that secures webhook verification at [Hookflo](https://hookflo.com).

⭐ Star this repo to support the project and help others discover it!  

💬 Join the discussion & contribute in our Discord: [Hookflo Community](https://discord.com/invite/SNmCjU97nr)

```bash
npm install @hookflo/tern
```

[![npm version](https://img.shields.io/npm/v/@hookflo/tern)](https://www.npmjs.com/package/@hookflo/tern)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Tern is a zero-dependency TypeScript framework for robust webhook verification across multiple platforms and algorithms.

<img width="1396" height="470" style="border-radius: 10px" alt="tern bird nature" src="https://github.com/user-attachments/assets/5f0da3e6-1aba-4f88-a9d7-9d8698845c39" />

## Features

- **Algorithm Agnostic**: Decouples platform logic from signature verification — verify based on cryptographic algorithm, not hardcoded platform rules.
Supports HMAC-SHA256, HMAC-SHA1, HMAC-SHA512, and custom algorithms

- **Platform Specific**: Accurate implementations for **Stripe, GitHub, Supabase, Clerk**, and other platforms
- **Flexible Configuration**: Custom signature configurations for any webhook format
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **Framework Agnostic**: Works with Express.js, Next.js, Cloudflare Workers, and more
- **Body-Parser Safe Adapters**: Read raw request bodies correctly to avoid signature mismatch issues
- **Multi-Provider Verification**: Verify and auto-detect across multiple providers with one API
- **Payload Normalization**: Opt-in normalized event shape to reduce provider lock-in
- **Category-aware Migration**: Normalize within provider categories (payment/auth/infrastructure) for safe platform switching
- **Strong Typed Normalized Schemas**: Category types like `PaymentWebhookNormalized` and `AuthWebhookNormalized` for safe migrations
- **Foundational Error Taxonomy**: Stable `errorCode` values (`INVALID_SIGNATURE`, `MISSING_SIGNATURE`, etc.)

## Why Tern?

Most webhook verifiers are tightly coupled to specific platforms or hardcoded logic. Tern introduces a flexible, scalable, algorithm-first approach that:

- Works across all major platforms
- Supports custom signing logic
- Keeps your code clean and modular
- Avoids unnecessary dependencies
- Is written in strict, modern TypeScript

## Installation

```bash
npm install @hookflo/tern
```

## Quick Start

### Basic Usage

```typescript
import { WebhookVerificationService, platformManager } from '@hookflo/tern';

// Method 1: Using the service (recommended)
const result = await WebhookVerificationService.verifyWithPlatformConfig(
  request,
  'stripe',
  'whsec_your_stripe_webhook_secret'
);

// Method 2: Using platform manager (for platform-specific operations)
const stripeResult = await platformManager.verify(request, 'stripe', 'whsec_your_secret');

if (result.isValid) {
  console.log('Webhook verified!', result.payload);
} else {
  console.log('Verification failed:', result.error);
}
```

### Universal Verification (auto-detect platform)

```typescript
import { WebhookVerificationService } from '@hookflo/tern';

const result = await WebhookVerificationService.verifyAny(request, {
  stripe: process.env.STRIPE_WEBHOOK_SECRET,
  github: process.env.GITHUB_WEBHOOK_SECRET,
  clerk: process.env.CLERK_WEBHOOK_SECRET,
});

if (result.isValid) {
  console.log(`Verified ${result.platform} webhook`);
}
```

### Category-aware Payload Normalization

### Strongly-Typed Normalized Payloads

```typescript
import {
  WebhookVerificationService,
  PaymentWebhookNormalized,
} from '@hookflo/tern';

const result = await WebhookVerificationService.verifyWithPlatformConfig<PaymentWebhookNormalized>(
  request,
  'stripe',
  process.env.STRIPE_WEBHOOK_SECRET!,
  300,
  { enabled: true, category: 'payment' },
);

if (result.isValid && result.payload?.event === 'payment.succeeded') {
  // result.payload is strongly typed
  console.log(result.payload.amount, result.payload.customer_id);
}
```

```typescript
import { WebhookVerificationService, getPlatformsByCategory } from '@hookflo/tern';

// Discover migration-compatible providers in the same category
const paymentPlatforms = getPlatformsByCategory('payment');
// ['stripe', 'polar', ...]

const result = await WebhookVerificationService.verifyWithPlatformConfig(
  request,
  'stripe',
  process.env.STRIPE_WEBHOOK_SECRET!,
  300,
  {
    enabled: true,
    category: 'payment',
    includeRaw: true,
  },
);

console.log(result.payload);
// {
//   event: 'payment.succeeded',
//   amount: 5000,
//   currency: 'USD',
//   customer_id: 'cus_123',
//   transaction_id: 'pi_123',
//   provider: 'stripe',
//   category: 'payment',
//   _raw: {...}
// }
```

### Platform-Specific Usage

```typescript
import { platformManager } from '@hookflo/tern';

// Run tests for a specific platform
const testsPassed = await platformManager.runPlatformTests('stripe');

// Get platform configuration
const config = platformManager.getConfig('stripe');

// Get platform documentation
const docs = platformManager.getDocumentation('stripe');
```

### Platform-Specific Configurations

```typescript
import { WebhookVerificationService } from '@hookflo/tern';

// Stripe webhook
const stripeConfig = {
  platform: 'stripe',
  secret: 'whsec_your_stripe_webhook_secret',
  toleranceInSeconds: 300,
};

// GitHub webhook
const githubConfig = {
  platform: 'github',
  secret: 'your_github_webhook_secret',
  toleranceInSeconds: 300,
};

// Clerk webhook
const clerkConfig = {
  platform: 'clerk',
  secret: 'whsec_your_clerk_webhook_secret',
  toleranceInSeconds: 300,
};

const result = await WebhookVerificationService.verify(request, stripeConfig);
```

## Supported Platforms

### Stripe
- **Signature Format**: `t={timestamp},v1={signature}`
- **Algorithm**: HMAC-SHA256
- **Payload Format**: `{timestamp}.{body}`

### GitHub
- **Signature Format**: `sha256={signature}`
- **Algorithm**: HMAC-SHA256
- **Payload Format**: Raw body

### Clerk
- **Signature Format**: `v1,{signature}` (space-separated)
- **Algorithm**: HMAC-SHA256 with base64 encoding
- **Payload Format**: `{id}.{timestamp}.{body}`

### Other Platforms
- **Dodo Payments**: HMAC-SHA256
- **Shopify**: HMAC-SHA256
- **Vercel**: HMAC-SHA256
- **Polar**: HMAC-SHA256
- **Supabase**: Token-based authentication
- **GitLab**: Token-based authentication 

## Custom Platform Configuration

This framework is fully configuration-driven. You can verify webhooks from any provider—even if it is not built-in—by supplying a custom configuration object. This allows you to support new or proprietary platforms instantly, without waiting for a library update.

### Example: Standard HMAC-SHA256 Webhook

```typescript
import { WebhookVerificationService } from '@hookflo/tern';

const acmeConfig = {
  platform: 'acmepay',
  secret: 'acme_secret',
  signatureConfig: {
    algorithm: 'hmac-sha256',
    headerName: 'x-acme-signature',
    headerFormat: 'raw',
    timestampHeader: 'x-acme-timestamp',
    timestampFormat: 'unix',
    payloadFormat: 'timestamped', // signs as {timestamp}.{body}
  }
};

const result = await WebhookVerificationService.verify(request, acmeConfig);
```

### Example: Svix/Standard Webhooks (Clerk, Dodo Payments, etc.)

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
      // encoding: 'base64' // only if the provider uses base64, otherwise omit
    }
  }
};

const result = await WebhookVerificationService.verify(request, svixConfig);
```

You can configure any combination of algorithm, header, payload, and encoding. See the `SignatureConfig` type for all options.

## Webhook Verification OK Tested Platforms
- **Stripe**
- **Supabase**
- **Github**
- **Clerk**
- **Dodo Payments**

- **Other Platforms** : Yet to verify....


## Custom Configurations

### Custom HMAC-SHA256

```typescript
const customConfig = {
  platform: 'custom',
  secret: 'your_custom_secret',
  signatureConfig: {
    algorithm: 'hmac-sha256',
    headerName: 'x-custom-signature',
    headerFormat: 'prefixed',
    prefix: 'sha256=',
    payloadFormat: 'raw',
  },
};
```

### Custom Timestamped Payload

```typescript
const timestampedConfig = {
  platform: 'custom',
  secret: 'your_custom_secret',
  signatureConfig: {
    algorithm: 'hmac-sha256',
    headerName: 'x-webhook-signature',
    headerFormat: 'raw',
    timestampHeader: 'x-webhook-timestamp',
    timestampFormat: 'unix',
    payloadFormat: 'timestamped',
  },
};
```

## Framework Integration

### Express.js middleware (body-parser safe)

```typescript
import express from 'express';
import { createWebhookMiddleware } from '@hookflo/tern/express';

const app = express();

app.post(
  '/webhooks/stripe',
  createWebhookMiddleware({
    platform: 'stripe',
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
    normalize: true,
  }),
  (req, res) => {
    const event = (req as any).webhook.payload;
    res.json({ received: true, event: event.event });
  },
);
```

### Next.js App Router

```typescript
import { createWebhookHandler } from '@hookflo/tern/nextjs';

export const POST = createWebhookHandler({
  platform: 'github',
  secret: process.env.GITHUB_WEBHOOK_SECRET!,
  handler: async (payload) => ({ received: true, event: payload.event ?? payload.type }),
});
```

### Cloudflare Workers

```typescript
import { createWebhookHandler } from '@hookflo/tern/cloudflare';

const handleStripe = createWebhookHandler({
  platform: 'stripe',
  secretEnv: 'STRIPE_WEBHOOK_SECRET',
  handler: async (payload) => ({ received: true, event: payload.event ?? payload.type }),
});

export default {
  async fetch(request: Request, env: Record<string, string>) {
    if (new URL(request.url).pathname === '/webhooks/stripe') {
      return handleStripe(request, env);
    }
    return new Response('Not Found', { status: 404 });
  },
};
```

## API Reference

### WebhookVerificationService

#### `verify(request: Request, config: WebhookConfig): Promise<WebhookVerificationResult>`

Verifies a webhook using the provided configuration.

#### `verifyWithPlatformConfig(request: Request, platform: WebhookPlatform, secret: string, toleranceInSeconds?: number, normalize?: boolean | NormalizeOptions): Promise<WebhookVerificationResult>`

Simplified verification using platform-specific configurations with optional payload normalization.

#### `verifyAny(request: Request, secrets: Record<string, string>, toleranceInSeconds?: number, normalize?: boolean | NormalizeOptions): Promise<WebhookVerificationResult>`

Auto-detects platform from headers and verifies against one or more provider secrets.

#### `verifyTokenBased(request: Request, webhookId: string, webhookToken: string): Promise<WebhookVerificationResult>`

Verifies token-based webhooks (like Supabase).

#### `getPlatformsByCategory(category: 'payment' | 'auth' | 'ecommerce' | 'infrastructure'): WebhookPlatform[]`

Returns built-in providers that normalize into a shared schema for the given migration category.

### Types

#### `WebhookVerificationResult`

```typescript
interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  errorCode?: WebhookErrorCode;
  platform: WebhookPlatform;
  payload?: any;
  metadata?: {
    timestamp?: string;
    id?: string | null;
    [key: string]: any;
  };
}
```

#### `WebhookConfig`

```typescript
interface WebhookConfig {
  platform: WebhookPlatform;
  secret: string;
  toleranceInSeconds?: number;
  signatureConfig?: SignatureConfig;
  normalize?: boolean | NormalizeOptions;
}
```

## Testing

### Run All Tests

```bash
npm test
```

### Platform-Specific Testing

```bash
# Test a specific platform
npm run test:platform stripe

# Test all platforms
npm run test:all
```

### Documentation and Analysis

```bash
# Fetch platform documentation
npm run docs:fetch

# Generate diffs between versions
npm run docs:diff

# Analyze changes and generate reports
npm run docs:analyze
```

## Examples

See the [examples.ts](./src/examples.ts) file for comprehensive usage examples.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information on how to:

- Set up your development environment
- Add new platforms
- Write tests
- Submit pull requests
- Follow our code style guidelines

### Quick Start for Contributors

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/tern.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `npm test`
6. Submit a pull request

### Adding a New Platform

See our [Platform Development Guide](CONTRIBUTING.md#adding-new-platforms) for step-by-step instructions on adding support for new webhook platforms.

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- [Documentation](./USAGE.md)
- [Framework Summary](./FRAMEWORK_SUMMARY.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Issues](https://github.com/Hookflo/tern/issues)


## Troubleshooting

### `Module not found: Can't resolve "@hookflo/tern/nextjs"`

If this happens in a Next.js project, it usually means one of these:

1. You installed an older published package version that does not include subpath exports yet.
2. Lockfile still points to an old tarball/version.
3. `node_modules` cache is stale after upgrading.

Fix steps:

```bash
# in your Next.js app
npm i @hookflo/tern@latest
rm -rf node_modules package-lock.json .next
npm i
```

Then verify resolution:

```bash
node -e "console.log(require.resolve('@hookflo/tern/nextjs'))"
```

If you are testing this repo locally before publish:

```bash
# inside /workspace/tern
npm run build
npm pack

# inside your other project
npm i /path/to/hookflo-tern-<version>.tgz
```

Minimal Next.js App Router usage:

```ts
import { createWebhookHandler } from '@hookflo/tern/nextjs';

export const POST = createWebhookHandler({
  platform: 'stripe',
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
  handler: async (payload) => ({ received: true, event: payload.event ?? payload.type }),
});
```

