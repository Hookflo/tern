import { WebhookVerifier } from "./base";
import { WebhookVerificationResult, SignatureConfig } from "../types";

// Custom verifier for token-based authentication (like Supabase)
export class TokenBasedVerifier extends WebhookVerifier {
  private config: SignatureConfig;

  constructor(
    secret: string,
    config: SignatureConfig,
    toleranceInSeconds: number = 300
  ) {
    super(secret, toleranceInSeconds);
    this.config = config;
  }

  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const token = request.headers.get(this.config.headerName);
      const id = request.headers.get(
        this.config.customConfig?.idHeader || "x-webhook-id"
      );

      if (!token) {
        return {
          isValid: false,
          error: `Missing token header: ${this.config.headerName}`,
          platform: "unknown" as any,
        };
      }

      // Simple token comparison
      const isValid = this.safeCompare(token, this.secret);

      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid token",
          platform: "unknown" as any,
        };
      }

      const rawBody = await request.text();
      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch (e) {
        payload = rawBody;
      }

      return {
        isValid: true,
        platform: "unknown" as any,
        payload,
        metadata: {
          id,
          algorithm: "token-based",
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Token-based verification error: ${(error as Error).message}`,
        platform: "unknown" as any,
      };
    }
  }
}

// Custom verifier for Clerk's specific format
export class ClerkCustomVerifier extends WebhookVerifier {
  private config: SignatureConfig;

  constructor(
    secret: string,
    config: SignatureConfig,
    toleranceInSeconds: number = 300
  ) {
    super(secret, toleranceInSeconds);
    this.config = config;
  }

  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const body = await request.text();
      const svixId = request.headers.get("svix-id");
      const svixTimestamp = request.headers.get("svix-timestamp");
      const svixSignature = request.headers.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        return {
          isValid: false,
          error: "Missing required Clerk webhook headers",
          platform: "clerk",
        };
      }

      const timestamp = parseInt(svixTimestamp, 10);
      if (!this.isTimestampValid(timestamp)) {
        return {
          isValid: false,
          error: "Webhook timestamp is too old",
          platform: "clerk",
        };
      }

      const signedContent = `${svixId}.${svixTimestamp}.${body}`;
      const secretBytes = new Uint8Array(
        Buffer.from(this.secret.split("_")[1], "base64")
      );

      const { createHmac } = await import("crypto");
      const expectedSignature = createHmac("sha256", secretBytes)
        .update(signedContent)
        .digest("base64");

      const signatures = svixSignature.split(" ");
      let isValid = false;

      for (const sig of signatures) {
        const [version, signature] = sig.split(",");
        if (
          version === "v1" &&
          this.safeCompare(signature, expectedSignature)
        ) {
          isValid = true;
          break;
        }
      }

      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid signature",
          platform: "clerk",
        };
      }

      return {
        isValid: true,
        platform: "clerk",
        payload: JSON.parse(body),
        metadata: {
          id: svixId,
          timestamp: svixTimestamp,
          algorithm: "clerk-custom",
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown error",
        platform: "clerk",
      };
    }
  }
}

// Custom verifier for Stripe's specific format
export class StripeCustomVerifier extends WebhookVerifier {
  private config: SignatureConfig;

  constructor(
    secret: string,
    config: SignatureConfig,
    toleranceInSeconds: number = 300
  ) {
    super(secret, toleranceInSeconds);
    this.config = config;
  }

  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const signature =
        request.headers.get("Stripe-Signature") ||
        request.headers.get("stripe-signature") ||
        request.headers.get("x-stripe-signature");

      if (!signature) {
        return {
          isValid: false,
          error: "Missing Stripe signature header",
          platform: "stripe",
        };
      }

      const rawBody = await request.text();

      const sigParts = signature.split(",");
      const sigMap: Record<string, string> = {};

      for (const part of sigParts) {
        const [key, value] = part.split("=");
        if (key && value) {
          sigMap[key] = value;
        }
      }

      const timestamp = sigMap.t;
      const sig = sigMap.v1;

      if (!timestamp || !sig) {
        return {
          isValid: false,
          error: "Invalid Stripe signature format",
          platform: "stripe",
        };
      }

      const timestampNum = parseInt(timestamp, 10);
      if (!this.isTimestampValid(timestampNum)) {
        return {
          isValid: false,
          error: "Stripe webhook timestamp expired",
          platform: "stripe",
        };
      }

      const signedPayload = `${timestamp}.${rawBody}`;

      const { createHmac } = await import("crypto");
      const hmac = createHmac("sha256", this.secret);
      hmac.update(signedPayload);
      const expectedSignature = hmac.digest("hex");

      const isValid = this.safeCompare(sig, expectedSignature);

      if (!isValid) {
        console.error("Stripe signature verification failed:", {
          received: sig,
          expected: expectedSignature,
          timestamp,
          bodyLength: rawBody.length,
          signedPayload: `${signedPayload.substring(0, 50)}...`,
        });
        return {
          isValid: false,
          error: "Invalid Stripe signature",
          platform: "stripe",
        };
      }

      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch (e) {
        return {
          isValid: true,
          platform: "stripe",
          metadata: {
            timestamp,
            id: sigMap.id,
            algorithm: "stripe-custom",
          },
        };
      }

      return {
        isValid: true,
        platform: "stripe",
        payload,
        metadata: {
          timestamp,
          id: sigMap.id,
          algorithm: "stripe-custom",
        },
      };
    } catch (error) {
      console.error("Stripe verification error:", error);
      return {
        isValid: false,
        error: `Stripe verification error: ${(error as Error).message}`,
        platform: "stripe",
      };
    }
  }
}

// Factory function for custom verifiers
export function createCustomVerifier(
  secret: string,
  config: SignatureConfig,
  toleranceInSeconds: number = 300
): WebhookVerifier {
  const customType = config.customConfig?.type;

  switch (customType) {
    case "token-based":
      return new TokenBasedVerifier(secret, config, toleranceInSeconds);
    case "clerk-custom":
      return new ClerkCustomVerifier(secret, config, toleranceInSeconds);
    case "stripe-custom":
      return new StripeCustomVerifier(secret, config, toleranceInSeconds);
    default:
      // Fallback to token-based for unknown custom types
      return new TokenBasedVerifier(secret, config, toleranceInSeconds);
  }
}
