import { createHmac, createHash, generateKeyPairSync, sign } from 'crypto';
import { WebhookVerificationService, getPlatformsByCategory } from './index';

const testSecret = 'whsec_test_secret_key_12345';
const testBody = JSON.stringify({ event: 'test', data: { id: '123' } });

function createMockRequest(
  headers: Record<string, string>,
  body: string = testBody,
): Request {
  return new Request('https://example.com/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

function createStripeSignature(body: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${body}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload);
  const signature = hmac.digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

function createGitHubSignature(body: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}

function createGitLabSignature(body: string, secret: string): string {
  // GitLab just compares the token in X-Gitlab-Token header
  return secret;
}


function createClerkSignature(body: string, secret: string, id: string, timestamp: number): string {
  const signedContent = `${id}.${timestamp}.${body}`;
  const secretBytes = new Uint8Array(Buffer.from(secret.split('_')[1], 'base64'));
  const hmac = createHmac('sha256', secretBytes);
  hmac.update(signedContent);
  return `v1,${hmac.digest('base64')}`;
}

function createStandardWebhooksSignature(body: string, secret: string, id: string, timestamp: number): string {
  const signedContent = `${id}.${timestamp}.${body}`;
  const base64Secret = secret.includes('_') ? secret.split('_')[1] : secret;
  const secretBytes = new Uint8Array(Buffer.from(base64Secret, 'base64'));
  const hmac = createHmac('sha256', secretBytes);
  hmac.update(signedContent);
  return `v1,${hmac.digest('base64')}`;
}

function createPaddleSignature(body: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}:${body}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload);
  return `ts=${timestamp};h1=${hmac.digest('hex')}`;
}


function createShopifySignature(body: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  return hmac.digest('base64');
}

function createWooCommerceSignature(body: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  return hmac.digest('base64');
}


function createWorkOSSignature(body: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${body}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload);
  return `t=${timestamp},v1=${hmac.digest('hex')}`;
}


function createSentrySignature(body: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(JSON.stringify(JSON.parse(body)));
  return hmac.digest('hex');
}

function createSentryIssueAlertSignature(issueAlertObject: Record<string, unknown>, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(JSON.stringify(issueAlertObject));
  return hmac.digest('hex');
}

function createGrafanaSignature(body: string, secret: string, timestamp?: number): string {
  const payload = timestamp ? `${timestamp}.${body}` : body;
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

function createDopplerSignature(body: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}

function createSanitySignature(body: string, secret: string, timestamp: number): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(`${timestamp}.${body}`);
  return `t=${timestamp},v1=${hmac.digest('hex')}`;
}

function createFalPayloadToSign(body: string, requestId: string, userId: string, timestamp: string): string {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  return `${requestId}\n${userId}\n${timestamp}\n${bodyHash}`;
}

