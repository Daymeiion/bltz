# 🔐 BLTZ Admin Dashboard - Access Guide

## 🎯 Quick Access

### Step 1: Set Admin Role
First, you need admin access in the database:

```sql
-- Run this in your Supabase SQL Editor
UPDATE profiles 
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Step 2: Access the Dashboard

#### Option 1: Direct URL
```
https://your-app-url.com/admin
```
or locally:
```
http://localhost:3001/admin
```

#### Option 2: From Player Dashboard
1. Log in to your account
2. Go to `/dashboard`
3. Look for "Admin Panel" in the sidebar (only visible if you have admin role)
4. Click to access

---

## 📊 Admin Dashboard Features

### Overview Tab
- **BLTZ Revenue Card**: Total platform revenue (10%)
- **Publisher Revenue Card**: Total school/league revenue (15%)
- **Player Revenue Card**: Total player earnings (60%)
- **Total Revenue Card**: Sum of all revenue
- **Top Publishers Table**: Schools and leagues ranked by revenue
- **Top Earning Players**: Players ranked by total earnings

### Revenue Analytics Tab
- **Revenue Split Breakdown**: Visual breakdown of 60/15/15/10 split
- **Platform Metrics**: Videos processed, publishers, active players
- **All Publishers Table**: Complete list with revenue details
  - Rank by revenue
  - Shows 15% share
  - Calculates total video revenue

### Player Management Tab
- **Player Stats Cards**: Total users, players, fans, blocked accounts
- **Search & Filter**: Find players by name, email, school
- **Player Table** with columns:
  - Player info (name, email, avatar)
  - School
  - Role (player/fan/admin)
  - Total videos
  - Status (active/blocked)
  - Quick actions dropdown

#### Quick Actions Per Player:
- 👁️ **View Profile** - See player's public profile
- 🚫 **Block/Unblock** - Toggle player visibility
- 🗑️ **Delete Player** - Permanently remove player

---

## 🎨 Dashboard UI Features

### Design
- **Dark gradient background** matching player dashboard
- **Modern card-based layout**
- **Responsive tables** with sorting
- **Color-coded metrics**:
  - Green: Platform revenue
  - Blue: Publishers
  - Gold: Players
  - Purple: Publishers in tables

### Navigation
- **3 tabs**: Overview, Revenue Analytics, Player Management
- **Gold accent** for active tab
- **Smooth transitions**

---

## 🔐 Security

### Access Control
- **Required Role**: `admin` in profiles table
- **RLS Policies**: Admin-only access to revenue tables
- **Auto Redirect**: Non-admins redirected to home

### Protected Routes
- `/admin` - Main dashboard
- `/api/admin/revenue` - Revenue data
- `/api/admin/players` - Player list
- `/api/admin/players/[id]` - Player actions
- `/api/admin/players/[id]/block` - Block/unblock

---

## 📈 Admin API Endpoints

### Revenue Data
```typescript
// Get revenue overview
GET /api/admin/revenue
Returns: {
  platformTotal: number,
  summary: {...},
  topPlayers: [...],
  recentDistributions: [...]
}

// Filter by date
GET /api/admin/revenue?start_date=2024-01-01&end_date=2024-12-31
```

### Player Management
```typescript
// Get all players
GET /api/admin/players
Returns: { players: [...] }

// Block/unblock player
POST /api/admin/players/[id]/block
Returns: { success: true, visibility: boolean }

// Delete player
DELETE /api/admin/players/[id]
Returns: { success: true }

// Update player role
PATCH /api/admin/players/[id]
Body: { role: 'player' | 'fan' | 'admin' }
```

---

## 💡 Common Admin Tasks

### 1. Make Someone an Admin
```sql
UPDATE profiles 
SET role = 'admin'
WHERE email = 'newadmin@bltz.com';
```

### 2. View Platform Revenue
- Go to Admin Dashboard
- Overview tab shows BLTZ's 10% in green card
- Revenue Analytics shows detailed breakdown

### 3. Check School Revenue
- Overview tab → "Top Revenue Publishers" table
- See which schools are generating most revenue

### 4. Manage Players
- Player Management tab
- Search for player
- Use dropdown for actions (view/block/delete)

### 5. Block Problematic User
- Player Management tab
- Find user in table
- Actions → Block Player
- Confirm

### 6. View Top Earners
- Overview tab → "Top Earning Players"
- Shows earnings breakdown (own videos + team pool)

---

## 🎯 Dashboard Metrics Explained

### BLTZ Revenue (10%)
Platform's share from all video revenue. This funds:
- Platform development
- Infrastructure costs
- Support and operations

### Publishers (15%)
Schools and leagues' share. Breakdown by:
- School name (UCLA, USC, etc.)
- League name (NFL, NCAA, etc.)
- Organization type

### Players (60%)
Direct earnings to video owners. Shown in:
- Total player revenue across platform
- Individual earnings in top players list

### Team Pool (15%)
Distributed among tagged teammates. Tracked separately in revenue analytics.

---

## 🔍 Monitoring Best Practices

### Daily Checks
- [ ] Review platform revenue growth
- [ ] Check for blocked accounts
- [ ] Monitor top publishers
- [ ] Verify revenue calculations running

### Weekly Reviews
- [ ] Top earning players analysis
- [ ] Publisher performance trends
- [ ] Player growth metrics
- [ ] Revenue distribution health

### Monthly Tasks
- [ ] Generate financial reports
- [ ] Review and export revenue data
- [ ] Analyze school partnerships
- [ ] Plan publisher outreach

---

## 🚀 Getting Started

### First Time Setup
1. Grant yourself admin access (SQL above)
2. Log out and log back in
3. Navigate to `/admin` or use sidebar link
4. Explore the three tabs
5. Test player management features

### Test Data
If you don't see revenue:
1. Ensure videos exist in database
2. Run revenue calculation: `POST /api/revenue/calculate`
3. Add sample views to `views` table
4. Refresh admin dashboard

---

## 📞 Support

### Troubleshooting
- **Can't access dashboard**: Check admin role in profiles table
- **No revenue data**: Run revenue calculations via API
- **Players not showing**: Check players and profiles tables have data
- **Actions not working**: Check browser console for errors

### SQL Quick Checks
```sql
-- Am I admin?
SELECT role FROM profiles WHERE id = auth.uid();

-- How much platform revenue?
SELECT SUM(amount) FROM platform_revenue;

-- How many players?
SELECT COUNT(*) FROM players WHERE visibility = true;
```

---

## 🎊 You're Ready!

Access your admin dashboard at:
- **URL**: `/admin`
- **Sidebar**: "Admin Panel" (gold icon, visible only to admins)

Manage your platform with complete oversight! 🚀

---

**BLTZ Admin Dashboard v1.0** | Revenue & Player Management

