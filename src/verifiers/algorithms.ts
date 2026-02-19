import {
  createHmac,
  createHash,
  createPublicKey,
  verify as verifySignature,
} from 'crypto';
import { WebhookVerifier } from './base';
import {
  WebhookVerificationResult,
  SignatureConfig,
  WebhookPlatform,
} from '../types';

const ed25519KeyCache = new Map<string, string>();

export abstract class AlgorithmBasedVerifier extends WebhookVerifier {
  protected config: SignatureConfig;

  protected platform: WebhookPlatform;

  constructor(
    secret: string,
    config: SignatureConfig,
    platform: WebhookPlatform,
    toleranceInSeconds: number = 300,
  ) {
    super(secret, toleranceInSeconds);
    this.config = config;
    this.platform = platform;
  }

  abstract verify(request: Request): Promise<WebhookVerificationResult>;

  protected parseDelimitedHeader(headerValue: string): Record<string, string> {
    const parts = headerValue.split(/[;,]/);
    const values: Record<string, string> = {};

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) continue;

      const key = trimmed.slice(0, equalIndex).trim();
      const value = trimmed.slice(equalIndex + 1).trim();
      if (key && value) {
        values[key] = value;
      }
    }

    return values;
  }

  protected extractSignature(request: Request): string | null {
    const headerValue = request.headers.get(this.config.headerName);
    if (!headerValue) return null;

    switch (this.config.headerFormat) {
      case 'prefixed':
        return headerValue;
      case 'comma-separated': {
        const sigMap = this.parseDelimitedHeader(headerValue);
        const signatureKey = this.config.customConfig?.signatureKey || 'v1';
        return sigMap[signatureKey] || sigMap.signature || sigMap.v1 || null;
      }
      case 'raw':
      default:
        if (this.config.customConfig?.signatureFormat?.includes('v1=')) {
          const signatures = headerValue.split(' ');
          for (const sig of signatures) {
            const [version, signature] = sig.split(',');
            if (version === 'v1') {
              return signature;
            }
          }
          return null;
        }
        return headerValue;
    }
  }

  protected extractTimestamp(request: Request): number | null {
    if (!this.config.timestampHeader) return null;

    const timestampHeader = request.headers.get(this.config.timestampHeader);
    if (!timestampHeader) return null;

    switch (this.config.timestampFormat) {
      case 'unix':
        return parseInt(timestampHeader, 10);
      case 'iso':
        return Math.floor(new Date(timestampHeader).getTime() / 1000);
      case 'custom':
        return parseInt(timestampHeader, 10);
      default:
        return parseInt(timestampHeader, 10);
    }
  }

  protected extractTimestampFromSignature(request: Request): number | null {
    if (this.config.headerFormat !== 'comma-separated') {
      return null;
    }

    const headerValue = request.headers.get(this.config.headerName);
    if (!headerValue) return null;

    const sigMap = this.parseDelimitedHeader(headerValue);
    const timestampKey = this.config.customConfig?.timestampKey || 't';
    return sigMap[timestampKey] ? parseInt(sigMap[timestampKey], 10) : null;
  }

  protected formatPayload(rawBody: string, request: Request): string {
    switch (this.config.payloadFormat) {
      case 'timestamped': {
        const timestamp = this.extractTimestampFromSignature(request)
          || this.extractTimestamp(request);
        return timestamp ? `${timestamp}.${rawBody}` : rawBody;
      }
      case 'custom':
        return this.formatCustomPayload(rawBody, request);
      case 'raw':
      default:
        return rawBody;
    }
  }

  protected formatCustomPayload(rawBody: string, request: Request): string {
    if (!this.config.customConfig?.payloadFormat) {
      return rawBody;
    }

    const customFormat = this.config.customConfig.payloadFormat;

    if (customFormat.includes('{id}') && customFormat.includes('{timestamp}')) {
      const id = request.headers.get(
        this.config.customConfig.idHeader || 'x-webhook-id',
      );
      const timestamp = request.headers.get(
        this.config.timestampHeader || 'x-webhook-timestamp',
      );
      return customFormat
        .replace('{id}', id || '')
        .replace('{timestamp}', timestamp || '')
        .replace('{body}', rawBody);
    }

    if (
      customFormat.includes('{timestamp}')
      && customFormat.includes('{body}')
    ) {
      const timestamp = this.extractTimestampFromSignature(request)
        || this.extractTimestamp(request);
      return customFormat
        .replace('{timestamp}', timestamp?.toString() || '')
        .replace('{body}', rawBody);
    }

    return rawBody;
  }

  protected verifyHMAC(
    payload: string,
    signature: string,
    algorithm: string = 'sha256',
  ): boolean {
    const hmac = createHmac(algorithm, this.secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    return this.safeCompare(signature, expectedSignature);
  }

  protected verifyHMACWithPrefix(
    payload: string,
    signature: string,
    algorithm: string = 'sha256',
  ): boolean {
    const hmac = createHmac(algorithm, this.secret);
    hmac.update(payload);
    const expectedSignature = `${this.config.prefix || ''}${hmac.digest(
      'hex',
    )}`;

    return this.safeCompare(signature, expectedSignature);
  }

  protected verifyHMACWithBase64(
    payload: string,
    signature: string,
    algorithm: string = 'sha256',
  ): boolean {
    const secretEncoding = this.config.customConfig?.secretEncoding || 'base64';

    let secretMaterial: string | Uint8Array = this.secret;
    if (secretEncoding === 'base64') {
      const base64Secret = this.secret.includes('_')
        ? this.secret.split('_').slice(1).join('_')
        : this.secret;
      secretMaterial = new Uint8Array(Buffer.from(base64Secret, 'base64'));
    }

    const hmac = createHmac(algorithm, secretMaterial);
    hmac.update(payload);
    const expectedSignature = hmac.digest('base64');

    return this.safeCompare(signature, expectedSignature);
  }

  protected extractMetadata(request: Request): Record<string, any> {
    const metadata: Record<string, any> = {
      algorithm: this.config.algorithm,
    };

    const timestamp = this.extractTimestamp(request) || this.extractTimestampFromSignature(request);
    if (timestamp) {
      metadata.timestamp = timestamp.toString();
    }

    switch (this.platform) {
      case 'github':
        metadata.event = request.headers.get('x-github-event');
        metadata.delivery = request.headers.get('x-github-delivery');
        break;
      case 'stripe': {
        const headerValue = request.headers.get(this.config.headerName);
        if (headerValue && this.config.headerFormat === 'comma-separated') {
          const sigMap = this.parseDelimitedHeader(headerValue);
          metadata.id = sigMap.id;
        }
        break;
      }
      case 'clerk':
      case 'dodopayments':
      case 'replicateai':
        metadata.id = request.headers.get(this.config.customConfig?.idHeader || 'webhook-id');
        break;
      case 'workos':
        metadata.id = request.headers.get(this.config.customConfig?.idHeader || 'webhook-id');
        break;
      default:
        break;
    }

    return metadata;
  }
}

