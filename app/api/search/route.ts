import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const developmentOrigin = process.env.NODE_ENV === 'development' ? 'http://localhost:4173' : '';

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: developmentOrigin ? {
      'Access-Control-Allow-Origin': developmentOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    } : undefined,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': developmentOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length === 0) {
      return json({
        players: [], 
        teams: [], 
        schools: [] 
      });
    }

    const supabase = await createClient();
    const trimmedQuery = query.trim();
    
    // Search all public entity types concurrently so suggestions are not gated
    // by three sequential network round trips.
    const [playersResult, teamsResult, schoolsResult] = await Promise.all([
      supabase
        .from('players')
        .select('id, full_name, slug, profile_image, school_id, team_id, schools(name), teams(name)')
        .eq('visibility', true)
        .ilike('full_name', `%${trimmedQuery}%`)
        .limit(limit),
      supabase
        .from('teams')
        .select('id, name, slug, logo_url, school_id, schools(name)')
        .ilike('name', `%${trimmedQuery}%`)
        .limit(limit),
      supabase
        .from('schools')
        .select('id, name, slug, logo_url, city, state')
        .ilike('name', `%${trimmedQuery}%`)
        .limit(limit),
    ]);

    const { data: players, error: playersError } = playersResult;
    const { data: teams, error: teamsError } = teamsResult;
    const { data: schools, error: schoolsError } = schoolsResult;

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

    return json({
      results: allResults,
      players: formattedPlayers,
      teams: formattedTeams,
      schools: formattedSchools,
    });
  } catch (error) {
    console.error('Error in search route:', error);
    return json({ error: 'Failed to search' }, 500);
  }
}

