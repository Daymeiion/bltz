import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyAccessToken } from '@/lib/spotify/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/auth/spotify/callback`;
    const tokens = await getSpotifyAccessToken(code, redirectUri);

    // Create response and set tokens in cookies
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    response.cookies.set('spotify_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
    });

    response.cookies.set('spotify_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return NextResponse.redirect(
      new URL('/?error=token_exchange_failed', request.url)
    );
  }
}