export class GenericHMACVerifier extends AlgorithmBasedVerifier {
  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const signature = this.extractSignature(request);
      if (!signature) {
        return {
          isValid: false,
          error: `Missing signature header: ${this.config.headerName}`,
          errorCode: 'MISSING_SIGNATURE',
          platform: this.platform,
        };
      }

      const rawBody = await request.text();

      let timestamp: number | null = null;
      if (this.config.headerFormat === 'comma-separated') {
        timestamp = this.extractTimestampFromSignature(request);
      } else {
        timestamp = this.extractTimestamp(request);
      }

      if (timestamp && !this.isTimestampValid(timestamp)) {
        return {
          isValid: false,
          error: 'Webhook timestamp expired',
          errorCode: 'TIMESTAMP_EXPIRED',
          platform: this.platform,
        };
      }

      const payload = this.formatPayload(rawBody, request);

      let isValid = false;
      const algorithm = this.config.algorithm.replace('hmac-', '');

      if (this.config.customConfig?.encoding === 'base64') {
        isValid = this.verifyHMACWithBase64(payload, signature, algorithm);
      } else if (this.config.headerFormat === 'prefixed') {
        isValid = this.verifyHMACWithPrefix(payload, signature, algorithm);
      } else {
        isValid = this.verifyHMAC(payload, signature, algorithm);
      }

      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid signature',
          errorCode: 'INVALID_SIGNATURE',
          platform: this.platform,
        };
      }

      let parsedPayload;
      try {
        parsedPayload = JSON.parse(rawBody);
      } catch (e) {
        parsedPayload = rawBody;
      }

      const metadata = this.extractMetadata(request);

      return {
        isValid: true,
        platform: this.platform,
        payload: parsedPayload,
        metadata,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `${this.platform} verification error: ${(error as Error).message}`,
        errorCode: 'VERIFICATION_ERROR',
        platform: this.platform,
      };
    }
  }
}

export class Ed25519Verifier extends AlgorithmBasedVerifier {
  private async resolvePublicKey(request: Request): Promise<string | null> {
    const configPublicKey = this.config.customConfig?.publicKey as string | undefined;
    if (configPublicKey) {
      return configPublicKey;
    }

    if (this.secret && this.secret.trim().length > 0) {
      return this.secret;
    }

    const jwksUrl = this.config.customConfig?.jwksUrl as string | undefined;
    const kidHeader = this.config.customConfig?.kidHeader as string | undefined;
    const kid = kidHeader ? request.headers.get(kidHeader) : null;

    if (!jwksUrl || !kid) {
      return null;
    }

    const cacheKey = `${jwksUrl}:${kid}`;
    if (ed25519KeyCache.has(cacheKey)) {
      return ed25519KeyCache.get(cacheKey) as string;
    }

    const response = await fetch(jwksUrl);
    if (!response.ok) {
      return null;
    }

    const body = await response.json() as { keys?: Array<Record<string, string>> };
    const key = body.keys?.find((entry) => entry.kid === kid);
    if (!key) {
      return null;
    }

    const keyObject = createPublicKey({ key, format: 'jwk' });
    const pem = keyObject.export({ type: 'spki', format: 'pem' }).toString();
    ed25519KeyCache.set(cacheKey, pem);
    return pem;
  }

