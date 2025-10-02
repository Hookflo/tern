import { createHmac, timingSafeEqual } from 'crypto';

export function verifyVercelSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac('sha1', secret);
  hmac.update(body);
  const expected = Buffer.from(hmac.digest('hex'), 'utf-8');
  const received = Buffer.from(signature, 'utf-8');

  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
