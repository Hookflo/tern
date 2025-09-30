import { WebhookConfig, WebhookVerificationResult } from '../../types';
import { StripeVerifier } from './verifier';
import { StripeConfig } from './config';
import { StripeTests } from './tests';

export class StripePlatform {
  private static instance: StripePlatform;
  private verifier: StripeVerifier;

  private constructor() {
    const config = StripeConfig.getSignatureConfig();
    this.verifier = new StripeVerifier({
      platform: 'stripe',
      secret: 'whsec_your_stripe_webhook_secret',
      toleranceInSeconds: 300,
      signatureConfig: config
    });
  }

  public static getInstance(): StripePlatform {
    if (!StripePlatform.instance) {
      StripePlatform.instance = new StripePlatform();
    }
    return StripePlatform.instance;
  }

  public async verify(request: Request, secret: string): Promise<WebhookVerificationResult> {
    // Create a new verifier instance with the provided secret
    const verifier = new StripeVerifier({
      platform: 'stripe',
      secret,
      toleranceInSeconds: 300,
      signatureConfig: StripeConfig.getSignatureConfig()
    });

    return verifier.verify(request);
  }

  public getConfig(): WebhookConfig {
    return {
      platform: 'stripe',
      secret: 'whsec_your_stripe_webhook_secret',
      toleranceInSeconds: 300,
      signatureConfig: StripeConfig.getSignatureConfig()
    };
  }

  public async runTests(): Promise<boolean> {
    return StripeTests.runAll();
  }

  public getDocumentation(): string {
    return StripeConfig.getDocumentation();
  }
}

// Export for convenience
export const stripePlatform = StripePlatform.getInstance();
export { StripeConfig, StripeVerifier, StripeTests };
