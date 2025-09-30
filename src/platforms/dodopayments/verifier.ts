import { WebhookConfig, WebhookVerificationResult } from '../../types';
import { GenericHMACVerifier } from '../../verifiers/algorithms';
import { DodoPaymentsConfig } from './config';

export class DodoPaymentsVerifier extends GenericHMACVerifier {
  constructor(config: WebhookConfig) {
    super(
      config.secret,
      config.signatureConfig || DodoPaymentsConfig.getSignatureConfig(),
      'dodopayments',
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