async function runTests() {
  console.log('🧪 Running Webhook Verification Tests...\n');

  // Test 1: Stripe Webhook
  console.log('1. Testing Stripe Webhook...');
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const stripeSignature = createStripeSignature(testBody, testSecret, timestamp);

    const stripeRequest = createMockRequest({
      'stripe-signature': stripeSignature,
      'content-type': 'application/json',
    });

    const stripeResult = await WebhookVerificationService.verifyWithPlatformConfig(
      stripeRequest,
      'stripe',
      testSecret,
    );

    const stripePassed = stripeResult.isValid && Boolean(stripeResult.eventId?.startsWith('stripe:'));
    console.log('   ✅ Stripe:', stripePassed ? 'PASSED' : 'FAILED');
    if (!stripeResult.isValid) {
      console.log('   ❌ Error:', stripeResult.error);
    }
  } catch (error) {
    console.log('   ❌ Stripe test failed:', error);
  }

  // Test 2: GitHub Webhook
  console.log('\n2. Testing GitHub Webhook...');
  try {
    const githubSignature = createGitHubSignature(testBody, testSecret);

    const githubRequest = createMockRequest({
      'x-hub-signature-256': githubSignature,
      'x-github-event': 'push',
      'x-github-delivery': 'test-delivery-id',
      'content-type': 'application/json',
    });

    const githubResult = await WebhookVerificationService.verifyWithPlatformConfig(
      githubRequest,
      'github',
      testSecret,
    );

    console.log('   ✅ GitHub:', githubResult.isValid ? 'PASSED' : 'FAILED');
    if (!githubResult.isValid) {
      console.log('   ❌ Error:', githubResult.error);
    }
  } catch (error) {
    console.log('   ❌ GitHub test failed:', error);
  }

  // Test 3: Clerk Webhook
  console.log('\n3. Testing Clerk Webhook...');
  try {
    // Create a proper Clerk-style secret (whsec_ + base64 encoded secret)
    const base64Secret = Buffer.from(testSecret).toString('base64');
    const clerkSecret = `whsec_${base64Secret}`;
    const id = 'test-id-123';
    const timestamp = Math.floor(Date.now() / 1000);
    const clerkSignature = createClerkSignature(testBody, clerkSecret, id, timestamp);

    const clerkRequest = createMockRequest({
      'svix-signature': clerkSignature,
      'svix-id': id,
      'svix-timestamp': timestamp.toString(),
      'content-type': 'application/json',
    });

    const clerkResult = await WebhookVerificationService.verifyWithPlatformConfig(
      clerkRequest,
      'clerk',
      clerkSecret,
    );

    console.log('   ✅ Clerk:', clerkResult.isValid ? 'PASSED' : 'FAILED');
    if (!clerkResult.isValid) {
      console.log('   ❌ Error:', clerkResult.error);
    }
  } catch (error) {
    console.log('   ❌ Clerk test failed:', error);
  }

  // Test 4: Standard HMAC-SHA256 (Generic)
  console.log('\n4. Testing Standard HMAC-SHA256...');
  try {
    const hmac = createHmac('sha256', testSecret);
    hmac.update(testBody);
    const signature = hmac.digest('hex');

    const genericRequest = createMockRequest({
      'x-webhook-signature': signature,
      'content-type': 'application/json',
    });

    const genericResult = await WebhookVerificationService.verifyWithPlatformConfig(
      genericRequest,
      'unknown',
      testSecret,
    );

    console.log('   ✅ Generic HMAC-SHA256:', genericResult.isValid ? 'PASSED' : 'FAILED');
    if (!genericResult.isValid) {
      console.log('   ❌ Error:', genericResult.error);
    }
  } catch (error) {
    console.log('   ❌ Generic test failed:', error);
  }

  // Test 4.5: Dodo Payments (Standard Webhooks / svix-style)
  console.log('\n4.5. Testing Dodo Payments...');
  try {
    const webhookId = 'test-webhook-id-123';
    const timestamp = Math.floor(Date.now() / 1000);

    // Create a proper secret format for Standard Webhooks (whsec_ + base64 encoded secret)
    const base64Secret = Buffer.from(testSecret).toString('base64');
    const dodoSecret = `whsec_${base64Secret}`;

    // Create svix-style signature: {webhook-id}.{webhook-timestamp}.{payload}
    const signedContent = `${webhookId}.${timestamp}.${testBody}`;

    // Use the base64-decoded secret for HMAC (like the Standard Webhooks library)
    const secretBytes = new Uint8Array(Buffer.from(base64Secret, 'base64'));
    const hmac = createHmac('sha256', secretBytes);
    hmac.update(signedContent);
    const signature = `v1,${hmac.digest('base64')}`;

    const dodoRequest = createMockRequest({
      'webhook-signature': signature,
      'webhook-id': webhookId,
      'webhook-timestamp': timestamp.toString(),
      'content-type': 'application/json',
    });

    const dodoResult = await WebhookVerificationService.verifyWithPlatformConfig(
      dodoRequest,
      'dodopayments',
      dodoSecret,
    );

    console.log('   ✅ Dodo Payments:', dodoResult.isValid ? 'PASSED' : 'FAILED');
    if (!dodoResult.isValid) {
      console.log('   ❌ Error:', dodoResult.error);
    }
  } catch (error) {
    console.log('   ❌ Dodo Payments test failed:', error);
  }

  // Test 5: Token-based authentication helper
  console.log('\n5. Testing Token-based Authentication...');
  try {
    const webhookId = 'test-webhook-id';
    const webhookToken = 'test-webhook-token';

    const tokenRequest = createMockRequest({
      'x-webhook-id': webhookId,
      'x-webhook-token': webhookToken,
      'content-type': 'application/json',
    });

    const tokenResult = await WebhookVerificationService.verifyTokenAuth(
      tokenRequest.clone(),
      webhookId,
      webhookToken,
    );


    const tokenAliasResult = await WebhookVerificationService.verifyTokenBased(
      tokenRequest.clone(),
      webhookId,
      webhookToken,
    );

    const tokenPassed = tokenResult.isValid && tokenAliasResult.isValid;

    console.log('   ✅ Token-based:', tokenPassed ? 'PASSED' : 'FAILED');
    if (!tokenResult.isValid) {
      console.log('   ❌ Error:', tokenResult.error);
    }
  } catch (error) {
    console.log('   ❌ Token-based test failed:', error);
  }

  // Test 5.5: Sentry webhook verification (standard + issue alert fallback)
  console.log('\n5.5. Testing Sentry Webhook...');
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const requestId = 'sentry-request-id-123';
    const sentryBody = JSON.stringify({
      action: 'triggered',
      data: {
        issue_alert: {
          id: 'alert-1',
          title: 'CPU high',
          project: 'infra',
        },
      },
    });

    const sentryRequest = createMockRequest({
      'sentry-hook-signature': createSentrySignature(sentryBody, testSecret),
      'sentry-hook-timestamp': timestamp.toString(),
      'request-id': requestId,
      'content-type': 'application/json',
    }, sentryBody);

    const sentryResult = await WebhookVerificationService.verifyWithPlatformConfig(
      sentryRequest,
      'sentry',
      testSecret,
    );

    const sentryIssueAlertRequest = createMockRequest({
      'sentry-hook-signature': createSentryIssueAlertSignature({ id: 'alert-1', title: 'CPU high', project: 'infra' }, testSecret),
      'sentry-hook-timestamp': timestamp.toString(),
      'request-id': `${requestId}-issue-alert`,
      'content-type': 'application/json',
    }, sentryBody);

    const sentryIssueAlertResult = await WebhookVerificationService.verifyWithPlatformConfig(
      sentryIssueAlertRequest,
      'sentry',
      testSecret,
    );

    const sentryPassed = sentryResult.isValid && sentryIssueAlertResult.isValid && sentryResult.eventId?.startsWith('sentry:');
    console.log('   ✅ Sentry:', sentryPassed ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Sentry test failed:', error);
  }

  // Test 5.6: Grafana webhook verification
  console.log('\n5.6. Testing Grafana Webhook...');
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const grafanaSignature = createGrafanaSignature(testBody, testSecret, timestamp);

    const grafanaRequest = createMockRequest({
      'x-grafana-alerting-signature': grafanaSignature,
      'x-grafana-alerting-timestamp': timestamp.toString(),
      'content-type': 'application/json',
    });

    const grafanaResult = await WebhookVerificationService.verifyWithPlatformConfig(
      grafanaRequest,
      'grafana',
      testSecret,
    );

    console.log('   ✅ Grafana:', grafanaResult.isValid ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Grafana test failed:', error);
  }

  // Test 5.7: Doppler webhook verification
  console.log('\n5.7. Testing Doppler Webhook...');
  try {
    const dopplerRequest = createMockRequest({
      'x-doppler-signature': createDopplerSignature(testBody, testSecret),
      'content-type': 'application/json',
    });

    const dopplerResult = await WebhookVerificationService.verifyWithPlatformConfig(
      dopplerRequest,
      'doppler',
      testSecret,
    );

    const dopplerPassed = dopplerResult.isValid && Boolean(dopplerResult.eventId?.startsWith('doppler:'));
    console.log('   ✅ Doppler:', dopplerPassed ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Doppler test failed:', error);
  }

  // Test 5.8: Sanity webhook verification
  console.log('\n5.8. Testing Sanity Webhook...');
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const idempotencyKey = 'sanity-idem-123';
    const sanityRequest = createMockRequest({
      'sanity-webhook-signature': createSanitySignature(testBody, testSecret, timestamp),
      'idempotency-key': idempotencyKey,
      'content-type': 'application/json',
    });

    const sanityResult = await WebhookVerificationService.verifyWithPlatformConfig(
      sanityRequest,
      'sanity',
      testSecret,
    );

    const sanityPassed = sanityResult.isValid && sanityResult.eventId === `sanity:${idempotencyKey}`;
    console.log('   ✅ Sanity:', sanityPassed ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Sanity test failed:', error);
  }

  // Test 6: Invalid signatures
  console.log('\n6. Testing Invalid Signatures...');
  try {
    const invalidRequest = createMockRequest({
      'stripe-signature': 't=1234567890,v1=invalid_signature',
      'content-type': 'application/json',
    });

    const invalidResult = await WebhookVerificationService.verifyWithPlatformConfig(
      invalidRequest,
      'stripe',
      testSecret,
    );

    const invalidSigPassed = !invalidResult.isValid && (
      invalidResult.errorCode === 'INVALID_SIGNATURE'
      || invalidResult.errorCode === 'TIMESTAMP_EXPIRED'
    );
    console.log('   ✅ Invalid signature correctly rejected:', invalidSigPassed ? 'PASSED' : 'FAILED');
    if (invalidResult.isValid) {
      console.log('   ❌ Should have been rejected');
    }
  } catch (error) {
    console.log('   ❌ Invalid signature test failed:', error);
  }

  // Test 7: Missing headers
  console.log('\n7. Testing Missing Headers...');
  try {
    const missingHeaderRequest = createMockRequest({
      'content-type': 'application/json',
    });

    const missingHeaderResult = await WebhookVerificationService.verifyWithPlatformConfig(
      missingHeaderRequest,
      'stripe',
      testSecret,
    );

    const missingHeaderPassed = !missingHeaderResult.isValid && missingHeaderResult.errorCode === 'MISSING_SIGNATURE';
    console.log('   ✅ Missing headers correctly rejected:', missingHeaderPassed ? 'PASSED' : 'FAILED');
    if (missingHeaderResult.isValid) {
      console.log('   ❌ Should have been rejected');
    }
  } catch (error) {
    console.log('   ❌ Missing headers test failed:', error);
  }

  // Test 8: GitLab Webhook
console.log('\n8. Testing GitLab Webhook...');
try {
  const gitlabSecret = testSecret;

  const gitlabRequest = createMockRequest({
    'X-Gitlab-Token': gitlabSecret,
    'content-type': 'application/json',
  });

  const gitlabResult = await WebhookVerificationService.verifyWithPlatformConfig(
    gitlabRequest,
    'gitlab',
    gitlabSecret,
  );

  console.log('   ✅ GitLab:', gitlabResult.isValid ? 'PASSED' : 'FAILED');
  if (!gitlabResult.isValid) {
    console.log('   ❌ Error:', gitlabResult.error);
  }
} catch (error) {
  console.log('   ❌ GitLab test failed:', error);
}

// Test 9: GitLab Invalid Token
console.log('\n9. Testing GitLab Invalid Token...');
try {
  const gitlabRequest = createMockRequest({
    'X-Gitlab-Token': 'wrong_secret',
    'content-type': 'application/json',
  });

  const gitlabResult = await WebhookVerificationService.verifyWithPlatformConfig(
    gitlabRequest,
    'gitlab',
    testSecret,
  );

  console.log(
    '   ✅ Invalid token correctly rejected:',
    !gitlabResult.isValid ? 'PASSED' : 'FAILED'
  );
} catch (error) {
  console.log('   ❌ GitLab invalid token test failed:', error);
}



  // Test 10: verifyAny should auto-detect Stripe
  console.log('\n10. Testing verifyAny auto-detection...');
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const stripeSignature = createStripeSignature(testBody, testSecret, timestamp);

    const request = createMockRequest({
      'stripe-signature': stripeSignature,
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verifyAny(request, {
      stripe: testSecret,
      github: 'wrong-secret',
    });

    console.log('   ✅ verifyAny:', result.isValid && result.platform === 'stripe' ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ verifyAny test failed:', error);
  }

  // Test 10.5: verifyAny error diagnostics
  console.log('\n10.5. Testing verifyAny error diagnostics...');
  try {
    const unknownRequest = createMockRequest({
      'content-type': 'application/json',
    });

    const invalidVerifyAny = await WebhookVerificationService.verifyAny(unknownRequest, {
      stripe: testSecret,
      shopify: testSecret,
    });

    const hasDetailedErrors = Boolean(
      invalidVerifyAny.error
      && invalidVerifyAny.error.includes('Attempts ->')
      && invalidVerifyAny.metadata?.attempts?.length === 2,
    );

    console.log('   ✅ verifyAny diagnostics:', hasDetailedErrors ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ verifyAny diagnostics test failed:', error);
  }

  // Test 11: Normalization for Stripe
  console.log('\n11. Testing payload normalization...');
  try {
    const normalizedStripeBody = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          amount: 5000,
          currency: 'usd',
          customer: 'cus_456',
        },
      },
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const stripeSignature = createStripeSignature(normalizedStripeBody, testSecret, timestamp);

    const request = createMockRequest(
      {
        'stripe-signature': stripeSignature,
        'content-type': 'application/json',
      },
      normalizedStripeBody,
    );

    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      request,
      'stripe',
      testSecret,
      300,
      true,
    );

    const payload = result.payload as Record<string, any>;
    const passed = result.isValid
      && payload.event === 'payment.succeeded'
      && payload.currency === 'USD'
      && payload.transaction_id === 'pi_123';

    console.log('   ✅ Normalization:', passed ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Normalization test failed:', error);
  }


  // Test 12: Category-aware normalization registry
  console.log('\n12. Testing category-based platform registry...');
  try {
    const paymentPlatforms = getPlatformsByCategory('payment');
    const hasStripeAndPolar = paymentPlatforms.includes('stripe') && paymentPlatforms.includes('polar');
    console.log('   ✅ Category registry:', hasStripeAndPolar ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Category registry test failed:', error);
  }

  // Test 13: Razorpay
  console.log('\n13. Testing Razorpay webhook...');
  try {
    const hmac = createHmac('sha256', testSecret);
    hmac.update(testBody);
    const signature = hmac.digest('hex');

    const request = createMockRequest({
      'x-razorpay-signature': signature,
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verifyWithPlatformConfig(request, 'razorpay', testSecret);
    console.log('   ✅ Razorpay:', result.isValid ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Razorpay test failed:', error);
  }

  // Test 14: Lemon Squeezy
  console.log('\n14. Testing Lemon Squeezy webhook...');
  try {
    const hmac = createHmac('sha256', testSecret);
    hmac.update(testBody);
    const signature = hmac.digest('hex');

    const request = createMockRequest({
      'x-signature': signature,
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verifyWithPlatformConfig(request, 'lemonsqueezy', testSecret);
    console.log('   ✅ Lemon Squeezy:', result.isValid ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Lemon Squeezy test failed:', error);
  }

  // Test 15: Paddle
  console.log('\n15. Testing Paddle webhook...');
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createPaddleSignature(testBody, testSecret, timestamp);
    const request = createMockRequest({
      'paddle-signature': signature,
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verifyWithPlatformConfig(request, 'paddle', testSecret);
    console.log('   ✅ Paddle:', result.isValid ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Paddle test failed:', error);
  }
  // Test 16: WorkOS
  console.log('\n16. Testing WorkOS webhook...');
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createWorkOSSignature(testBody, testSecret, timestamp);
    const request = createMockRequest({
      'workos-signature': signature,
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verifyWithPlatformConfig(request, 'workos', testSecret);
    console.log('   ✅ WorkOS:', result.isValid ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ WorkOS test failed:', error);
  }

  // Test 17.5: Shopify
  console.log('\n17. Testing Shopify webhook...');
  try {
    const signature = createShopifySignature(testBody, testSecret);
    const request = createMockRequest({
      'x-shopify-hmac-sha256': signature,
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verifyWithPlatformConfig(request, 'shopify', testSecret);
    console.log('   ✅ Shopify:', result.isValid ? 'PASSED' : 'FAILED');
    if (!result.isValid) {
      console.log('   ❌ Error:', result.error);
    }
  } catch (error) {
    console.log('   ❌ Shopify test failed:', error);
  }

  // Test 18: WooCommerce
  console.log('\n18. Testing WooCommerce webhook...');
  try {
    const signature = createWooCommerceSignature(testBody, testSecret);
    const request = createMockRequest({
      'x-wc-webhook-signature': signature,
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verifyWithPlatformConfig(request, 'woocommerce', testSecret);
    console.log('   ✅ WooCommerce:', result.isValid ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ WooCommerce test failed:', error);
  }

  // Test 18.5: Polar (Standard Webhooks)
  console.log('\n18.5. Testing Polar webhook...');
  try {
    const secret = `whsec_${Buffer.from(testSecret).toString('base64')}`;
    const webhookId = 'polar-webhook-id-1';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createStandardWebhooksSignature(testBody, secret, webhookId, timestamp);
    const request = createMockRequest({
      'webhook-signature': signature,
      'webhook-id': webhookId,
      'webhook-timestamp': timestamp.toString(),
      'user-agent': 'Polar.sh Webhooks',
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verifyWithPlatformConfig(request, 'polar', secret);
    const detectedPlatform = WebhookVerificationService.detectPlatform(request);

    console.log('   ✅ Polar verification:', result.isValid ? 'PASSED' : 'FAILED');
    console.log('   ✅ Polar auto-detect:', detectedPlatform === 'polar' ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Polar test failed:', error);
  }

  // Test 19: Replicate
  console.log('\n19. Testing Replicate webhook...');
  try {
    const secret = `whsec_${Buffer.from(testSecret).toString('base64')}`;
    const webhookId = 'replicate-webhook-id-1';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createStandardWebhooksSignature(testBody, secret, webhookId, timestamp);
    const request = createMockRequest({
      'webhook-signature': signature,
      'webhook-id': webhookId,
      'webhook-timestamp': timestamp.toString(),
      'user-agent': 'Replicate-Webhooks/1.0',
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verifyWithPlatformConfig(request, 'replicateai', secret);
    console.log('   ✅ Replicate:', result.isValid ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Replicate test failed:', error);
  }

  // Test 20: fal.ai
  console.log('\n20. Testing fal.ai webhook...');
  try {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const requestId = 'fal-request-id';
    const userId = 'fal-user-id';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadToSign = createFalPayloadToSign(testBody, requestId, userId, timestamp);
    const payloadBytes = new Uint8Array(Buffer.from(payloadToSign));
    const signature = sign(null, payloadBytes, privateKey).toString('hex');

    const request = createMockRequest({
      'x-fal-webhook-signature': signature,
      'x-fal-webhook-request-id': requestId,
      'x-fal-webhook-user-id': userId,
      'x-fal-webhook-timestamp': timestamp,
      'content-type': 'application/json',
    });

    const result = await WebhookVerificationService.verify(
      request,
      {
        platform: 'falai',
        secret: '',
        signatureConfig: {
          algorithm: 'ed25519',
          headerName: 'x-fal-webhook-signature',
          headerFormat: 'raw',
          payloadFormat: 'custom',
          customConfig: {
            publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
            requestIdHeader: 'x-fal-webhook-request-id',
            userIdHeader: 'x-fal-webhook-user-id',
            timestampHeader: 'x-fal-webhook-timestamp',
          },
        },
      },
    );

    console.log('   ✅ fal.ai:', result.isValid ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ fal.ai test failed:', error);
  }


  // Test 21: Core SDK queue entry point
  console.log('\n21. Testing core SDK handleWithQueue...');
  try {
    const request = createMockRequest({
      'content-type': 'application/json',
    });

    const originalToken = process.env.QSTASH_TOKEN;
    const originalCurrent = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const originalNext = process.env.QSTASH_NEXT_SIGNING_KEY;

    delete process.env.QSTASH_TOKEN;
    delete process.env.QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.QSTASH_NEXT_SIGNING_KEY;

    let threw = false;
    try {
      await WebhookVerificationService.handleWithQueue(request, {
        platform: 'stripe',
        secret: testSecret,
        queue: true,
        handler: async () => undefined,
      });
    } catch (error) {
      threw = (error as Error).message.includes('queue: true requires QSTASH_TOKEN');
    }

    if (originalToken !== undefined) process.env.QSTASH_TOKEN = originalToken;
    if (originalCurrent !== undefined) process.env.QSTASH_CURRENT_SIGNING_KEY = originalCurrent;
    if (originalNext !== undefined) process.env.QSTASH_NEXT_SIGNING_KEY = originalNext;

    console.log('   ✅ handleWithQueue:', threw ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ handleWithQueue test failed:', error);
  }

  console.log('\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
