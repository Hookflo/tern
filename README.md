# Tern

A robust, scalable webhook verification framework supporting multiple platforms and signature algorithms. Built with TypeScript for maximum type safety and developer experience.

## Features

- **Algorithm-based verification**: Instead of platform-specific verifiers, use algorithm-based verifiers
- **Platform configuration**: Each platform specifies which algorithm to use
- **Extensible framework**: Easy to add new algorithms and platforms
- **Most common algorithms**: HMAC-SHA256, HMAC-SHA1, HMAC-SHA512, and custom algorithms
- **TypeScript support**: Full type safety and IntelliSense
- **Zero dependencies**: Only uses Node.js built-in modules

## Installation

```bash
npm install tern
```

## Quick Start

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

### Token-based Authentication (Supabase, Custom)

```typescript
// For platforms that use simple token-based auth
const result = await WebhookVerificationService.verifyTokenBased(
  request,
  'your-webhook-id',
  'your-webhook-token'
);
```

### Custom Signature Configuration

```typescript
import { WebhookVerificationService } from 'tern';

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

## 🏗️ Supported Platforms

### HMAC-SHA256 (Most Common)
- **GitHub**: `x-hub-signature-256` with `sha256=` prefix
- **Stripe**: `stripe-signature` with comma-separated format
- **Clerk**: `svix-signature` with base64 encoding
- **Dodo Payments**: `webhook-signature` with raw format
- **Shopify**: `x-shopify-hmac-sha256`
- **Vercel**: `x-vercel-signature`
- **Polar**: `x-polar-signature`

### Custom Algorithms
- **Supabase**: Token-based authentication
- **Clerk**: Custom base64 encoding
- **Stripe**: Custom comma-separated format

## 🔧 API Reference

### WebhookVerificationService

#### `verify(request: Request, config: WebhookConfig): Promise<WebhookVerificationResult>`

Verify a webhook using a configuration object.

```typescript
const config = {
  platform: 'github',
  secret: 'your-secret',
  toleranceInSeconds: 300
};

const result = await WebhookVerificationService.verify(request, config);
```

#### `verifyWithPlatformConfig(request: Request, platform: WebhookPlatform, secret: string, toleranceInSeconds?: number): Promise<WebhookVerificationResult>`

Verify a webhook using platform-specific configuration.

```typescript
const result = await WebhookVerificationService.verifyWithPlatformConfig(
  request,
  'stripe',
  'your-stripe-secret',
  300
);
```

#### `verifyTokenBased(request: Request, webhookId: string, webhookToken: string): Promise<WebhookVerificationResult>`

Verify a webhook using simple token-based authentication.

```typescript
const result = await WebhookVerificationService.verifyTokenBased(
  request,
  'your-webhook-id',
  'your-webhook-token'
);
```

### Utility Functions

#### `detectPlatformFromHeaders(headers: Headers): WebhookPlatform | null`

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

#### `getPlatformsUsingAlgorithm(algorithm: string): WebhookPlatform[]`

Get all platforms that use a specific algorithm.

```typescript
import { WebhookVerificationService } from 'tern';

const hmacPlatforms = WebhookVerificationService.getPlatformsUsingAlgorithm('hmac-sha256');
// Returns: ['github', 'stripe', 'clerk', 'dodopayments', ...]
```

## 🎯 Usage Examples

### Express.js Integration

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
      // Process the webhook
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
      // Handle the webhook
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

### Custom Platform Integration

```typescript
import { WebhookVerificationService } from 'tern';

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

## 🔧 Adding New Platforms

### Step 1: Add Platform Type

```typescript
// In your project, extend the types
declare module 'tern' {
  interface WebhookPlatform {
    'your-platform': 'your-platform';
  }
}
```

### Step 2: Use Custom Configuration

```typescript
const config = {
  platform: 'custom',
  secret: 'your-secret',
  signatureConfig: {
    algorithm: 'hmac-sha256', // or 'custom'
    headerName: 'x-your-signature',
    headerFormat: 'raw',
    payloadFormat: 'raw'
  }
};
```

## 📊 Platform Support Matrix

| Platform | Algorithm | Header | Format |
|----------|-----------|--------|--------|
| GitHub | HMAC-SHA256 | `x-hub-signature-256` | `sha256=...` |
| Stripe | HMAC-SHA256 | `stripe-signature` | `t=...,v1=...` |
| Clerk | Custom | `svix-signature` | Base64 |
| Supabase | Token-based | `x-webhook-token` | Simple |
| Shopify | HMAC-SHA256 | `x-shopify-hmac-sha256` | Raw |
| Vercel | HMAC-SHA256 | `x-vercel-signature` | Raw |
| Polar | HMAC-SHA256 | `x-polar-signature` | Raw |

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

## 📈 Performance

- **Zero dependencies**: Only uses Node.js built-in modules
- **Optimized algorithms**: Efficient HMAC verification
- **Timing-safe comparisons**: Prevents timing attacks
- **Minimal overhead**: Lightweight and fast

## 🔒 Security Features

- **Timing-safe comparisons**: Prevents timing attacks
- **Proper validation**: Comprehensive input validation
- **Secure defaults**: Secure by default configuration
- **Algorithm flexibility**: Support for multiple signature algorithms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tern/issues)
- **Documentation**: [GitHub Wiki](https://github.com/yourusername/tern/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tern/discussions)

## 🚀 Roadmap

- [ ] RSA-SHA256 support
- [ ] Ed25519 support
- [ ] Performance optimizations
- [ ] More platform integrations
- [ ] Built-in rate limiting
- [ ] Monitoring and metrics 