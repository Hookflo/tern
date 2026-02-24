import {
  createHmac,
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "crypto";
import { WebhookVerifier } from "./base";
import {
  WebhookVerificationResult,
  SignatureConfig,
  WebhookPlatform,
} from "../types";

// Cache stores array of PEM keys per JWKS URL
const ed25519KeyCache = new Map<
  string,
  { pems: string[]; expiresAt: number }
>();

const JWKS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours per fal.ai docs

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
      const equalIndex = trimmed.indexOf("=");
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
      case "prefixed":
        return headerValue.trim();
      case "comma-separated": {
        const sigMap = this.parseDelimitedHeader(headerValue);
        const signatureKey = this.config.customConfig?.signatureKey || "v1";
        return sigMap[signatureKey] || sigMap.signature || sigMap.v1 || null;
      }
      case "raw":
      default:
        if (this.config.customConfig?.signatureFormat?.includes("v1=")) {
          const signatures = headerValue.split(" ");
          for (const sig of signatures) {
            const [version, signature] = sig.split(",");
            if (version === "v1") {
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
      case "unix":
        return parseInt(timestampHeader, 10);
      case "iso":
        return Math.floor(new Date(timestampHeader).getTime() / 1000);
      case "custom":
        return parseInt(timestampHeader, 10);
      default:
        return parseInt(timestampHeader, 10);
    }
  }

  protected extractTimestampFromSignature(request: Request): number | null {
    if (this.config.headerFormat !== "comma-separated") {
      return null;
    }

    const headerValue = request.headers.get(this.config.headerName);
    if (!headerValue) return null;

    const sigMap = this.parseDelimitedHeader(headerValue);
    const timestampKey = this.config.customConfig?.timestampKey || "t";
    return sigMap[timestampKey] ? parseInt(sigMap[timestampKey], 10) : null;
  }

  protected formatPayload(rawBody: string, request: Request): string {
    switch (this.config.payloadFormat) {
      case "timestamped": {
        const timestamp =
          this.extractTimestampFromSignature(request) ||
          this.extractTimestamp(request);
        return timestamp ? `${timestamp}.${rawBody}` : rawBody;
      }
      case "json-stringified":
        try {
          return JSON.stringify(JSON.parse(rawBody));
        } catch {
          return rawBody;
        }
      case "custom":
        return this.formatCustomPayload(rawBody, request);
      case "raw":
      default:
        return rawBody;
    }
  }

  protected formatCustomPayload(rawBody: string, request: Request): string {
    if (!this.config.customConfig?.payloadFormat) {
      return rawBody;
    }

    const customFormat = this.config.customConfig.payloadFormat;

    if (customFormat.includes("{id}") && customFormat.includes("{timestamp}")) {
      const id = request.headers.get(
        this.config.customConfig.idHeader || "x-webhook-id",
      );
      const timestamp = request.headers.get(
        this.config.timestampHeader ||
          this.config.customConfig?.timestampHeader ||
          "x-webhook-timestamp",
      );

      // if either is missing payload will be malformed — fail explicitly
      if (!id || !timestamp) {
        throw new Error(
          `Missing required headers for payload construction: ${
            !id ? this.config.customConfig.idHeader || "x-webhook-id" : ""
          } ${
            !timestamp
              ? this.config.timestampHeader || "x-webhook-timestamp"
              : ""
          }`.trim(),
        );
      }

      return customFormat
        .replace("{id}", id.trim() || "")
        .replace("{timestamp}", timestamp.trim() || "")
        .replace("{body}", rawBody);
    }

    if (
      customFormat.includes("{timestamp}") &&
      customFormat.includes("{body}")
    ) {
      const timestamp =
        this.extractTimestampFromSignature(request) ||
        this.extractTimestamp(request);
      return customFormat
        .replace("{timestamp}", timestamp?.toString() || "")
        .replace("{body}", rawBody);
    }

    return rawBody;
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

  protected verifyHMACWithBase64(
    payload: string,
    signature: string,
    algorithm: string = "sha256",
  ): boolean {
    const secretEncoding = this.config.customConfig?.secretEncoding || "base64";

    let secretMaterial: string | Uint8Array = this.secret;
    if (secretEncoding === "base64") {
      const base64Secret = this.secret.includes("_")
        ? this.secret.split("_").slice(1).join("_")
        : this.secret;
      secretMaterial = new Uint8Array(Buffer.from(base64Secret, "base64"));
    }
    // 'utf8', 'raw', or anything else → use secret as-is

    const hmac = createHmac(algorithm, secretMaterial);
    hmac.update(payload);
    const expectedSignature = hmac.digest("base64");
    return this.safeCompare(signature, expectedSignature);
  }

  protected extractMetadata(request: Request): Record<string, any> {
    const metadata: Record<string, any> = {
      algorithm: this.config.algorithm,
    };

    const timestamp =
      this.extractTimestamp(request) ||
      this.extractTimestampFromSignature(request);
    if (timestamp) {
      metadata.timestamp = timestamp.toString();
    }

    switch (this.platform) {
      case "github":
        metadata.event = request.headers.get("x-github-event");
        metadata.delivery = request.headers.get("x-github-delivery");
        break;
      case "stripe": {
        const headerValue = request.headers.get(this.config.headerName);
        if (headerValue && this.config.headerFormat === "comma-separated") {
          const sigMap = this.parseDelimitedHeader(headerValue);
          metadata.id = sigMap.id;
        }
        break;
      }
      case "clerk":
      case "dodopayments":
      case "replicateai":
        metadata.id = request.headers.get(
          this.config.customConfig?.idHeader || "webhook-id",
        );
        break;
      case "workos":
      case "sentry":
      case "sanity":
        metadata.id = request.headers.get(
          this.config.idHeader ||
            this.config.customConfig?.idHeader ||
            "webhook-id",
        );
        break;
      default:
        if (this.config.idHeader) {
          metadata.id = request.headers.get(this.config.idHeader);
        }
        break;
    }

    return metadata;
  }
}

export class GenericHMACVerifier extends AlgorithmBasedVerifier {
  private resolveSentryPayloadCandidates(
    rawBody: string,
    request: Request,
  ): string[] {
    const candidates: string[] = [
      this.formatPayload(rawBody, request),
      rawBody,
    ];

    if (this.config.payloadFormat === "json-stringified") {
      try {
        const parsed = JSON.parse(rawBody) as Record<string, any>;
        candidates.push(JSON.stringify(parsed));

        const issueAlertPath = this.config.customConfig?.issueAlertPayloadPath;
        if (issueAlertPath) {
          const segments = `${issueAlertPath}`.split(".").filter(Boolean);
          let current: any = parsed;
          for (const segment of segments) {
            current = current?.[segment];
          }
          if (current !== undefined) {
            candidates.push(
              typeof current === "string" ? current : JSON.stringify(current),
            );
          }
        }
      } catch {
        // ignore malformed JSON payloads
      }
    }

    return [...new Set(candidates.filter(Boolean))];
  }

  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const signature = this.extractSignature(request);
      if (!signature) {
        return {
          isValid: false,
          error: `Missing signature header: ${this.config.headerName}`,
          errorCode: "MISSING_SIGNATURE",
          platform: this.platform,
        };
      }

      const rawBody = await request.text();

      let timestamp: number | null = null;
      if (this.config.headerFormat === "comma-separated") {
        timestamp = this.extractTimestampFromSignature(request);
      } else {
        timestamp = this.extractTimestamp(request);
      }

      if (timestamp && !this.isTimestampValid(timestamp)) {
        return {
          isValid: false,
          error: "Webhook timestamp expired",
          errorCode: "TIMESTAMP_EXPIRED",
          platform: this.platform,
        };
      }

      const payloadCandidates =
        this.platform === "sentry"
          ? this.resolveSentryPayloadCandidates(rawBody, request)
          : [this.formatPayload(rawBody, request)];

      let isValid = false;
      const algorithm = this.config.algorithm.replace("hmac-", "");

      for (const payload of payloadCandidates) {
        if (this.config.customConfig?.encoding === "base64") {
          isValid = this.verifyHMACWithBase64(payload, signature, algorithm);
        } else if (this.config.headerFormat === "prefixed") {
          isValid = this.verifyHMACWithPrefix(payload, signature, algorithm);
        } else {
          isValid = this.verifyHMAC(payload, signature, algorithm);
        }

        if (isValid) {
          break;
        }
      }

      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid signature",
          errorCode: "INVALID_SIGNATURE",
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
      if (this.platform === "doppler" && !metadata.id) {
        const timestamp =
          metadata.timestamp || Math.floor(Date.now() / 1000).toString();
        metadata.id = createHash("sha256")
          .update(`${timestamp}:${rawBody}`)
          .digest("hex");
      }

      return {
        isValid: true,
        platform: this.platform,
        payload: parsedPayload,
        metadata,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `${this.platform} verification error: ${
          (error as Error).message
        }`,
        errorCode: "VERIFICATION_ERROR",
        platform: this.platform,
      };
    }
  }
}

