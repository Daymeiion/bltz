import "server-only";

import { isIP } from "node:net";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

import { INTEGRATION_KINDS, type IntegrationKind, type IntegrationStatus } from "./integrations-shared";

export { INTEGRATION_KINDS, type IntegrationKind, type IntegrationStatus };

const SLACK_WEBHOOK = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{20,200}$/;

/** Classic Teams incoming webhooks and the Workflows ("Post to a channel when a webhook request is received") links. */
export function isTeamsWebhook(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && (/\.webhook\.office\.com$/i.test(url.hostname) || /\.logic\.azure\.com$/i.test(url.hostname) || /\.environment\.api\.powerplatform\.com$/i.test(url.hostname));
  } catch {
    return false;
  }
}

/**
 * The school's own public site only: https, a real domain name, no IP addresses,
 * ports, credentials or internal names. Keeps the server from being pointed inward.
 */
export function publicSiteUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port || isIP(host.replace(/^\[|\]$/g, "")) !== 0) return null;
    if (!host.includes(".") || /(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(host)) return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export const integrationInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("slack"), webhookUrl: z.string().trim().regex(SLACK_WEBHOOK), label: z.string().trim().min(1).max(120).nullish() }).strict(),
  z.object({ kind: z.literal("teams"), webhookUrl: z.string().trim().max(2048).refine(isTeamsWebhook), label: z.string().trim().min(1).max(120).nullish() }).strict(),
  z.object({
    kind: z.literal("wordpress"),
    siteUrl: z.string().trim().max(300).refine((value) => publicSiteUrl(value) !== null),
    username: z.string().trim().min(1).max(120),
    // WordPress shows application passwords as six groups of four characters.
    appPassword: z.string().trim().regex(/^[A-Za-z0-9]{4}( ?[A-Za-z0-9]{4}){5}$/),
  }).strict(),
]);
export type IntegrationInput = z.infer<typeof integrationInput>;

const rowSchema = z.object({ kind: z.enum(INTEGRATION_KINDS), label: z.string().nullable(), config: z.record(z.string(), z.unknown()), updated_at: z.string() });

function configOf(input: IntegrationInput): { label: string | null; config: Record<string, string> } {
  if (input.kind === "wordpress") {
    const site = publicSiteUrl(input.siteUrl)!;
    return { label: new URL(site).host, config: { siteUrl: site, username: input.username, appPassword: input.appPassword.replace(/\s+/g, "") } };
  }
  return { label: input.label ?? null, config: { webhookUrl: input.webhookUrl } };
}

export async function listIntegrations(organizationId: string): Promise<{ state: "ready" | "unavailable"; integrations: IntegrationStatus[] }> {
  try {
    const { data, error } = await createServiceClient().from("organization_integrations").select("kind,label,config,updated_at").eq("organization_id", organizationId);
    const parsed = z.array(rowSchema).safeParse(data);
    if (error || !parsed.success) return { state: "unavailable", integrations: [] };
    return { state: "ready", integrations: parsed.data.map((row) => ({ kind: row.kind, label: row.label, updatedAt: row.updated_at })) };
  } catch {
    return { state: "unavailable", integrations: [] };
  }
}

export async function saveIntegration(organizationId: string, actorUserId: string, input: IntegrationInput): Promise<IntegrationStatus> {
  const { label, config } = configOf(input);
  const updatedAt = new Date().toISOString();
  const { error } = await createServiceClient().from("organization_integrations").upsert({
    organization_id: organizationId, kind: input.kind, label, config, connected_by: actorUserId, updated_at: updatedAt,
  }, { onConflict: "organization_id,kind" });
  if (error) throw new Error("integration_save_failed");
  return { kind: input.kind, label, updatedAt };
}

export async function removeIntegration(organizationId: string, kind: IntegrationKind): Promise<void> {
  const { error } = await createServiceClient().from("organization_integrations").delete().eq("organization_id", organizationId).eq("kind", kind);
  if (error) throw new Error("integration_remove_failed");
}

async function configFor(organizationId: string, kind: IntegrationKind): Promise<Record<string, unknown> | null> {
  const { data } = await createServiceClient().from("organization_integrations").select("config").eq("organization_id", organizationId).eq("kind", kind).maybeSingle();
  const config = (data as { config?: unknown } | null)?.config;
  return config && typeof config === "object" ? config as Record<string, unknown> : null;
}

export type DeliveryResult = { state: "sent" | "not_connected" | "failed"; url?: string };

async function post(url: string, init: RequestInit): Promise<Response> {
  // No redirects: a stored link must not be able to bounce the server elsewhere.
  return fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(10_000) });
}

/** Posts the message to the school's connected Slack channel. */
export async function sendToSlack(organizationId: string, text: string): Promise<DeliveryResult> {
  const config = await configFor(organizationId, "slack");
  const url = typeof config?.webhookUrl === "string" && SLACK_WEBHOOK.test(config.webhookUrl) ? config.webhookUrl : null;
  if (!url) return { state: "not_connected" };
  try {
    const response = await post(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, unfurl_links: false }) });
    return { state: response.ok ? "sent" : "failed" };
  } catch {
    return { state: "failed" };
  }
}

/** Posts the message to the school's connected Teams channel as a simple Adaptive Card. */
export async function sendToTeams(organizationId: string, title: string, text: string, link: string): Promise<DeliveryResult> {
  const config = await configFor(organizationId, "teams");
  const url = typeof config?.webhookUrl === "string" && isTeamsWebhook(config.webhookUrl) ? config.webhookUrl : null;
  if (!url) return { state: "not_connected" };
  const card = {
    type: "AdaptiveCard", $schema: "http://adaptivecards.io/schemas/adaptive-card.json", version: "1.4",
    body: [{ type: "TextBlock", text: title, weight: "Bolder", size: "Medium", wrap: true }, { type: "TextBlock", text, wrap: true }],
    actions: [{ type: "Action.OpenUrl", title: "Open in BLTZ", url: link }],
  };
  try {
    const response = await post(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "message", attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: card }] }) });
    return { state: response.ok ? "sent" : "failed" };
  } catch {
    return { state: "failed" };
  }
}

/** Creates a draft post on the school's WordPress site; staff review and publish it there. */
export async function createWordPressDraft(organizationId: string, title: string, html: string): Promise<DeliveryResult> {
  const config = await configFor(organizationId, "wordpress");
  const site = typeof config?.siteUrl === "string" ? publicSiteUrl(config.siteUrl) : null;
  if (!site || typeof config?.username !== "string" || typeof config?.appPassword !== "string") return { state: "not_connected" };
  try {
    const response = await post(`${site}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${config.username}:${config.appPassword}`).toString("base64")}` },
      body: JSON.stringify({ title, content: html, status: "draft" }),
    });
    if (!response.ok) return { state: "failed" };
    const body = await response.json().catch(() => ({})) as { id?: unknown };
    const id = typeof body.id === "number" ? body.id : null;
    return { state: "sent", ...(id ? { url: `${site}/wp-admin/post.php?post=${id}&action=edit` } : {}) };
  } catch {
    return { state: "failed" };
  }
}
