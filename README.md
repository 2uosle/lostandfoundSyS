# Lost & Found System

A modern, full-featured Lost & Found management system built with Next.js 15, featuring institutional Google OAuth authentication, advanced item matching algorithms, and admin dashboard.

## Features

✨ **Authentication**
- 🔐 Credential-based authentication (email/password)
- 🎓 **Google OAuth with institutional email** (@neu.edu.ph)
- 🔒 Role-based access control (Admin/Student)

📦 **Item Management**
- 📢 Report lost items (authentication required)
- ✨ Report found items (authentication required, photo required)
- 🔍 Advanced fuzzy matching algorithm
- 🏷️ Category-based filtering
- 📍 Location tracking with synonym support
- 🖼️ Image upload support
- 🔐 Protected routes - must sign in to report items

👨‍💼 **Admin Dashboard**
- 📊 Manage all lost and found items
- 🔄 Side-by-side item comparison
- ✅ Match, archive, claim, and delete items
- 📜 Activity history logging
- 🎯 Smart match scoring with breakdown

🎨 **Modern UI/UX**
- 🌟 Clean, Apple-inspired design
- 📱 Fully responsive
- 🔔 Toast notifications
- ⚡ Fast and optimized

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google Cloud Platform account (for OAuth)

### 1. Clone and Install

```bash
git clone <your-repo>
cd newproject
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/lostfound"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

📖 **See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for detailed Google OAuth setup instructions.**

### 3. Set Up Database

```bash
# Run migrations
npx prisma migrate dev

# (Optional) Create an admin user
npm run create-admin
```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔐 Authentication Methods

### Option 1: Google OAuth (Recommended)
1. Go to `/login`
2. Click **"Sign in with Institutional Email"**
3. Sign in with your `@neu.edu.ph` email
4. You'll be automatically registered and logged in!

### Option 2: Email/Password
1. Go to `/register`
2. Create an account with any email and password
3. Sign in at `/login`

## 📚 Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Credentials + Google OAuth)
- **Styling**: Tailwind CSS v4
- **Validation**: Zod
- **Language**: TypeScript
- **Testing**: Playwright (E2E), Vitest (Unit)

## 🗂️ Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth & registration
│   │   ├── items/        # Lost/found item endpoints
│   │   ├── match/        # Matching algorithm
│   │   └── admin/        # Admin actions
│   ├── admin/            # Admin dashboard pages
│   ├── lost/             # Report lost item
│   ├── found/            # Report found item
│   └── login/            # Login page
├── components/           # Reusable components
├── lib/                  # Utilities, validations, matching logic
└── types/                # TypeScript types

prisma/
├── schema.prisma         # Database schema
└── migrations/           # Database migrations
```

## 🔧 Customization

### Change Allowed Email Domains

Edit `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
const ALLOWED_DOMAINS = ['neu.edu.ph', 'yourdomain.edu']; // Add more domains
```

### Adjust Matching Algorithm

Edit `src/lib/matching.ts` to customize:
- Match score weights
- Keyword extraction
- Location synonyms
- Date proximity scoring

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
4. Deploy!

Don't forget to add production callback URL to Google Console:
- `https://yourdomain.com/api/auth/callback/google`

## 📖 Documentation

- [Google OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md) - Detailed OAuth configuration
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)

## 🐛 Troubleshooting

**Q: Google sign-in redirects but doesn't work**
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Verify redirect URI in Google Console matches exactly
- Restart dev server after adding env variables

**Q: Database migration failed**
- Ensure PostgreSQL is running
- Check `DATABASE_URL` is correct
- Run `npx prisma generate` then retry migration

**Q: "Only institutional emails allowed" error**
- You tried to sign in with a non-@neu.edu.ph email
- Add your domain to `ALLOWED_DOMAINS` array

## 📝 License

MIT
