import { createHmac } from 'crypto';
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

    console.log('   ✅ Stripe:', stripeResult.isValid ? 'PASSED' : 'FAILED');
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

  // Test 5: Token-based (Supabase)
  console.log('\n5. Testing Token-based Authentication...');
  try {
    const webhookId = 'test-webhook-id';
    const webhookToken = 'test-webhook-token';

    const tokenRequest = createMockRequest({
      'x-webhook-id': webhookId,
      'x-webhook-token': webhookToken,
      'content-type': 'application/json',
    });

    const tokenResult = await WebhookVerificationService.verifyTokenBased(
      tokenRequest,
      webhookId,
      webhookToken,
    );

    console.log('   ✅ Token-based:', tokenResult.isValid ? 'PASSED' : 'FAILED');
    if (!tokenResult.isValid) {
      console.log('   ❌ Error:', tokenResult.error);
    }
  } catch (error) {
    console.log('   ❌ Token-based test failed:', error);
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

  // Test 13: Semantic normalization with manual fallback
  console.log('\n13. Testing semantic normalization fallback...');
  try {
    const semanticStripeBody = JSON.stringify({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_789',
          billing_details: {
            email: 'buyer@example.com',
          },
        },
      },
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const stripeSignature = createStripeSignature(semanticStripeBody, testSecret, timestamp);

    const request = createMockRequest(
      {
        'stripe-signature': stripeSignature,
        'content-type': 'application/json',
      },
      semanticStripeBody,
    );

    const result = await WebhookVerificationService.verifyWithPlatformConfig(
      request,
      'stripe',
      testSecret,
      300,
      {
        semantic: {
          fields: {
            customer_email: {
              description: 'email of the paying customer',
              fallback: 'data.object.billing_details.email',
            },
          },
        },
      },
    );

    const payload = result.payload as Record<string, any>;
    const semanticEmail = payload._semantic?.fields?.customer_email;
    const semanticSource = payload._semantic?.meta?.customer_email?.source;
    const passed = result.isValid && semanticEmail === 'buyer@example.com' && semanticSource === 'manual';

    console.log('   ✅ Semantic fallback:', passed ? 'PASSED' : 'FAILED');
  } catch (error) {
    console.log('   ❌ Semantic fallback test failed:', error);
  }

  console.log('\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
