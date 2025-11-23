# Deploying to Vercel

This guide will walk you through deploying your Next.js app with Supabase to Vercel.

## Prerequisites

1. A GitHub account (or GitLab/Bitbucket)
2. A Vercel account (sign up at [vercel.com](https://vercel.com))
3. Your Supabase project credentials

## Step 1: Prepare Your Code

1. **Commit your code to Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**:
   - Create a new repository on GitHub
   - Push your code:
     ```bash
     git remote add origin https://github.com/yourusername/your-repo-name.git
     git branch -M main
     git push -u origin main
     ```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Click "Add New..." → "Project"**
3. **Import your GitHub repository**:
   - Select your repository from the list
   - Click "Import"
4. **Configure your project**:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `with-supabase-app` ⚠️ **CRITICAL**: Set this to `with-supabase-app` if your repo root is `bltz`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)
   
   **Important**: If you see errors about `./src/app/page.tsx` or invalid `next.config.ts` keys, it means the Root Directory is not set correctly. Make sure it's set to `with-supabase-app`.

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Navigate to your project**:
   ```bash
   cd with-supabase-app
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   - Follow the prompts
   - For production deployment: `vercel --prod`

## Step 3: Configure Environment Variables

**Critical**: You must add your environment variables in Vercel before deployment succeeds.

1. **In Vercel Dashboard**:
   - Go to your project → **Settings** → **Environment Variables**

2. **Add the following variables**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_USE_MOCK=0
   ```

   **Where to find these values**:
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **Settings** → **API**
   - Copy:
     - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

3. **Optional Environment Variables** (if you use them):
   ```
   OPENAI_API_KEY=your_openai_key (if using AI features)
   TAVILY_API_KEY=your_tavily_key (if using search features)
   ```

4. **Set for all environments**:
   - Check boxes for: **Production**, **Preview**, and **Development**

5. **Click "Save"**

## Step 4: Configure Build Settings

1. **In Vercel Dashboard** → **Settings** → **General**:
   - Verify **Node.js Version**: Should be 18.x or 20.x
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)

2. **If your project root is different**:
   - Go to **Settings** → **General**
   - Set **Root Directory** to `with-supabase-app`

## Step 5: Deploy

1. **If using Dashboard**: Click "Deploy" button
2. **If using CLI**: Run `vercel --prod`

3. **Wait for deployment** to complete (usually 2-5 minutes)

4. **Check deployment logs** for any errors

## Step 6: Verify Deployment

1. **Visit your deployment URL** (e.g., `https://your-project.vercel.app`)
2. **Test key features**:
   - Homepage loads
   - Player pages work (`/player/[slug]`)
   - Search functionality
   - Authentication (if enabled)

## Troubleshooting

### Build Errors

**Error: Missing environment variables**
- Solution: Ensure all required env vars are set in Vercel dashboard

**Error: Module not found**
- Solution: Check `package.json` dependencies are correct
- Run `npm install` locally to verify

**Error: Supabase connection failed**
- Solution: Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active

### Runtime Errors

**404 on player pages**
- Check RLS policies in Supabase allow public read access
- Verify `visibility = true` for players

**Search not working**
- Verify API routes are deployed correctly
- Check browser console for errors

### Performance Issues

**Slow page loads**
- Enable Vercel Edge Functions if using API routes
- Optimize images (Next.js Image component)
- Check Supabase query performance

## Post-Deployment

1. **Set up custom domain** (optional):
   - Go to **Settings** → **Domains**
   - Add your domain
   - Follow DNS configuration instructions

2. **Enable Analytics** (optional):
   - Go to **Analytics** tab
   - Enable Web Analytics

3. **Set up automatic deployments**:
   - Already enabled by default when connected to GitHub
   - Every push to `main` branch triggers production deployment
   - Pull requests create preview deployments

## Environment-Specific Settings

You can set different values for different environments:

- **Production**: Your live site
- **Preview**: Pull request deployments
- **Development**: Local development (via Vercel CLI)

Set environment variables for each environment as needed.

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Vercel Integration](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

## Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] Build settings verified
- [ ] Deployment successful
- [ ] Site tested and working
- [ ] Custom domain configured (optional)

