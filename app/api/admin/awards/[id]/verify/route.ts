import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
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
