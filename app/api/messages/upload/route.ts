import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserProfile, isInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

// Image size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_COMPRESSED_SIZE = 1 * 1024 * 1024; // 1MB after compression
const MAX_DIMENSIONS = 2048; // Max width/height

// Allowed image types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const messageId = formData.get('messageId') as string;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }
    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id')
      .eq('id', messageId)
      .maybeSingle();

    if (messageError) {
      console.error("Error checking message access:", messageError);
      return NextResponse.json({ error: "Failed to verify message access" }, { status: 500 });
    }
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    const isParticipant =
      message.sender_id === profile.id || message.recipient_id === profile.id;
    if (!isParticipant && !(await isInternalAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` 
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    // Process image with Sharp
    let processedImage = sharp(imageBuffer);
    const metadata = await processedImage.metadata();

    // Resize if too large
    if (metadata.width && metadata.height) {
      if (metadata.width > MAX_DIMENSIONS || metadata.height > MAX_DIMENSIONS) {
        processedImage = processedImage.resize(MAX_DIMENSIONS, MAX_DIMENSIONS, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }

    // Compress image
    let compressedBuffer: Buffer;
    let finalSize: number;
    let compressionLevel = 80;

    do {
      compressedBuffer = await processedImage
        .jpeg({ quality: compressionLevel, progressive: true })
        .toBuffer();
      
      finalSize = compressedBuffer.length;
      compressionLevel -= 10;
    } while (finalSize > MAX_COMPRESSED_SIZE && compressionLevel > 20);

    // If still too large, resize more aggressively
    if (finalSize > MAX_COMPRESSED_SIZE) {
      processedImage = sharp(imageBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true });
      
      compressedBuffer = await processedImage
        .jpeg({ quality: 70, progressive: true })
        .toBuffer();
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${messageId}/${profile.id}/message-${timestamp}-${randomString}.jpg`;
    const thumbnailName = `${messageId}/${profile.id}/thumb-${timestamp}-${randomString}.jpg`;

    // Upload to Supabase Storage
    // Upload main image
    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from('message-images')
      .upload(fileName, compressedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    // Create thumbnail
    const thumbnailBuffer = await sharp(compressedBuffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 60 })
      .toBuffer();

    // Upload thumbnail
    const { data: _thumbData, error: thumbError } = await supabase.storage
      .from('message-images')
      .upload(thumbnailName, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });

    if (thumbError) {
      console.error("Error uploading thumbnail:", thumbError);
      // Continue without thumbnail
    }

    // Get public URLs
    const { data: imageUrl } = supabase.storage
      .from('message-images')
      .getPublicUrl(fileName);

    const { data: thumbUrl } = supabase.storage
      .from('message-images')
      .getPublicUrl(thumbnailName);

    // Save attachment record to database
    const { data: attachment, error: dbError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        file_name: file.name,
        file_path: imageUrl.publicUrl,
        file_size: compressedBuffer.length,
        mime_type: 'image/jpeg',
        file_type: 'image',
        width: metadata.width,
        height: metadata.height,
        thumbnail_path: thumbUrl.publicUrl,
        is_compressed: true,
        original_size: file.size
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error saving attachment:", dbError);
      return NextResponse.json({ error: "Failed to save attachment" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attachment: {
        id: attachment.id,
        fileName: file.name,
        filePath: imageUrl.publicUrl,
        thumbnailPath: thumbUrl.publicUrl,
        fileSize: compressedBuffer.length,
        originalSize: file.size,
        width: metadata.width,
        height: metadata.height,
        compressionRatio: Math.round((1 - compressedBuffer.length / file.size) * 100)
      }
    });

  } catch (error) {
    console.error("Error in image upload:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
