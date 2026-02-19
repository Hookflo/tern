# Tern - Usage Guide

## 🚀 Quick Start

### Installation

```bash
npm install tern
```

### Basic Usage

```typescript
import { WebhookVerificationService } from 'tern';

// Verify a GitHub webhook
const result = await WebhookVerificationService.verifyWithPlatformConfig(
  request,
  'github',
  'your-github-secret',
  300
);

if (result.isValid) {
  console.log('Webhook verified successfully:', result.payload);
} else {
  console.error('Verification failed:', result.error);
}
```

## 🎯 Supported Platforms

### HMAC-SHA256 Platforms
- **GitHub**: `x-hub-signature-256` header
- **Stripe**: `stripe-signature` header
- **Shopify**: `x-shopify-hmac-sha256` header
- **Vercel**: `x-vercel-signature` header
- **Polar**: `x-polar-signature` header
- **Dodo Payments**: `webhook-signature` header
- **Paddle**: `paddle-signature` header
- **Razorpay**: `x-razorpay-signature` header
- **Lemon Squeezy**: `x-signature` header
- **Auth0**: `x-auth0-signature` header
- **WorkOS**: `workos-signature` header
- **WooCommerce**: `x-wc-webhook-signature` header
- **ReplicateAI**: `webhook-signature` header
- **fal.ai**: `x-fal-webhook-signature` header (ED25519)

### Custom Platforms
- **Clerk**: Custom base64 encoding
- **Supabase**: Token-based authentication


## 🧩 Framework middleware usage for new platforms

All built-in platforms work automatically with framework adapters (`express`, `nextjs`, `cloudflare`) by setting `platform` and `secret`.

```typescript
// Next.js - Paddle
import { createWebhookHandler } from '@hookflo/tern/nextjs';

export const POST = createWebhookHandler({
  platform: 'paddle',
  secret: process.env.PADDLE_WEBHOOK_SECRET!,
  handler: async (payload) => ({ received: true, type: payload.event_type ?? payload.type }),
});
```

```typescript
// Express - Auth0
import { createWebhookMiddleware } from '@hookflo/tern/express';

app.post('/webhooks/auth0', createWebhookMiddleware({
  platform: 'auth0',
  secret: process.env.AUTH0_WEBHOOK_SECRET!,
}), (req, res) => res.json({ received: true }));
```

```typescript
// Cloudflare - WooCommerce
import { createWebhookHandler } from '@hookflo/tern/cloudflare';

const handleWoo = createWebhookHandler({
  platform: 'woocommerce',
  secretEnv: 'WOO_WEBHOOK_SECRET',
  handler: async () => ({ received: true }),
});
```

### fal.ai (important)

fal.ai verification is ED25519-based and requires `x-fal-webhook-signature` plus fal request metadata headers.

For framework adapters, pass a PEM public key via `secret`:

```typescript
import { createWebhookHandler } from '@hookflo/tern/nextjs';

export const POST = createWebhookHandler({
  platform: 'falai',
  secret: process.env.FAL_PUBLIC_KEY_PEM!,
  handler: async (payload, metadata) => ({ received: true, requestId: metadata.requestId }),
});
```

## 🔧 API Reference

### WebhookVerificationService

#### `verifyWithPlatformConfig(request, platform, secret, toleranceInSeconds?)`

Verify a webhook using platform-specific configuration.

```typescript
const result = await WebhookVerificationService.verifyWithPlatformConfig(
  request,
  'github',
  'your-secret',
  300 // optional, default: 300
);
```

#### `verifyTokenBased(request, webhookId, webhookToken)`

Verify a webhook using simple token-based authentication (like Supabase).

```typescript
const result = await WebhookVerificationService.verifyTokenBased(
  request,
  'your-webhook-id',
  'your-webhook-token'
);
```

#### `verify(request, config)`

Verify a webhook using a custom configuration object.

```typescript
const config = {
  platform: 'custom',
  secret: 'your-secret',
  signatureConfig: {
    algorithm: 'hmac-sha256',
    headerName: 'x-signature',
    headerFormat: 'prefixed',
    prefix: 'sha256=',
    payloadFormat: 'raw'
  }
};

const result = await WebhookVerificationService.verify(request, config);
```

### Utility Functions

#### `detectPlatformFromHeaders(headers)`

Automatically detect the platform from request headers.

```typescript
import { detectPlatformFromHeaders } from 'tern';

const platform = detectPlatformFromHeaders(request.headers);
if (platform) {
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    request, platform, 'your-secret', 300
  );
}
```

