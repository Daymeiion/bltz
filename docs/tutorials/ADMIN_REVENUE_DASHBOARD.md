# BLTZ Admin Revenue Dashboard Guide

## 🎯 Overview
This guide is for BLTZ administrators to monitor and manage the platform's revenue system.

---

## 💰 Revenue Model Summary

### Four-Way Split
Every video generates revenue distributed as follows:

| Recipient | Percentage | Description |
|-----------|-----------|-------------|
| **Player** | 60% | Video owner's direct earnings |
| **Team Pool** | 15% | Split among tagged teammates |
| **Publisher** | 15% | Goes to school/league (UCLA, NFL, etc.) |
| **BLTZ Platform** | 10% | Platform operational revenue |

### Revenue Sources
- **View Revenue**: $0.05 per video view
- **Sponsor Revenue**: Custom amounts from deals

---

## 📊 Admin Dashboard API

### Get Complete Revenue Overview
```typescript
const response = await fetch('/api/admin/revenue');
const data = await response.json();

// Returns:
{
  platformTotal: 125000,        // Total BLTZ revenue
  summary: {
    totalPlatformRevenue: 125000,
    totalPublisherRevenue: 187500,
    totalPlayerRevenue: 750000,
    totalTeamPoolRevenue: 187500,
    totalVideosProcessed: 5000,
    byPublisher: [
      { name: "UCLA", type: "school", amount: 45000 },
      { name: "NFL", type: "league", amount: 78000 },
      // ...
    ]
  },
  topPlayers: [...],
  recentDistributions: [...]
}
```

### Filter by Date Range
```typescript
const start = '2024-01-01';
const end = '2024-12-31';
const response = await fetch(
  `/api/admin/revenue?start_date=${start}&end_date=${end}`
);
```

---

## 🔍 Key Metrics to Monitor

### 1. Platform Revenue (BLTZ's 10%)
```sql
-- Total platform revenue
SELECT SUM(amount) as total_bltz_revenue
FROM platform_revenue;

-- Monthly trends
SELECT 
  TO_CHAR(calculation_date, 'YYYY-MM') as month,
  SUM(amount) as monthly_revenue,
  COUNT(DISTINCT video_id) as videos
FROM platform_revenue
GROUP BY month
ORDER BY month DESC;
```

### 2. Publisher Revenue (Schools/Leagues 15%)
```sql
-- Revenue by publisher
SELECT 
  publisher_name,
  publisher_type,
  SUM(amount) as total_revenue,
  COUNT(DISTINCT video_id) as videos,
  COUNT(DISTINCT player_id) as players
FROM publisher_revenue
GROUP BY publisher_name, publisher_type
ORDER BY total_revenue DESC;

-- Top 20 schools by revenue
SELECT 
  publisher_name as school,
  SUM(amount) as school_revenue,
  COUNT(DISTINCT player_id) as players_count
FROM publisher_revenue
WHERE publisher_type = 'school'
GROUP BY publisher_name
ORDER BY school_revenue DESC
LIMIT 20;
```

### 3. Player Earnings Distribution
```sql
-- Total player earnings across platform
SELECT 
  SUM(total_earnings) as all_player_earnings,
  AVG(total_earnings) as avg_per_player,
  COUNT(*) as total_players_earning
FROM player_earnings;

-- Top 100 earners
SELECT 
  p.full_name,
  p.school,
  pe.total_earnings,
  pe.earnings_from_own_videos,
  pe.earnings_from_team_pool,
  ROUND((pe.earnings_from_team_pool / NULLIF(pe.total_earnings, 0) * 100), 2) as team_pool_percentage
FROM player_earnings pe
JOIN players p ON pe.player_id = p.id
ORDER BY pe.total_earnings DESC
LIMIT 100;
```

