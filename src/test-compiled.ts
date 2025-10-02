import { runTests } from './test';

runTests().catch((err) => {
  console.error('❌ runTests() failed:', err);
});
