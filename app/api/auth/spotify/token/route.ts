import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshSpotifyToken } from '@/lib/spotify/auth';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  // If no access token but have refresh token, try to refresh
  if (!accessToken && refreshToken) {
    try {
      const tokens = await refreshSpotifyToken(refreshToken);
      accessToken = tokens.access_token;

      // Set new access token in cookie
      const response = NextResponse.json({ access_token: accessToken });
      response.cookies.set('spotify_access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.expires_in,
      });

      return response;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 });
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 });
  }

  return NextResponse.json({ access_token: accessToken });
}
