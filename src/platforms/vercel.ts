// /src/platforms/vercel.ts
import { verifyVercelSignature } from "../verifiers/vercel";

export const vercelHandler = {
  normalizeEvent: (rawBody: any, headers: Record<string, string>) => {
    const id = rawBody?.id || rawBody?.deployment?.uid || rawBody?.domain?.id;
    const type = rawBody?.type || rawBody?.event || "unknown";
    const timestamp = rawBody?.createdAt
      ? Math.floor(new Date(rawBody.createdAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

    return {
      id: String(id),
      type,
      timestamp,
      payload: rawBody,
    };
  },

  verifySignature: (rawBody: string | object, headers: Record<string, string>, secret: string) => {
    const signature = headers["x-vercel-signature"];
    if (!signature) return false;

    const bodyString = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
    return verifyVercelSignature(bodyString, signature, secret);
  },

  supportedEvents: [
    "deployment.created",
    "deployment.ready",
    "deployment.error",
    "domain.created",
    "domain.deleted",
  ],
};
