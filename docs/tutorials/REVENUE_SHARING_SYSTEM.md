# BLTZ Revenue Sharing System

## Overview
The BLTZ platform implements a comprehensive revenue sharing model where revenue is distributed among:
1. **Video Owner (Player)**: 60% - Direct earnings from their content
2. **Team Pool**: 15% - Split among eligible tagged teammates
3. **Publisher (School/League)**: 15% - Goes to NFL/NCAA/School
4. **BLTZ Platform**: 10% - Platform operational revenue

## Revenue Model

### Revenue Sources
1. **View Revenue**: $0.05 per video view
2. **Sponsor Revenue**: Custom amounts stored in video metadata (`meta.sponsor_amount`)

### Revenue Distribution
For each video, total revenue is split as follows:
- **60%** goes to the video owner (player)
- **15%** goes to team pool (split equally among eligible tagged teammates)
- **15%** goes to publisher (player's school, league, or organization)
- **10%** goes to BLTZ platform

### Eligibility Criteria for Team Pool
Players are eligible to receive team pool revenue if they:
1. Are tagged in the video (`video_tags` table)
2. Attended the same school/university as the video owner
3. Have overlapping years of attendance (e.g., both played 2018-2022)

## Database Schema

### Tables

#### `video_tags`
Tracks which players are tagged in videos for revenue sharing.
```sql
- id: uuid (PK)
- video_id: uuid (FK -> videos.id)
- tagged_player_id: uuid (FK -> players.id)
- created_at: timestamptz
```

#### `revenue_distributions`
Records of player revenue distributions (owner + team pool).
```sql
- id: uuid (PK)
- video_id: uuid (FK -> videos.id)
- source_player_id: uuid (video owner)
- recipient_player_id: uuid (receiving player)
- amount: decimal(10, 2)
- distribution_type: 'view_revenue' | 'sponsor_revenue' | 'team_pool'
- calculation_date: timestamptz
- created_at: timestamptz
```

#### `platform_revenue`
Tracks BLTZ platform's 10% share.
```sql
- id: uuid (PK)
- video_id: uuid (FK -> videos.id)
- amount: decimal(10, 2)
- percentage: decimal(5, 2) -- Always 10.00
- calculation_date: timestamptz
- created_at: timestamptz
```

#### `publisher_revenue`
Tracks publisher (NFL/NCAA/School) 15% share.
```sql
- id: uuid (PK)
- video_id: uuid (FK -> videos.id)
- player_id: uuid (FK -> players.id)
- publisher_name: text -- 'NFL', 'NCAA', 'UCLA', etc.
- publisher_type: 'league' | 'school' | 'organization'
- amount: decimal(10, 2)
- percentage: decimal(5, 2) -- Always 15.00
- calculation_date: timestamptz
- created_at: timestamptz
```

#### `admin_revenue_summary`
Daily summary for BLTZ admin dashboard.
```sql
- id: uuid (PK)
- summary_date: date (UNIQUE)
- total_platform_revenue: decimal(12, 2)
- total_publisher_revenue: decimal(12, 2)
- total_player_revenue: decimal(12, 2)
- total_team_pool_revenue: decimal(12, 2)
- total_videos_processed: integer
- total_views_processed: integer
- created_at: timestamptz
- updated_at: timestamptz
```

#### `player_earnings`
Accumulated earnings for each player.
```sql
- id: uuid (PK)
- player_id: uuid (FK -> players.id)
- total_earnings: decimal(10, 2)
- earnings_from_own_videos: decimal(10, 2)
- earnings_from_team_pool: decimal(10, 2)
- last_calculated_at: timestamptz
- created_at: timestamptz
- updated_at: timestamptz
```

### Player Metadata Required
Players should have the following in their `meta` or direct columns:
```json
{
  "school": "UCLA",
  "university": "University of California, Los Angeles",
  "years_start": 2018,
  "years_end": 2022
}
```

## Usage

### Tagging Players in Videos
```typescript
import { tagPlayersInVideo } from "@/lib/queries/revenue";

// When creating/editing a video, tag teammates
await tagPlayersInVideo(videoId, [playerId1, playerId2, playerId3]);
```

### Calculate Revenue for a Video
```typescript
import { calculateVideoRevenue } from "@/lib/queries/revenue";

// This should be run periodically (e.g., daily cron job)
await calculateVideoRevenue(videoId);
```

### Get Player Earnings
```typescript
import { getPlayerEarnings } from "@/lib/queries/revenue";

const earnings = await getPlayerEarnings(playerId);
// Returns: { total, fromOwnVideos, fromTeamPool }
```

### Get Team Videos Count
```typescript
import { getTeamVideosCount } from "@/lib/queries/revenue";

const count = await getTeamVideosCount(playerId);
// Returns count of videos from same school/years teammates
```

## Example Calculation

### Scenario:
- Video has 10,000 views = $500 revenue ($0.05 × 10,000)
- Video has $2,000 sponsor deal
- Total Revenue: $2,500
- Player is from UCLA
- Video has 3 tagged teammates from UCLA with overlapping years

### Distribution:
- **Player (Owner)**: $1,500 (60%)
- **Team Pool**: $375 (15%) → Split 3 ways = **$125 each teammate**
- **Publisher (UCLA)**: $375 (15%)
- **BLTZ Platform**: $250 (10%)

### Total Distributed: $2,500 ✅

## Implementation Steps

### 1. Add Player School/Years Data
Update player profiles with school and years:
```sql
UPDATE players 
SET meta = jsonb_set(
  COALESCE(meta, '{}'::jsonb),
  '{school}',
  '"UCLA"'
) 
WHERE id = 'player-uuid';

UPDATE players 
SET meta = jsonb_set(
  jsonb_set(
    COALESCE(meta, '{}'::jsonb),
    '{years_start}',
    '2018'
  ),
  '{years_end}',
  '2022'
)
WHERE id = 'player-uuid';
```

### 2. Tag Players in Videos
When uploading/editing videos, add tags:
```sql
INSERT INTO video_tags (video_id, tagged_player_id)
VALUES 
  ('video-uuid-1', 'player-uuid-1'),
  ('video-uuid-1', 'player-uuid-2');
```

### 3. Run Revenue Calculations
Set up a cron job or scheduled function to run daily:
```typescript
// Process all videos or just new/updated ones
const { data: videos } = await supabase
  .from('videos')
  .select('id')
  .eq('visibility', 'public');

for (const video of videos) {
  await calculateVideoRevenue(video.id);
}
```

## Future Enhancements

1. **Historical Tracking**: Add `revenue_snapshots` table for historical revenue tracking
2. **Payout System**: Add `payouts` table for actual payment processing
3. **Revenue Rules**: Add configurable rules per school/league
4. **Team Verification**: Add admin approval for team relationships
5. **Analytics**: Add revenue analytics and forecasting
6. **Tax Tracking**: Add tax calculation and reporting features

## API Endpoints

### Get Team Videos Count
Already implemented in `/api/dashboard/videos`

### Calculate Video Revenue (Future)
```typescript
POST /api/revenue/calculate
Body: { videoId: string }
```

### Get Earnings Breakdown (Future)
```typescript
GET /api/revenue/earnings/:playerId
Returns: {
  total: number,
  fromOwnVideos: number,
  fromTeamPool: number,
  breakdown: [...distributions]
}
```

## Notes
- Revenue calculations are run asynchronously to avoid slowing down video uploads
- Team pool is only distributed to players with verified school/years data
- Players can see their team video count on the dashboard
- All revenue tracking is transparent via `revenue_distributions` table

