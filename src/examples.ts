import { WebhookVerificationService } from './index';
import { WebhookConfig, SignatureConfig } from './types';

// Example 1: Basic usage with platform config
export async function exampleBasicUsage(request: Request) {
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    request,
    'github',
    'your-github-secret',
    300
  );
  return result;
}

// Example 2: Token-based authentication (Supabase style)
export async function exampleTokenBased(request: Request) {
  const result = await WebhookVerificationService.verifyTokenBased(
    request,
    'your-webhook-id',
    'your-webhook-token'
  );
  return result;
}

// Example 3: Custom signature configuration
export async function exampleCustomSignature(request: Request) {
  const signatureConfig: SignatureConfig = {
    algorithm: 'hmac-sha256',
    headerName: 'x-custom-signature',
    headerFormat: 'prefixed',
    prefix: 'sha256=',
    payloadFormat: 'raw'
  };

  const config: WebhookConfig = {
    platform: 'custom',
    secret: 'your-custom-secret',
    signatureConfig
  };

  const result = await WebhookVerificationService.verify(request, config);
  return result;
}

// Example 4: Platform detection
export async function examplePlatformDetection(request: Request) {
  const { detectPlatformFromHeaders } = require('./utils');
  
  const platform = detectPlatformFromHeaders(request.headers);
  if (platform) {
    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      request,
      platform,
      'your-secret',
      300
    );
    return result;
  }
  
  throw new Error('Unknown platform');
}

// Example 5: Error handling
export async function exampleErrorHandling(request: Request) {
  try {
    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      request,
      'github',
      'your-secret',
      300
    );

    if (!result.isValid) {
      console.error('Verification failed:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, payload: result.payload };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, error: error.message };
  }
}

// Example 6: Batch verification
export async function exampleBatchVerification(request: Request) {
  const platforms = ['github', 'stripe', 'clerk'];
  const results = [];

  for (const platform of platforms) {
    try {
      const result = await WebhookVerificationService.verifyWithPlatformConfig(
        request,
        platform as any,
        'your-secret',
        300
      );
      results.push({ platform, success: true, result });
    } catch (error) {
      results.push({ platform, success: false, error: error.message });
    }
  }

  return results;
}

// Example 7: Express.js integration
export function exampleExpressIntegration() {
  const express = require('express');
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

  return app;
}

// Example 8: Next.js API route
export function exampleNextJsApiRoute() {
  return async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const result = await WebhookVerificationService.verifyWithPlatformConfig(
        req,
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
  };
}

// Example 9: Custom platform integration
export async function exampleCustomPlatform(request: Request) {
  const customConfig: WebhookConfig = {
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
  return result;
}

// Example 10: Helper methods usage
export function exampleHelperMethods() {
  const { WebhookVerificationService } = require('./index');
  
  // Get all platforms using HMAC-SHA256
  const hmacPlatforms = WebhookVerificationService.getPlatformsUsingAlgorithm('hmac-sha256');
  console.log('Platforms using HMAC-SHA256:', hmacPlatforms);

  // Check if a platform uses a specific algorithm
  const githubUsesHmac = WebhookVerificationService.platformUsesAlgorithm('github', 'hmac-sha256');
  console.log('GitHub uses HMAC-SHA256:', githubUsesHmac);

  // Validate a signature config
  const config: SignatureConfig = {
    algorithm: 'hmac-sha256',
    headerName: 'x-signature',
    payloadFormat: 'raw'
  };
  const isValid = WebhookVerificationService.validateSignatureConfig(config);
  console.log('Config is valid:', isValid);
} 