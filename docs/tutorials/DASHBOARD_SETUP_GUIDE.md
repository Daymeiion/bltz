# Player Dashboard Setup Guide

## 🎉 What Was Created

A complete player dashboard with Role-Based Access Control (RBAC) using the Aceternity sidebar component.

### Files Created:

1. **`lib/rbac.ts`** - RBAC utility functions for role checking
2. **`app/dashboard/page.tsx`** - Main dashboard page with authentication and role checks
3. **`app/dashboard/dashboard-client.tsx`** - Client component with Aceternity sidebar
4. **`app/dashboard/layout.tsx`** - Dashboard layout wrapper
5. **`scripts/setup-rbac.sql`** - SQL script to set up database tables and policies
6. **`RBAC_SETUP.md`** - Detailed documentation on RBAC implementation

## 🚀 Quick Start

### Step 1: Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/setup-rbac.sql`
4. Click **Run** to execute the script

This will create:
- `profiles` table with user role information
- Row Level Security (RLS) policies
- Automatic profile creation on user signup
- Indexes for better performance

### Step 2: Assign Player Role to Test User

After creating a user account, assign them the "player" role:

```sql
-- In Supabase SQL Editor, run:
UPDATE public.profiles
SET role = 'player'
WHERE email = 'your-test-user@example.com';
```

### Step 3: Test the Dashboard

1. Make sure your dev server is running: `npm run dev`
2. Log in with your test user account
3. Navigate to `/dashboard`
4. You should see the player dashboard with the sidebar!

## 📋 Features

### RBAC System

- **5 User Roles**: player, fan, admin, coach, scout
- **Automatic Profile Creation**: New users automatically get a profile with "fan" role
- **Row Level Security**: Database-level security for user data
- **Server-Side Validation**: All role checks happen server-side for security

### Dashboard Features

- **Aceternity Sidebar**: Beautiful, animated sidebar with hover effects
- **Responsive Design**: Works on desktop and mobile
- **Navigation Links**:
  - Dashboard (home)
  - Profile
  - My Videos
  - Statistics
  - Schedule
  - Achievements
  - Team
  - Settings
  - Back to Home

- **Placeholder Content**: 
  - Welcome message
  - Stats cards (Videos, Profile Views, Followers)
  - Animated skeleton loaders

### Access Control

- **Protected Route**: Only users with "player" role can access `/dashboard`
- **Automatic Redirects**: 
  - Non-authenticated users → `/auth/login`
  - Authenticated non-players → `/?error=insufficient_permissions`

## 🔧 Customization Guide

### Adding Dashboard Content

Edit `app/dashboard/dashboard-client.tsx` and modify the `Dashboard` component:

```typescript
const Dashboard = ({ profile }: { profile: UserProfile }) => {
  return (
    <div className="flex flex-1">
      <div className="p-2 md:p-10 rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full h-full overflow-auto">
        {/* Add your custom content here */}
        <YourCustomComponent />
      </div>
    </div>
  );
};
```

### Adding/Removing Sidebar Links

In `app/dashboard/dashboard-client.tsx`, modify the `links` array:

```typescript
const links = [
  {
    label: "New Page",
    href: "/dashboard/new-page",
    icon: (
      <IconYourIcon className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  // ... more links
];
```

### Creating Additional Dashboard Pages

1. Create a new file: `app/dashboard/your-page/page.tsx`
2. Add RBAC protection:

```typescript
import { redirect } from "next/navigation";
import { getCurrentUserProfile, isPlayer } from "@/lib/rbac";

export default async function YourPage() {
  const profile = await getCurrentUserProfile();
  
  if (!profile) {
    redirect("/auth/login");
  }

  const playerAccess = await isPlayer();
  
  if (!playerAccess) {
    redirect("/?error=insufficient_permissions");
  }

  return (
    <div>
      {/* Your page content */}
    </div>
  );
}
```

### Changing Dashboard Branding

In `dashboard-client.tsx`, update the `Logo` and `LogoIcon` components:

```typescript
export const Logo = () => {
  return (
    <Link href="/dashboard" className="...">
      <Image src="/your-logo.png" alt="Logo" width={32} height={32} />
      <motion.span>Your Brand Name</motion.span>
    </Link>
  );
};
```

## 🎨 Design & Layout

### Current Layout Structure

```
┌─────────────────────────────────────┐
│  Sidebar (collapsible)  │  Content  │
│                         │           │
│  Logo                   │  Welcome  │
│  Navigation Links       │  Stats    │
│                         │  Content  │
│  User Profile (bottom)  │           │
└─────────────────────────────────────┘
```

### Sidebar Behavior

- **Desktop**: Hover to expand/collapse
- **Mobile**: Hamburger menu to toggle
- **Width**: 60px collapsed, 300px expanded

### Color Scheme

- Uses Tailwind CSS default palette
- Dark mode support included
- Neutral grays for professional look

## 🔐 Security Best Practices

1. **All role checks are server-side** - Client code cannot bypass security
2. **RLS policies protect database** - Users can only access their own data
3. **Authentication required** - No anonymous access to dashboard
4. **Role validation on every request** - Cannot fake role on client

## 📊 Database Schema

### Profiles Table

```sql
profiles (
  id UUID PRIMARY KEY,           -- References auth.users(id)
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL,            -- 'player', 'fan', 'admin', 'coach', 'scout'
  bio TEXT,
  location TEXT,
  website TEXT,
  twitter_handle TEXT,
  instagram_handle TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## 🧪 Testing Checklist

- [ ] Database tables created successfully
- [ ] Test user has "player" role assigned
- [ ] Dashboard loads at `/dashboard`
- [ ] Sidebar expands on hover (desktop)
- [ ] All navigation links present
- [ ] Non-players are redirected when accessing dashboard
- [ ] Non-authenticated users redirected to login
- [ ] User profile shows at bottom of sidebar
- [ ] Dark mode works correctly
- [ ] Mobile menu works

## 🐛 Troubleshooting

### "Forbidden - Insufficient permissions" error

**Solution**: Make sure your user has the "player" role:
```sql
UPDATE public.profiles SET role = 'player' WHERE email = 'your-email@example.com';
```

### "Unauthorized" error / Redirected to login

**Solution**: Make sure you're logged in and your session is valid.

### Sidebar not showing/working

**Solution**: Make sure you've installed all dependencies:
```bash
npm install @tabler/icons-react motion framer-motion
```

### Profile not found in database

**Solution**: The trigger might not have fired. Manually create profile:
```sql
INSERT INTO public.profiles (id, email, role)
VALUES ('user-uuid', 'email@example.com', 'player');
```

## 🎯 Next Steps

Now that the dashboard structure is set up, you can:

1. **Design the main content area** - Add widgets, charts, videos, etc.
2. **Create sub-pages** - Profile editor, video uploader, stats viewer
3. **Add real data** - Connect to your Supabase tables
4. **Implement features**:
   - Video upload and management
   - Profile editing
   - Statistics tracking
   - Team management
   - Achievement system

5. **Style refinements** - Customize colors, fonts, spacing
6. **Add animations** - More interactions and transitions
7. **Mobile optimization** - Ensure great mobile UX

## 📚 Resources

- [Aceternity UI Sidebar](https://ui.aceternity.com/components/sidebar)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

---

**Ready to customize?** Start by editing the `Dashboard` component in `dashboard-client.tsx`!

