# Admin Analytics Database Setup

## Overview
This document explains the database schema and API setup for the BLTZ admin analytics dashboard.

## Database Tables Created

### 1. `video_engagement`
Tracks all user interactions with videos.

**Columns:**
- `id` (uuid, primary key)
- `video_id` (uuid, foreign key → videos)
- `user_id` (uuid, foreign key → auth.users)
- `engagement_type` (text: 'like', 'comment', 'share', 'view')
- `metadata` (jsonb: additional data)
- `created_at` (timestamptz)

**Indexes:**
- `idx_video_engagement_video_id`
- `idx_video_engagement_type`
- `idx_video_engagement_created_at`

**RLS:** Admin-only read access

---

### 2. `user_activity`
Tracks user actions across the platform.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → auth.users)
- `activity_type` (text: 'login', 'logout', 'video_upload', 'profile_update', 'invite_sent', 'message_sent')
- `metadata` (jsonb)
- `created_at` (timestamptz)

**Indexes:**
- `idx_user_activity_user_id`
- `idx_user_activity_type`
- `idx_user_activity_created_at`

**RLS:** Admin-only read access

---

### 3. `user_locations`
Stores geographic data for users.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → auth.users, unique)
- `country` (text)
- `state` (text)
- `city` (text)
- `timezone` (text)
- `ip_address` (inet)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes:**
- `idx_user_locations_state`
- `idx_user_locations_country`

**RLS:** Admin-only read access

---

### 4. `user_devices`
Tracks device types used by users.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → auth.users)
- `device_type` (text: 'mobile', 'tablet', 'desktop')
- `browser` (text)
- `os` (text)
- `last_used_at` (timestamptz)
- `created_at` (timestamptz)

**Indexes:**
- `idx_user_devices_user_id`
- `idx_user_devices_type`

**RLS:** Admin-only read access

---

### 5. `traffic_sources`
Tracks where users come from.

**Columns:**
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key → auth.users)
- `source` (text: 'direct', 'social', 'referral', 'email', 'search')
- `referrer_url` (text)
- `utm_source` (text)
- `utm_medium` (text)
- `utm_campaign` (text)
- `created_at` (timestamptz)

**Indexes:**
- `idx_traffic_sources_source`
- `idx_traffic_sources_created_at`

**RLS:** Admin-only read access

---

### 6. `daily_analytics`
Daily aggregated analytics summary.

**Columns:**
- `id` (uuid, primary key)
- `summary_date` (date, unique)
- `total_users` (integer)
- `new_users` (integer)
- `active_users` (integer)
- `total_views` (integer)
- `total_likes` (integer)
- `total_comments` (integer)
- `total_shares` (integer)
- `total_videos_uploaded` (integer)
- `avg_session_duration_seconds` (integer)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes:**
- `idx_daily_analytics_date`

**RLS:** Admin-only read access

---

## Updated Tables

### `profiles`
Added `publisher` role to the role constraint.

**Updated constraint:**
```sql
CHECK (role IN ('player', 'fan', 'admin', 'publisher'))
```

---

## API Endpoints

All endpoints require admin authentication.

### 1. **GET** `/api/admin/analytics/engagement?days=7`
Returns engagement metrics (likes, comments, shares, views) grouped by date.

**Query params:**
- `days` (optional, default: 7): Number of days to fetch (7, 30, or 90)

**Response:**
```json
[
  {
    "date": "Mon",
    "likes": 1200,
    "comments": 340,
    "shares": 180,
    "views": 8500
  }
]
```

---

### 2. **GET** `/api/admin/analytics/locations`
Returns user distribution by state.

**Response:**
```json
[
  {
    "state": "California",
    "users": 4820,
    "percentage": 28
  }
]
```

---

### 3. **GET** `/api/admin/analytics/invites`
Returns invitation statistics by channel.

**Response:**
```json
[
  {
    "source": "Email",
    "sent": 2400,
    "accepted": 1680,
    "rate": 70
  }
]
```

---

### 4. **GET** `/api/admin/analytics/revenue`
Returns revenue breakdown by source (subscriptions, ads, partnerships).

