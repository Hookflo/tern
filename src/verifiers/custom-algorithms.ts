import { WebhookVerifier } from "./base";
import { WebhookVerificationResult, SignatureConfig } from "../types";

// Token-based verifier for platforms like Supabase
export class TokenBasedVerifier extends WebhookVerifier {
  private config: SignatureConfig;

  constructor(
    secret: string,
    config: SignatureConfig,
    toleranceInSeconds: number = 300,
  ) {
    super(secret, toleranceInSeconds);
    this.config = config;
  }

  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const token = request.headers.get(this.config.headerName);
      const id = request.headers.get(
        this.config.customConfig?.idHeader || "x-webhook-id",
      );

      if (!token) {
        return {
          isValid: false,
          error: `Missing token header: ${this.config.headerName}`,
          platform: "custom",
        };
      }

      // Simple token comparison
      const isValid = this.safeCompare(token, this.secret);

      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid token",
          platform: "custom",
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
        platform: "custom",
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
        platform: "custom",
      };
    }
  }
}

// Factory function to create custom verifiers
export function createCustomVerifier(
  secret: string,
  config: SignatureConfig,
  toleranceInSeconds: number = 300,
): WebhookVerifier {
  const customType = config.customConfig?.type;

  switch (customType) {
    case "token-based":
      return new TokenBasedVerifier(secret, config, toleranceInSeconds);
    default:
      // Fallback to token-based for unknown custom types
      return new TokenBasedVerifier(secret, config, toleranceInSeconds);
  }
}
