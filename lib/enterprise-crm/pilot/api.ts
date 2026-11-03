import "server-only";

import type { ExecutivePermission } from "@/lib/enterprise-crm/auth/permissions";
import { authorizeWorkspaceRequest } from "@/lib/enterprise-crm/workspace-access";
import type { OrganizationContext } from "@/lib/organization/types";
import { loadSchoolRoster } from "./former-players";
import { validGettyItem, verifyUpload } from "./media";

export const API_HEADERS = { "Cache-Control": "private, no-store" };

export function apiError(state: string, status: number) {
  return Response.json({ state }, { status, headers: API_HEADERS });
}

/** Same-origin browser writes only. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin) && origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}

/** Authorizes a workspace write and returns the actor and organization. */
export async function authorizeWrite(request: Request, organizationId: string, permission: ExecutivePermission):
  Promise<{ ok: true; context: OrganizationContext } | { ok: false; response: Response }> {
  if (!isSameOrigin(request)) return { ok: false, response: apiError("forbidden", 403) };
  const auth = await authorizeWorkspaceRequest(organizationId, permission);
  if (!auth.ok) return { ok: false, response: apiError(auth.status === 401 ? "unauthenticated" : "forbidden", auth.status) };
  return { ok: true, context: auth.context };
}

/** A school may only act on its own former players. */
export async function isSchoolPlayer(context: OrganizationContext, playerId: string): Promise<boolean> {
  return areSchoolPlayers(context, [playerId]);
}

export async function areSchoolPlayers(context: OrganizationContext, playerIds: readonly string[]): Promise<boolean> {
  const roster = await loadSchoolRoster(context);
  const own = new Set(roster.players.map((player) => player.id));
  return playerIds.every((id) => own.has(id));
}

/** Uploads must belong to this school and player; Getty items must name a real Getty asset page. */
export async function validMediaItems(context: OrganizationContext, playerId: string | null, items: ReadonlyArray<{ source: "link" | "upload" | "getty"; storagePath?: string | null; url?: string | null; externalId?: string | null }>): Promise<boolean> {
  for (const item of items) {
    if (item.source === "upload" && !(playerId && item.storagePath && await verifyUpload(context.organization.id, playerId, item.storagePath))) return false;
    if (item.source === "getty" && !validGettyItem(item.url, item.externalId)) return false;
  }
  return true;
}

/** Name and headshot for each of the school's players, for activation avatars. */
export async function schoolPlayerDirectory(context: OrganizationContext) {
  const roster = await loadSchoolRoster(context);
  return new Map(roster.players.map((player) => [player.id, { name: player.name, portraitUrl: player.portraitUrl }]));
}
