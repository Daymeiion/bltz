import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile?.player_id) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const playerId = formData.get('playerId') as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    const supabase = await createClient();

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `headshot-${playerId}-${Date.now()}.${fileExt}`;
    const filePath = `headshots/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('player-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('player-assets')
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // Update player profile with new image URL
    const { error: updateError } = await supabase
      .from('players')
      .update({ profile_image: imageUrl })
      .eq('id', playerId);

    if (updateError) {
      console.error("Error updating player profile:", updateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      message: "Headshot uploaded successfully"
    });

  } catch (error) {
    console.error("Error uploading headshot:", error);
    return NextResponse.json({ error: "Failed to upload headshot" }, { status: 500 });
  }
}
