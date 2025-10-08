# Contributing to Tern

Thank you for your interest in contributing! Tern is an algorithm-agnostic webhook verification framework. We welcome contributions for new platforms, algorithms, docs, and improvements.

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting Started

- Node.js >= 22 or 20
- pnpm or npm

```bash
# Fork and clone
git clone https://github.com/Hookflo/tern.git
cd tern

# Install deps
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

## Project Structure

- `src/index.ts`: Public API (`WebhookVerificationService`, helpers)
- `src/platforms/algorithms.ts`: Per-platform signature configuration
- `src/verifiers/*`: Algorithm and custom verifiers
- `src/normalization/*`: Provider registries and templates
- `src/utils.ts`: Helpers for platform detection and signatures
- `dist/`: Compiled output

## Development Workflow

- Create a feature branch: `git checkout -b feat/<short-name>`
- Commit with clear messages: `type(scope): short summary`
- Add/Update tests for your changes
- Run `npm run build` and `npm test` before opening a PR

## Coding Standards

- TypeScript strict mode; no `any` unless unavoidable
- Clear naming: descriptive variables and function names
- Early returns; avoid deep nesting
- Keep functions small and focused
- Match existing formatting; prefer multi-line for readability

## Adding a New Platform

There are two ways to support a new platform:

### 1) Algorithm-based configuration (preferred)

Most platforms can be added by defining a `SignatureConfig` in `src/platforms/algorithms.ts`.

Steps:
1. Add an entry to `platformAlgorithmConfigs` with keys:
   - `platform`: the new `WebhookPlatform` key (add to `src/types.ts` if missing)
   - `signatureConfig`: includes `algorithm`, `headerName`, `headerFormat`, optional `timestampHeader` and `timestampFormat`, `payloadFormat`, and optional `customConfig`
   - `description`: short description
2. Ensure detection in `detectPlatformFromHeaders` in `src/utils.ts` if applicable.
3. Exported APIs already work via `WebhookVerificationService.verifyWithPlatformConfig(request, '<platform>', secret)`.

Example snippet:
```ts
// src/platforms/algorithms.ts
platformAlgorithmConfigs.myplatform = {
  platform: 'myplatform',
  signatureConfig: {
    algorithm: 'hmac-sha256',
    headerName: 'x-myplatform-signature',
    headerFormat: 'raw',
    timestampHeader: 'x-myplatform-timestamp',
    timestampFormat: 'unix',
    payloadFormat: 'timestamped',
  },
  description: 'MyPlatform webhooks use HMAC-SHA256',
};
```

### 2) Custom verifier (only for special cases)

If the platform requires special handling beyond `SignatureConfig` (e.g., token-based or asymmetric keys), implement or extend a custom verifier in `src/verifiers/custom-algorithms.ts` and wire it via `algorithm: 'custom'` with `customConfig` fields.

## Testing Your Integration

We support testing at multiple levels.

### Unit tests

- Add tests under `src/**` or test files referenced by `npm test` (see `package.json`).
- Prefer table-driven tests for multiple signature cases.

### Platform simulation: triggering events

To test end-to-end verification, simulate a real webhook request:

1. Build a raw HTTP request with headers and body matching your platform:
   - Set the signature headers (e.g., `stripe-signature`, `x-hub-signature-256`, `svix-*`, etc.)
   - If timestamped payload is used, create payload as `{timestamp}.{body}` or the configured `customConfig.payloadFormat`.
2. Generate the expected signature using your `secret` and configured `algorithm`:
   - For HMAC algorithms, compute HMAC over the payload string
   - For token-based platforms, set headers `x-webhook-id` and `x-webhook-token`
3. Call the API:
```ts
import { WebhookVerificationService } from './src';

const result = await WebhookVerificationService.verifyWithPlatformConfig(
  request, // a Request object with headers/body
  'myplatform',
  'my_secret',
  300,
);
```
4. Assert `result.isValid === true` and validate `result.payload` and `metadata`.

### CLI/test scripts

- `npm test` runs the suite.
- For selective testing, add a script like `npm run test:platform myplatform` and wire it in tests.

### Examples

See `src/examples.ts` and README examples for request construction and verification calls. Also check `dist/` for compiled signatures of the public API to confirm outputs.

## Documentation

- Update `README.md` sections: Supported Platforms, examples if applicable.
- Add notes to `USAGE.md` for any new advanced configuration fields.

## Submitting a Pull Request

- Ensure all CI checks are green
- Include tests and documentation updates
- Keep PR focused and well-scoped
- Link related issues
- Fill out the PR template

## Reporting Vulnerabilities

Please follow our [Security Policy](./SECURITY.md) to report vulnerabilities responsibly.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
