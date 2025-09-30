import { WebhookConfig, WebhookVerificationResult } from '../../types';
import { DodoPaymentsVerifier } from './verifier';
import { DodoPaymentsConfig } from './config';
import { DodoPaymentsTests } from './tests';

export class DodoPaymentsPlatform {
  private static instance: DodoPaymentsPlatform;
  private verifier: DodoPaymentsVerifier;

  private constructor() {
    const config = DodoPaymentsConfig.getSignatureConfig();
    this.verifier = new DodoPaymentsVerifier({
      platform: 'dodopayments',
      secret: 'whsec_your_dodo_webhook_secret',
      toleranceInSeconds: 300,
      signatureConfig: config
    });
  }

  public static getInstance(): DodoPaymentsPlatform {
    if (!DodoPaymentsPlatform.instance) {
      DodoPaymentsPlatform.instance = new DodoPaymentsPlatform();
    }
    return DodoPaymentsPlatform.instance;
  }

  public async verify(request: Request, secret: string): Promise<WebhookVerificationResult> {
    // Create a new verifier instance with the provided secret
    const verifier = new DodoPaymentsVerifier({
      platform: 'dodopayments',
      secret,
      toleranceInSeconds: 300,
      signatureConfig: DodoPaymentsConfig.getSignatureConfig()
    });

    return verifier.verify(request);
  }

  public getConfig(): WebhookConfig {
    return {
      platform: 'dodopayments',
      secret: 'whsec_your_dodo_webhook_secret',
      toleranceInSeconds: 300,
      signatureConfig: DodoPaymentsConfig.getSignatureConfig()
    };
  }

  public async runTests(): Promise<boolean> {
    return DodoPaymentsTests.runAll();
  }

  public getDocumentation(): string {
    return DodoPaymentsConfig.getDocumentation();
  }
}

// Export for convenience
export const dodoPaymentsPlatform = DodoPaymentsPlatform.getInstance();
export { DodoPaymentsConfig, DodoPaymentsVerifier, DodoPaymentsTests };
