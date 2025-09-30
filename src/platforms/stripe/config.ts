import { SignatureConfig } from '../../types';

export class StripeConfig {
  public static getSignatureConfig(): SignatureConfig {
    return {
      algorithm: 'hmac-sha256',
      headerName: 'stripe-signature',
      headerFormat: 'comma-separated',
      timestampHeader: 'stripe-signature',
      timestampFormat: 'unix',
      payloadFormat: 'timestamped'
    };
  }

  public static getDocumentation(): string {
    return `
# Stripe Webhook Verification

## Signature Format
Stripe uses HMAC-SHA256 for webhook signature verification.

## Headers
- **stripe-signature**: Contains timestamp and signature in format: t={timestamp},v1={signature}

## Payload Format
The payload is signed as: {timestamp}.{body}

## Configuration
- Algorithm: HMAC-SHA256
- Header: stripe-signature
- Format: t={timestamp},v1={signature}
- Payload: {timestamp}.{body}

## Example
\`\`\`
stripe-signature: t=1234567890,v1=abc123...
\`\`\`
    `;
  }

  public static getTestCases() {
    const testBody = '{"type":"payment_intent.succeeded"}';
    const testSecret = 'whsec_test_secret';
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create proper Stripe signature
    const crypto = require('crypto');
    const signedPayload = `${timestamp}.${testBody}`;
    const hmac = crypto.createHmac('sha256', testSecret);
    hmac.update(signedPayload);
    const signature = hmac.digest('hex');
    const validSignature = `t=${timestamp},v1=${signature}`;
    
    return [
      {
        name: 'Valid Stripe webhook',
        headers: {
          'stripe-signature': validSignature
        },
        body: testBody,
        secret: testSecret,
        expected: true
      },
      {
        name: 'Invalid signature',
        headers: {
          'stripe-signature': 't=1234567890,v1=invalid_signature'
        },
        body: testBody,
        secret: testSecret,
        expected: false
      }
    ];
  }
}
