import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/rbac';
import { createServiceClient } from "@/lib/supabase/service";

const MUTABLE_AWARD_FIELDS = [
  'name',
  'description',
  'category',
  'year',
  'organization',
  'image_url',
  'source_url',
  'significance',
  'confidence_score',
] as const;

function awardUpdates(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const input = body as Record<string, unknown>;
  return Object.fromEntries(
    MUTABLE_AWARD_FIELDS
      .filter((field) => Object.hasOwn(input, field))
      .map((field) => [field, input[field]]),
  );
}

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
    const updates = awardUpdates(await request.json());
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid award fields provided' }, { status: 400 });
    }

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
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createServiceClient();
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
