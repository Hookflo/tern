import { WebhookConfig, WebhookVerificationResult } from '../../types';
import { GenericHMACVerifier } from '../../verifiers/algorithms';
import { GitHubConfig } from './config';

export class GitHubVerifier extends GenericHMACVerifier {
  constructor(config: WebhookConfig) {
    super(
      config.secret,
      config.signatureConfig || GitHubConfig.getSignatureConfig(),
      'github',
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
