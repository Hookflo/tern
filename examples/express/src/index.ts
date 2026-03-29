import express from 'express';
import { createWebhookMiddleware } from '@hookflo/tern/express';

const app = express();

// ─── CRITICAL ORDER ───────────────────────────────────────────────────────────
// Register the webhook route BEFORE app.use(express.json()).
// If express.json() runs first it consumes the raw body and signature
// verification will always fail — tern cannot recover the original bytes.
// ─────────────────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({ status: 'ok', framework: 'express' });
});

// Recommended: use the tern Express adapter.
// It applies express.raw() semantics internally by reading the raw stream/body
// and attaches the verified payload to req.webhook before calling next().
app.post(
  '/webhooks/stripe',
  createWebhookMiddleware({
    platform: 'stripe',
    secret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  }),
  (req, res) => {
    const event = (req as any).webhook?.payload;
    console.log('✅ Verified. Event type:', event?.type);
    res.json({ received: true });
  },
);

// ── Alternative (no adapter) ──────────────────────────────────────────────────
// If you want to use WebhookVerificationService directly, reconstruct a
// Web API Request from the raw buffer that express.raw() gives you:
//
// import { WebhookVerificationService } from '@hookflo/tern'
//
// app.post(
//   '/webhooks/stripe/raw',
//   express.raw({ type: '*/*' }),          // <-- must come before express.json()
//   async (req, res) => {
//     const webRequest = new Request('https://example.com/webhooks/stripe', {
//       method: 'POST',
//       headers: req.headers as Record<string, string>,
//       body: req.body,                    // Buffer from express.raw()
//     })
//     const result = await WebhookVerificationService.verifyWithPlatformConfig(
//       webRequest,
//       'stripe',
//       process.env.STRIPE_WEBHOOK_SECRET ?? ''
//     )
//     if (!result.isValid) return res.status(400).json({ error: result.error })
//     res.json({ received: true })
//   }
// )
// ─────────────────────────────────────────────────────────────────────────────

// Global JSON parser — AFTER the webhook route
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 3002);
app.listen(port, () =>
  console.log(`🚀 Express running at http://localhost:${port}`),
);
