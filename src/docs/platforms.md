Vercel Webhooks

Vercel allows you to trigger webhooks for deployments, domains, projects, and more. This section explains how to configure a webhook and integrate it with Tern.

1. Create a Webhook in Vercel

Go to your Vercel Dashboard: https://vercel.com/dashboard

Select the project you want to create a webhook for.

Navigate to Settings → Git → Webhooks or Settings → Integrations → Webhooks.

Click Create Webhook.

Fill in the details:

URL: Your Tern webhook endpoint, e.g., https://your-app.com/webhooks/vercel

Event: Select the events you want to listen to, e.g.:

deployment.created

deployment.ready

deployment.error

domain.created

domain.deleted

Secret: Generate a signing secret (keep it safe; Tern will use it to verify payloads).

Click Save.

2. Configure Tern to Verify Vercel Webhooks

In Tern, you need to use the vercelHandler and set your webhook secret:

import { vercelHandler } from './src/platforms/vercel';

// Example Express.js handler
app.post('/webhooks/vercel', async (req, res) => {
  const rawBody = await req.text();
  const headers = req.headers as Record<string, string>;
  const secret = process.env.VERCEL_WEBHOOK_SECRET!;

  const isValid = vercelHandler.verifySignature(rawBody, headers, secret);

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = vercelHandler.normalizeEvent(JSON.parse(rawBody), headers);

  console.log('Received Vercel event:', event);

  res.status(200).json({ received: true });
});

3. Supported Event Types

deployment.created – A deployment has started.

deployment.ready – A deployment is ready.

deployment.error – Deployment failed.

domain.created – A domain was added.

domain.deleted – A domain was removed.

4. Testing

Go to the webhook settings in Vercel.

Use the Send Test Event button to trigger an event.

Ensure Tern receives it and verifies the signature correctly.

Invalid signatures should be rejected automatically.