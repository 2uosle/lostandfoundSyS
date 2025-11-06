# Email Notification Setup Guide

The system currently shows `SMTP not configured` warnings because email credentials are not set up.

## Quick Setup (Gmail)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Enable **2-Step Verification** if not already enabled

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter name: `ClaimNEU Lost and Found`
5. Click **Generate**
6. **Copy the 16-character password** (you won't see it again)

### Step 3: Update .env File
Open `.env` and update these lines:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-actual-email@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"  # The 16-char app password from step 2
SMTP_FROM="your-actual-email@gmail.com"
```

### Step 4: Restart the Application
```bash
# Stop the dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Testing Email

After setup, when an admin matches a lost item with a found item, the user who reported the lost item will receive an email notification with:
- Match confidence score
- Details of both items
- Link to dashboard
- Next steps instructions

## Alternative SMTP Providers

### Outlook/Hotmail
```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_USER="your-email@outlook.com"
SMTP_PASS="your-password"
SMTP_FROM="your-email@outlook.com"
```

### Mailtrap (For Testing - emails won't actually send)
```env
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="2525"
SMTP_USER="your-mailtrap-username"
SMTP_PASS="your-mailtrap-password"
SMTP_FROM="no-reply@claimneu.test"
```
Get free credentials at: https://mailtrap.io/

### SendGrid (Production-grade)
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
SMTP_FROM="verified-sender@yourdomain.com"
```
Get API key at: https://sendgrid.com/

## Troubleshooting

### "SMTP not configured" warning
- Check that all 5 SMTP variables are set in `.env`
- Restart your dev server after changing `.env`

### Emails not sending
1. Check server console for error messages
2. Verify SMTP credentials are correct
3. For Gmail: Make sure you're using an App Password, not your regular password
4. Check spam/junk folder
5. Verify the recipient email address exists in the database

### Gmail "Less secure app access" error
- Don't use "Less secure apps" - it's deprecated
- Always use App Passwords (see Step 2 above)

### Port issues
- Port 587: TLS (recommended)
- Port 465: SSL
- Port 25: Usually blocked by ISPs

## Current Email Triggers

Emails are sent when:
1. **Match Created** - Admin matches a lost item with a found item
   - Sent to: User who reported the lost item
   - Content: Match details, confidence score, next steps

More email notifications can be added in the future (e.g., when item is claimed, status updates, etc.)
