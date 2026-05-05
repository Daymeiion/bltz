import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { hasRole } from "@/lib/rbac";

export const runtime = "nodejs";

const Body = z.object({
  player_id: z.string().uuid(),
  expires_in_hours: z.number().int().min(1).max(24 * 30).optional(),
});

/**
 * Mint a claim token for an existing player record (founder archive entry).
 * Admins-only. The athlete redeems it by visiting `/onboarding/claim/[token]`.
 */
export async function POST(req: Request) {
  if (!(await hasRole(["admin", "publisher"]))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "invalid_input", detail: e?.message }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data: player, error: playerErr } = await sb
    .from("players")
    .select("id, slug, full_name")
    .eq("id", body.player_id)
    .maybeSingle();

  if (playerErr || !player) {
    return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  }

  const token = randomBytes(24).toString("base64url");
  const hours = body.expires_in_hours ?? 24 * 14;
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const { error: insertErr } = await sb.from("claim_tokens").insert({
    player_id: body.player_id,
    token,
    expires_at: expiresAt,
  });
  if (insertErr) {
    return NextResponse.json({ error: "could_not_mint", detail: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    token,
    claim_url: `/onboarding/claim/${token}`,
    player: { id: player.id, slug: player.slug, full_name: player.full_name },
    expires_at: expiresAt,
  });
}
