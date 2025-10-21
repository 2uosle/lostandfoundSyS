# 🚀 Quick Start Guide

## ⚡ Get Up and Running in 5 Minutes

### Step 1: Environment Setup (2 minutes)

Create a `.env` file:

```bash
# Copy and paste this into your .env file
DATABASE_URL="postgresql://user:password@localhost:5432/lostfound"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-random-string-min-32-chars"

# Optional: For Google OAuth (see GOOGLE_OAUTH_SETUP.md)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

**Generate NEXTAUTH_SECRET:**
```bash
# Mac/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Step 2: Database Setup (2 minutes)

```bash
# Make sure PostgreSQL is running, then:
npx prisma migrate dev
npx prisma generate
```

### Step 3: Start Development Server (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🎓 Using Google OAuth (Optional)

**Want users to sign in with `@neu.edu.ph` emails?**

1. Follow the detailed guide: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
2. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`
3. Restart dev server
4. Click **"Sign in with Institutional Email"** on login page!

**Without Google OAuth:** Users can still register with email/password normally.

---

## 👤 Create Admin Account

```bash
npm run create-admin
# Follow the prompts to create an admin user
```

Or manually in database:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'youremail@example.com';
```

---

## 📋 What Works Out of the Box

✅ **Email/Password Authentication**
- Register at `/register`
- Login at `/login`
- Fully functional without Google OAuth

✅ **Item Management**
- Report lost items at `/lost`
- Report found items at `/found`
- View your items at `/dashboard`

✅ **Admin Dashboard** (admin users only)
- Manage all items at `/admin/items`
- View activity history at `/admin/history`
- Match, archive, claim, delete items
- Side-by-side comparison view

✅ **Smart Matching**
- Fuzzy text matching
- Location synonym support
- Date proximity scoring
- Keyword extraction
- Cross-field matching

---

## 🔧 Quick Customization

### Change Allowed Domains for Google OAuth

Edit `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
const ALLOWED_DOMAINS = ['neu.edu.ph', 'yourdomain.edu'];
```

### Adjust Item Categories

Edit `src/lib/validations.ts`:
```typescript
export const itemCategories = [
  'electronics',
  'clothing',
  'accessories',
  'documents',
  'keys',
  'books',
  'other',
  'your-new-category', // Add here
] as const;
```

### Customize Match Score Weights

Edit `src/lib/matching.ts`:
```typescript
// Category match (40 points - most important)
const categoryMatch = lost.category === found.category ? 40 : 0;

// Title similarity (20 points) - change weight here
const titleSimilarity = calculateStringSimilarity(lost.title, found.title) * 20;
```

---

## 🐛 Common Issues

**❌ "Cannot connect to database"**
- Is PostgreSQL running?
- Check `DATABASE_URL` in `.env`
- Try: `psql -U postgres` to verify connection

**❌ "Module not found: @prisma/client"**
```bash
npx prisma generate
```

**❌ "Google sign-in not working"**
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Restart dev server after adding env variables
- See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

**❌ "Access denied" on admin pages**
- Make sure your user has `role = 'ADMIN'` in database
- Run `npm run create-admin` to create an admin user

---

## 📚 Next Steps

1. ✅ Set up Google OAuth: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
2. 📖 Read full documentation: [README.md](./README.md)
3. 🎨 Customize the UI to match your school's branding
4. 🚀 Deploy to production (Vercel, Railway, etc.)

---

## 💡 Pro Tips

- **Test matching algorithm**: Report a lost item, then report a similar found item and use "Find Matches"
- **Admin features**: Sign in as admin to see the full admin dashboard
- **Photo uploads**: Found items require a photo (helps with verification)
- **Activity logs**: All admin actions are logged in the history page
- **Mobile friendly**: Try it on your phone - fully responsive!

---

Need help? Check the main [README.md](./README.md) or the detailed [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) guide.

