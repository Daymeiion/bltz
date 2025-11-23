import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ 
        players: [], 
        teams: [], 
        schools: [] 
      });
    }

    const supabase = await createClient();
    const trimmedQuery = query.trim();
    
    // Search players by full_name
    // Supabase ilike works with pattern matching - use %query% format
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, full_name, slug, profile_image, school_id, team_id, schools(name), teams(name)')
      .eq('visibility', true)
      .ilike('full_name', `%${trimmedQuery}%`)
      .limit(limit);

    // Debug logging
    if (playersError) {
      console.error('[SEARCH API] Players error:', {
        message: playersError.message,
        details: playersError.details,
        hint: playersError.hint,
        code: playersError.code,
        query: trimmedQuery
      });
    }

    // Search teams by name
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, slug, logo_url, school_id, schools(name)')
      .ilike('name', `%${trimmedQuery}%`)
      .limit(limit);

    // Search schools by name
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, slug, logo_url, city, state')
      .ilike('name', `%${trimmedQuery}%`)
      .limit(limit);

    if (playersError) {
      console.error('Error searching players:', playersError);
    }
    if (teamsError) {
      console.error('Error searching teams:', teamsError);
    }
    if (schoolsError) {
      console.error('Error searching schools:', schoolsError);
    }

    // Format results with type indicators
    const formattedPlayers = (players || []).map((player: any) => ({
      type: 'player' as const,
      id: player.id,
      name: player.full_name,
      slug: player.slug,
      image_url: player.profile_image || null, // Map profile_image to image_url for frontend
      banner_url: null, // banner_url doesn't exist in players table
      school: player.schools?.name || null,
      team: player.teams?.name || null,
    }));

    const formattedTeams = (teams || []).map((team: any) => ({
      type: 'team' as const,
      id: team.id,
      name: team.name,
      slug: team.slug,
      logo_url: team.logo_url,
      school: team.schools?.name || null,
    }));

    const formattedSchools = (schools || []).map((school: any) => ({
      type: 'school' as const,
      id: school.id,
      name: school.name,
      slug: school.slug,
      logo_url: school.logo_url,
      city: school.city,
      state: school.state,
    }));

    // Combine all results
    const allResults = [
      ...formattedPlayers,
      ...formattedTeams,
      ...formattedSchools,
    ].slice(0, limit);

    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[SEARCH API] Results:', {
        query: trimmedQuery,
        playersFound: formattedPlayers.length,
        teamsFound: formattedTeams.length,
        schoolsFound: formattedSchools.length,
        totalResults: allResults.length,
        samplePlayer: formattedPlayers[0] || null
      });
    }

    return NextResponse.json({ 
      results: allResults,
      players: formattedPlayers,
      teams: formattedTeams,
      schools: formattedSchools,
    });
  } catch (error) {
    console.error('Error in search route:', error);
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}

