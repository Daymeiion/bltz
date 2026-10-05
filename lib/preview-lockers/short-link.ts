import { z } from "zod";

export const shortLinkAlias = z.string().min(3).max(70).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// These route segments are already used by the application, so a root-level
// link with one of these names could never reach the short-link handler.
const reserved = new Set([
  "admin", "api", "auth", "dashboard", "feed", "onboarding", "organization",
  "player", "preview-lockers", "preview-referrals", "protected", "watch",
]);

export function validShortLinkAlias(value: string): boolean {
  return shortLinkAlias.safeParse(value).success && !reserved.has(value);
}

export function previewShortLink(alias: string): string {
  return `https://bltz.me/${alias}`;
}