export class Ed25519Verifier extends AlgorithmBasedVerifier {
  /**
   * Fetch all public keys from JWKS endpoint.
   * Returns array of PEM strings — tries all keys during verification
   * so key rotation works transparently.
   * Caches for 24 hours per fal.ai docs recommendation.
   */
  private async fetchJWKSKeys(jwksUrl: string): Promise<string[]> {
    const cached = ed25519KeyCache.get(jwksUrl);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.pems;
    }

    const response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch JWKS from ${jwksUrl}: ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      keys?: Array<Record<string, string>>;
    };
    const keys = body.keys || [];

    if (keys.length === 0) {
      throw new Error("No keys found in JWKS response");
    }

    const pems: string[] = [];
    for (const key of keys) {
      try {
        const keyObject = createPublicKey({ key, format: "jwk" });
        const pem = keyObject
          .export({ type: "spki", format: "pem" })
          .toString();
        pems.push(pem);
      } catch {
        // skip malformed keys, continue with rest
        continue;
      }
    }

    if (pems.length === 0) {
      throw new Error("No valid ED25519 keys found in JWKS");
    }

    ed25519KeyCache.set(jwksUrl, {
      pems,
      expiresAt: Date.now() + JWKS_CACHE_TTL,
    });

    return pems;
  }

  /**
   * Resolve public keys to use for verification.
   * Priority:
   *   1. Explicit publicKey in config
   *   2. Non-empty secret passed directly (user-provided PEM)
   *   3. JWKS URL in config (fal.ai — fetches all keys, tries each)
   */
  private async resolvePublicKeys(request: Request): Promise<string[]> {
    // 1. explicit public key in config
    const configPublicKey = this.config.customConfig?.publicKey as
      | string
      | undefined;
    if (configPublicKey) {
      return [configPublicKey];
    }

    // 2. non-empty secret = user passed PEM directly
    // empty string = fal.ai pattern (no shared secret, use JWKS)
    if (
      this.secret &&
      this.secret.trim().length > 0 &&
      this.platform !== "falai"
    ) {
      return [this.secret];
    }

    // 3. fetch from JWKS — handles fal.ai and any other JWKS-based platform
    const jwksUrl = this.config.customConfig?.jwksUrl as string | undefined;
    if (!jwksUrl) {
      return [];
    }

    return this.fetchJWKSKeys(jwksUrl);
  }

  /**
   * Build fal.ai specific payload string.
   *
   * Per fal.ai docs, message is newline-separated (NOT dot-separated):
   *   {request-id}\n{user-id}\n{timestamp}\n{sha256hex(body)}
   */
  private buildFalPayload(rawBody: string, request: Request): string {
    const requestIdHeader =
      this.config.customConfig?.requestIdHeader || "x-fal-webhook-request-id";
    const userIdHeader =
      this.config.customConfig?.userIdHeader || "x-fal-webhook-user-id";
    const timestampHeader =
      this.config.customConfig?.timestampHeader || "x-fal-webhook-timestamp";

    const requestId = request.headers.get(requestIdHeader) || "";
    const userId = request.headers.get(userIdHeader) || "";
    const timestamp = request.headers.get(timestampHeader) || "";
    const bodyHash = createHash("sha256").update(rawBody).digest("hex");

    return `${requestId}\n${userId}\n${timestamp}\n${bodyHash}`;
  }

  async verify(request: Request): Promise<WebhookVerificationResult> {
    try {
      const signature = this.extractSignature(request);
      if (!signature) {
        return {
          isValid: false,
          error: `Missing signature header: ${this.config.headerName}`,
          errorCode: "MISSING_SIGNATURE",
          platform: this.platform,
        };
      }

      const rawBody = await request.text();

      // fal.ai timestamp validation before signature check
      if (this.platform === "falai") {
        const timestampHeader =
          this.config.customConfig?.timestampHeader ||
          "x-fal-webhook-timestamp";
        const timestampStr = request.headers.get(timestampHeader);
        if (timestampStr) {
          const timestamp = parseInt(timestampStr, 10);
          if (!this.isTimestampValid(timestamp)) {
            return {
              isValid: false,
              error: "Webhook timestamp expired",
              errorCode: "TIMESTAMP_EXPIRED",
              platform: this.platform,
            };
          }
        }
      }

      const payload =
        this.platform === "falai"
          ? this.buildFalPayload(rawBody, request)
          : this.formatPayload(rawBody, request);

      // resolve all public keys
      let publicKeys: string[];
      try {
        publicKeys = await this.resolvePublicKeys(request);
      } catch (error) {
        return {
          isValid: false,
          error: `Failed to resolve public keys: ${(error as Error).message}`,
          errorCode: "VERIFICATION_ERROR",
          platform: this.platform,
        };
      }

      if (publicKeys.length === 0) {
        return {
          isValid: false,
          error: "No public keys available for ED25519 verification",
          errorCode: "VERIFICATION_ERROR",
          platform: this.platform,
        };
      }

      // fal.ai signature is hex encoded (not base64)
      // other ED25519 platforms use base64 by default
      const signatureEncoding = this.platform === "falai" ? "hex" : "base64";
      const signatureBytes = new Uint8Array(
        Buffer.from(signature, signatureEncoding),
      );
      const payloadBytes = new Uint8Array(Buffer.from(payload, "utf-8"));

      // try all keys — succeeds if any key validates
      // this handles key rotation gracefully
      let isValid = false;
      for (const pem of publicKeys) {
        try {
          const keyObject = createPublicKey(pem);
          const valid = verifySignature(
            null,
            payloadBytes,
            keyObject,
            signatureBytes,
          );
          if (valid) {
            isValid = true;
            break;
          }
        } catch {
          // this key failed — try next
          continue;
        }
      }

      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid signature",
          errorCode: "INVALID_SIGNATURE",
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
          requestId: request.headers.get(
            this.config.customConfig?.requestIdHeader ||
              "x-fal-webhook-request-id",
          ),
          userId: request.headers.get(
            this.config.customConfig?.userIdHeader || "x-fal-webhook-user-id",
          ),
          timestamp:
            request.headers.get(
              this.config.customConfig?.timestampHeader ||
                "x-fal-webhook-timestamp",
            ) || undefined,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: `${this.platform} verification error: ${
          (error as Error).message
        }`,
        errorCode: "VERIFICATION_ERROR",
        platform: this.platform,
      };
    }
  }
}

