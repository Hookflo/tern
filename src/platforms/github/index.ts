import { WebhookConfig, WebhookVerificationResult } from '../../types';
import { GitHubVerifier } from './verifier';
import { GitHubConfig } from './config';
import { GitHubTests } from './tests';

export class GitHubPlatform {
  private static instance: GitHubPlatform;
  private verifier: GitHubVerifier;

  private constructor() {
    const config = GitHubConfig.getSignatureConfig();
    this.verifier = new GitHubVerifier({
      platform: 'github',
      secret: 'your_github_webhook_secret',
      toleranceInSeconds: 300,
      signatureConfig: config
    });
  }

  public static getInstance(): GitHubPlatform {
    if (!GitHubPlatform.instance) {
      GitHubPlatform.instance = new GitHubPlatform();
    }
    return GitHubPlatform.instance;
  }

  public async verify(request: Request, secret: string): Promise<WebhookVerificationResult> {
    // Create a new verifier instance with the provided secret
    const verifier = new GitHubVerifier({
      platform: 'github',
      secret,
      toleranceInSeconds: 300,
      signatureConfig: GitHubConfig.getSignatureConfig()
    });

    return verifier.verify(request);
  }

  public getConfig(): WebhookConfig {
    return {
      platform: 'github',
      secret: 'your_github_webhook_secret',
      toleranceInSeconds: 300,
      signatureConfig: GitHubConfig.getSignatureConfig()
    };
  }

  public async runTests(): Promise<boolean> {
    return GitHubTests.runAll();
  }

  public getDocumentation(): string {
    return GitHubConfig.getDocumentation();
  }
}

// Export for convenience
export const githubPlatform = GitHubPlatform.getInstance();
export { GitHubConfig, GitHubVerifier, GitHubTests };
