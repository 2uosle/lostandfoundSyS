# Foreign Key Constraint Error - Quick Fix Guide

## Problem
You're seeing this error when trying to report lost/found items:
```
Foreign key constraint violated on the constraint: `LostItem_userId_fkey`
```

## Root Cause
Your browser session contains a reference to a user ID that no longer exists in the database. This happens when:
- A user account was deleted while you were logged in
- The database was reset/seeded after you logged in
- Session data became corrupted

## ✅ Quick Fix (Choose ONE)

### Option 1: Logout and Re-login (Recommended)
1. Click the logout button in your app
2. Login again with a valid user
3. Try reporting an item again

### Option 2: Clear Browser Cookies
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Find Cookies → localhost:3000
4. Delete `next-auth.session-token` and `__Secure-next-auth.session-token`
5. Refresh the page
6. Login again

### Option 3: Incognito/Private Window
1. Open a new incognito/private browsing window
2. Navigate to http://localhost:3000
3. Login with a valid user
4. Try reporting an item

## Available Users (from database check)

```
1. cedrickjohn.dizon@neu.edu.ph (STUDENT)
2. student1-test-matching@neu.edu.ph (STUDENT)
3. student2-test-matching@neu.edu.ph (STUDENT)
4. admin-test-matching@neu.edu.ph (ADMIN)
5. maria@neu.edu.ph (STUDENT)
6. juan@neu.edu.ph (STUDENT)
7. admin@neu.edu.ph (ADMIN)
```

**Default Password for all users:** `Password123!`

## Prevention (Updated Code)

I've updated the API routes to handle this better:

### Lost Items API (`/api/items/lost`)
```typescript
// Check if user is authenticated
if (!session?.user?.id) {
  return errorResponse('Unauthorized - Please login to report items', 401);
}

// Verify user exists in database
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { id: true },
});

if (!user) {
  return errorResponse('User not found - Please re-login', 404);
}
```

### Found Items API (`/api/items/found`)
Same validation added to ensure the user exists before creating items.

## Helpful Commands

### Check Database State
```powershell
npm run db:check
```
Shows all users, items, and helps diagnose issues.

### Database Cleanup
```powershell
npm run db:cleanup
```
Shows cleanup instructions and available users.

### Reseed Database
```powershell
npm run db:seed
```
Resets database with fresh test data.

## What Changed

### Before
- API would try to create items with non-existent user IDs
- Database would reject with foreign key error
- User saw generic 500 error

### After
- API validates user exists before creating items
- Returns clear 404 error: "User not found - Please re-login"
- Better error messages guide user to solution

## Testing the Fix

1. **Logout** from your current session
2. **Login** with: `admin@neu.edu.ph` / `Password123!`
3. Go to **Report Lost Item** or **Report Found Item**
4. Fill out the form
5. Click **Submit Report**
6. Review in **Confirmation Modal**
7. Click **Confirm & Submit**
8. Should work! ✅

## If Still Having Issues

1. Check you're using a valid user from the list above
2. Make sure the database is seeded: `npm run db:seed`
3. Try clearing all site data in browser settings
4. Restart the dev server: Stop and run `npm run dev`

---

## Summary

**Problem:** Session references deleted user  
**Solution:** Logout and login again  
**Prevention:** Added user validation in API routes  
**Status:** Fixed ✅

