# How to Fix Vercel Root Directory Issue

## Option 1: Delete and Recreate Project (5 minutes - RECOMMENDED)

This is the **easiest and cleanest** solution:

### Steps:

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project** (bltz or whatever it's named)
3. **Go to Settings** → Scroll all the way down
4. **Click "Delete Project"** → Confirm deletion
   - Don't worry, your GitHub repo and code are safe!
   - This only deletes the Vercel deployment configuration

5. **Create New Project**:
   - Click **"Add New..."** → **"Project"**
   - Select your GitHub repository (`Daymeiion/bltz-v1`)
   - Click **"Import"**

6. **CRITICAL STEP - Configure BEFORE Deploying**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Type `with-supabase-app` ⚠️ **DO THIS NOW**
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

7. **Add Environment Variables** (if not auto-detected):
   - Go to **Settings** → **Environment Variables**
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_USE_MOCK=0`

8. **Click "Deploy"**

That's it! The build should work now.

---

## Option 2: Use Vercel CLI (If you prefer CLI)

1. **Login to Vercel**:
   ```bash
   cd C:\Users\Administrator\bltz\with-supabase-app
   npx vercel login
   ```

2. **Link your project**:
   ```bash
   npx vercel link
   ```
   - Select your existing project
   - This creates `.vercel/project.json`

3. **Update project settings** (you'll need to do this in the dashboard after linking, or use the API)

**Note**: The CLI method still requires UI access to change root directory, so Option 1 is better.

---

## Option 3: Move Next.js App to Root (Last Resort)

If you absolutely can't delete/recreate, we can move everything from `with-supabase-app/` to the root `bltz/` directory. This is a bigger change but will work.

Let me know which option you prefer!

