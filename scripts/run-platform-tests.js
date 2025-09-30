#!/usr/bin/env node

const { platformManager } = require('../dist/index');

async function runPlatformTests() {
  const args = process.argv.slice(2);
  const platform = args[0];
  
  if (!platform) {
    console.log('Usage: node scripts/run-platform-tests.js <platform>');
    console.log('Available platforms:', platformManager.getSupportedPlatforms().join(', '));
    process.exit(1);
  }
  
  if (!platformManager.isPlatformSupported(platform)) {
    console.error(`Platform '${platform}' is not supported`);
    console.log('Available platforms:', platformManager.getSupportedPlatforms().join(', '));
    process.exit(1);
  }
  
  console.log(`Running tests for ${platform}...`);
  
  try {
    const result = await platformManager.runPlatformTests(platform);
    
    if (result) {
      console.log(`✅ All ${platform} tests passed`);
      process.exit(0);
    } else {
      console.log(`❌ Some ${platform} tests failed`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error running ${platform} tests:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runPlatformTests().catch(console.error);
}

module.exports = { runPlatformTests };
