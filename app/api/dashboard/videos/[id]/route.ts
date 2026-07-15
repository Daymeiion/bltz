import { NextResponse } from "next/server";
import { getCurrentUserProfile, type UserProfile } from "@/lib/rbac";
import { updateVideo, deleteVideo, getVideoById } from "@/lib/queries/videos";
import { createClient } from "@/lib/supabase/server";

type OwnedVideo = {
  owner_user_id: string | null;
  player_id: string | null;
};

async function canManageVideo(profile: UserProfile, video: OwnedVideo): Promise<boolean> {
  if (profile.role === 'admin' || video.owner_user_id === profile.id) return true;
  if (profile.player_id && video.player_id === profile.player_id) return true;
  if (!video.player_id) return false;

  const supabase = await createClient();
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('id', video.player_id)
    .eq('user_id', profile.id)
    .maybeSingle();
  return Boolean(player);
}

// GET - Fetch a single video
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const video = await getVideoById(id);

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    if (!(await canManageVideo(profile, video))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ video });
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 500 }
    );
  }
}

// PUT - Update a video
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingVideo = await getVideoById(id);
    if (!existingVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    if (!(await canManageVideo(profile, existingVideo))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    
    const video = await updateVideo(id, {
      title: body.title,
      description: body.description,
      thumbnail_url: body.thumbnail_url,
      playback_url: body.playback_url,
      duration_seconds: body.duration_seconds,
      tags: body.tags,
      visibility: body.visibility,
    });

    return NextResponse.json({ video });
  } catch (error) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: "Failed to update video" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a video
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingVideo = await getVideoById(id);
    if (!existingVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    if (!(await canManageVideo(profile, existingVideo))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteVideo(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}

