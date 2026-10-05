# BLTZ Revenue Sharing - Quick Start Guide

## ✅ What's Been Implemented

### Database Tables ✅
- ✅ `video_tags` - Track player tags in videos
- ✅ `revenue_distributions` - Track player revenue splits (60% + 15% team pool)
- ✅ `player_earnings` - Accumulated player earnings
- ✅ `platform_revenue` - Track BLTZ's 10% platform revenue
- ✅ `publisher_revenue` - Track NFL/NCAA/School 15% revenue
- ✅ `admin_revenue_summary` - Daily summary for admin dashboard
- ✅ `videos.meta` - Store sponsor amounts

### Revenue Calculation System ✅
- ✅ 60/15/15/10 split (player/team/publisher/platform)
- ✅ $0.05 per view
- ✅ Sponsor revenue support
- ✅ School + years eligibility matching
- ✅ Equal split among tagged teammates
- ✅ Publisher tracking (NFL/NCAA/Schools)
- ✅ Platform revenue tracking for BLTZ

### API Endpoints ✅
- ✅ `POST /api/revenue/calculate` - Calculate revenue distributions
- ✅ `GET /api/revenue/calculate` - Get player earnings breakdown
- ✅ `POST /api/videos/[id]/tags` - Tag teammates in videos
- ✅ `GET /api/videos/[id]/tags` - Get tagged players
- ✅ `GET /api/dashboard/videos` - Returns teamVideosCount
- ✅ `GET /api/admin/revenue` - Admin dashboard (platform + publisher revenue)
- ✅ `POST /api/admin/revenue` - Update daily summary

### Dashboard UI ✅
- ✅ Revenue stat card (green CircleDollarSign icon)
- ✅ Team Videos stat card (Film icon)
- ✅ Modern Lucide icons throughout

---

## 🚀 Getting Started (3 Steps)

### 1. Add School/Years to Players
```sql
UPDATE players 
SET 
  school = 'UCLA',
  meta = meta || '{"years_start": 2018, "years_end": 2022}'::jsonb
WHERE id = 'player-uuid';
```

### 2. Tag Teammates in Videos
```typescript
await fetch(`/api/videos/${videoId}/tags`, {
  method: 'POST',
  body: JSON.stringify({ 
    playerIds: ['teammate-uuid-1', 'teammate-uuid-2'] 
  })
});
```

### 3. Calculate Revenue
```typescript
await fetch('/api/revenue/calculate', {
  method: 'POST',
  body: JSON.stringify({ playerId: 'player-uuid' })
});
```

---

## 📁 File Structure

```
lib/queries/
  └── revenue.ts              ← Revenue calculation logic

app/api/
  ├── revenue/calculate/route.ts   ← Calculate & view earnings
  └── videos/[id]/tags/route.ts    ← Tag management

scripts/
  ├── calculate-all-revenue.ts     ← Batch processing script
  └── setup-revenue-sharing-example.sql  ← Example SQL queries

docs/
  ├── REVENUE_SHARING_SYSTEM.md          ← Full documentation
  └── REVENUE_IMPLEMENTATION_GUIDE.md     ← Implementation details
```

---

## 💡 Key Functions

### In `lib/queries/revenue.ts`:
```typescript
// Calculate and distribute revenue for a video
calculateVideoRevenue(videoId: string)

// Get player's total earnings
getPlayerEarnings(playerId: string)

// Get count of team videos
getTeamVideosCount(playerId: string)

// Tag players in a video
tagPlayersInVideo(videoId: string, playerIds: string[])

// Get tagged players
getTaggedPlayers(videoId: string)
```

---

## 🎯 Revenue Eligibility Rules

A player receives team pool revenue if:
1. ✅ Tagged in the video (`video_tags` table)
2. ✅ Same school as video owner
3. ✅ Overlapping years of attendance

