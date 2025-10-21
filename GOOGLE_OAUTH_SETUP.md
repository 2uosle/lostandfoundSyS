# Google OAuth Setup Guide

This guide will help you set up Google OAuth for institutional email login (@neu.edu.ph).

## Prerequisites
- Google Cloud Platform account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** → **New Project**
3. Name your project (e.g., "Lost & Found System")
4. Click **Create**

## Step 2: Enable Google+ API

1. In the sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **Internal** (if you have Google Workspace) or **External**
3. Fill in the required fields:
   - **App name**: Lost & Found System
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**
5. Skip **Scopes** (click Save and Continue)
6. Skip **Test users** (click Save and Continue)
7. Click **Back to Dashboard**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Application type**: Web application
4. Name it: "Lost & Found Web Client"
5. Add **Authorized JavaScript origins**:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
6. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
7. Click **Create**
8. **Copy the Client ID and Client Secret** - you'll need these!

## Step 5: Add Environment Variables

Create a `.env` file in your project root (if it doesn't exist) and add:

```bash
# Existing variables...
DATABASE_URL="postgresql://user:password@localhost:5432/lostfound"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth - ADD THESE:
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

### Generate NEXTAUTH_SECRET

If you don't have a `NEXTAUTH_SECRET`, generate one using:

```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Step 6: Run Database Migration

Since we updated the schema (made password optional), run:

```bash
npx prisma migrate dev --name make_password_optional_for_oauth
```

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000/login`

3. Click **"Sign in with Institutional Email"**

4. You should be redirected to Google sign-in

5. Sign in with your `@neu.edu.ph` email

6. You'll be redirected back to the app and automatically logged in!

## Domain Restriction

The system is configured to **only allow** emails from `@neu.edu.ph`. 

To add more allowed domains, edit `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
const ALLOWED_DOMAINS = ['neu.edu.ph', 'anotherschool.edu']; // Add more here
```

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in Google Console **exactly matches**: `http://localhost:3000/api/auth/callback/google`
- No trailing slash!

### "Access blocked: This app's request is invalid"
- Check that you've enabled Google+ API
- Verify OAuth consent screen is configured

### "Invalid email domain"
- The user tried to sign in with a non-institutional email
- Only `@neu.edu.ph` emails are allowed by default

### User sees "Sign in with Institutional Email" but gets error
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Restart your dev server after adding environment variables

## Production Deployment

When deploying to production:

1. Add production URLs to Google Console:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`

2. Update environment variables on your hosting platform (Vercel, Railway, etc.):
   - `NEXTAUTH_URL=https://yourdomain.com`
   - `GOOGLE_CLIENT_ID=...`
   - `GOOGLE_CLIENT_SECRET=...`
   - `NEXTAUTH_SECRET=...` (use a different secret for production!)

3. If using Google Workspace, you can enforce the domain in OAuth consent screen settings.

## Security Notes

- ✅ Only institutional emails (`@neu.edu.ph`) can sign in via Google
- ✅ Users are automatically created in the database on first sign-in
- ✅ Default role is `STUDENT` (can be changed to `ADMIN` manually in database)
- ✅ No password is stored for Google OAuth users
- ⚠️ Never commit `.env` file to Git!
- ⚠️ Keep `GOOGLE_CLIENT_SECRET` confidential!

## Support

If you encounter issues, check:
- Google Cloud Console error logs
- Next.js terminal output
- Browser console for errors

