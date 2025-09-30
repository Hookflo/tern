import { SignatureConfig } from '../../types';

export class DodoPaymentsConfig {
  public static getSignatureConfig(): SignatureConfig {
    return {
      algorithm: 'hmac-sha256',
      headerName: 'webhook-signature',
      headerFormat: 'raw',
      timestampHeader: 'webhook-timestamp',
      timestampFormat: 'unix',
      payloadFormat: 'custom',
      customConfig: {
        payloadFormat: '{id}.{timestamp}.{body}',
        idHeader: 'webhook-id',
        encoding: 'base64'
      }
    };
  }

  public static getDocumentation(): string {
    return `
# Dodo Payments Webhook Verification

## Signature Format
Dodo Payments uses HMAC-SHA256 with base64 encoding for webhook signature verification.

## Headers
- **webhook-signature**: Contains signature in format: v1,{signature}
- **webhook-id**: Webhook ID
- **webhook-timestamp**: Unix timestamp

## Payload Format
The payload is signed as: {id}.{timestamp}.{body}

## Configuration
- Algorithm: HMAC-SHA256
- Header: webhook-signature
- Format: v1,{signature}
- Payload: {id}.{timestamp}.{body}
- Encoding: Base64

## Example
\`\`\`
webhook-signature: v1,abc123def456...
webhook-id: webhook_123
webhook-timestamp: 1234567890
\`\`\`
    `;
  }

  public static getTestCases() {
    const testBody = '{"type":"payment.succeeded"}';
    const testSecret = 'whsec_test_secret';
    const webhookId = 'webhook_123';
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create proper Dodo Payments signature
    const crypto = require('crypto');
    const signedContent = `${webhookId}.${timestamp}.${testBody}`;
    const secretBytes = new Uint8Array(Buffer.from(testSecret.split('_')[1] || testSecret, 'base64'));
    const hmac = crypto.createHmac('sha256', secretBytes);
    hmac.update(signedContent);
    const signature = hmac.digest('base64');
    const validSignature = `v1,${signature}`;
    
    return [
      {
        name: 'Valid Dodo Payments webhook',
        headers: {
          'webhook-signature': validSignature,
          'webhook-id': webhookId,
          'webhook-timestamp': timestamp.toString()
        },
        body: testBody,
        secret: testSecret,
        expected: true
      },
      {
        name: 'Invalid signature',
        headers: {
          'webhook-signature': 'v1,invalid_signature',
          'webhook-id': webhookId,
          'webhook-timestamp': timestamp.toString()
        },
        body: testBody,
        secret: testSecret,
        expected: false
      }
    ];
  }
}
