interface PlatformConfig {
  supportedEvents: string[];
  signatureHeader: string;
  algorithm: "sha1" | "sha256" | "hmac-sha256";
}

export const platformConfigs: Record<string, PlatformConfig> = {
  vercel: {
    supportedEvents: [
      "deployment.created",
      "deployment.ready",
      "deployment.error",
      "domain.created",
      "domain.deleted",
    ],
    signatureHeader: "x-vercel-signature",
    algorithm: "sha1",
  },
};
