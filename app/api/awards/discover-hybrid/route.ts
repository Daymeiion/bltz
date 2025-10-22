import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { discoverPlayerAwardsHybrid } from '@/lib/awards/hybrid-discovery';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { player_id } = await request.json();

    if (!player_id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Get player data
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('full_name, school, team, position')
      .eq('id', player_id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    console.log(`🔍 Starting hybrid discovery for ${player.full_name}...`);

    // Use hybrid discovery system
    const result = await discoverPlayerAwardsHybrid(
      player.full_name,
      'Football',
      player.school || '',
      player.team ? [player.team] : []
    );

    console.log(`✅ Found ${result.awards.length} awards for ${player.full_name}`);

    // Save awards to database
    const awardsToSave = result.awards.map(award => ({
      player_id,
      name: award.name,
      description: award.description,
      year: award.year,
      organization: award.organization,
      category: award.category,
      significance: award.significance,
      source_url: award.source_url,
      image_url: award.image_url,
      confidence: award.confidence,
      verified: award.verified,
      needs_review: !award.verified
    }));

    if (awardsToSave.length > 0) {
      const { error: saveError } = await supabase
        .from('player_awards')
        .upsert(awardsToSave, { 
          onConflict: 'player_id,name,year',
          ignoreDuplicates: false 
        });

      if (saveError) {
        console.error('Failed to save awards:', saveError);
        return NextResponse.json({ error: 'Failed to save awards' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      player_name: result.player_name,
      awards_found: result.awards.length,
      verified_count: result.verified_count,
      confidence_score: result.confidence_score,
      sources_checked: result.sources_checked
    });

  } catch (error) {
    console.error('Hybrid discovery failed:', error);
    return NextResponse.json({ 
      error: 'Award discovery failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
