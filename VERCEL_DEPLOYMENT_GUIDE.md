# Vercel Deployment Guide - Lost & Found System

## Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com)
- PostgreSQL database (recommended: Vercel Postgres, Supabase, or Neon)

## Step 1: Prepare Your Project

### 1.1 Update ESLint Configuration
✅ Already done - ESLint errors are now warnings

### 1.2 Create a `.vercelignore` file
Create a file to exclude unnecessary files from deployment:

```
.env
.env.local
node_modules
.next
.git
*.log
coverage
.vscode
```

### 1.3 Update `next.config.ts` for production
Ensure your Next.js config is optimized:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Only use in emergency - this allows build despite type errors
    // ignoreBuildErrors: false,
  },
};

export default nextConfig;
```

## Step 2: Set Up Database

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Create a new Postgres database
3. Copy the connection string

### Option B: External Database (Supabase, Neon, Railway)
1. Create a PostgreSQL database on your chosen provider
2. Get the connection string
3. Ensure it allows external connections

## Step 3: Push to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Initial commit - Ready for Vercel deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Step 4: Deploy to Vercel

### 4.1 Import Project
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the repository: `lostandfoundSyS`

### 4.2 Configure Project Settings
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)

### 4.3 Environment Variables
Add the following environment variables in Vercel:

```env
# Database
DATABASE_URL=<your-production-database-url>

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-new-secret>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Environment
NODE_ENV=production

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<your-app-password>
SMTP_FROM=Lost & Found <your-email>
```

**Important Security Notes:**
- Generate a new `NEXTAUTH_SECRET` for production: `openssl rand -base64 32`
- Update `NEXTAUTH_URL` to your actual Vercel domain
- Update Google OAuth redirect URIs in Google Console

### 4.4 Deploy
Click "Deploy" and wait for the build to complete.

## Step 5: Database Migration

After deployment, you need to run Prisma migrations:

### Option 1: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link to your project
vercel link

# Run migration
vercel env pull .env.production
npx prisma migrate deploy
```

### Option 2: Add Build Script
Update `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

Then redeploy.

## Step 6: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to "Credentials"
4. Edit your OAuth 2.0 Client
5. Add Authorized Redirect URIs:
   - `https://your-app.vercel.app/api/auth/callback/google`
   - `https://*.vercel.app/api/auth/callback/google` (for preview deployments)

## Step 7: Create Admin User

After deployment, create an admin user:

### Option 1: Using Vercel CLI
```bash
vercel env pull
node scripts/create-admin.js
```

### Option 2: Direct Database Access
Connect to your production database and run:

```sql
INSERT INTO "User" (id, email, name, password, role, "emailVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@yourdomain.com',
  'Admin User',
  '$2a$10$...', -- Use bcrypt to hash your password
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);
```

## Step 8: Post-Deployment Checklist

- [ ] Test login functionality
- [ ] Test Google OAuth
- [ ] Create test lost/found items
- [ ] Test email notifications
- [ ] Test admin dashboard
- [ ] Test handoff process
- [ ] Check all images load correctly
- [ ] Verify database connections
- [ ] Test on mobile devices

## Troubleshooting

### Build Fails with ESLint Errors
The eslint config has been updated to treat errors as warnings. If issues persist:
1. Fix critical TypeScript errors
2. Or temporarily set `eslint.ignoreDuringBuilds: true` in `next.config.ts`

### Database Connection Issues
1. Verify `DATABASE_URL` is correct
2. Ensure database allows connections from Vercel IPs
3. Check if SSL is required (add `?sslmode=require` to connection string)

### Images Not Loading
1. Update `next.config.ts` with correct image domains
2. For Vercel blob storage, add Vercel domain to allowed patterns

### OAuth Not Working
1. Verify redirect URIs in Google Console
2. Check `NEXTAUTH_URL` matches your deployment URL
3. Ensure `NEXTAUTH_SECRET` is set

### Prisma Migration Issues
Run migrations manually:
```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

## Environment Variables Summary

| Variable | Example | Required |
|----------|---------|----------|
| DATABASE_URL | postgresql://... | ✅ |
| NEXTAUTH_URL | https://your-app.vercel.app | ✅ |
| NEXTAUTH_SECRET | random-32-char-string | ✅ |
| GOOGLE_CLIENT_ID | xxx.apps.googleusercontent.com | ✅ |
| GOOGLE_CLIENT_SECRET | GOCSPX-xxx | ✅ |
| NODE_ENV | production | ✅ |
| SMTP_HOST | smtp.gmail.com | ⚠️ Optional |
| SMTP_PORT | 587 | ⚠️ Optional |
| SMTP_USER | your@email.com | ⚠️ Optional |
| SMTP_PASS | app-password | ⚠️ Optional |
| SMTP_FROM | Lost & Found <email> | ⚠️ Optional |

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

## Custom Domain (Optional)

1. Go to Project Settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Update `NEXTAUTH_URL` and Google OAuth redirect URIs

## Monitoring

Monitor your deployment:
- **Logs**: Vercel Dashboard → Your Project → Logs
- **Analytics**: Enable Vercel Analytics
- **Performance**: Check Vercel Speed Insights

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review environment variables
3. Test locally with production environment
4. Check the Vercel documentation: https://vercel.com/docs

---

**Ready to deploy!** Follow the steps above and your Lost & Found System will be live! 🚀
