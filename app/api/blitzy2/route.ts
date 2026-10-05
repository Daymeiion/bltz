// app/api/blitzy2/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { fullName, school } = await req.json();

  // 1) mock normalized payload (replace with OpenAI + scraping later)
  const normalized = {
    fullName,
    school,
    position: 'CB',
    imageUrl: null,
    meta: { source: 'mock', ts: new Date().toISOString() },
    stats: { tackles: 80, ints: 4 }
  };

  // 2) upsert player by (name, school) to get player_id
  const slug = `${fullName}`.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  const { data: player, error } = await supabase
    .from('players')
    .upsert({ slug, full_name: fullName, school, meta: normalized.meta }, { onConflict: 'slug' })
    .select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 3) upsert locker
  await supabase
    .from('player_lockers')
    .upsert({ player_id: player.id, headline: `${fullName} — ${school}`, stats: normalized.stats });

  return NextResponse.json({ ok: true, playerId: player.id, slug });
}