### 4. Team Pool Effectiveness
```sql
-- Team pool distribution stats
SELECT 
  COUNT(DISTINCT recipient_player_id) as players_receiving_from_pool,
  SUM(amount) as total_team_pool_distributed,
  AVG(amount) as avg_per_distribution,
  COUNT(*) as total_distributions
FROM revenue_distributions
WHERE distribution_type = 'team_pool';

-- Most generous teams (distributing most to teammates)
SELECT 
  sp.full_name as video_owner,
  sp.school,
  COUNT(DISTINCT rd.video_id) as videos_with_pool,
  SUM(rd.amount) as total_distributed_to_teammates,
  COUNT(DISTINCT rd.recipient_player_id) as teammates_helped
FROM revenue_distributions rd
JOIN players sp ON rd.source_player_id = sp.id
WHERE rd.distribution_type = 'team_pool'
GROUP BY sp.id, sp.full_name, sp.school
ORDER BY total_distributed_to_teammates DESC
LIMIT 20;
```

---

## 📈 Revenue Analytics

### Complete Revenue Breakdown
```sql
-- Four-way split verification
SELECT 
  'Player Direct (60%)' as category,
  SUM(amount) as total,
  ROUND(SUM(amount) / (
    SELECT SUM(amount) FROM platform_revenue
    + (SELECT SUM(amount) FROM publisher_revenue)
    + (SELECT SUM(amount) FROM revenue_distributions)
  ) * 100, 2) as actual_percentage
FROM revenue_distributions
WHERE distribution_type = 'view_revenue'

UNION ALL

SELECT 
  'Team Pool (15%)' as category,
  SUM(amount) as total,
  NULL as actual_percentage
FROM revenue_distributions
WHERE distribution_type = 'team_pool'

UNION ALL

SELECT 
  'Publishers (15%)' as category,
  SUM(amount) as total,
  NULL as actual_percentage
FROM publisher_revenue

UNION ALL

SELECT 
  'BLTZ Platform (10%)' as category,
  SUM(amount) as total,
  NULL as actual_percentage
FROM platform_revenue;
```

### Revenue Per Video Statistics
```sql
-- Average revenue per video
SELECT 
  AVG(total_revenue) as avg_revenue_per_video,
  MIN(total_revenue) as min_revenue,
  MAX(total_revenue) as max_revenue,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_revenue) as median_revenue
FROM (
  SELECT 
    video_id,
    SUM(amount) as total_revenue
  FROM platform_revenue
  GROUP BY video_id
) video_revenues;
```

### Publisher Performance
```sql
-- Which schools/leagues generate most revenue
SELECT 
  pr.publisher_name,
  pr.publisher_type,
  COUNT(DISTINCT pr.video_id) as total_videos,
  COUNT(DISTINCT pr.player_id) as total_players,
  SUM(pr.amount) as publisher_revenue_15_percent,
  SUM(pr.amount) / 0.15 as estimated_total_video_revenue,
  ROUND(AVG(pr.amount), 2) as avg_per_video
FROM publisher_revenue pr
GROUP BY pr.publisher_name, pr.publisher_type
ORDER BY publisher_revenue_15_percent DESC
LIMIT 50;
```

---

## 🎮 Admin Actions

### 1. Trigger Revenue Calculation
```bash
# For all videos
curl -X POST https://yourapp.com/api/revenue/calculate \
  -H "Content-Type: application/json"

# For specific player
curl -X POST https://yourapp.com/api/revenue/calculate \
  -H "Content-Type: application/json" \
  -d '{"playerId": "player-uuid"}'

# For specific video
curl -X POST https://yourapp.com/api/revenue/calculate \
  -H "Content-Type: application/json" \
  -d '{"videoId": "video-uuid"}'
```

### 2. Update Daily Summary
```bash
curl -X POST https://yourapp.com/api/admin/revenue \
  -H "Content-Type: application/json"
```

### 3. Export Revenue Data
```sql
-- Export for accounting
COPY (
  SELECT 
    summary_date,
    total_platform_revenue,
    total_publisher_revenue,
    total_player_revenue,
    total_team_pool_revenue
  FROM admin_revenue_summary
  WHERE summary_date >= '2024-01-01'
  ORDER BY summary_date
) TO '/tmp/bltz_revenue_2024.csv' WITH CSV HEADER;
```

---

## 📱 Future Admin Dashboard UI

### Recommended Dashboard Sections

#### 1. **Platform Overview Card**
- Total BLTZ revenue (10%)
- Monthly recurring revenue
- Growth rate

#### 2. **Publisher Breakdown**
- Top 10 schools by revenue
- Top 5 leagues by revenue
- Revenue per publisher type

