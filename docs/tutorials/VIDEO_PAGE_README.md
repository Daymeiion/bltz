# Video Viewing Page

This document describes the new video viewing page implementation that provides a comprehensive video watching experience similar to YouTube.

## Overview

The video viewing page is built with a responsive design that provides different layouts for desktop/tablet and mobile devices. When users click on a video from the YT video row, they are taken to `/watch/[id]` where they can watch the video with full functionality.

## Components

### 1. VideoPlayer (`components/video/VideoPlayer.tsx`)
- Custom video player with full controls
- Play/pause functionality
- Volume control with mute/unmute
- Progress bar with clickable seeking
- Skip forward/backward (10 seconds)
- Fullscreen support
- Time display (current/total)
- Responsive design

### 2. VideoSidebar (`components/video/VideoSidebar.tsx`)
- Dropdown menu with video categories:
  - **High School**: 12 Episodes (expanded by default)
  - **Collegiate**: 16 Videos (collapsed)
  - **Professional**: 0 Videos (collapsed)
- Share container with social media icons:
  - Twitter, Facebook, LinkedIn (blue)
  - Instagram, Link, Copy (gray)
- Tags section with clickable hashtags:
  - #action, #adventure, #survival, #wars, #1980, #history, #documentary

### 3. VideoComments (`components/video/VideoComments.tsx`)
- Comments header with count and sort options
- Add comment functionality
- Comment display with:
  - Author avatar and name
  - Timestamp
  - Pinned comments (highlighted)
  - Like/dislike buttons
  - Reply functionality
  - Nested replies count

### 4. VideoMetadata (`components/video/VideoMetadata.tsx`)
- Video title and metadata display
- Follow/Following button
- Engagement stats (views, likes, dislikes)
- Interactive like/dislike functionality
- Share and notify buttons
- Video description

### 5. MobileVideoLayout (`components/video/MobileVideoLayout.tsx`)
- Mobile-specific responsive design
- Tabbed interface (Related Videos / Comments)
- Condensed layout for smaller screens
- Touch-optimized controls

## Page Structure

### Desktop/Tablet Layout (`/watch/[id]`)
```
┌─────────────────────────────────────────────────────────┐
│ Video Player (Full Width)                               │
├─────────────────────────────────────────────────────────┤
│ Video Metadata (Title, Stats, Description)              │
├─────────────────────────────────────────────────────────┤
│ Comments Section                                        │
│ - Add Comment                                           │
│ - Comments List                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Sidebar                                                 │
│ - Video Categories (Dropdown)                          │
│ - Share Container                                       │
│ - Tags                                                  │
└─────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────────────────────────────────────────────┐
│ Video Player (Full Width)                               │
├─────────────────────────────────────────────────────────┤
│ Video Metadata (Condensed)                              │
├─────────────────────────────────────────────────────────┤
│ Tabs: [Related Videos] [Comments]                       │
├─────────────────────────────────────────────────────────┤
│ Tab Content                                             │
│ - Related Videos (Categories)                           │
│ - Share & Tags                                          │
│ OR                                                      │
│ - Comments Section                                      │
└─────────────────────────────────────────────────────────┘
```

## Features

### Video Player Controls
- **Play/Pause**: Spacebar or click
- **Volume**: Click speaker icon to mute/unmute
- **Seeking**: Click on progress bar to jump to specific time
- **Skip**: 10-second forward/backward buttons
- **Fullscreen**: Enter fullscreen mode
- **Time Display**: Current time / Total duration

### Interactive Elements
- **Like/Dislike**: Click to toggle, updates count
- **Follow Button**: Toggle between Follow/Following states
- **Category Dropdowns**: Expand/collapse video categories
- **Social Sharing**: Click social media icons to share
- **Comments**: Add, like, and reply to comments
- **Tags**: Click hashtags for navigation

### Responsive Behavior
- **Desktop/Tablet**: Side-by-side layout with video and sidebar
- **Mobile**: Stacked layout with tabbed navigation
- **Touch Support**: Optimized for mobile interactions

## Data Flow

1. **Video Selection**: User clicks video in YT row → navigates to `/watch/[id]`
2. **Data Loading**: Page fetches video data from Supabase or uses mock data
3. **Component Rendering**: Video player, metadata, sidebar, and comments render
4. **User Interactions**: All interactive elements update state and UI accordingly

## Styling

- **Dark Theme**: Black background with white text
- **Blue Accents**: Interactive elements use blue color scheme
- **Gray Variants**: Secondary text and inactive elements
- **Hover Effects**: Smooth transitions on interactive elements
- **Responsive Grid**: CSS Grid for desktop, Flexbox for mobile

## Integration

The video page integrates seamlessly with the existing codebase:
- Uses existing Supabase client for data fetching
- Leverages existing UI components and styling
- Maintains consistent design language
- Works with existing authentication system

## Future Enhancements

- **Video Recommendations**: AI-powered related videos
- **Live Chat**: Real-time commenting during live streams
- **Playlists**: Create and manage video playlists
- **Download**: Offline video download functionality
- **Quality Selection**: Multiple video quality options
- **Subtitles**: Closed caption support
- **Speed Control**: Playback speed adjustment
