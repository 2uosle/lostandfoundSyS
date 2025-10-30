# Google OAuth Auto-Registration Setup

## Overview

The NEU Claim system now supports **automatic registration** for users who sign in with Google using their institutional email (`@neu.edu.ph`). When a user signs in with Google for the first time, the system automatically creates an account for them without requiring manual registration.

## How It Works

### For New Users

1. User clicks **"Sign in with Institutional Email"** on the login or register page
2. User is redirected to Google OAuth consent screen
3. User selects their `@neu.edu.ph` account
4. System checks if the email domain is allowed (`neu.edu.ph`)
5. System checks if user exists in database:
   - **If user exists**: Log them in
   - **If user doesn't exist**: Automatically create account with:
     - Email from Google profile
     - Name from Google profile (or email username as fallback)
     - Role: `STUDENT` (default)
     - Password: `null` (OAuth users don't need passwords)
6. User is logged in and redirected to the dashboard

### For Existing Users

- If a user already exists in the database, they are simply logged in
- Their name is updated if it has changed in their Google profile

## Configuration

### Environment Variables

Make sure you have the following in your `.env` file:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Allowed Domains

The allowed institutional domains are configured in `src/lib/auth.ts`:

```typescript
const ALLOWED_DOMAINS = ['neu.edu.ph']; // Add more domains as needed
```

To add more domains, simply add them to this array:

```typescript
const ALLOWED_DOMAINS = ['neu.edu.ph', 'example.edu', 'university.edu'];
```

### Google OAuth Settings

In your Google Cloud Console, configure:

1. **Authorized JavaScript origins**:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)

2. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)

3. **OAuth consent screen**:
   - Configure with your institution's information
   - Add required scopes: `email`, `profile`

## User Flow Examples

### Scenario 1: First-time Google Sign-in
```
User clicks "Sign in with Institutional Email"
  ↓
Google OAuth (user@neu.edu.ph)
  ↓
Auto-create account:
  - Email: user@neu.edu.ph
  - Name: John Doe
  - Role: STUDENT
  - Password: null
  ↓
User logged in → Dashboard
```

### Scenario 2: Returning Google User
```
User clicks "Sign in with Institutional Email"
  ↓
Google OAuth (user@neu.edu.ph)
  ↓
User exists → Log in
  ↓
User logged in → Dashboard
```

### Scenario 3: Non-institutional Email
```
User clicks "Sign in with Institutional Email"
  ↓
Google OAuth (user@gmail.com)
  ↓
Domain check fails
  ↓
Sign-in rejected (error message)
```

## Security Features

1. **Domain Restriction**: Only emails from allowed domains can sign in
2. **Google Hosted Domain**: OAuth configured with `hd: "neu.edu.ph"` parameter
3. **Session Management**: NextAuth handles secure session tokens
4. **CSRF Protection**: Built-in NextAuth CSRF protection for all auth routes
5. **Origin Validation**: Custom middleware validates request origins

## Database Schema

Auto-registered users are created with the following structure:

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String?
  password      String?        // null for OAuth users
  role          UserRole       @default(STUDENT)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  lostItems     LostItem[]
  foundItems    FoundItem[]
  activityLogs  ActivityLog[]
  notifications Notification[]
}
```

## User Experience

### Login Page
- **Google Button**: "Sign in with Institutional Email"
- **Traditional Form**: Email + Password for manual accounts
- **Hint**: "🎓 Institutional email (@neu.edu.ph) required for Google Sign-In"

### Register Page
- **Google Button**: "Sign up with Institutional Email" (auto-registers + logs in)
- **Traditional Form**: Manual registration with email + password
- **Hint**: "🎓 Use your institutional email (@neu.edu.ph) for instant access"

## Testing

All authentication functionality is covered by unit tests:

```bash
npm test
```

Tests verify:
- ✅ Password timing attack protection
- ✅ Domain validation
- ✅ User creation
- ✅ Auto-login after registration

## Troubleshooting

### Issue: "Sign-in rejected: email is not from an allowed domain"
**Solution**: Make sure the user is signing in with an `@neu.edu.ph` email address.

### Issue: "Failed to sign in with Google"
**Solutions**:
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Verify redirect URIs are configured correctly in Google Cloud Console
- Check that the application is running on the correct URL (`NEXTAUTH_URL`)

### Issue: User created but name is empty
**Solution**: This is expected behavior if the Google profile doesn't have a name. The system uses the email username as a fallback.

## Logs

The system logs important events for debugging:

```typescript
// Auto-registration
console.log(`Auto-registering new user: ${user.email}`);
console.log(`Successfully created user: ${dbUser.id}`);

// Domain rejection
console.error(`Sign-in rejected: ${user.email} is not from an allowed domain`);

// General errors
console.error("Sign-in error:", error);
```

Check your server console for these messages when troubleshooting.

## Code References

- **Auth Configuration**: `src/lib/auth.ts`
- **Login Page**: `src/app/login/page.tsx`
- **Register Page**: `src/app/register/page.tsx`
- **User Schema**: `prisma/schema.prisma`
- **Tests**: `tests/unit/auth-timing.test.ts`

## Future Enhancements

Potential improvements to consider:

1. **Email Verification**: Send welcome email after auto-registration
2. **Multi-Domain Support**: Allow different domains for different user roles
3. **Profile Completion**: Prompt users to complete their profile after first login
4. **Admin Approval**: Require admin approval for new auto-registered accounts
5. **Activity Logging**: Log auto-registration events in activity logs
