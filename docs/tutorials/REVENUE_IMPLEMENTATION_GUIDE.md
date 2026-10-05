# BLTZ Revenue Sharing System - Implementation Guide

## 🎯 Overview

The BLTZ platform implements a comprehensive four-way revenue-sharing model:
1. **Player (Video Owner)**: 60% - Direct earnings from their content
2. **Team Pool**: 15% - Split among eligible tagged teammates
3. **Publisher**: 15% - Goes to NFL/NCAA/School organizations
4. **BLTZ Platform**: 10% - Platform operational revenue

This creates a sustainable ecosystem where players, teammates, schools, and the platform all benefit.

---

## 📊 Business Model

### Revenue Formula
```
Total Video Revenue = (Views × $0.05) + Sponsor Amounts
```

### Distribution Per Video (4-Way Split)
- **Player (Owner)**: 60% of total revenue
- **Team Pool**: 15% of total revenue
  - Split equally among **eligible** tagged teammates
  - Eligibility: Same school + overlapping years
- **Publisher**: 15% of total revenue
  - Goes to player's school, league, or organization (e.g., UCLA, NFL, NCAA)
- **BLTZ Platform**: 10% of total revenue
  - Platform operational costs and development

### Example Calculation
```
Video Stats:
- 10,000 views = $500 (10,000 × $0.05)
- $2,000 sponsor deal
- Total Revenue: $2,500
- Player from UCLA
- 3 tagged teammates from UCLA (overlapping years)

Distribution:
- Player (Owner): $1,500 (60%)
- Team Pool: $375 (15%)
  - Teammate 1: $125
  - Teammate 2: $125
  - Teammate 3: $125
- Publisher (UCLA): $375 (15%)
- BLTZ Platform: $250 (10%)

Total: $2,500 ✅
```

---

## 🗄️ Database Structure

### New Tables Created

#### 1. `video_tags`
Tracks which players are tagged in videos.
```sql
id, video_id, tagged_player_id, created_at
```

#### 2. `revenue_distributions`
Records player revenue distributions (60% owner + 15% team pool).
```sql
id, video_id, source_player_id, recipient_player_id, 
amount, distribution_type, calculation_date
```

#### 3. `player_earnings`
Accumulated earnings per player.
```sql
id, player_id, total_earnings, earnings_from_own_videos,
earnings_from_team_pool, last_calculated_at
```

#### 4. `platform_revenue`
Tracks BLTZ platform's 10% share.
```sql
id, video_id, amount, percentage, calculation_date
```

#### 5. `publisher_revenue`
Tracks publisher (NFL/NCAA/School) 15% share.
```sql
id, video_id, player_id, publisher_name, publisher_type,
amount, percentage, calculation_date
```

#### 6. `admin_revenue_summary`
Daily revenue summary for admin dashboard.
```sql
id, summary_date, total_platform_revenue, total_publisher_revenue,
total_player_revenue, total_team_pool_revenue, total_videos_processed
```

### Updated Tables

#### `videos`
Added `meta` column for sponsor data:
```json
{
  "sponsor_amount": 500,
  "sponsor_name": "Nike",
  "sponsor_deal_date": "2024-01-15"
}
```

#### `players`
Required metadata for revenue eligibility:
```json
{
  "school": "UCLA",
  "university": "University of California, Los Angeles",
  "years_start": 2018,
  "years_end": 2022
}
```

---

## 🚀 Implementation Steps

### Step 1: Add Player School/Years Data

Update each player's profile:
```typescript
// Via SQL
UPDATE players 
SET 
  school = 'UCLA',
  meta = meta || '{"years_start": 2018, "years_end": 2022}'::jsonb
WHERE id = 'player-uuid';

// Via API (future enhancement)
PATCH /api/players/{id}
Body: { 
  school: "UCLA",
  meta: { years_start: 2018, years_end: 2022 }
}
```

### Step 2: Tag Players in Videos

When uploading a video, tag teammates:
```typescript
// After video is created
const videoId = "new-video-uuid";
const taggedPlayers = ["teammate-1-uuid", "teammate-2-uuid"];

await fetch(`/api/videos/${videoId}/tags`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerIds: taggedPlayers })
});
```

### Step 3: Add Sponsor Revenue (Optional)

```typescript
// Update video with sponsor amount
UPDATE videos
SET meta = meta || '{"sponsor_amount": 2000}'::jsonb
WHERE id = 'video-uuid';
```

### Step 4: Calculate Revenue

#### Option A: Manual Trigger (via API)
```typescript
// Calculate for specific video
POST /api/revenue/calculate
Body: { videoId: "video-uuid" }

// Calculate for all player's videos
POST /api/revenue/calculate
Body: { playerId: "player-uuid" }

// Calculate for all videos (admin only)
POST /api/revenue/calculate
Body: {}
```

#### Option B: Automated (Cron Job)
```bash
# Run daily at midnight
npx tsx scripts/calculate-all-revenue.ts
```

### Step 5: View Earnings

Players can view their earnings on the dashboard:
- **Revenue Card**: Shows total earnings
- **Revenue Growth**: Shows percentage increase
- **Team Videos Card**: Shows videos where they're tagged

---

## 📱 Frontend Features

### Dashboard Stats Card
```typescript
// Revenue card shows:
- Total earnings (own videos + team pool)
- Growth percentage
- Green CircleDollarSign icon
```

### Team Videos Card
```typescript
// Shows count of:
- Videos from same school teammates
- Videos where player is tagged
- Videos from overlapping years
```

### Future: Earnings Page
Create `/dashboard/earnings` to show:
- Earnings breakdown
- Revenue per video
- Team pool contributions
- Payout history

---

## 🔧 API Endpoints

