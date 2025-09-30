import { ClerkVerifier } from './verifier';
import { ClerkConfig } from './config';

export class ClerkTests {
  public static async runAll(): Promise<boolean> {
    console.log('Running Clerk platform tests...');
    
    const testCases = ClerkConfig.getTestCases();
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
      try {
        const request = ClerkVerifier.createTestRequest(
          testCase.headers,
          testCase.body
        );
        
        const verifier = new ClerkVerifier({
          platform: 'clerk',
          secret: testCase.secret,
          toleranceInSeconds: 300,
          signatureConfig: ClerkConfig.getSignatureConfig()
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
    
    console.log(`\nClerk Tests Summary: ${passed} passed, ${failed} failed`);
    return failed === 0;
  }

  public static async runSpecificTest(testName: string): Promise<boolean> {
    const testCases = ClerkConfig.getTestCases();
    const testCase = testCases.find(tc => tc.name === testName);
    
    if (!testCase) {
      console.error(`Test case '${testName}' not found`);
      return false;
    }
    
    try {
      const request = ClerkVerifier.createTestRequest(
        testCase.headers,
        testCase.body
      );
      
      const verifier = new ClerkVerifier({
        platform: 'clerk',
        secret: testCase.secret,
        toleranceInSeconds: 300,
        signatureConfig: ClerkConfig.getSignatureConfig()
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
