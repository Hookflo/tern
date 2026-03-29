import { createWebhookHandler } from '@hookflo/tern/nextjs';

// createWebhookHandler wraps the App Router POST export.
// It reads the raw body correctly — no need to call req.json() yourself.
export const POST = createWebhookHandler({
  platform: 'stripe',
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
  handler: async (payload) => {
    console.log('✅ Verified. Event type:', payload?.type);
    // Return value is sent as JSON with status 200
    return { received: true };
  },
});