### Video Tags
```
GET    /api/videos/[id]/tags     - Get tagged players
POST   /api/videos/[id]/tags     - Tag players (body: { playerIds: [] })
DELETE /api/videos/[id]/tags     - Remove all tags
```

### Revenue
```
POST /api/revenue/calculate      - Calculate revenue distributions
GET  /api/revenue/calculate      - Get player's earnings breakdown
```

### Videos
```
GET /api/dashboard/videos        - Includes teamVideosCount
```

### Admin (Admin Role Required)
```
GET  /api/admin/revenue          - Get comprehensive revenue dashboard
                                   Includes:
                                   - Platform total revenue (BLTZ 10%)
                                   - Publisher revenue by school/league
                                   - Top earning players
                                   - Recent distributions
                                   - Summary by date range
                                   
POST /api/admin/revenue          - Update daily revenue summary
```

---

## 🔐 Security & Access Control

### Row Level Security (RLS)
All tables have RLS enabled:

- **video_tags**: Anyone can view, only video owner can manage
- **revenue_distributions**: Players can view their own distributions
- **player_earnings**: Players can view their own earnings

### Permissions
- **Players**: Can tag teammates in their own videos
- **Players**: Can view their own earnings
- **Admins**: Can trigger revenue calculations for all videos

---

## 📈 Analytics & Reporting

### Player Revenue Summary View
```sql
SELECT * FROM player_revenue_summary
WHERE player_id = 'your-uuid';
```

Shows:
- Total earnings
- Breakdown by source
- Video counts
- Times tagged in videos

### Video Revenue Breakdown View
```sql
SELECT * FROM video_revenue_breakdown
WHERE player_id = 'your-uuid';
```

Shows revenue per video with view counts and sponsor amounts.

---

## 🎮 Game Plan for Production

### Phase 1: Data Setup ✅
- [x] Create database tables
- [x] Add migration
- [x] Create revenue calculation functions
- [ ] Add school/years to player profiles (manual or bulk update)

### Phase 2: Video Tagging 🔄
- [x] Create tagging API
- [ ] Update VideoModal UI to add player tagging
- [ ] Add teammate search/autocomplete
- [ ] Show tagged players on video cards

### Phase 3: Revenue Calculation 🔄
- [x] Create calculation logic
- [x] Add revenue API endpoint
- [ ] Set up automated cron job
- [ ] Add error handling and retry logic

### Phase 4: Player Dashboard 🔄
- [x] Show revenue in stats card
- [x] Show team videos count
- [ ] Create earnings detail page
- [ ] Add revenue history charts

### Phase 5: Payout System (Future)
- [ ] Add payout requests
- [ ] Integration with payment processor (Stripe, PayPal)
- [ ] Tax reporting (1099 forms)
- [ ] Minimum payout threshold

---

## 🚨 Important Notes

### Data Requirements
1. **Players must have school data** for team matching
2. **Years must overlap** for eligibility
3. **Videos must be public** to generate revenue

### Revenue Calculation Timing
- Run calculations **daily** or **weekly** 
- Avoid calculating in real-time (too expensive)
- Cache results in `player_earnings` table

### Performance Considerations
- Indexed on video_id, player_id for fast lookups
- Use batch processing for large datasets
- Consider pagination for revenue calculations

### Testing
```sql
-- Test with sample data
-- Create test players
-- Tag them in videos
-- Run calculation
-- Verify distributions in revenue_distributions table
```

---

## 📞 Support & Maintenance

### Monitoring Queries
```sql
-- Check for calculation errors
SELECT COUNT(*) FROM videos v
LEFT JOIN revenue_distributions rd ON v.id = rd.video_id
WHERE v.visibility = 'public' AND rd.id IS NULL;

-- Total platform revenue
SELECT SUM(total_earnings) FROM player_earnings;

-- Average team pool per player
SELECT AVG(earnings_from_team_pool) FROM player_earnings
WHERE earnings_from_team_pool > 0;
```

### Troubleshooting
- If revenue isn't calculating: Check player school/years data
- If team videos is 0: Verify teammates exist with same school
- If pool isn't splitting: Check video_tags entries

---

## 🎓 Next Steps

1. **Bulk update existing players** with school/years data
2. **Add UI for player tagging** in VideoModal
3. **Set up cron job** for daily revenue calculations
4. **Create earnings dashboard page**
5. **Test with real data** before production
6. **Add payout request system**

---

## 📝 Example Workflow

```typescript
// 1. Player uploads video
const video = await createVideo({ 
  title: "Championship Game 2022",
  // ... other fields
});

// 2. Tag teammates who were in the game
await fetch(`/api/videos/${video.id}/tags`, {
  method: 'POST',
  body: JSON.stringify({ 
    playerIds: [teammate1Id, teammate2Id, teammate3Id] 
  })
});

// 3. Add sponsor if applicable
await updateVideo(video.id, {
  meta: { sponsor_amount: 1000, sponsor_name: "Nike" }
});

// 4. Revenue gets calculated automatically (daily cron)
// OR trigger manually:
await fetch('/api/revenue/calculate', {
  method: 'POST',
  body: JSON.stringify({ videoId: video.id })
});

// 5. Revenue Distribution (Example: $2,500 total)
// - Player sees $1,500 (60%) in revenue card
// - Each tagged teammate sees $125 (15% ÷ 3) in revenue card
// - UCLA receives $375 (15%) in publisher_revenue table
// - BLTZ Platform receives $250 (10%) in platform_revenue table

// 6. Admin Dashboard
// - BLTZ admin can view total platform revenue
// - See publisher breakdown by school/league
// - Monitor top earning players and schools
```

---

**Built with ❤️ for the BLTZ athlete community**