## 🎯 Integration Examples

### Express.js

```typescript
import express from 'express';
import { WebhookVerificationService } from 'tern';

const app = express();

app.post('/webhook', async (req, res) => {
  try {
    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      req,
      'github',
      process.env.GITHUB_WEBHOOK_SECRET,
      300
    );

    if (result.isValid) {
      console.log('Webhook received:', result.payload);
      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Next.js API Route

```typescript
// pages/api/webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { WebhookVerificationService } from 'tern';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      req as any,
      'stripe',
      process.env.STRIPE_WEBHOOK_SECRET,
      300
    );

    if (result.isValid) {
      console.log('Stripe webhook:', result.payload);
      res.status(200).json({ received: true });
    } else {
      res.status(401).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Platform Detection

```typescript
import { detectPlatformFromHeaders, WebhookVerificationService } from 'tern';

async function handleWebhook(request: Request) {
  const platform = detectPlatformFromHeaders(request.headers);
  
  if (!platform) {
    throw new Error('Unknown webhook platform');
  }

  const secret = getSecretForPlatform(platform); // Your secret management
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    request,
    platform,
    secret,
    300
  );

  return result;
}
```

### Token-based Authentication (Supabase)

```typescript
import { WebhookVerificationService } from 'tern';

// For platforms that use simple token-based auth
const result = await WebhookVerificationService.verifyTokenBased(
  request,
  'your-webhook-id',
  'your-webhook-token'
);

if (result.isValid) {
  console.log('Token-based webhook verified:', result.payload);
}
```

## 🔍 Error Handling

```typescript
try {
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    request,
    'github',
    'your-secret',
    300
  );

  if (!result.isValid) {
    console.error('Verification failed:', result.error);
    return res.status(401).json({ error: result.error });
  }

  // Process webhook
  console.log('Webhook verified:', result.payload);
} catch (error) {
  console.error('Verification error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}
```

## 🧪 Testing

```typescript
import { WebhookVerificationService } from 'tern';

// Create a mock request
const mockRequest = new Request('http://localhost/webhook', {
  method: 'POST',
  headers: {
    'x-hub-signature-256': 'sha256=abc123',
    'content-type': 'application/json'
  },
  body: JSON.stringify({ test: 'data' })
});

const result = await WebhookVerificationService.verifyWithPlatformConfig(
  mockRequest,
  'github',
  'test-secret',
  300
);

console.log('Test result:', result);
```

## 🔧 Custom Platforms

### Adding a New Platform

```typescript
const customConfig = {
  platform: 'custom',
  secret: 'your-custom-secret',
  signatureConfig: {
    algorithm: 'hmac-sha256',
    headerName: 'x-custom-signature',
    headerFormat: 'raw',
    payloadFormat: 'raw'
  }
};

const result = await WebhookVerificationService.verify(request, customConfig);
```

### Custom Algorithm

```typescript
const customConfig = {
  platform: 'custom',
  secret: 'your-secret',
  signatureConfig: {
    algorithm: 'custom',
    headerName: 'x-custom-signature',
    headerFormat: 'raw',
    payloadFormat: 'raw',
    customConfig: {
      type: 'your-custom-type',
      // Add your custom configuration here
    }
  }
};
```

## 📊 Response Format

All verification methods return a `WebhookVerificationResult` object:

```typescript
interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  platform: WebhookPlatform;
  payload?: any;
  metadata?: {
    timestamp?: string;
    id?: string;
    [key: string]: any;
  };
}
```

### Example Response

```typescript
// Success
{
  isValid: true,
  platform: 'github',
  payload: { event: 'push', repository: { name: 'test' } },
  metadata: {
    timestamp: '1234567890',
    algorithm: 'hmac-sha256'
  }
}

// Error
{
  isValid: false,
  error: 'Invalid signature',
  platform: 'github'
}
```

## 🔒 Security Features

- **Timing-safe comparisons**: Prevents timing attacks
- **Proper validation**: Comprehensive input validation
- **Secure defaults**: Secure by default configuration
- **Algorithm flexibility**: Support for multiple signature algorithms

## 📈 Performance

- **Zero dependencies**: Only uses Node.js built-in modules
- **Optimized algorithms**: Efficient HMAC verification
- **Minimal overhead**: Lightweight and fast
- **TypeScript support**: Full type safety and IntelliSense 