  private buildFalPayload(rawBody: string, request: Request): string {
    const requestIdHeader = this.config.customConfig?.requestIdHeader || 'x-fal-request-id';
    const userIdHeader = this.config.customConfig?.userIdHeader || 'x-fal-user-id';
    const timestampHeader = this.config.customConfig?.timestampHeader || 'x-fal-webhook-timestamp';

    const requestId = request.headers.get(requestIdHeader) || '';
    const userId = request.headers.get(userIdHeader) || '';
    const timestamp = request.headers.get(timestampHeader) || '';
    const bodyHash = createHash('sha256').update(rawBody).digest('hex');

    return `${requestId}.${userId}.${timestamp}.${bodyHash}`;
  }

  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const signature = this.extractSignature(request);
      if (!signature) {
        return {
          isValid: false,
          error: `Missing signature header: ${this.config.headerName}`,
          errorCode: 'MISSING_SIGNATURE',
          platform: this.platform,
        };
      }

      const rawBody = await request.text();
      const payload = this.platform === 'falai'
        ? this.buildFalPayload(rawBody, request)
        : this.formatPayload(rawBody, request);

      const publicKey = await this.resolvePublicKey(request);
      if (!publicKey) {
        return {
          isValid: false,
          error: 'Missing public key for ED25519 verification',
          errorCode: 'VERIFICATION_ERROR',
          platform: this.platform,
        };
      }

      const signatureBytes = new Uint8Array(Buffer.from(signature, 'base64'));
      const keyObject = createPublicKey(publicKey);
      const payloadBytes = new Uint8Array(Buffer.from(payload));
      const isValid = verifySignature(null, payloadBytes, keyObject, signatureBytes);

      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid signature',
          errorCode: 'INVALID_SIGNATURE',
          platform: this.platform,
        };
      }

      let parsedPayload;
      try {
        parsedPayload = JSON.parse(rawBody);
      } catch (e) {
        parsedPayload = rawBody;
      }

      return {
        isValid: true,
        platform: this.platform,
        payload: parsedPayload,
        metadata: {
          algorithm: this.config.algorithm,
          requestId: request.headers.get(this.config.customConfig?.requestIdHeader || 'x-fal-request-id'),
          userId: request.headers.get(this.config.customConfig?.userIdHeader || 'x-fal-user-id'),
          timestamp: request.headers.get(this.config.customConfig?.timestampHeader || 'x-fal-webhook-timestamp') || undefined,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `${this.platform} verification error: ${(error as Error).message}`,
        errorCode: 'VERIFICATION_ERROR',
        platform: this.platform,
      };
    }
  }
}

export class HMACSHA256Verifier extends GenericHMACVerifier {
  constructor(
    secret: string,
    config: SignatureConfig,
    platform: WebhookPlatform = 'unknown',
    toleranceInSeconds: number = 300,
  ) {
    super(secret, config, platform, toleranceInSeconds);
  }
}

export class HMACSHA1Verifier extends GenericHMACVerifier {
  constructor(
    secret: string,
    config: SignatureConfig,
    platform: WebhookPlatform = 'unknown',
    toleranceInSeconds: number = 300,
  ) {
    super(secret, config, platform, toleranceInSeconds);
  }
}

export class HMACSHA512Verifier extends GenericHMACVerifier {
  constructor(
    secret: string,
    config: SignatureConfig,
    platform: WebhookPlatform = 'unknown',
    toleranceInSeconds: number = 300,
  ) {
    super(secret, config, platform, toleranceInSeconds);
  }
}

export function createAlgorithmVerifier(
  secret: string,
  config: SignatureConfig,
  platform: WebhookPlatform = 'unknown',
  toleranceInSeconds: number = 300,
): AlgorithmBasedVerifier {
  switch (config.algorithm) {
    case 'hmac-sha256':
    case 'hmac-sha1':
    case 'hmac-sha512':
      return new GenericHMACVerifier(secret, config, platform, toleranceInSeconds);
    case 'ed25519':
      return new Ed25519Verifier(secret, config, platform, toleranceInSeconds);
    case 'rsa-sha256':
    case 'custom':
      throw new Error(`Algorithm ${config.algorithm} not yet implemented`);
    default:
      throw new Error(`Unknown algorithm: ${config.algorithm}`);
  }
}