### Example Matching:
```
Video Owner: UCLA 2018-2022
Tagged Player: UCLA 2020-2024
Result: ✅ ELIGIBLE (years overlap)

Video Owner: UCLA 2018-2022
Tagged Player: USC 2020-2024
Result: ❌ NOT ELIGIBLE (different schools)

Video Owner: UCLA 2018-2022
Tagged Player: UCLA 2015-2017
Result: ❌ NOT ELIGIBLE (no overlap)
```

---

## 🎨 UI Components Updated

### Dashboard Main (`/dashboard`)
- **Revenue Card**: Total earnings with growth %
- Uses `CircleDollarSign` icon (green)

### My Videos Page (`/dashboard/videos`)
- **Team Videos Card**: Count of teammate videos
- Uses `Film` icon (blue)
- Shows videos from same school/years teammates

---

## ⚙️ Configuration

### Revenue Constants (in `lib/queries/revenue.ts`)
```typescript
export const REVENUE_CONFIG = {
  REVENUE_PER_VIEW: 0.05,        // $0.05 per view
  PLAYER_PERCENTAGE: 0.60,       // 60% to player (owner)
  TEAM_POOL_PERCENTAGE: 0.15,    // 15% to team pool
  PUBLISHER_PERCENTAGE: 0.15,    // 15% to publisher (school/league)
  PLATFORM_PERCENTAGE: 0.10,     // 10% to BLTZ platform
};
```

Modify these values to adjust the business model.

---

## 🔄 Automated Processing

### Set Up Cron Job (Recommended)

**Option 1: Vercel Cron**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/revenue/calculate",
    "schedule": "0 0 * * *"  // Daily at midnight
  }]
}
```

**Option 2: External Cron**
```bash
# Add to crontab
0 0 * * * curl -X POST https://yourapp.com/api/revenue/calculate
```

**Option 3: GitHub Actions**
```yaml
# .github/workflows/calculate-revenue.yml
name: Calculate Revenue
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
jobs:
  calculate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npx tsx scripts/calculate-all-revenue.ts
```

---

## 📊 Monitoring & Analytics

### Check Total Platform Revenue
```sql
SELECT SUM(total_earnings) as platform_total
FROM player_earnings;
```

### Top Earners from Team Pool
```sql
SELECT 
  p.full_name,
  pe.earnings_from_team_pool as team_pool_earnings
FROM player_earnings pe
JOIN players p ON pe.player_id = p.id
ORDER BY pe.earnings_from_team_pool DESC
LIMIT 10;
```

### Revenue by School
```sql
SELECT 
  p.school,
  COUNT(DISTINCT p.id) as players,
  SUM(pe.total_earnings) as total_revenue
FROM players p
JOIN player_earnings pe ON p.id = pe.player_id
GROUP BY p.school
ORDER BY total_revenue DESC;
```

---

## 👨‍💼 Admin Dashboard

### View Platform Revenue
```typescript
const response = await fetch('/api/admin/revenue');
const data = await response.json();

console.log('BLTZ Platform Revenue:', data.platformTotal);
console.log('Publisher Breakdown:', data.summary.byPublisher);
console.log('Top Earning Players:', data.topPlayers);
```

### Get Revenue by Date Range
```typescript
const start = '2024-01-01';
const end = '2024-12-31';
const response = await fetch(`/api/admin/revenue?start_date=${start}&end_date=${end}`);
```

### Platform Revenue Summary
```sql
-- Total BLTZ platform revenue
SELECT SUM(amount) as total_platform_revenue
FROM platform_revenue;

-- Platform revenue by month
SELECT 
  DATE_TRUNC('month', calculation_date) as month,
  SUM(amount) as monthly_revenue
FROM platform_revenue
GROUP BY month
ORDER BY month DESC;
```

### Publisher Revenue by Organization
```sql
-- Revenue by publisher (schools/leagues)
SELECT 
  publisher_name,
  publisher_type,
  COUNT(DISTINCT video_id) as videos,
  SUM(amount) as total_revenue
FROM publisher_revenue
GROUP BY publisher_name, publisher_type
ORDER BY total_revenue DESC;

-- Top revenue schools
SELECT 
  publisher_name as school,
  SUM(amount) as school_revenue,
  COUNT(DISTINCT player_id) as players
