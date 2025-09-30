#!/usr/bin/env node

const { platformManager } = require('../dist/index');

async function runAllPlatformTests() {
  console.log('Running all platform tests...\n');
  
  try {
    const result = await platformManager.runAllTests();
    
    if (result) {
      console.log('\n✅ All platform tests passed');
      process.exit(0);
    } else {
      console.log('\n❌ Some platform tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running platform tests:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllPlatformTests().catch(console.error);
}

module.exports = { runAllPlatformTests };
