# 📐 Dashboard Layout Guide

## New Dashboard Structure

The dashboard has been redesigned with a modern, professional layout featuring the welcome header at the top and organized widget sections.

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR  │  DASHBOARD CONTENT                                  │
│           │                                                      │
│  Logo     │  ┌─────────────────────────────────────────────┐  │
│           │  │ WELCOME HEADER (Top)                        │  │
│  Nav      │  │ "Welcome back, Test Player!"                │  │
│  Links    │  │ [Upload Video] [Edit Profile]               │  │
│           │  └─────────────────────────────────────────────┘  │
│           │                                                      │
│           │  ┌──────┬──────┬──────┬──────┐                    │
│           │  │Videos│ Views│Follow│Achiev│  4 Stats Cards      │
│           │  │  12  │ 1,248│  342 │   8  │                     │
│  User     │  └──────┴──────┴──────┴──────┘                    │
│  Profile  │                                                      │
│  (Bottom) │  ┌──────────────────────┬──────────┐               │
│           │  │  Recent Videos       │ Activity │               │
│           │  │  (2/3 width)         │ Feed     │               │
│           │  │                      │ (1/3)    │               │
│           │  └──────────────────────┴──────────┘               │
│           │                                                      │
│           │  ┌─────────────────────────────────┐               │
│           │  │  Performance Overview Chart      │               │
│           │  │  [Week] [Month] [Year]          │               │
│           │  └─────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Section Breakdown

### 1. Welcome Header (NEW - Top)
**Location:** Top of dashboard
**Features:**
- Large welcome message with user's name
- Subtitle: "Here's what's happening with your profile today"
- Two action buttons:
  - **Upload Video** (Blue primary button)
  - **Edit Profile** (Secondary outline button)
- Responsive: Stacks vertically on mobile

**Purpose:** Quick access to primary actions and personalized greeting

---

### 2. Stats Cards Row
**Layout:** 4 cards in a row (stacks on mobile)
**Cards:**

#### Card 1: Total Videos (Blue)
- Icon: Video camera
- Count: 12
- Growth: "+2 this week"

#### Card 2: Profile Views (Purple)
- Icon: Chart bar
- Count: 1,248
- Growth: "+12% from last month"

#### Card 3: Followers (Green)
- Icon: Users
- Count: 342
- Growth: "+23 this week"

#### Card 4: Achievements (Orange)
- Icon: Trophy
- Count: 8
- Status: "2 unlocked recently"

**Design:** Gradient backgrounds, colored borders, icons, and growth indicators

---

### 3. Main Content Grid
**Layout:** 3-column grid (responsive)

#### Recent Videos (2/3 width - Left)
- Section title: "Recent Videos"
- "View All" link
- 3 video placeholders (skeleton loaders)
- Each shows:
  - Thumbnail preview
  - Video title
  - Metadata

**Ready for real data:**
```typescript
// Fetch actual videos:
const videos = await getPlayerVideos(profile.player_id);
```

#### Activity Feed (1/3 width - Right)
- Section title: "Recent Activity"
- 5 activity items (skeleton loaders)
- Blue dot indicators
- Timestamp placeholders

**Ready for real data:**
```typescript
// Fetch recent activity:
const activities = await getUserActivities(profile.id);
```

---

### 4. Performance Overview Chart
**Location:** Bottom of dashboard
**Features:**
- Section title: "Performance Overview"
- Time period toggles:
  - Week (active)
  - Month
  - Year
- Chart placeholder (264px height)

**Ready for integration:**
- Add charts library (Recharts, Chart.js, etc.)
- Display views, engagement, or video performance
- Interactive time period selection

---

## Color Scheme

