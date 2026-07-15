import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/rbac';
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { id } = await params;
    const { verified } = await request.json();
    if (typeof verified !== 'boolean') {
      return NextResponse.json({ error: 'verified must be a boolean' }, { status: 400 });
    }

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
