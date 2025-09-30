import { GitHubVerifier } from './verifier';
import { GitHubConfig } from './config';

export class GitHubTests {
  public static async runAll(): Promise<boolean> {
    console.log('Running GitHub platform tests...');
    
    const testCases = GitHubConfig.getTestCases();
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
      try {
        const request = GitHubVerifier.createTestRequest(
          testCase.headers,
          testCase.body
        );
        
        const verifier = new GitHubVerifier({
          platform: 'github',
          secret: testCase.secret,
          toleranceInSeconds: 300,
          signatureConfig: GitHubConfig.getSignatureConfig()
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
    
    console.log(`\nGitHub Tests Summary: ${passed} passed, ${failed} failed`);
    return failed === 0;
  }

  public static async runSpecificTest(testName: string): Promise<boolean> {
    const testCases = GitHubConfig.getTestCases();
    const testCase = testCases.find(tc => tc.name === testName);
    
    if (!testCase) {
      console.error(`Test case '${testName}' not found`);
      return false;
    }
    
    try {
      const request = GitHubVerifier.createTestRequest(
        testCase.headers,
        testCase.body
      );
      
      const verifier = new GitHubVerifier({
        platform: 'github',
        secret: testCase.secret,
        toleranceInSeconds: 300,
        signatureConfig: GitHubConfig.getSignatureConfig()
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
