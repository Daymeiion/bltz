import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { verified } = await request.json();

    const { data, error } = await supabase
      .from('player_awards')
      .update({ verified })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to verify award:', error);
      return NextResponse.json({ error: 'Failed to verify award' }, { status: 500 });
    }

    return NextResponse.json({ award: data });
  } catch (error) {
    console.error('Error verifying award:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
