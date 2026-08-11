import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const quoteSchema = z.object({
  quote: z.string().trim().max(280).nullable().optional(),
  author: z.string().trim().max(80).nullable().optional(),
});

async function getOwnedPlayerId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (player?.id) return player.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("player_id")
    .eq("id", userId)
    .maybeSingle();

  return profile?.player_id ?? null;
}
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const playerId = await getOwnedPlayerId(supabase, user.id);
  if (!playerId) return NextResponse.json({ error: "Athlete profile not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("player_lockers")
    .select("quote_text, quote_author")
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to load locker quote" }, { status: 500 });
  return NextResponse.json({ quote: data?.quote_text ?? "", author: data?.quote_author ?? "" });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = quoteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Quote must be 280 characters or fewer and attribution 80 or fewer." }, { status: 400 });
  }

  const playerId = await getOwnedPlayerId(supabase, user.id);
  if (!playerId) return NextResponse.json({ error: "Athlete profile not found" }, { status: 404 });

  const quote = parsed.data.quote || null;
  const author = quote ? parsed.data.author || null : null;
  const { data, error } = await supabase
    .from("player_lockers")
    .upsert(
      { player_id: playerId, quote_text: quote, quote_author: author },
      { onConflict: "player_id" },
    )
    .select("quote_text, quote_author")
    .single();

  if (error) return NextResponse.json({ error: "Failed to save locker quote" }, { status: 500 });
  return NextResponse.json({ quote: data.quote_text ?? "", author: data.quote_author ?? "" });
}