export class HMACSHA256Verifier extends GenericHMACVerifier {
  constructor(
    secret: string,
    config: SignatureConfig,
    platform: WebhookPlatform = "unknown",
    toleranceInSeconds: number = 300,
  ) {
    super(secret, config, platform, toleranceInSeconds);
  }
}

export class HMACSHA1Verifier extends GenericHMACVerifier {
  constructor(
    secret: string,
    config: SignatureConfig,
    platform: WebhookPlatform = "unknown",
    toleranceInSeconds: number = 300,
  ) {
    super(secret, config, platform, toleranceInSeconds);
  }
}

export class HMACSHA512Verifier extends GenericHMACVerifier {
  constructor(
    secret: string,
    config: SignatureConfig,
    platform: WebhookPlatform = "unknown",
    toleranceInSeconds: number = 300,
  ) {
    super(secret, config, platform, toleranceInSeconds);
  }
}

export function createAlgorithmVerifier(
  secret: string,
  config: SignatureConfig,
  platform: WebhookPlatform = "unknown",
  toleranceInSeconds: number = 300,
): AlgorithmBasedVerifier {
  switch (config.algorithm) {
    case "hmac-sha256":
    case "hmac-sha1":
    case "hmac-sha512":
      return new GenericHMACVerifier(
        secret,
        config,
        platform,
        toleranceInSeconds,
      );
    case "ed25519":
      return new Ed25519Verifier(secret, config, platform, toleranceInSeconds);
    case "rsa-sha256":
    case "custom":
      throw new Error(`Algorithm ${config.algorithm} not yet implemented`);
    default:
      throw new Error(`Unknown algorithm: ${config.algorithm}`);
  }
}
