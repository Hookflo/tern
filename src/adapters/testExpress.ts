import crypto from "crypto";
import { toWebRequest } from "./shared";
import WebhookVerificationService from "..";

const secret = "whsec_test_secret";

const payload =
  JSON.stringify({ type: "payment_intent.succeeded", data: { amount: 2000 } }) +
  "\n";

function buildStripeSignature(body: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = `${timestamp}.${body}`;
  const hmac = crypto
    .createHmac("sha256", secret.replace("whsec_", ""))
    .update(signed)
    .digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

// ── Test 1: raw stream — no middleware ran ───────────────────
async function testRawStream() {
  const sig = buildStripeSignature(payload, secret); // ✓ fixed: was missing secret arg

  const chunks = [Buffer.from(payload, "utf8")];

  const req = {
    method: "POST",
    headers: {
      "stripe-signature": sig,
      "content-type": "application/json",
    },
    body: undefined,
    on: (event: string, cb: (chunk?: unknown) => void) => {
      if (event === "data") {
        for (const chunk of chunks) cb(chunk);
      }
      if (event === "end") {
        cb();
      }
    },
  };

  const webReq = await toWebRequest(req as any);
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    webReq,
    "stripe",
    secret,
  );
  console.log(
    "Test 1 Raw stream (no middleware):",
    result.isValid ? "✓ PASS" : `✗ FAIL — ${result.error}`,
  );
}

// ── Test 2: Buffer body — express.raw() ran ──────────────────
async function testBufferBody() {
  const sig = buildStripeSignature(payload, secret);

  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": sig,
    },
    body: Buffer.from(payload, "utf8"),
  };

  const webReq = await toWebRequest(req as any);
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    webReq,
    "stripe",
    secret,
  );
  console.log(
    "Test 2 Buffer body (express.raw):",
    result.isValid ? "✓ PASS" : `✗ FAIL — ${result.error}`,
  );
}

// ── Test 3: parsed object — express.json() ran ───────────────
async function testParsedObject() {
  // signature computed against raw payload including \n
  const sig = buildStripeSignature(payload, secret);

  const req = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": sig,
    },
    body: JSON.parse(payload), // \n gone, bytes lost
  };

  const webReq = await toWebRequest(req as any);
  const result = await WebhookVerificationService.verifyWithPlatformConfig(
    webReq,
    "stripe",
    secret,
  );
  // should FAIL — \n was in original signature but lost after JSON.parse
  console.log(
    "Test 3 Parsed object (express.json):",
    !result.isValid ? "✓ FAILS AS EXPECTED" : "✗ SHOULD HAVE FAILED",
  );
}

async function run() {
  await testRawStream(); // no middleware      → should PASS
  await testBufferBody(); // express.raw()      → should PASS
  await testParsedObject(); // express.json()     → should FAIL as expected
  console.log("\nDone. Test 3 failing is correct behavior.");
}

run();
