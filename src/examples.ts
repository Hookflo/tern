import { WebhookVerificationService } from './index';
import { WebhookConfig, SignatureConfig } from './types';

// Example 1: Using platform-specific configurations (Recommended)
export async function examplePlatformSpecific() {
  console.log('🔧 Example 1: Platform-Specific Configurations\n');

  // Stripe webhook verification
  const stripeConfig: WebhookConfig = {
    platform: 'stripe',
    secret: 'whsec_your_stripe_webhook_secret',
    toleranceInSeconds: 300,
  };

  // GitHub webhook verification
  const githubConfig: WebhookConfig = {
    platform: 'github',
    secret: 'your_github_webhook_secret',
    toleranceInSeconds: 300,
  };

  // Clerk webhook verification
  const clerkConfig: WebhookConfig = {
    platform: 'clerk',
    secret: 'whsec_your_clerk_webhook_secret',
    toleranceInSeconds: 300,
  };

  // Usage with Request object
  const request = new Request('https://your-app.com/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': 't=1234567890,v1=abc123...',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ event: 'payment_intent.succeeded' }),
  });

  try {
    const result = await WebhookVerificationService.verify(request, stripeConfig);

    if (result.isValid) {
      console.log('✅ Webhook verified successfully!');
      console.log('Platform:', result.platform);
      console.log('Payload:', result.payload);
      console.log('Metadata:', result.metadata);
    } else {
      console.log('❌ Webhook verification failed:', result.error);
    }
  } catch (error) {
    console.error('Error verifying webhook:', error);
  }
}

// Example 2: Using custom signature configurations
export async function exampleCustomSignature() {
  console.log('\n🔧 Example 2: Custom Signature Configurations\n');

  // Custom HMAC-SHA256 configuration
  const customConfig: WebhookConfig = {
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

  // Custom timestamped configuration
  const timestampedConfig: WebhookConfig = {
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

  console.log('Custom configurations created for different signature formats');
}

// Example 3: Using the simplified platform config method
export async function exampleSimplifiedPlatform() {
  console.log('\n🔧 Example 3: Simplified Platform Configuration\n');

  const request = new Request('https://your-app.com/webhook', {
    method: 'POST',
    headers: {
      'x-hub-signature-256': 'sha256=abc123...',
      'x-github-event': 'push',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ref: 'refs/heads/main' }),
  });

  try {
    // Simple one-liner for platform-specific verification
    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      request,
      'github',
      'your_github_webhook_secret',
    );

    if (result.isValid) {
      console.log('✅ GitHub webhook verified!');
      console.log('Event:', result.metadata?.event);
      console.log('Payload:', result.payload);
    } else {
      console.log('❌ GitHub webhook verification failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 4: Token-based authentication helper
export async function exampleTokenBased() {
  console.log('\n🔧 Example 4: Token-Based Authentication\n');

  const request = new Request('https://your-app.com/webhook', {
    method: 'POST',
    headers: {
      'x-webhook-id': 'webhook_123',
      'x-webhook-token': 'token_456',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ event: 'database.insert' }),
  });

  try {
    const result = await WebhookVerificationService.verifyTokenAuth(
      request,
      'webhook_123',
      'token_456',
    );

    if (result.isValid) {
      console.log('✅ Token-based webhook verified!');
      console.log('Webhook ID:', result.metadata?.id);
      console.log('Payload:', result.payload);
    } else {
      console.log('❌ Token-based webhook verification failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 5: Error handling and validation
export async function exampleErrorHandling() {
  console.log('\n🔧 Example 5: Error Handling and Validation\n');

  // Test with invalid signature
  const invalidRequest = new Request('https://your-app.com/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': 't=1234567890,v1=invalid_signature',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ event: 'test' }),
  });

  try {
    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      invalidRequest,
      'stripe',
      'whsec_your_stripe_webhook_secret',
    );

    if (!result.isValid) {
      console.log('❌ Expected failure:', result.error);
      console.log('Platform:', result.platform);
    } else {
      console.log('⚠️ Unexpected success - this should have failed');
    }
  } catch (error) {
    console.error('Error during verification:', error);
  }

  // Test with missing headers
  const missingHeadersRequest = new Request('https://your-app.com/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ event: 'test' }),
  });

  try {
    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      missingHeadersRequest,
      'stripe',
      'whsec_your_stripe_webhook_secret',
    );

    if (!result.isValid) {
      console.log('❌ Missing headers detected:', result.error);
    } else {
      console.log('⚠️ Unexpected success - should have detected missing headers');
    }
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Example 6: Platform algorithm information
export function examplePlatformInfo() {
  console.log('\n🔧 Example 6: Platform Algorithm Information\n');

  // Get all platforms using HMAC-SHA256
  const hmacSha256Platforms = WebhookVerificationService.getPlatformsUsingAlgorithm('hmac-sha256');
  console.log('Platforms using HMAC-SHA256:', hmacSha256Platforms);

  // Check if a platform uses a specific algorithm
  const stripeUsesHmac = WebhookVerificationService.platformUsesAlgorithm('stripe', 'hmac-sha256');
  console.log('Stripe uses HMAC-SHA256:', stripeUsesHmac);

  const clerkUsesCustom = WebhookVerificationService.platformUsesAlgorithm('clerk', 'custom');
  console.log('Clerk uses custom algorithm:', clerkUsesCustom);

  // Validate signature config
  const validConfig: SignatureConfig = {
    algorithm: 'hmac-sha256',
    headerName: 'x-webhook-signature',
    headerFormat: 'raw',
    payloadFormat: 'raw',
  };

  const isValid = WebhookVerificationService.validateSignatureConfig(validConfig);
  console.log('Signature config is valid:', isValid);
}

// Example 7: Real-world usage patterns
export async function exampleRealWorldUsage() {
  console.log('\n🔧 Example 7: Real-World Usage Patterns\n');

  // Pattern 1: Express.js middleware
  console.log('Pattern 1: Express.js Middleware');
  console.log(`
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
  `);

  // Pattern 2: Next.js API route
  console.log('\nPattern 2: Next.js API Route');
  console.log(`
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
  `);

  // Pattern 3: Cloudflare Workers
  console.log('\nPattern 3: Cloudflare Workers');
  console.log(`
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
  `);
}

// Run all examples
export async function runAllExamples() {
  console.log('🚀 Running Webhook Verification Examples\n');

  await examplePlatformSpecific();
  await exampleCustomSignature();
  await exampleSimplifiedPlatform();
  await exampleTokenBased();
  await exampleErrorHandling();
  examplePlatformInfo();
  await exampleRealWorldUsage();

  console.log('\n✅ All examples completed!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
