# 🎵 Spotify Mini Player Setup Guide

## Overview
The Spotify Mini Player integrates the Spotify Web Playback SDK to allow users to play music directly in the BLTZ app.

## Prerequisites
- Spotify Premium account (required for Web Playback SDK)
- Spotify Developer account

## Setup Instructions

### 1. Create Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create app"
3. Fill in app details:
   - **App name**: BLTZ Player
   - **App description**: Music player for BLTZ platform
   - **Redirect URI**: `http://localhost:3000/api/auth/spotify/callback`
   - For production, add: `https://your-domain.com/api/auth/spotify/callback`
4. Click "Save"
5. Copy your **Client ID** and **Client Secret**

### 2. Add Environment Variables
Add these to your `.env.local` file:

```bash
# Spotify API Credentials
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### 3. User Authentication Flow

#### First-Time Setup
Users need to connect their Spotify account:

1. Add a "Connect Spotify" button in your UI
2. Button redirects to: `/api/auth/spotify/login`
3. User authorizes the app on Spotify
4. Spotify redirects back to your callback URL
5. Access token is stored in HTTP-only cookies

#### Login Route
Create `/app/api/auth/spotify/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify/auth';

export async function GET(request: NextRequest) {
  const redirectUri = `${request.nextUrl.origin}/api/auth/spotify/callback`;
  const authUrl = getSpotifyAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
```

### 4. How It Works

#### Authentication Flow
```
User clicks "Connect Spotify"
    ↓
Redirects to Spotify Authorization
    ↓
User grants permissions
    ↓
Spotify redirects to callback
    ↓
Exchange code for access token
    ↓
Store tokens in HTTP-only cookies
    ↓
Player can now stream music
```

#### Player Initialization
1. SpotifyMiniPlayer component loads Spotify Web Playback SDK
2. Fetches access token from `/api/auth/spotify/token`
3. Creates a new Spotify.Player instance
4. Connects to Spotify's servers
5. Receives a device ID
6. Player is ready to stream music

### 5. Features

#### Current Implementation
- ✅ Play/Pause controls
- ✅ Skip to next track
- ✅ Repeat track
- ✅ Real-time progress bar
- ✅ Current track info (title, artist, album)
- ✅ Album art display
- ✅ Countdown timer
- ✅ Hover state controls

#### Player Controls
- **Play/Pause**: Toggle playback
- **Skip Forward**: Go to next track
- **Repeat**: Set track to repeat mode

### 6. API Scopes
The player requests these Spotify permissions:
- `streaming` - Play music in the browser
- `user-read-email` - Read user email
- `user-read-private` - Access private user data
- `user-read-playback-state` - Read playback state
- `user-modify-playback-state` - Control playback
- `user-library-read` - Access user's library
- `playlist-read-private` - Read private playlists
- `playlist-read-collaborative` - Read collaborative playlists

### 7. Testing

#### Local Testing
1. Make sure you have Spotify Premium
2. Click "Connect Spotify" button
3. Authorize the app
4. Open Spotify mini player
5. Click play - music should start

#### Troubleshooting
- **"Failed to initialize"**: Check if Spotify Premium is active
- **"Authentication error"**: Verify Client ID and Client Secret
- **"Account error"**: User must have Spotify Premium
- **No music playing**: Check browser console for errors

### 8. Production Deployment

#### Update Redirect URIs
1. Go to your Spotify app settings
2. Add production callback URL: `https://your-domain.com/api/auth/spotify/callback`
3. Update environment variables with production credentials

#### Security Best Practices
- ✅ Access tokens stored in HTTP-only cookies
- ✅ CSRF protection enabled
- ✅ Secure cookies in production (HTTPS only)
- ✅ Token refresh flow implemented
- ✅ Client secrets never exposed to browser

### 9. File Structure
```
with-supabase-app/
├── components/
│   └── player/
│       └── SpotifyMiniPlayer.tsx       # Main player component
├── lib/
│   └── spotify/
│       └── auth.ts                      # OAuth helper functions
├── app/
│   └── api/
│       └── auth/
│           └── spotify/
│               ├── callback/
│               │   └── route.ts         # OAuth callback handler
│               ├── login/
│               │   └── route.ts         # Initiates OAuth flow
│               └── token/
│                   └── route.ts         # Returns access token
└── types/
    └── spotify.d.ts                     # TypeScript definitions
```

### 10. Future Enhancements
- [ ] Volume control
- [ ] Seek/scrub functionality
- [ ] Queue management
- [ ] Playlist selection
- [ ] Search functionality
- [ ] Like/save tracks
- [ ] Full-screen player mode

## Support
For issues with Spotify integration, check:
- [Spotify Web Playback SDK Documentation](https://developer.spotify.com/documentation/web-playback-sdk)
- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api)

## Notes
- Spotify Premium is **required** for Web Playback SDK
- Access tokens expire after 1 hour
- Refresh tokens are used to get new access tokens automatically
- Player works in all modern browsers (Chrome, Firefox, Safari, Edge)
