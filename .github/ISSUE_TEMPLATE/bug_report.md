---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: ['bug']
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

A clear and concise description of what actually happened.

## Environment

- **Platform**: [e.g., Stripe, GitHub, Clerk, Supabase, Dodo Payments]
- **Node.js Version**: [e.g., 16.0.0]
- **Tern Version**: [e.g., 1.0.6]
- **Operating System**: [e.g., macOS, Windows, Linux]

## Code Example

```typescript
// Please provide a minimal code example that reproduces the issue
import { WebhookVerificationService } from '@hookflo/tern';

const result = await WebhookVerificationService.verifyWithPlatformConfig(
  request,
  'stripe',
  'whsec_your_secret'
);
```

## Error Messages

```
// Please paste any error messages or stack traces here
```

## Additional Context

Add any other context about the problem here, such as:
- Webhook payload structure
- Headers being sent
- Any custom configuration

## Screenshots

If applicable, add screenshots to help explain your problem.

## Checklist

- [ ] I have searched existing issues to avoid duplicates
- [ ] I have provided all the requested information
- [ ] I can reproduce this issue consistently
- [ ] This is not a configuration issue
