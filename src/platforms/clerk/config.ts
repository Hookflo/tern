import { SignatureConfig } from '../../types';

export class ClerkConfig {
  public static getSignatureConfig(): SignatureConfig {
    return {
      algorithm: 'hmac-sha256',
      headerName: 'svix-signature',
      headerFormat: 'raw',
      timestampHeader: 'svix-timestamp',
      timestampFormat: 'unix',
      payloadFormat: 'custom',
      customConfig: {
        payloadFormat: '{id}.{timestamp}.{body}',
        idHeader: 'svix-id',
        encoding: 'base64'
      }
    };
  }

  public static getDocumentation(): string {
    return `
# Clerk Webhook Verification

## Signature Format
Clerk uses HMAC-SHA256 with base64 encoding for webhook signature verification.

## Headers
- **svix-signature**: Contains signature in format: v1,{signature}
- **svix-id**: Webhook ID
- **svix-timestamp**: Unix timestamp

## Payload Format
The payload is signed as: {id}.{timestamp}.{body}

## Configuration
- Algorithm: HMAC-SHA256
- Header: svix-signature
- Format: v1,{signature}
- Payload: {id}.{timestamp}.{body}
- Encoding: Base64

## Example
\`\`\`
svix-signature: v1,abc123def456...
svix-id: webhook_123
svix-timestamp: 1234567890
\`\`\`
    `;
  }

  public static getTestCases() {
    const testBody = '{"type":"user.created"}';
    const testSecret = 'whsec_test_secret';
    const webhookId = 'webhook_123';
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create proper Clerk signature
    const crypto = require('crypto');
    const signedContent = `${webhookId}.${timestamp}.${testBody}`;
    const secretBytes = new Uint8Array(Buffer.from(testSecret.split('_')[1] || testSecret, 'base64'));
    const hmac = crypto.createHmac('sha256', secretBytes);
    hmac.update(signedContent);
    const signature = hmac.digest('base64');
    const validSignature = `v1,${signature}`;
    
    return [
      {
        name: 'Valid Clerk webhook',
        headers: {
          'svix-signature': validSignature,
          'svix-id': webhookId,
          'svix-timestamp': timestamp.toString()
        },
        body: testBody,
        secret: testSecret,
        expected: true
      },
      {
        name: 'Invalid signature',
        headers: {
          'svix-signature': 'v1,invalid_signature',
          'svix-id': webhookId,
          'svix-timestamp': timestamp.toString()
        },
        body: testBody,
        secret: testSecret,
        expected: false
      }
    ];
  }
}
