import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ players: [] });
    }

    const supabase = await createClient();

    // Search players by full_name or school
    const { data: players, error } = await supabase
      .from('players')
      .select('id, full_name, school, slug, image_url, banner_url')
      .or(`full_name.ilike.%${query}%,school.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching players:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ players: players || [] });
  } catch (error) {
    console.error('Error in search players route:', error);
    return NextResponse.json(
      { error: 'Failed to search players' },
      { status: 500 }
    );
  }
}

