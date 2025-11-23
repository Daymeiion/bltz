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
    const updates = await request.json();

    const { data, error } = await supabase
      .from('player_awards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update award:', error);
      return NextResponse.json({ error: 'Failed to update award' }, { status: 500 });
    }

    return NextResponse.json({ award: data });
  } catch (error) {
    console.error('Error updating award:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('player_awards')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete award:', error);
      return NextResponse.json({ error: 'Failed to delete award' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting award:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
