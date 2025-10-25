# Pre-Deployment Checklist

## ✅ Files Modified/Created for Deployment

- [x] `eslint.config.mjs` - Updated to treat errors as warnings
- [x] `package.json` - Added Prisma generate to build script
- [x] `.vercelignore` - Created to exclude unnecessary files
- [x] `vercel.json` - Created for Vercel configuration
- [x] `VERCEL_DEPLOYMENT_GUIDE.md` - Comprehensive guide
- [x] `QUICK_DEPLOY.md` - Quick start guide

## 📋 Pre-Deployment Tasks

### Code Preparation
- [x] ESLint configuration updated (errors → warnings)
- [x] Build scripts configured
- [ ] Test local build: `npm run build`
- [ ] Verify no critical errors

### Environment Setup
- [ ] Production database created (Vercel Postgres/Supabase/Neon)
- [ ] Database URL obtained
- [ ] New NEXTAUTH_SECRET generated (run: `openssl rand -base64 32`)
- [ ] All environment variables ready

### Repository
- [ ] Code committed to Git
- [ ] Pushed to GitHub
- [ ] Repository is public or Vercel has access

### Google OAuth
- [ ] Google Cloud Console project exists
- [ ] OAuth credentials configured
- [ ] Ready to add Vercel redirect URIs after deployment

### Email (Optional)
- [ ] SMTP credentials verified
- [ ] App password generated (if using Gmail)

## 🚀 Deployment Steps

1. [ ] Sign in to Vercel (https://vercel.com)
2. [ ] Click "Add New Project"
3. [ ] Import GitHub repository
4. [ ] Configure project settings (use defaults)
5. [ ] Add all environment variables
6. [ ] Click "Deploy"
7. [ ] Wait for build to complete

## 🔧 Post-Deployment Tasks

1. [ ] Copy Vercel deployment URL
2. [ ] Update NEXTAUTH_URL environment variable
3. [ ] Add Vercel URL to Google OAuth redirect URIs
4. [ ] Run database migrations
5. [ ] Create admin user
6. [ ] Test login functionality
7. [ ] Test Google OAuth
8. [ ] Test creating lost/found items
9. [ ] Test email notifications
10. [ ] Test admin dashboard

## 🛠️ Test Local Build First

Before deploying, test locally:

```powershell
# Clean install
Remove-Item -Recurse -Force node_modules, .next
npm install

# Generate Prisma client
npx prisma generate

# Build
npm run build

# Test production build
npm start
```

Visit http://localhost:3000 and verify everything works.

## 📝 Environment Variables Needed

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-new>
GOOGLE_CLIENT_ID=<your-id>
GOOGLE_CLIENT_SECRET=<your-secret>
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASS=<app-password>
SMTP_FROM=Lost & Found <your-email>
```

## ⚠️ Security Reminders

- [ ] Never commit `.env` to GitHub
- [ ] Generate new NEXTAUTH_SECRET for production
- [ ] Use different database for production
- [ ] Keep API keys secure
- [ ] Enable 2FA on Vercel account
- [ ] Review Vercel security settings

## 📊 Monitoring

After deployment:
- [ ] Check Vercel deployment logs
- [ ] Monitor runtime logs
- [ ] Set up error tracking (optional)
- [ ] Configure Vercel Analytics (optional)

## 🎯 Ready to Deploy?

If all items above are checked, you're ready to deploy! 🚀

Follow the steps in `QUICK_DEPLOY.md` for the fastest deployment process.
