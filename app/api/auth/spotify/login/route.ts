import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify/auth';

export async function GET(request: NextRequest) {
  const redirectUri = `${request.nextUrl.origin}/api/auth/spotify/callback`;
  const authUrl = getSpotifyAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
