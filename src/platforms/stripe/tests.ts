import { StripeVerifier } from './verifier';
import { StripeConfig } from './config';

export class StripeTests {
  public static async runAll(): Promise<boolean> {
    console.log('Running Stripe platform tests...');
    
    const testCases = StripeConfig.getTestCases();
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
      try {
        const request = StripeVerifier.createTestRequest(
          testCase.headers,
          testCase.body
        );
        
        const verifier = new StripeVerifier({
          platform: 'stripe',
          secret: testCase.secret,
          toleranceInSeconds: 300,
          signatureConfig: StripeConfig.getSignatureConfig()
        });
        
        const result = await verifier.verify(request);
        
        if (result.isValid === testCase.expected) {
          console.log(`✅ ${testCase.name} - PASSED`);
          passed++;
        } else {
          console.log(`❌ ${testCase.name} - FAILED (expected ${testCase.expected}, got ${result.isValid})`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${testCase.name} - ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }
    
    console.log(`\nStripe Tests Summary: ${passed} passed, ${failed} failed`);
    return failed === 0;
  }

  public static async runSpecificTest(testName: string): Promise<boolean> {
    const testCases = StripeConfig.getTestCases();
    const testCase = testCases.find(tc => tc.name === testName);
    
    if (!testCase) {
      console.error(`Test case '${testName}' not found`);
      return false;
    }
    
    try {
      const request = StripeVerifier.createTestRequest(
        testCase.headers,
        testCase.body
      );
      
      const verifier = new StripeVerifier({
        platform: 'stripe',
        secret: testCase.secret,
        toleranceInSeconds: 300,
        signatureConfig: StripeConfig.getSignatureConfig()
      });
      
      const result = await verifier.verify(request);
      
      if (result.isValid === testCase.expected) {
        console.log(`✅ ${testCase.name} - PASSED`);
        return true;
      } else {
        console.log(`❌ ${testCase.name} - FAILED (expected ${testCase.expected}, got ${result.isValid})`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} - ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}
