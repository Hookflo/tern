import { WebhookConfig, WebhookVerificationResult } from '../types';
import { StripePlatform } from './stripe';
import { GitHubPlatform } from './github';
import { ClerkPlatform } from './clerk';
import { DodoPaymentsPlatform } from './dodopayments';

export type PlatformName = 'stripe' | 'github' | 'clerk' | 'supabase' | 'dodopayments';

export class PlatformManager {
  private static instance: PlatformManager;
  private platforms: Map<PlatformName, any> = new Map();

  private constructor() {
    this.initializePlatforms();
  }

  public static getInstance(): PlatformManager {
    if (!PlatformManager.instance) {
      PlatformManager.instance = new PlatformManager();
    }
    return PlatformManager.instance;
  }

  private initializePlatforms(): void {
    this.platforms.set('stripe', StripePlatform.getInstance());
    this.platforms.set('github', GitHubPlatform.getInstance());
    this.platforms.set('clerk', ClerkPlatform.getInstance());
    this.platforms.set('dodopayments', DodoPaymentsPlatform.getInstance());
    // Add other platforms as they are implemented
  }

  public async verify(request: Request, platform: PlatformName, secret: string): Promise<WebhookVerificationResult> {
    const platformInstance = this.platforms.get(platform);
    
    if (!platformInstance) {
      return {
        isValid: false,
        error: `Platform '${platform}' is not supported`,
        platform
      };
    }

    return platformInstance.verify(request, secret);
  }

  public getConfig(platform: PlatformName): WebhookConfig | null {
    const platformInstance = this.platforms.get(platform);
    
    if (!platformInstance) {
      return null;
    }

    return platformInstance.getConfig();
  }

  public async runPlatformTests(platform: PlatformName): Promise<boolean> {
    const platformInstance = this.platforms.get(platform);
    
    if (!platformInstance) {
      console.error(`Platform '${platform}' is not supported`);
      return false;
    }

    return platformInstance.runTests();
  }

  public async runAllTests(): Promise<boolean> {
    console.log('Running all platform tests...');
    
    let allPassed = true;
    
    for (const [platformName, platformInstance] of this.platforms) {
      console.log(`\nTesting ${platformName}...`);
      const passed = await platformInstance.runTests();
      
      if (!passed) {
        allPassed = false;
      }
    }
    
    console.log(`\nAll Platform Tests Summary: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
    return allPassed;
  }

  public getDocumentation(platform: PlatformName): string | null {
    const platformInstance = this.platforms.get(platform);
    
    if (!platformInstance) {
      return null;
    }

    return platformInstance.getDocumentation();
  }

  public getSupportedPlatforms(): PlatformName[] {
    return Array.from(this.platforms.keys());
  }

  public isPlatformSupported(platform: PlatformName): boolean {
    return this.platforms.has(platform);
  }
}

// Export for convenience
export const platformManager = PlatformManager.getInstance();
