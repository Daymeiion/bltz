# Fixing Vercel Root Directory Issue

If Vercel won't let you change the Root Directory in the UI, here are your options:

## Option 1: Delete and Recreate Project (Easiest)

1. **Go to Vercel Dashboard** → Your Project
2. **Settings** → Scroll to bottom → **Delete Project**
3. **Create a new project**:
   - Click "Add New..." → "Project"
   - Import the same GitHub repository
   - **IMPORTANT**: When configuring, set **Root Directory** to `with-supabase-app` BEFORE clicking Deploy
   - This is the only time you can set it easily

## Option 2: Use Vercel CLI to Set Root Directory

1. **Install Vercel CLI** (if not already):
   ```bash
   npm i -g vercel
   ```

2. **Link your project**:
   ```bash
   cd with-supabase-app
   vercel link
   ```
   - Select your existing project
   - This will create/update `.vercel/project.json`

3. **Update project settings via API** or use the CLI:
   ```bash
   vercel env pull .env.local
   ```

4. **Manually update in dashboard**:
   - Go to Settings → General
   - The Root Directory field should now be editable after linking

## Option 3: Move Next.js App to Root (Alternative)

If the above don't work, you can move everything from `with-supabase-app/` to the root:

1. **Move all files** from `with-supabase-app/` to root `bltz/`
2. **Delete** the `with-supabase-app/` folder
3. **Update imports** if any reference `with-supabase-app/`
4. **Redeploy** - Vercel will now build from root

**Note**: This requires moving files and might break local development setup.

## Option 4: Use vercel.json with Build Commands

The `vercel.json` at the root should work, but if it doesn't:

1. **Commit and push** the `vercel.json` file
2. **Redeploy** in Vercel
3. Vercel should read the build commands from `vercel.json`

If this still doesn't work, try **Option 1** (delete and recreate) - it's the cleanest solution.

