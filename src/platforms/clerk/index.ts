import { WebhookConfig, WebhookVerificationResult } from '../../types';
import { ClerkVerifier } from './verifier';
import { ClerkConfig } from './config';
import { ClerkTests } from './tests';

export class ClerkPlatform {
  private static instance: ClerkPlatform;
  private verifier: ClerkVerifier;

  private constructor() {
    const config = ClerkConfig.getSignatureConfig();
    this.verifier = new ClerkVerifier({
      platform: 'clerk',
      secret: 'whsec_your_clerk_webhook_secret',
      toleranceInSeconds: 300,
      signatureConfig: config
    });
  }

  public static getInstance(): ClerkPlatform {
    if (!ClerkPlatform.instance) {
      ClerkPlatform.instance = new ClerkPlatform();
    }
    return ClerkPlatform.instance;
  }

  public async verify(request: Request, secret: string): Promise<WebhookVerificationResult> {
    // Create a new verifier instance with the provided secret
    const verifier = new ClerkVerifier({
      platform: 'clerk',
      secret,
      toleranceInSeconds: 300,
      signatureConfig: ClerkConfig.getSignatureConfig()
    });

    return verifier.verify(request);
  }

  public getConfig(): WebhookConfig {
    return {
      platform: 'clerk',
      secret: 'whsec_your_clerk_webhook_secret',
      toleranceInSeconds: 300,
      signatureConfig: ClerkConfig.getSignatureConfig()
    };
  }

  public async runTests(): Promise<boolean> {
    return ClerkTests.runAll();
  }

  public getDocumentation(): string {
    return ClerkConfig.getDocumentation();
  }
}

// Export for convenience
export const clerkPlatform = ClerkPlatform.getInstance();
export { ClerkConfig, ClerkVerifier, ClerkTests };
