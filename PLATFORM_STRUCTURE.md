# Platform Structure Guide

This document explains the new platform-specific structure of Tern and how it benefits LLM agents and self-healing systems.

## Overview

Tern has been restructured to provide better isolation, modularity, and LLM-friendly organization. Each platform now has its own dedicated folder with all related code, tests, and configuration.

## Directory Structure

```
src/platforms/
├── manager.ts              # Central platform manager
├── stripe/                 # Stripe platform
│   ├── index.ts           # Main platform class
│   ├── config.ts          # Platform configuration
│   ├── verifier.ts        # Platform-specific verification
│   └── tests.ts           # Platform-specific tests
├── github/                 # GitHub platform
│   ├── index.ts
│   ├── config.ts
│   ├── verifier.ts
│   └── tests.ts
├── clerk/                  # Clerk platform
├── supabase/              # Supabase platform
└── dodo-payments/         # Dodo Payments platform
```

## Benefits for LLM Agents

### 1. **Targeted Analysis**
LLM agents can now focus on specific platform folders instead of analyzing the entire codebase. This significantly reduces token consumption and improves accuracy.

**Example**: When a Stripe webhook issue is detected, the agent only needs to examine:
- `src/platforms/stripe/` folder
- Stripe-specific configuration
- Stripe-specific tests

### 2. **Isolated Changes**
Platform-specific changes are contained within their respective folders, making it easier for agents to:
- Understand the scope of changes
- Generate accurate patches
- Test changes without affecting other platforms

### 3. **Clear Dependencies**
Each platform folder contains all necessary files:
- **config.ts**: Platform-specific configuration
- **verifier.ts**: Verification logic
- **tests.ts**: Test cases
- **index.ts**: Main platform interface

### 4. **Consistent Patterns**
All platforms follow the same structure, making it easier for LLM agents to:
- Understand new platforms quickly
- Apply fixes across multiple platforms
- Generate consistent code

## Platform Manager

The `PlatformManager` class provides a unified interface for all platforms:

```typescript
import { platformManager } from '@hookflo/tern';

// Verify a webhook for a specific platform
const result = await platformManager.verify(request, 'stripe', secret);

// Run tests for a specific platform
const testsPassed = await platformManager.runPlatformTests('stripe');

// Get platform configuration
const config = platformManager.getConfig('stripe');

// Get platform documentation
const docs = platformManager.getDocumentation('stripe');
```

## Self-Healing Workflow

### 1. **Issue Detection**
When a webhook verification fails, the system identifies the specific platform.

### 2. **Targeted Analysis**
The LLM agent focuses only on the relevant platform folder:
```
src/platforms/{platform}/
├── config.ts      # Check configuration
├── verifier.ts    # Check verification logic
└── tests.ts       # Run tests
```

### 3. **Change Generation**
The agent generates changes only for the affected platform, reducing:
- Token consumption
- Risk of breaking other platforms
- Complexity of the fix

### 4. **Testing**
The agent can run platform-specific tests:
```bash
npm run test:platform stripe
```

### 5. **Integration Testing**
After platform-specific changes, run all tests to ensure no regressions:
```bash
npm run test:all
```

## Documentation and Analysis

### Automated Documentation Sync
The system automatically fetches and stores platform documentation:

```bash
# Fetch latest documentation
npm run docs:fetch

# Generate diffs between versions
npm run docs:diff

# Analyze changes
npm run docs:analyze
```

### Diff Analysis
The system generates diffs between documentation versions and analyzes them for:
- Security-related changes
- Format changes
- Header changes
- API changes

## Adding New Platforms

### Step 1: Create Platform Structure
```bash
mkdir src/platforms/{platform-name}
touch src/platforms/{platform-name}/{index,config,verifier,tests}.ts
```

### Step 2: Implement Platform Files
Follow the established pattern from existing platforms.

### Step 3: Add to Platform Manager
```typescript
// In src/platforms/manager.ts
this.platforms.set('new-platform', NewPlatformPlatform.getInstance());
```

### Step 4: Add Tests
Implement comprehensive test cases in `tests.ts`.

### Step 5: Update Documentation
Add platform to README and other documentation.

## LLM Agent Guidelines

### When Targeting a Specific Platform:
1. **Focus on the platform folder**: `src/platforms/{platform}/`
2. **Check configuration first**: `config.ts`
3. **Review verification logic**: `verifier.ts`
4. **Run platform tests**: `tests.ts`
5. **Test integration**: Run all tests after changes

### When Adding a New Platform:
1. **Follow the established pattern**
2. **Implement all required files**
3. **Add comprehensive tests**
4. **Update the platform manager**
5. **Update documentation**

### When Fixing Issues:
1. **Identify the affected platform**
2. **Make changes only in that platform's folder**
3. **Run platform-specific tests**
4. **Run integration tests**
5. **Update documentation if needed**

## Benefits Summary

### For LLM Agents:
- **Reduced token consumption**: Focus on specific folders
- **Improved accuracy**: Clear context and scope
- **Faster processing**: Less code to analyze
- **Better isolation**: Changes don't affect other platforms

### For Developers:
- **Clear organization**: Each platform is self-contained
- **Easy maintenance**: Changes are isolated
- **Better testing**: Platform-specific test suites
- **Scalable structure**: Easy to add new platforms

### For Self-Healing Systems:
- **Targeted fixes**: Only affected platforms are modified
- **Reduced risk**: Changes are isolated
- **Better monitoring**: Platform-specific metrics
- **Faster recovery**: Focused analysis and fixes

## Migration from Old Structure

The new structure is backward compatible. Existing code will continue to work:

```typescript
// Old way (still works)
import { WebhookVerificationService } from '@hookflo/tern';
const result = await WebhookVerificationService.verifyWithPlatformConfig(request, 'stripe', secret);

// New way (recommended)
import { platformManager } from '@hookflo/tern';
const result = await platformManager.verify(request, 'stripe', secret);
```

## Conclusion

The new platform structure provides significant benefits for LLM agents and self-healing systems while maintaining backward compatibility. The modular approach reduces complexity, improves maintainability, and enables more efficient automated fixes.
