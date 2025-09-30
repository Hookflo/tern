# Contributing to Tern

Thank you for your interest in contributing to Tern! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Platform-Specific Development](#platform-specific-development)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Adding New Platforms](#adding-new-platforms)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/tern.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Hookflo/tern.git
cd tern

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Available Scripts

- `npm run build` - Build the TypeScript code
- `npm run dev` - Watch mode for development
- `npm test` - Run all tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

## Platform-Specific Development

Tern is structured to be platform-agnostic and easily extensible. Each platform has its own directory under `src/platforms/` with the following structure:

```
src/platforms/{platform}/
├── index.ts          # Main platform class
├── config.ts         # Platform configuration
├── verifier.ts       # Platform-specific verification logic
└── tests.ts          # Platform-specific tests
```

### Adding a New Platform

1. Create a new directory under `src/platforms/{platform-name}/`
2. Implement the required files following the existing pattern
3. Add the platform to the `PlatformManager` in `src/platforms/manager.ts`
4. Add tests for your platform
5. Update documentation

### Platform Implementation Template

```typescript
// src/platforms/{platform}/index.ts
import { WebhookConfig, WebhookVerificationResult } from '../../types';
import { {Platform}Verifier } from './verifier';
import { {Platform}Config } from './config';
import { {Platform}Tests } from './tests';

export class {Platform}Platform {
  // Implementation following the pattern in existing platforms
}

export const {platform}Platform = {Platform}Platform.getInstance();
export { {Platform}Config, {Platform}Verifier, {Platform}Tests };
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific platform
node dist/test.js --platform=stripe

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

Each platform should have comprehensive tests covering:

- Valid webhook verification
- Invalid signature handling
- Missing headers
- Malformed payloads
- Edge cases specific to the platform

### Test Structure

```typescript
// Example test structure
export class {Platform}Tests {
  public static async runAll(): Promise<boolean> {
    // Run all test cases
  }

  public static async runSpecificTest(testName: string): Promise<boolean> {
    // Run a specific test case
  }
}
```

## Pull Request Process

1. **Fork and Clone**: Fork the repository and clone your fork
2. **Create Branch**: Create a feature branch from `main`
3. **Make Changes**: Implement your changes following the code style
4. **Test**: Ensure all tests pass
5. **Document**: Update documentation if needed
6. **Submit PR**: Create a pull request with a clear description

### PR Guidelines

- **Title**: Use a clear, descriptive title
- **Description**: Explain what the PR does and why
- **Tests**: Ensure all tests pass
- **Documentation**: Update docs if adding new features
- **Breaking Changes**: Clearly mark any breaking changes

### PR Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Added tests for new functionality
- [ ] Updated existing tests

## Checklist
- [ ] Code follows the style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly marked)
```

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use async/await over Promises when possible

### File Organization

- One class per file
- Group related functionality in directories
- Use index files for clean exports
- Keep files under 300 lines when possible

### Naming Conventions

- **Classes**: PascalCase (e.g., `StripeVerifier`)
- **Functions**: camelCase (e.g., `verifyWebhook`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Files**: kebab-case (e.g., `webhook-verifier.ts`)

## Adding New Platforms

### Step-by-Step Guide

1. **Research the Platform**
   - Study the platform's webhook documentation
   - Understand their signature verification method
   - Identify required headers and payload format

2. **Create Platform Structure**
   ```bash
   mkdir src/platforms/{platform-name}
   touch src/platforms/{platform-name}/{index,config,verifier,tests}.ts
   ```

3. **Implement Configuration**
   - Define signature configuration
   - Document platform-specific requirements
   - Create test cases

4. **Implement Verifier**
   - Extend the base `WebhookVerifier` class
   - Implement platform-specific logic
   - Handle edge cases and errors

5. **Write Tests**
   - Test valid scenarios
   - Test invalid scenarios
   - Test edge cases

6. **Update Platform Manager**
   - Add the platform to the manager
   - Update type definitions

7. **Update Documentation**
   - Add platform to README
   - Update examples
   - Add platform-specific documentation

### Platform Requirements

Each platform implementation must:

- Extend `WebhookVerifier` base class
- Implement the `verify` method
- Provide configuration via `getSignatureConfig`
- Include comprehensive tests
- Follow the established patterns

## Documentation

### Code Documentation

- Use JSDoc for all public APIs
- Include examples in comments
- Document complex algorithms
- Explain platform-specific logic

### User Documentation

- Keep README up to date
- Document new features
- Provide clear examples
- Include troubleshooting guides

### API Documentation

- Document all public methods
- Include parameter descriptions
- Provide return type information
- Add usage examples

## Getting Help

- **Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: Check the README and USAGE.md files
- **Examples**: Look at the examples.ts file for usage patterns

## Release Process

1. **Version Bump**: Update version in package.json
2. **Changelog**: Update CHANGELOG.md
3. **Build**: Run `npm run build`
4. **Test**: Ensure all tests pass
5. **Publish**: Run `npm publish`
6. **Tag**: Create a Git tag for the release

## License

By contributing to Tern, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Tern! Your contributions help make webhook verification more secure and accessible for everyone.