#### 3. **Player Statistics**
- Total players earning
- Average earnings per player
- Top 20 earners

#### 4. **Video Performance**
- Total videos processed
- Average revenue per video
- Top revenue-generating videos

#### 5. **Team Pool Insights**
- Total distributed to teammates
- Average teammates per video
- Most collaborative schools

#### 6. **Revenue Trends**
- Line chart: Monthly revenue by category
- Bar chart: Revenue by school
- Pie chart: 60/15/15/10 split visualization

---

## 🚨 Important Monitoring

### Health Checks
```sql
-- Ensure all videos have proper splits
SELECT 
  v.id,
  v.title,
  COUNT(DISTINCT pr.id) as has_publisher_rev,
  COUNT(DISTINCT plat.id) as has_platform_rev,
  COUNT(DISTINCT rd.id) as has_player_rev
FROM videos v
LEFT JOIN publisher_revenue pr ON v.id = pr.video_id
LEFT JOIN platform_revenue plat ON v.id = plat.video_id
LEFT JOIN revenue_distributions rd ON v.id = rd.video_id
WHERE v.visibility = 'public'
  AND (pr.id IS NULL OR plat.id IS NULL OR rd.id IS NULL)
GROUP BY v.id, v.title;

-- Find videos missing revenue calculations
SELECT 
  v.id,
  v.title,
  v.created_at,
  COALESCE(view_count, 0) as views
FROM videos v
LEFT JOIN LATERAL (
  SELECT COUNT(*) as view_count FROM views WHERE video_id = v.id
) vc ON true
LEFT JOIN platform_revenue pr ON v.id = pr.video_id
WHERE v.visibility = 'public'
  AND pr.id IS NULL
  AND v.created_at < NOW() - INTERVAL '1 day'
ORDER BY v.created_at DESC;
```

### Revenue Reconciliation
```sql
-- Verify 100% distribution per video
SELECT 
  v.id,
  v.title,
  (
    COALESCE((SELECT SUM(amount) FROM revenue_distributions WHERE video_id = v.id), 0) +
    COALESCE((SELECT amount FROM publisher_revenue WHERE video_id = v.id), 0) +
    COALESCE((SELECT amount FROM platform_revenue WHERE video_id = v.id), 0)
  ) as total_distributed,
  (
    COALESCE((SELECT COUNT(*) FROM views WHERE video_id = v.id), 0) * 0.05 +
    COALESCE((v.meta->>'sponsor_amount')::decimal, 0)
  ) as expected_total
FROM videos v
WHERE v.visibility = 'public'
HAVING total_distributed != expected_total
LIMIT 100;
```

---

## 🔐 Admin Access Control

### Required Role
All admin endpoints require `role = 'admin'` in the `profiles` table.

### Grant Admin Access
```sql
-- Make a user an admin
UPDATE profiles 
SET role = 'admin'
WHERE email = 'admin@bltz.com';
```

### Revoke Admin Access
```sql
UPDATE profiles 
SET role = 'player'
WHERE email = 'user@example.com';
```

---

## 📊 KPIs to Track

1. **Platform Revenue Growth**: Month-over-month BLTZ earnings
2. **Publisher Satisfaction**: Revenue distribution to schools/leagues
3. **Player Earnings**: Average earnings per active player
4. **Team Collaboration**: Percentage of videos with tagged teammates
5. **Revenue Per View**: Trending at $0.05 or changing?
6. **Sponsor Revenue**: Growing deals and amounts

---

## 🛠️ Maintenance Tasks

### Daily
- [ ] Run revenue calculations for new videos
- [ ] Update `admin_revenue_summary` table
- [ ] Check for calculation errors

### Weekly
- [ ] Review top earning publishers
- [ ] Monitor player earnings distribution
- [ ] Check team pool participation rates

### Monthly
- [ ] Generate financial reports
- [ ] Reconcile all revenue accounts
- [ ] Review and adjust revenue rates if needed
- [ ] Generate publisher payment reports

---

## 📞 Contact & Support

For issues with the revenue system:
1. Check logs in `/api/revenue/calculate`
2. Verify database migrations applied
3. Review player school/years data
4. Check video tagging completeness

---

**BLTZ Admin Dashboard** - Revenue Tracking & Analytics

