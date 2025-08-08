import { WebhookVerificationService } from './index';
import { detectPlatformFromHeaders, cleanHeaders } from './utils';
// Mock request for testing
function createMockRequest(
  headers: Record<string, string>,
  body: string = '{"test": "data"}',
): Request {
  return new Request('http://localhost/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

// Test GitHub webhook
async function testGitHubWebhook() {
  console.log('Testing GitHub webhook...');

  const request = createMockRequest({
    'x-hub-signature-256': 'sha256=abc123',
    'content-type': 'application/json',
  });

  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    request,
    'github',
    'test-secret',
    300,
  );

  console.log('GitHub result:', result);
  return result;
}

// Test token-based webhook (Supabase style)
async function testTokenBasedWebhook() {
  console.log('Testing token-based webhook...');

  const request = createMockRequest({
    'x-webhook-id': 'test-webhook-id',
    'x-webhook-token': 'test-webhook-token',
    'content-type': 'application/json',
  });

  const result = await WebhookVerificationService.verifyTokenBased(
    request,
    'test-webhook-id',
    'test-webhook-token',
  );

  console.log('Token-based result:', result);
  return result;
}

// Test platform detection
function testPlatformDetection() {
  console.log('Testing platform detection...');

  const testCases = [
    {
      name: 'GitHub',
      headers: { 'x-hub-signature-256': 'sha256=abc123' },
    },
    {
      name: 'Stripe',
      headers: { 'stripe-signature': 't=1234567890,v1=abc123' },
    },
    {
      name: 'Clerk',
      headers: { 'svix-signature': 'v1,abc123' },
    },
    {
      name: 'Supabase',
      headers: { 'x-webhook-token': 'token123' },
    },
  ];

  for (const testCase of testCases) {
    const request = createMockRequest(cleanHeaders(testCase.headers));
    const detectedPlatform = detectPlatformFromHeaders(request.headers);
    console.log(`${testCase.name}: ${detectedPlatform}`);
  }
}

// Test custom signature configuration
async function testCustomSignature() {
  console.log('Testing custom signature...');

  const request = createMockRequest({
    'x-custom-signature': 'sha256=abc123',
    'content-type': 'application/json',
  });

  const result = await WebhookVerificationService.verify(request, {
    platform: 'custom',
    secret: 'custom-secret',
    signatureConfig: {
      algorithm: 'hmac-sha256',
      headerName: 'x-custom-signature',
      headerFormat: 'prefixed',
      prefix: 'sha256=',
      payloadFormat: 'raw',
    },
  });

  console.log('Custom signature result:', result);
  return result;
}

// Run all tests
export async function runAllTests() {
  console.log('🚀 Running Webhook Verifier Tests\n');

  try {
    await testGitHubWebhook();
    await testTokenBasedWebhook();
    testPlatformDetection();
    await testCustomSignature();

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Export for use in other files
export {
  testGitHubWebhook,
  testTokenBasedWebhook,
  testPlatformDetection,
  testCustomSignature,
};
