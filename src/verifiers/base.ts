import { timingSafeEqual } from "crypto";
import { WebhookVerificationResult } from "../types";

export abstract class WebhookVerifier {
  protected secret: string;

  protected toleranceInSeconds: number;

  constructor(secret: string, toleranceInSeconds: number = 300) {
    this.secret = secret;
    this.toleranceInSeconds = toleranceInSeconds;
  }

  abstract verify(request: Request): Promise<WebhookVerificationResult>;

  protected isTimestampValid(timestamp: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    // WorkOS sends milliseconds — auto-detect by magnitude
    const timestampInSeconds =
      timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp;
    return Math.abs(now - timestampInSeconds) <= this.toleranceInSeconds;
  }
  
  protected safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(
      new TextEncoder().encode(a),
      new TextEncoder().encode(b),
    );
  }
}
