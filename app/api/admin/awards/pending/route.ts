import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/rbac';
import { createServiceClient } from "@/lib/supabase/service";
import type { PlayerAward } from "@/types/database";

export async function GET() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createServiceClient();
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
    type AwardWithPlayer = PlayerAward & {
      players: { full_name: string | null } | null;
    };
    const typedAwards = (awards ?? []) as AwardWithPlayer[];
    const playersMap = new Map<string, AwardWithPlayer[]>();
    
    typedAwards.forEach((award) => {
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
        confidence: award.confidence_score ?? 0.5,
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
