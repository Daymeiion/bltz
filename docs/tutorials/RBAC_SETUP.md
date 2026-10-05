# Role-Based Access Control (RBAC) Setup

## Overview

This application uses Role-Based Access Control to restrict access to certain pages based on user roles. The player dashboard is restricted to users with the "player" role.

## Database Setup

### 1. Create the Profiles Table

You need to create a `profiles` table in your Supabase database. Run this SQL in the Supabase SQL Editor:

```sql
-- Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'fan',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow authenticated users to insert their profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create a function to automatically create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'fan')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### 2. User Roles

The application supports the following roles:
- `player` - Athletes/players with access to the player dashboard
- `fan` - Regular users (default role)
- `admin` - Administrators
- `coach` - Coaches
- `scout` - Talent scouts

### 3. Set User Roles

To set a user's role to "player", run this SQL (replace the email with the actual user's email):

```sql
UPDATE public.profiles
SET role = 'player'
WHERE email = 'user@example.com';
```

Or to manually insert a profile with a specific role:

```sql
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'user-uuid-here',
  'player@example.com',
  'John Doe',
  'player'
);
```

## How RBAC Works

### 1. RBAC Utilities (`lib/rbac.ts`)

The RBAC system provides several utility functions:

- `getCurrentUserProfile()` - Gets the current user's profile with role information
- `hasRole(roles)` - Checks if the user has one of the specified roles
- `isPlayer()` - Checks if the user is a player
- `isAuthenticated()` - Checks if the user is authenticated
- `requireAuth()` - Throws error if not authenticated
- `requireRole(roles)` - Throws error if user doesn't have required role

### 2. Protected Pages

The dashboard page (`app/dashboard/page.tsx`) uses RBAC to check:
1. If the user is authenticated
2. If the user has the "player" role

If either check fails, the user is redirected.

### 3. Adding More Protected Pages

To create a new protected page with role-based access:

```typescript
import { redirect } from "next/navigation";
import { getCurrentUserProfile, hasRole } from "@/lib/rbac";

export default async function MyProtectedPage() {
  const profile = await getCurrentUserProfile();
  
  if (!profile) {
    redirect("/auth/login");
  }

  const hasAccess = await hasRole(["player", "coach"]); // Allow multiple roles
  
  if (!hasAccess) {
    redirect("/?error=insufficient_permissions");
  }

  // Your page content here
  return <div>Protected Content</div>;
}
```

## Testing

1. Create a test user account
2. Manually set their role to "player" in the database
3. Log in and navigate to `/dashboard`
4. You should see the player dashboard with the Aceternity sidebar

## Next Steps

- Customize the dashboard content
- Add more role-based pages
- Implement admin panel for role management
- Add role-based UI components (show/hide based on role)