### Stats Cards Gradients:
- **Videos:** Blue (#3B82F6) - Trust, reliability
- **Views:** Purple (#A855F7) - Creativity, engagement
- **Followers:** Green (#10B981) - Growth, success
- **Achievements:** Orange (#F97316) - Energy, accomplishment

### Backgrounds:
- **Cards:** Neutral-50 (light) / Neutral-800/50 (dark)
- **Main:** White (light) / Neutral-900 (dark)
- **Borders:** Neutral-200 (light) / Neutral-700 (dark)

### Buttons:
- **Primary:** Blue-600 (#2563EB) with hover blue-700
- **Secondary:** Border with neutral colors

---

## Responsive Behavior

### Desktop (≥1024px)
- 4 stats cards in a row
- 3-column grid (2 + 1 layout)
- Welcome header: horizontal layout with buttons on right

### Tablet (768px - 1023px)
- 2 stats cards per row (2x2 grid)
- Videos and Activity stack vertically
- Welcome header: horizontal layout

### Mobile (<768px)
- Stats cards stack vertically (1 per row)
- All content stacks vertically
- Welcome header: vertical layout with buttons below text
- Sidebar becomes hamburger menu

---

## Widget Placeholders

All widgets currently show skeleton loaders (animated gray boxes) as placeholders. These are ready to be replaced with real data:

### To Add Real Data:

1. **Recent Videos Widget:**
```typescript
// components/dashboard/RecentVideos.tsx
import { getPlayerVideos } from "@/lib/queries";

export async function RecentVideos({ playerId }) {
  const videos = await getPlayerVideos(playerId, { limit: 3 });
  
  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
```

2. **Activity Feed Widget:**
```typescript
// components/dashboard/ActivityFeed.tsx
import { getUserActivities } from "@/lib/queries";

export async function ActivityFeed({ userId }) {
  const activities = await getUserActivities(userId, { limit: 5 });
  
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
```

3. **Performance Chart:**
```typescript
// components/dashboard/PerformanceChart.tsx
import { Line } from 'recharts';
import { getViewStats } from "@/lib/queries";

export async function PerformanceChart({ playerId, period }) {
  const stats = await getViewStats(playerId, period);
  
  return (
    <ResponsiveContainer width="100%" height={264}>
      <LineChart data={stats}>
        <Line type="monotone" dataKey="views" stroke="#2563EB" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## Next Steps to Implement Real Widgets

### Step 1: Create Query Functions
Create `lib/queries/dashboard.ts`:
```typescript
export async function getPlayerVideos(playerId: string, options?: { limit?: number }) {
  const supabase = await createClient();
  const query = supabase
    .from('videos')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });
  
  if (options?.limit) {
    query.limit(options.limit);
  }
  
  return await query;
}

export async function getUserActivities(userId: string, options?: { limit?: number }) {
  // Implement activity tracking query
}

export async function getViewStats(playerId: string, period: 'week' | 'month' | 'year') {
  const supabase = await createClient();
  // Query views table grouped by date
}

export async function getStatsOverview(playerId: string) {
  // Get all stats in one query for the cards
  const [videos, views, followers, achievements] = await Promise.all([
    getVideoCount(playerId),
    getViewCount(playerId),
    getFollowerCount(playerId),
    getAchievementCount(playerId),
  ]);
  
  return { videos, views, followers, achievements };
}
```

### Step 2: Create Widget Components
Break down the dashboard into smaller components:
- `components/dashboard/WelcomeHeader.tsx`
- `components/dashboard/StatsCards.tsx`
- `components/dashboard/RecentVideos.tsx`
- `components/dashboard/ActivityFeed.tsx`
- `components/dashboard/PerformanceChart.tsx`

### Step 3: Add Interactivity
- Make action buttons functional:
  - "Upload Video" → Navigate to upload page
  - "Edit Profile" → Navigate to profile edit page
- Make time period toggles work for the chart
- Add click handlers to stat cards for detailed views

### Step 4: Add Real-time Updates (Optional)
- Use Supabase Realtime subscriptions
- Update stats when new videos are uploaded
- Show notifications for new followers or achievements

---

## Current Status

✅ **Completed:**
- Welcome header moved to top
- Professional layout with organized sections
- 4 colorful stats cards with icons and growth indicators
- Main content grid with Recent Videos and Activity Feed
- Performance chart section with time period toggles
- Fully responsive design
- Action buttons (Upload Video, Edit Profile)
- Dark mode support
- Skeleton loaders for all widgets

🚧 **Ready for Implementation:**
- Real video data integration
- Real stats from database
- Activity feed data
- Performance chart with actual metrics
- Functional action buttons
- Time period filtering

---

## Testing the New Layout

1. **Start the dev server:**
   ```bash
   cd with-supabase-app
   npm run dev
   ```

2. **Log in** as `godchoseme20@gmail.com`

3. **Navigate to** `/dashboard`

4. **You should see:**
   - Welcome header at the top with your name
   - 4 colorful stats cards
   - Recent Videos section with placeholders
   - Activity Feed sidebar
   - Performance chart section at bottom

---

## Customization Tips

### Change Card Colors:
Edit the gradient classes in `dashboard-client.tsx`:
```typescript
// From blue to your color:
from-blue-50 to-blue-100 dark:from-blue-900/20
```

### Adjust Layout:
- Change grid columns: `grid-cols-1 md:grid-cols-4`
- Adjust widget widths: `lg:col-span-2`
- Modify spacing: `gap-6`

### Add More Stats Cards:
Just duplicate a card and change:
- Icon
- Color scheme
- Title
- Value
- Growth indicator

---

This new layout provides a solid foundation for building out the full dashboard with real data! 🚀

