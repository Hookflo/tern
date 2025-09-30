import { WebhookConfig, WebhookVerificationResult } from '../../types';
import { GenericHMACVerifier } from '../../verifiers/algorithms';
import { StripeConfig } from './config';

export class StripeVerifier extends GenericHMACVerifier {
  constructor(config: WebhookConfig) {
    super(
      config.secret,
      config.signatureConfig || StripeConfig.getSignatureConfig(),
      'stripe',
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
