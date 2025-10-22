import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get all pending awards grouped by player
    const { data: awards, error } = await supabase
      .from('player_awards')
      .select(`
        *,
        players!inner(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch pending awards:', error);
      return NextResponse.json({ error: 'Failed to fetch awards' }, { status: 500 });
    }

    // Group awards by player
    const playersMap = new Map<string, any[]>();
    
    awards?.forEach((award: any) => {
      const playerName = award.players?.full_name || 'Unknown Player';
      if (!playersMap.has(playerName)) {
        playersMap.set(playerName, []);
      }
      playersMap.get(playerName)!.push(award);
    });

    const players = Array.from(playersMap.entries()).map(([playerName, awards]) => ({
      player_name: playerName,
      awards: awards.map(award => ({
        id: award.id,
        player_name: playerName,
        name: award.name,
        description: award.description,
        year: award.year,
        organization: award.organization,
        category: award.category,
        significance: award.significance,
        source_url: award.source_url,
        image_url: award.image_url,
        confidence: award.confidence || 0.5,
        verified: award.verified || false,
        created_at: award.created_at,
        needs_review: !award.verified
      }))
    }));

    return NextResponse.json({ players });
  } catch (error) {
    console.error('Error fetching pending awards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
