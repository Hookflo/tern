import { SignatureConfig } from '../../types';

export class GitHubConfig {
  public static getSignatureConfig(): SignatureConfig {
    return {
      algorithm: 'hmac-sha256',
      headerName: 'x-hub-signature-256',
      headerFormat: 'prefixed',
      prefix: 'sha256=',
      payloadFormat: 'raw'
    };
  }

  public static getDocumentation(): string {
    return `
# GitHub Webhook Verification

## Signature Format
GitHub uses HMAC-SHA256 for webhook signature verification.

## Headers
- **x-hub-signature-256**: Contains signature in format: sha256={signature}

## Payload Format
The payload is signed as raw body content.

## Configuration
- Algorithm: HMAC-SHA256
- Header: x-hub-signature-256
- Format: sha256={signature}
- Payload: Raw body

## Example
\`\`\`
x-hub-signature-256: sha256=abc123def456...
\`\`\`
    `;
  }

  public static getTestCases() {
    const testBody = '{"ref":"refs/heads/main","repository":{"name":"test-repo"}}';
    const testSecret = 'github_test_secret';
    
    // Create proper GitHub signature
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', testSecret);
    hmac.update(testBody);
    const signature = hmac.digest('hex');
    const validSignature = `sha256=${signature}`;
    
    return [
      {
        name: 'Valid GitHub webhook',
        headers: {
          'x-hub-signature-256': validSignature
        },
        body: testBody,
        secret: testSecret,
        expected: true
      },
      {
        name: 'Invalid signature',
        headers: {
          'x-hub-signature-256': 'sha256=invalid_signature'
        },
        body: testBody,
        secret: testSecret,
        expected: false
      }
    ];
  }
}
