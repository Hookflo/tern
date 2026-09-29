import { WebhookVerificationService } from '@hookflo/tern';

interface Env {
  STRIPE_WEBHOOK_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' && request.method === 'GET') {
      return Response.json({ status: 'ok', framework: 'cloudflare-workers' });
    }

    if (url.pathname === '/webhooks/stripe' && request.method === 'POST') {
      // Workers use the standard Web API Request — tern works natively.
      const result = await WebhookVerificationService.verifyWithPlatformConfig(
        request,
        'stripe',
        env.STRIPE_WEBHOOK_SECRET,
      );

      if (!result.isValid) {
        console.error('❌ Verification failed:', result.error);
        return Response.json({ error: result.error }, { status: 400 });
      }

      console.log('✅ Verified. Event type:', result.payload?.type);
      return Response.json({ received: true });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
};