**Response:**
```json
[
  {
    "month": "Jan",
    "subscriptions": 12500,
    "ads": 4200,
    "partnerships": 8300
  }
]
```

---

### 5. **GET** `/api/admin/analytics/top-videos?limit=5`
Returns top performing videos.

**Query params:**
- `limit` (optional, default: 5): Number of videos to return

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Game Winning Touchdown vs USC",
    "creator": "Eddie Lake",
    "views": 45200,
    "likes": 8940,
    "shares": 2340,
    "engagement": 24.8
  }
]
```

---

### 6. **GET** `/api/admin/analytics/users`
Returns user statistics by role.

**Response:**
```json
{
  "totalUsers": 17200,
  "totalPlayers": 1240,
  "totalFans": 15800,
  "totalPublishers": 160
}
```

---

## Query Functions

Located in `lib/queries/analytics.ts`:

- `getEngagementMetrics(days)` - Fetch engagement data
- `getLocationBreakdown()` - Fetch user location data
- `getInviteAnalytics()` - Fetch invite statistics
- `getRevenueData()` - Fetch revenue breakdown
- `getTopVideos(limit)` - Fetch top performing videos
- `getUserStats()` - Fetch user counts by role

All functions include **mock data fallbacks** if the database is empty or returns errors.

---

## How to Populate Data

### Manual Testing Data

You can insert test data using the Supabase SQL editor:

```sql
-- Insert test video engagement
INSERT INTO video_engagement (video_id, user_id, engagement_type)
SELECT 
  (SELECT id FROM videos LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  (ARRAY['like', 'comment', 'share', 'view'])[floor(random() * 4 + 1)]
FROM generate_series(1, 100);

-- Insert test user locations
INSERT INTO user_locations (user_id, state, country)
SELECT 
  id,
  (ARRAY['California', 'Texas', 'Florida', 'New York', 'Nevada'])[floor(random() * 5 + 1)],
  'USA'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_locations);

-- Insert test user activity
INSERT INTO user_activity (user_id, activity_type)
SELECT 
  (SELECT id FROM auth.users ORDER BY random() LIMIT 1),
  (ARRAY['login', 'logout', 'video_upload', 'profile_update'])[floor(random() * 4 + 1)]
FROM generate_series(1, 50);
```

### Production Data Collection

To collect real data, you'll need to:

1. **Track video engagement** - Add tracking to video player components
2. **Track user activity** - Add tracking to auth flows and major actions
3. **Capture location data** - Use IP geolocation on signup/login
4. **Track device info** - Parse user agent strings
5. **Track traffic sources** - Capture UTM parameters and referrers

---

## Security

All analytics tables have RLS policies that only allow admin users to read data:

```sql
CREATE POLICY "Admin can view all [table]" ON [table]
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

---

## Next Steps

1. **Wire up components** - Update analytics components to fetch from API endpoints
2. **Add tracking code** - Implement event tracking throughout the app
3. **Create aggregation jobs** - Set up cron jobs to populate `daily_analytics`
4. **Add more metrics** - Expand based on business needs

---

## Component Integration Example

```tsx
// In your analytics component
"use client";

import { useEffect, useState } from "react";

export function EngagementChart() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetch("/api/admin/analytics/engagement?days=7")
      .then(res => res.json())
      .then(setData);
  }, []);
  
  // Render chart with data
}
```

---

## Troubleshooting

**Issue:** API returns empty arrays
- **Solution:** Check if tables have data, use mock data fallbacks

**Issue:** 403 Unauthorized
- **Solution:** Ensure user has admin role in profiles table

**Issue:** Slow queries
- **Solution:** Ensure indexes are created, consider adding more specific indexes

---

## Migration Applied

Migration name: `create_analytics_tables`
Applied: ✅

To rollback (if needed):
```sql
DROP TABLE IF EXISTS video_engagement CASCADE;
DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS user_locations CASCADE;
DROP TABLE IF EXISTS user_devices CASCADE;
DROP TABLE IF EXISTS traffic_sources CASCADE;
DROP TABLE IF EXISTS daily_analytics CASCADE;
```

