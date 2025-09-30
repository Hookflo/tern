import { WebhookConfig, WebhookVerificationResult } from '../../types';
import { GenericHMACVerifier } from '../../verifiers/algorithms';
import { ClerkConfig } from './config';

export class ClerkVerifier extends GenericHMACVerifier {
  constructor(config: WebhookConfig) {
    super(
      config.secret,
      config.signatureConfig || ClerkConfig.getSignatureConfig(),
      'clerk',
      config.toleranceInSeconds
    );
  }

  public static createTestRequest(headers: Record<string, string>, body: string): Request {
    return new Request('https://example.com/webhook', {
      method: 'POST',
      headers,
      body
    });
  }
}
