import { createHmac } from "crypto";
import { WebhookVerifier } from "./base";
import { WebhookVerificationResult, SignatureConfig } from "../types";

export abstract class AlgorithmBasedVerifier extends WebhookVerifier {
  protected config: SignatureConfig;

  constructor(
    secret: string,
    config: SignatureConfig,
    toleranceInSeconds: number = 300,
  ) {
    super(secret, toleranceInSeconds);
    this.config = config;
  }

  abstract verify(request: Request): Promise<WebhookVerificationResult>;

  protected extractSignature(request: Request): string | null {
    const headerValue = request.headers.get(this.config.headerName);
    if (!headerValue) return null;

    switch (this.config.headerFormat) {
      case "prefixed":
        return headerValue.startsWith(this.config.prefix || "")
          ? headerValue.substring((this.config.prefix || "").length)
          : null;
      case "comma-separated":
        // Handle comma-separated format like Stripe: "t=1234567890,v1=abc123"
        const parts = headerValue.split(",");
        const sigMap: Record<string, string> = {};
        for (const part of parts) {
          const [key, value] = part.split("=");
          if (key && value) {
            sigMap[key] = value;
          }
        }
        return sigMap.v1 || sigMap.signature || null;
      case "raw":
      default:
        return headerValue;
    }
  }

  protected extractTimestamp(request: Request): number | null {
    if (!this.config.timestampHeader) return null;

    const timestampHeader = request.headers.get(this.config.timestampHeader);
    if (!timestampHeader) return null;

    switch (this.config.timestampFormat) {
      case "unix":
        return parseInt(timestampHeader, 10);
      case "iso":
        return Math.floor(new Date(timestampHeader).getTime() / 1000);
      case "custom":
        // Custom timestamp parsing logic can be added here
        return parseInt(timestampHeader, 10);
      default:
        return parseInt(timestampHeader, 10);
    }
  }

  protected formatPayload(rawBody: string, timestamp?: number | null): string {
    switch (this.config.payloadFormat) {
      case "timestamped":
        return timestamp ? `${timestamp}.${rawBody}` : rawBody;
      case "custom":
        // Custom payload formatting logic can be added here
        return rawBody;
      case "raw":
      default:
        return rawBody;
    }
  }

  protected verifyHMAC(
    payload: string,
    signature: string,
    algorithm: string = "sha256",
  ): boolean {
    const hmac = createHmac(algorithm, this.secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    return this.safeCompare(signature, expectedSignature);
  }

  protected verifyHMACWithPrefix(
    payload: string,
    signature: string,
    algorithm: string = "sha256",
  ): boolean {
    const hmac = createHmac(algorithm, this.secret);
    hmac.update(payload);
    const expectedSignature = `${this.config.prefix || ""}${hmac.digest(
      "hex",
    )}`;

    return this.safeCompare(signature, expectedSignature);
  }
}

export class HMACSHA256Verifier extends AlgorithmBasedVerifier {
  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const signature = this.extractSignature(request);
      if (!signature) {
        return {
          isValid: false,
          error: `Missing signature header: ${this.config.headerName}`,
          platform: "unknown" as any,
        };
      }

      const rawBody = await request.text();
      const timestamp = this.extractTimestamp(request);

      if (timestamp && !this.isTimestampValid(timestamp)) {
        return {
          isValid: false,
          error: "Webhook timestamp expired",
          platform: "unknown" as any,
        };
      }

      const payload = this.formatPayload(rawBody, timestamp);
      const isValid = this.config.prefix
        ? this.verifyHMACWithPrefix(payload, signature, "sha256")
        : this.verifyHMAC(payload, signature, "sha256");

      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid signature",
          platform: "unknown" as any,
        };
      }

      let parsedPayload;
      try {
        parsedPayload = JSON.parse(rawBody);
      } catch (e) {
        // Return valid even if JSON parsing fails
        parsedPayload = rawBody;
      }

      return {
        isValid: true,
        platform: "unknown" as any,
        payload: parsedPayload,
        metadata: {
          timestamp: timestamp?.toString(),
          algorithm: "hmac-sha256",
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `HMAC-SHA256 verification error: ${(error as Error).message}`,
        platform: "unknown" as any,
      };
    }
  }
}

export class HMACSHA1Verifier extends AlgorithmBasedVerifier {
  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const signature = this.extractSignature(request);
      if (!signature) {
        return {
          isValid: false,
          error: `Missing signature header: ${this.config.headerName}`,
          platform: "unknown" as any,
        };
      }

      const rawBody = await request.text();
      const timestamp = this.extractTimestamp(request);

      if (timestamp && !this.isTimestampValid(timestamp)) {
        return {
          isValid: false,
          error: "Webhook timestamp expired",
          platform: "unknown" as any,
        };
      }

      const payload = this.formatPayload(rawBody, timestamp);
      const isValid = this.config.prefix
        ? this.verifyHMACWithPrefix(payload, signature, "sha1")
        : this.verifyHMAC(payload, signature, "sha1");

      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid signature",
          platform: "unknown" as any,
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
        platform: "unknown" as any,
        payload: parsedPayload,
        metadata: {
          timestamp: timestamp?.toString(),
          algorithm: "hmac-sha1",
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `HMAC-SHA1 verification error: ${(error as Error).message}`,
        platform: "unknown" as any,
      };
    }
  }
}

export class HMACSHA512Verifier extends AlgorithmBasedVerifier {
  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const signature = this.extractSignature(request);
      if (!signature) {
        return {
          isValid: false,
          error: `Missing signature header: ${this.config.headerName}`,
          platform: "unknown" as any,
        };
      }

      const rawBody = await request.text();
      const timestamp = this.extractTimestamp(request);

      if (timestamp && !this.isTimestampValid(timestamp)) {
        return {
          isValid: false,
          error: "Webhook timestamp expired",
          platform: "unknown" as any,
        };
      }

      const payload = this.formatPayload(rawBody, timestamp);
      const isValid = this.config.prefix
        ? this.verifyHMACWithPrefix(payload, signature, "sha512")
        : this.verifyHMAC(payload, signature, "sha512");

      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid signature",
          platform: "unknown" as any,
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
        platform: "unknown" as any,
        payload: parsedPayload,
        metadata: {
          timestamp: timestamp?.toString(),
          algorithm: "hmac-sha512",
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `HMAC-SHA512 verification error: ${(error as Error).message}`,
        platform: "unknown" as any,
      };
    }
  }
}

// Factory function to create verifiers based on algorithm
export function createAlgorithmVerifier(
  secret: string,
  config: SignatureConfig,
  toleranceInSeconds: number = 300,
): AlgorithmBasedVerifier {
  switch (config.algorithm) {
    case "hmac-sha256":
      return new HMACSHA256Verifier(secret, config, toleranceInSeconds);
    case "hmac-sha1":
      return new HMACSHA1Verifier(secret, config, toleranceInSeconds);
    case "hmac-sha512":
      return new HMACSHA512Verifier(secret, config, toleranceInSeconds);
    case "rsa-sha256":
    case "ed25519":
    case "custom":
      // These can be implemented as needed
      throw new Error(`Algorithm ${config.algorithm} not yet implemented`);
    default:
      throw new Error(`Unknown algorithm: ${config.algorithm}`);
  }
}