FROM publisher_revenue
WHERE publisher_type = 'school'
GROUP BY publisher_name
ORDER BY school_revenue DESC
LIMIT 20;
```

### Admin Analytics Views
```sql
-- Total revenue breakdown
SELECT 
  'Platform (BLTZ)' as recipient,
  SUM(amount) as total,
  '10%' as percentage
FROM platform_revenue
UNION ALL
SELECT 
  'Publishers (Schools/Leagues)' as recipient,
  SUM(amount) as total,
  '15%' as percentage
FROM publisher_revenue
UNION ALL
SELECT 
  'Players (Direct)' as recipient,
  SUM(amount) as total,
  '60%' as percentage
FROM revenue_distributions
WHERE distribution_type = 'view_revenue'
UNION ALL
SELECT 
  'Team Pool' as recipient,
  SUM(amount) as total,
  '15%' as percentage
FROM revenue_distributions
WHERE distribution_type = 'team_pool';
```

---

## 🐛 Troubleshooting

### Revenue Not Calculating?
1. Check player has `school` and `years_start/years_end` in meta
2. Verify players are tagged in `video_tags` table
3. Ensure video is `visibility = 'public'`
4. Check for errors in `revenue_distributions` table

### Team Videos Count is 0?
1. Verify teammates exist in `player_teammates` table
2. Check school names match exactly
3. Verify years overlap
4. Ensure teammate videos are public

### Revenue Shows $0?
1. Check if video has views in `views` table
2. Verify sponsor amounts in `videos.meta`
3. Run revenue calculation manually
4. Check `player_earnings` table for entries

---

## 🔮 Future Enhancements

1. **UI for Player Tagging**: Add teammate selector in VideoModal
2. **Earnings Dashboard**: Detailed page showing all revenue sources
3. **Payout System**: Integration with Stripe/PayPal
4. **Tax Reporting**: Generate 1099 forms
5. **Revenue Analytics**: Charts and forecasting
6. **Team Verification**: Admin approval for team relationships
7. **Minimum Payout**: Threshold before withdrawal
8. **Revenue Notifications**: Alert players when they earn from team pool

---

## 📞 Need Help?

- See full documentation: `REVENUE_SHARING_SYSTEM.md`
- Implementation details: `REVENUE_IMPLEMENTATION_GUIDE.md`
- Example SQL: `scripts/setup-revenue-sharing-example.sql`
- Batch script: `scripts/calculate-all-revenue.ts`

---

**Status**: ✅ Core system implemented and ready for testing
**Next**: Add player data and start tagging teammates in videos!

---

## 💼 For BLTZ Admins

### Access Admin Dashboard
```typescript
// Requires admin role in profiles table
const response = await fetch('/api/admin/revenue');
const data = await response.json();
```

### View Key Metrics
- **Platform Revenue**: BLTZ's 10% share across all videos
- **Publisher Revenue**: Schools/Leagues' 15% share
- **Top Earners**: Players earning the most
- **Publisher Breakdown**: Revenue by school/league

### Admin Queries
```sql
-- Total BLTZ platform revenue
SELECT SUM(amount) FROM platform_revenue;

-- Revenue by school
SELECT publisher_name, SUM(amount) 
FROM publisher_revenue 
WHERE publisher_type = 'school'
GROUP BY publisher_name
ORDER BY SUM(amount) DESC;
```

See full admin guide: **`ADMIN_REVENUE_DASHBOARD.md`**

---

## 📊 Revenue Breakdown Example

```
Video: "Championship Game 2022"
Views: 10,000
Sponsor: $2,000
Total Revenue: $2,500

Distribution:
├─ Player (60%): $1,500
├─ Team Pool (15%): $375
│  ├─ Teammate 1: $125
│  ├─ Teammate 2: $125
│  └─ Teammate 3: $125
├─ Publisher - UCLA (15%): $375
└─ BLTZ Platform (10%): $250

✅ Total: $2,500 (100%)
```

