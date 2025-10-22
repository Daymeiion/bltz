# Achievements System

## Overview

The achievements system provides a gamified experience for players to unlock rewards and track their progress on the BLTZ platform. It features a macOS-style dock interface with a carousel display for viewing achievement details.

## Features

### 🏆 Achievement Types
- **Common**: Basic achievements (10 points)
- **Rare**: Intermediate achievements (50-75 points)  
- **Epic**: Advanced achievements (100-200 points)
- **Legendary**: Ultimate achievements (500-1000 points)

### 🎨 Visual Design
- **macOS-style dock**: Interactive achievement icons with hover effects
- **Carousel display**: Large achievement cards with progress tracking
- **Rarity indicators**: Color-coded borders and icons
- **Progress bars**: Visual progress tracking for incomplete achievements

### 📊 Statistics
- Total achievements unlocked
- Completion rate percentage
- Legendary achievement count
- Real-time progress tracking

## Database Schema

### Tables Created

#### `achievements`
- Stores all available achievements
- Includes rarity, category, criteria, and point values
- Supports JSON criteria for flexible achievement conditions

#### `player_achievements`
- Tracks which achievements each player has unlocked
- Stores unlock timestamps and progress data
- One-to-many relationship with players

#### `achievement_progress`
- Tracks progress towards incomplete achievements
- Supports percentage-based progress tracking
- Automatically unlocks achievements when progress reaches 100%

## API Endpoints

### `GET /api/achievements`
Returns all achievements for the current player with progress and statistics.

## Achievement Categories

1. **Content Creation**: Video uploads, consistency
2. **Engagement**: Views, viral content, quick growth
3. **Community**: Moderation, helpful actions
4. **Rankings**: Leaderboard positions
5. **Recognition**: Awards, special achievements
6. **Collection**: Achievement milestones

## Sample Achievements

- **First Steps**: Upload your first video (Common)
- **Viral Sensation**: Get 10,000 views on a single video (Epic)
- **Consistent Creator**: Upload 10 videos in a month (Rare)
- **Lightning Fast**: Get 1,000 views within 24 hours (Rare)
- **Community Guardian**: Moderate 50 comments/reports (Epic)
- **Royalty**: Become a top 10 player (Legendary)
- **Award Winner**: Win a monthly content award (Epic)
- **Medal Collector**: Unlock 25 different achievements (Legendary)

## Usage

1. Navigate to `/dashboard/achievements`
2. View achievements in the macOS-style dock
3. Click achievement icons to see details in the carousel
4. Track progress with visual progress bars
5. View statistics in the bottom section

## Technical Implementation

- **Frontend**: React with Framer Motion animations
- **Backend**: Supabase with Row Level Security
- **Database**: PostgreSQL with JSON criteria support
- **Styling**: Tailwind CSS with custom BLTZ theme
- **Icons**: Lucide React icon library

## Future Enhancements

- Achievement notifications
- Social sharing of achievements
- Achievement badges for profiles
- Seasonal/limited-time achievements
- Achievement leaderboards
- Custom achievement creation by admins
