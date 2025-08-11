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
    return Math.abs(now - timestamp) <= this.toleranceInSeconds;
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
