# Tern - Algorithm Agnostic Webhook Verification Framework

A robust, algorithm-agnostic webhook verification framework that supports multiple platforms with accurate signature verification and payload retrieval.

[![npm version](https://img.shields.io/npm/v/@hookflo/tern)](https://www.npmjs.com/package/@hookflo/tern)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Tern is a zero-dependency TypeScript framework for robust webhook verification across multiple platforms and algorithms.

<img width="1396" height="470" style="border-radius: 10px" alt="tern bird nature" src="https://github.com/user-attachments/assets/5f0da3e6-1aba-4f88-a9d7-9d8698845c39" />
## Features

- **Algorithm Agnostic**: Decouples platform logic from signature verification — verify based on cryptographic algorithm, not hardcoded platform rules.
Supports HMAC-SHA256, HMAC-SHA1, HMAC-SHA512, and custom algorithms

- **Platform Specific**: Accurate implementations for Stripe, GitHub, Clerk, and other platforms
- **Flexible Configuration**: Custom signature configurations for any webhook format
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **Framework Agnostic**: Works with Express.js, Next.js, Cloudflare Workers, and more

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
import { WebhookVerificationService } from '@hookflo/tern';

// Verify a Stripe webhook
const result = await WebhookVerificationService.verifyWithPlatformConfig(
  request,
  'stripe',
  'whsec_your_stripe_webhook_secret'
);

if (result.isValid) {
  console.log('Webhook verified!', result.payload);
} else {
  console.log('Verification failed:', result.error);
}
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

### Express.js

```typescript
app.post('/webhooks/stripe', async (req, res) => {
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    req,
    'stripe',
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (!result.isValid) {
    return res.status(400).json({ error: result.error });
  }

  // Process the webhook
  console.log('Stripe event:', result.payload.type);
  res.json({ received: true });
});
```

### Next.js API Route

```typescript
// pages/api/webhooks/github.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    req,
    'github',
    process.env.GITHUB_WEBHOOK_SECRET
  );

  if (!result.isValid) {
    return res.status(400).json({ error: result.error });
  }

  // Handle GitHub webhook
  const event = req.headers['x-github-event'];
  console.log('GitHub event:', event);
  
  res.json({ received: true });
}
```

### Cloudflare Workers

```typescript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.url.includes('/webhooks/clerk')) {
    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      request,
      'clerk',
      CLERK_WEBHOOK_SECRET
    );

    if (!result.isValid) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process Clerk webhook
    console.log('Clerk event:', result.payload.type);
    return new Response(JSON.stringify({ received: true }));
  }
}
```

## API Reference

### WebhookVerificationService

#### `verify(request: Request, config: WebhookConfig): Promise<WebhookVerificationResult>`

Verifies a webhook using the provided configuration.

#### `verifyWithPlatformConfig(request: Request, platform: WebhookPlatform, secret: string, toleranceInSeconds?: number): Promise<WebhookVerificationResult>`

Simplified verification using platform-specific configurations.

#### `verifyTokenBased(request: Request, webhookId: string, webhookToken: string): Promise<WebhookVerificationResult>`

Verifies token-based webhooks (like Supabase).

### Types

#### `WebhookVerificationResult`

```typescript
interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
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
}
```

## Testing

Run the test suite:

```bash
npm test
```

Run examples:

```bash
npm run examples
```

## Examples

See the [examples.ts](./src/examples.ts) file for comprehensive usage examples.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- [Documentation](./USAGE.md)
- [Framework Summary](./FRAMEWORK_SUMMARY.md)
- [Issues](https://github.com/your-repo/tern/issues)
