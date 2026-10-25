import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { WebhookVerificationService } from '@hookflo/tern';

const app = new Hono();

app.get('/', (c) => c.json({ status: 'ok', framework: 'hono' }));

app.post('/webhooks/stripe', async (c) => {
  // IMPORTANT: pass c.req.raw — the native Web API Request object.
  // Never call c.req.json() or c.req.text() before this; it consumes the stream.
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    c.req.raw,
    'stripe',
    process.env.STRIPE_WEBHOOK_SECRET ?? '',
  );

  if (!result.isValid) {
    console.error('❌ Verification failed:', result.error);
    return c.json({ error: result.error }, 400);
  }

  console.log('✅ Verified. Event type:', result.payload?.type);
  return c.json({ received: true });
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () =>
  console.log(`🚀 Hono running at http://localhost:${port}`),
);
