import "server-only";
import { timingSafeEqual } from "node:crypto";
import { Receiver } from "@upstash/qstash";
import type { AnalyticsDeliveryConfiguration } from "./config";

export function verifyAnalyticsDispatchSecret(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || header.length > 4096) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/** Vercel GET scheduling uses a separate server-only bearer credential, never query parameters. */
export function verifyAnalyticsCronSecret(request: Request, secret: string | undefined = process.env.CRON_SECRET): boolean {
  return !!secret && secret.length >= 32 && !/[\r\n]/.test(secret) && verifyAnalyticsDispatchSecret(request, secret);
}

export async function verifyAnalyticsWorkerSignature(config: AnalyticsDeliveryConfiguration, request: Request, rawBody: string): Promise<boolean> {
  const signature = request.headers.get("upstash-signature");
  if (!signature || signature.length > 4096) return false;
  try {
    const receiver = new Receiver({ currentSigningKey: config.currentSigningKey, nextSigningKey: config.nextSigningKey, devMode: false });
    return await receiver.verify({ signature, body: rawBody, url: config.workerUrl, clockTolerance: 5 });
  } catch { return false; }
}
