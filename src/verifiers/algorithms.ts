import { createHmac } from 'crypto';
import { WebhookVerifier } from './base';
import { WebhookVerificationResult, SignatureConfig, WebhookPlatform } from '../types';

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

  protected extractSignature(request: Request): string | null {
    const headerValue = request.headers.get(this.config.headerName);
    if (!headerValue) return null;

    switch (this.config.headerFormat) {
      case 'prefixed':
        // For GitHub, return the full signature including prefix for comparison
        return headerValue;
      case 'comma-separated':
        // Handle comma-separated format like Stripe: "t=1234567890,v1=abc123"
        const parts = headerValue.split(',');
        const sigMap: Record<string, string> = {};
        for (const part of parts) {
          const [key, value] = part.split('=');
          if (key && value) {
            sigMap[key] = value;
          }
        }
        return sigMap.v1 || sigMap.signature || null;
      case 'raw':
      default:
        // For Clerk, handle space-separated signatures
        if (this.platform === 'clerk') {
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
        // Custom timestamp parsing logic can be added here
        return parseInt(timestampHeader, 10);
      default:
        return parseInt(timestampHeader, 10);
    }
  }

  protected extractTimestampFromSignature(request: Request): number | null {
    // For platforms like Stripe where timestamp is embedded in signature
    if (this.config.headerFormat === 'comma-separated') {
      const headerValue = request.headers.get(this.config.headerName);
      if (!headerValue) return null;

      const parts = headerValue.split(',');
      const sigMap: Record<string, string> = {};
      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key && value) {
          sigMap[key] = value;
        }
      }
      return sigMap.t ? parseInt(sigMap.t, 10) : null;
    }
    return null;
  }

  protected formatPayload(rawBody: string, request: Request): string {
    switch (this.config.payloadFormat) {
      case 'timestamped':
        // For Stripe, timestamp is embedded in signature
        const timestamp = this.extractTimestampFromSignature(request) || this.extractTimestamp(request);
        return timestamp ? `${timestamp}.${rawBody}` : rawBody;
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
    
    // Handle Clerk-style format: {id}.{timestamp}.{body}
    if (customFormat.includes('{id}') && customFormat.includes('{timestamp}')) {
      const id = request.headers.get(this.config.customConfig.idHeader || 'x-webhook-id');
      const timestamp = request.headers.get(this.config.timestampHeader || 'x-webhook-timestamp');
      return customFormat
        .replace('{id}', id || '')
        .replace('{timestamp}', timestamp || '')
        .replace('{body}', rawBody);
    }

    // Handle Stripe-style format: {timestamp}.{body}
    if (customFormat.includes('{timestamp}') && customFormat.includes('{body}')) {
      const timestamp = this.extractTimestamp(request);
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
    // For platforms like Clerk that use base64 encoding
    const secretBytes = new Uint8Array(Buffer.from(this.secret.split('_')[1], 'base64'));
    const hmac = createHmac(algorithm, secretBytes);
    hmac.update(payload);
    const expectedSignature = hmac.digest('base64');

    return this.safeCompare(signature, expectedSignature);
  }

  protected extractMetadata(request: Request): Record<string, any> {
    const metadata: Record<string, any> = {
      algorithm: this.config.algorithm,
    };

    // Add timestamp if available
    const timestamp = this.extractTimestamp(request);
    if (timestamp) {
      metadata.timestamp = timestamp.toString();
    }

    // Add platform-specific metadata
    switch (this.platform) {
      case 'github':
        metadata.event = request.headers.get('x-github-event');
        metadata.delivery = request.headers.get('x-github-delivery');
        break;
      case 'stripe':
        // Extract Stripe-specific metadata from signature
        const headerValue = request.headers.get(this.config.headerName);
        if (headerValue && this.config.headerFormat === 'comma-separated') {
          const parts = headerValue.split(',');
          const sigMap: Record<string, string> = {};
          for (const part of parts) {
            const [key, value] = part.split('=');
            if (key && value) {
              sigMap[key] = value;
            }
          }
          metadata.id = sigMap.id;
        }
        break;
      case 'clerk':
        metadata.id = request.headers.get('svix-id');
        break;
    }

    return metadata;
  }
}

// Generic HMAC Verifier that handles all HMAC-based algorithms
export class GenericHMACVerifier extends AlgorithmBasedVerifier {
  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const signature = this.extractSignature(request);
      if (!signature) {
        return {
          isValid: false,
          error: `Missing signature header: ${this.config.headerName}`,
          platform: this.platform,
        };
      }

      const rawBody = await request.text();
      
      // Extract timestamp based on platform configuration
      let timestamp: number | null = null;
      if (this.config.headerFormat === 'comma-separated') {
        // For platforms like Stripe where timestamp is embedded in signature
        timestamp = this.extractTimestampFromSignature(request);
      } else {
        // For platforms with separate timestamp header
        timestamp = this.extractTimestamp(request);
      }

      // Validate timestamp if required
      if (timestamp && !this.isTimestampValid(timestamp)) {
        return {
          isValid: false,
          error: 'Webhook timestamp expired',
          platform: this.platform,
        };
      }

      // Format payload according to platform requirements
      const payload = this.formatPayload(rawBody, request);

      // Verify signature based on platform configuration
      let isValid = false;
      const algorithm = this.config.algorithm.replace('hmac-', '');

      if (this.config.customConfig?.encoding === 'base64') {
        // For platforms like Clerk that use base64 encoding
        isValid = this.verifyHMACWithBase64(payload, signature, algorithm);
      } else if (this.config.headerFormat === 'prefixed') {
        // For platforms like GitHub that use prefixed signatures
        isValid = this.verifyHMACWithPrefix(payload, signature, algorithm);
      } else {
        // Standard HMAC verification
        isValid = this.verifyHMAC(payload, signature, algorithm);
      }

      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid signature',
          platform: this.platform,
        };
      }

      // Parse payload
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(rawBody);
      } catch (e) {
        parsedPayload = rawBody;
      }

      // Extract platform-specific metadata
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
        platform: this.platform,
      };
    }
  }
}

// Legacy verifiers for backward compatibility
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

// Factory function to create verifiers based on algorithm
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
    case 'rsa-sha256':
    case 'ed25519':
    case 'custom':
      // These can be implemented as needed
      throw new Error(`Algorithm ${config.algorithm} not yet implemented`);
    default:
      throw new Error(`Unknown algorithm: ${config.algorithm}`);
  }
}
