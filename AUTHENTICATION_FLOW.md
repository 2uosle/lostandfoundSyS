# 🔐 Authentication Flow Documentation

## Overview

The Lost & Found system implements comprehensive authentication protection to ensure only verified users can report items. This document explains how the authentication flow works.

---

## 🛡️ Protected Routes

### Pages Requiring Authentication

| Route | Description | Redirect Behavior |
|-------|-------------|-------------------|
| `/lost` | Report Lost Item | → `/login?callbackUrl=/lost` |
| `/found` | Report Found Item | → `/login?callbackUrl=/found` |
| `/dashboard` | My Items (user's reports) | → `/login?callbackUrl=/dashboard` |
| `/admin/*` | Admin Dashboard | → `/login` (middleware) |

### Public Routes (No Auth Required)

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/login` | Login page |
| `/register` | Registration page |

---

## 🔄 User Flow

### Scenario 1: Unauthenticated User Tries to Report Item

```
1. User clicks "Report Lost Item" from home page
   ↓
2. System checks authentication (getServerSession)
   ↓
3. No session found → Redirect to /login?callbackUrl=/lost
   ↓
4. Login page shows toast: "Please sign in to continue"
   ↓
5. User signs in (email/password OR Google OAuth)
   ↓
6. After successful login → Redirect to /lost
   ↓
7. User can now report lost item ✅
```

### Scenario 2: Authenticated User Reports Item

```
1. User clicks "Report Lost Item"
   ↓
2. System checks authentication
   ↓
3. Session found ✅ → Show report form immediately
   ↓
4. User fills form and submits
   ↓
5. API validates session and creates item
   ↓
6. Success! Item reported ✅
```

---

## 🔧 Technical Implementation

### Server-Side Protection (Page Level)

**File**: `src/app/lost/page.tsx` and `src/app/found/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function ReportLostItem() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login?callbackUrl=/lost');
  }

  return <ItemReportForm type="lost" />;
}
```

**How it works:**
1. Page is a Server Component (runs on server)
2. `getServerSession()` checks if user is authenticated
3. If no session → `redirect()` sends user to login
4. `callbackUrl` parameter preserves intended destination
5. If session exists → Render the form

### Client-Side Redirect Handling

**File**: `src/app/login/page.tsx`

```typescript
const searchParams = useSearchParams();
const callbackUrl = searchParams.get('callbackUrl') || '/';

useEffect(() => {
  if (callbackUrl !== '/') {
    showToast('Please sign in to continue', 'info');
  }
}, [callbackUrl]);

const handle = async (data: any) => {
  const res = await signIn('credentials', { 
    redirect: false, 
    email: data.email, 
    password: data.password 
  });
  
  if (!res?.error) {
    window.location.href = callbackUrl; // Redirect back!
  }
};
```

**How it works:**
1. Extract `callbackUrl` from query params
2. Show toast notification if user was redirected
3. After successful login, redirect to `callbackUrl`
4. User lands on the page they originally wanted

### API-Level Protection

**Files**: `src/app/api/items/lost/route.ts` and `src/app/api/items/found/route.ts`

```typescript
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Optional: Allow guests to report (but we enforce on page level)
  const userId = session?.user?.id;
  
  // Create item with userId
  const item = await prisma.lostItem.create({
    data: {
      ...validatedItem,
      userId, // Links item to user
    },
  });
}
```

**How it works:**
1. API checks session (defense in depth)
2. Extracts `userId` from session
3. Associates item with user in database
4. Users can only see their own items in `/dashboard`

---

## 🎯 User Experience

### Visual Indicators

1. **Navigation Bar**
   - "Report Lost" and "Report Found" buttons always visible
   - Clicking when not authenticated → Redirects to login
   - No confusing "disabled" states

2. **Login Page**
   - Toast notification: "Please sign in to continue"
   - Clear indication of why they're on login page
   - Callback URL preserved in browser address bar

3. **After Login**
   - Automatic redirect to intended page
   - Success toast: "Welcome back!"
   - Form immediately ready to use

### Error Handling

| Error Scenario | User Experience |
|----------------|-----------------|
| Try to access `/lost` without auth | Redirect to `/login?callbackUrl=/lost` |
| Invalid credentials at login | Toast: "Invalid email or password" |
| Google OAuth domain mismatch | Toast: "Only institutional emails allowed" |
| Session expires during form fill | Form submission fails → Toast with error |

---

## 🔐 Security Benefits

### Why Require Authentication?

1. **Accountability**
   - Every report is linked to a verified user
   - Prevents spam and fake reports
   - Enables contact tracing if needed

2. **Data Integrity**
   - Users can only edit/delete their own items
   - Admin can see who reported each item
   - Activity logs track all actions

3. **Trust & Safety**
   - Institutional email verification (Google OAuth)
   - Reduces anonymous malicious reports
   - Easier to ban bad actors

4. **Better Matching**
   - Contact info automatically from user profile
   - Notification system can use user email
   - Users can track their reported items

---

## 🛠️ Customization

### Make Reporting Public (Remove Auth Requirement)

If you want to allow guest reporting:

**Step 1**: Remove auth check from pages
```typescript
// src/app/lost/page.tsx
export default function ReportLostItem() {
  // Remove: const session = await getServerSession(authOptions);
  // Remove: if (!session?.user) redirect('/login?callbackUrl=/lost');
  
  return <ItemReportForm type="lost" />;
}
```

**Step 2**: Update API to handle null userId
```typescript
// src/app/api/items/lost/route.ts
const session = await getServerSession(authOptions);
const userId = session?.user?.id || null; // Allow null

await prisma.lostItem.create({
  data: {
    ...validatedItem,
    userId, // Can be null for guest reports
  },
});
```

**Step 3**: Update schema (already optional)
```prisma
model LostItem {
  userId  String? // Already optional
  // ...
}
```

### Add Additional Auth Checks

**Require Email Verification**:
```typescript
if (!session?.user) {
  redirect('/login?callbackUrl=/lost');
}

if (!session.user.emailVerified) {
  redirect('/verify-email');
}
```

**Limit to Specific Roles**:
```typescript
if (!session?.user || session.user.role === 'GUEST') {
  redirect('/login?callbackUrl=/lost');
}
```

---

## 📊 Flow Diagrams

### Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOME PAGE (/)                            │
│                                                                   │
│  [Report Lost Item]  [Report Found Item]                        │
│         │                     │                                   │
└─────────┼─────────────────────┼───────────────────────────────────┘
          ↓                     ↓
    ┌─────────────────────────────────┐
    │   Check Authentication          │
    │   (getServerSession)            │
    └─────────────────────────────────┘
          │
          ├── Authenticated? ──→ YES ──→ [Show Report Form]
          │                                      │
          └── NO                                 ↓
              │                            [Submit Item]
              ↓                                  │
    ┌─────────────────────────────────┐         ↓
    │ Redirect to:                    │    [Success!]
    │ /login?callbackUrl=/lost        │
    └─────────────────────────────────┘
              │
              ↓
    ┌─────────────────────────────────┐
    │      LOGIN PAGE                  │
    │                                   │
    │ Toast: "Please sign in to        │
    │         continue"                 │
    │                                   │
    │ [Email/Password Form]            │
    │        OR                         │
    │ [Google OAuth Button]            │
    └─────────────────────────────────┘
              │
              ↓ (after successful login)
    ┌─────────────────────────────────┐
    │ Redirect to callbackUrl         │
    │ → /lost (original destination)  │
    └─────────────────────────────────┘
              │
              ↓
    [Show Report Form] ✅
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] **Test 1**: Unauthenticated access
  - Go to `/lost` without signing in
  - Should redirect to `/login?callbackUrl=/lost`
  - Should see toast notification

- [ ] **Test 2**: Callback URL preservation
  - Try to access `/found` while logged out
  - Sign in
  - Should land on `/found` (not home page)

- [ ] **Test 3**: Direct login
  - Go to `/login` directly (no callback URL)
  - Sign in
  - Should land on home page `/`

- [ ] **Test 4**: Google OAuth redirect
  - Try to access `/lost` while logged out
  - Click "Sign in with Institutional Email"
  - Complete Google sign-in
  - Should land back on `/lost`

- [ ] **Test 5**: Form submission
  - Sign in
  - Go to `/lost`
  - Fill and submit form
  - Item should be created with your userId

### Automated Testing (Playwright)

```typescript
test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/lost');
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Flost/);
});

test('redirects back after login', async ({ page }) => {
  await page.goto('/lost');
  await page.fill('[name="email"]', 'test@neu.edu.ph');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/lost');
});
```

---

## 📝 Summary

✅ **Routes Protected**: `/lost`, `/found`, `/dashboard`, `/admin/*`  
✅ **Server-Side**: Uses `getServerSession()` for security  
✅ **Client-Side**: Smart redirect with `callbackUrl` parameter  
✅ **User Friendly**: Toast notifications and smooth redirects  
✅ **Secure**: All reports linked to verified users  
✅ **Flexible**: Easy to customize or remove auth if needed  

**Result**: Users must sign in to report items, ensuring accountability and data integrity while maintaining excellent UX! 🎉

