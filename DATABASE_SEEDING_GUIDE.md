# Database Seeding Guide

## Overview

The database has been populated with realistic dummy data to test the NEU Claim system, including the matching algorithm functionality.

## What Was Seeded

### 👥 Users (6 total)

**1 Admin Account:**
- Email: `admin@neu.edu.ph`
- Password: `Password123!`
- Role: ADMIN
- Can access all admin features

**5 Student Accounts:**
- `juan.delacruz@neu.edu.ph`
- `maria.santos@neu.edu.ph`
- `pedro.reyes@neu.edu.ph`
- `ana.garcia@neu.edu.ph`
- `carlos.lopez@neu.edu.ph`
- Password (all): `Password123!`
- Role: STUDENT

### 📢 Lost Items (8 items)

**Items with Matching Found Items:**
1. **iPhone 13 Pro Max** - Black with blue case, lost at Main Library
2. **AirPods Pro** - White with charging case, lost at Cafeteria
3. **Brown Leather Wallet** - Contains ID and cards, lost at Gymnasium

**Items Without Matches (Pending):**
4. **Dell Laptop** - Silver XPS 13 with NEU stickers, lost at Computer Lab
5. **Set of Keys** - Multiple keys with red lanyard and teddy bear charm
6. **Calculus Textbook** - Red textbook with name inside
7. **Blue Water Bottle** - Insulated with university logo sticker
8. **Black Umbrella** - Compact, automatic open/close

### ✨ Found Items (7 items)

**Items with Matching Lost Items:**
1. **Black iPhone with Blue Case** - iPhone 13 Pro found at Main Library
2. **Apple AirPods with Case** - White AirPods Pro found at Cafeteria
3. **Leather Wallet** - Brown wallet with ID found at Gymnasium

**Items Without Matches (Unclaimed):**
4. **iPhone Charger** - Lightning cable and adapter
5. **Reading Glasses** - Black-framed with brown case
6. **USB Flash Drive** - 32GB SanDisk, black
7. **Wireless Headphones** - Black Sony over-ear style

## Testing the Matching Algorithm

### High Match Pairs

The seed data includes three item pairs that should generate high match scores:

#### Pair 1: iPhone
- **Lost**: "iPhone 13 Pro Max" - Black iPhone 13 Pro Max with blue case, Main Library
- **Found**: "Black iPhone with Blue Case" - iPhone 13 Pro with blue case, Main Library
- **Expected Match Score**: ~85-95%
- **Matching Factors**: Category (Electronics), Location (Main Library), Description keywords (iPhone, black, blue, case)

#### Pair 2: AirPods
- **Lost**: "AirPods Pro" - White AirPods Pro with charging case, Cafeteria
- **Found**: "Apple AirPods with Case" - White AirPods Pro, Cafeteria
- **Expected Match Score**: ~85-95%
- **Matching Factors**: Category (Electronics), Location (Cafeteria), Description keywords (AirPods, white, case)

#### Pair 3: Wallet
- **Lost**: "Brown Leather Wallet" - Brown leather wallet with ID and cards, Gymnasium
- **Found**: "Leather Wallet" - Brown leather wallet with ID, Gymnasium
- **Expected Match Score**: ~80-90%
- **Matching Factors**: Category (Personal Items), Location (Gymnasium), Description keywords (wallet, leather, brown, ID)

## How to Use the Seed Data

### Running the Seed Script

**Initial Seed:**
```bash
npm run seed
```
or
```bash
npm run db:seed
```

**Re-seeding (Clears all data first):**
```bash
npm run seed
```

**Warning**: The seed script **DELETES ALL EXISTING DATA** before seeding. Use with caution in production!

### Testing Workflow

#### 1. Test as Admin
```
Login: admin@neu.edu.ph
Password: Password123!

Actions to test:
✅ View all items in Admin Items page
✅ Test matching algorithm (should suggest the 3 pairs above)
✅ Match items using the Match action
✅ Test email notifications (if SMTP configured)
✅ View analytics dashboard
✅ Export analytics data
✅ View activity history
```

#### 2. Test as Student
```
Login: juan.delacruz@neu.edu.ph (or any student)
Password: Password123!

Actions to test:
✅ View own lost items
✅ Report new lost items
✅ View found items catalog
✅ Receive match notifications
✅ Check notification center
```

#### 3. Test Matching Algorithm

**Via Admin Panel:**
1. Login as admin
2. Go to Admin Dashboard → Manage Items
3. Filter to show PENDING lost items
4. Click "Match" on any of the three items mentioned above
5. System should suggest the corresponding found item with high match score
6. Confirm the match
7. Check that status changes to MATCHED
8. Verify email notification was sent (if configured)

**Expected Matches:**
- iPhone 13 Pro Max → Black iPhone with Blue Case
- AirPods Pro → Apple AirPods with Case
- Brown Leather Wallet → Leather Wallet

### Testing Other Features

#### Email Notifications
If SMTP is configured:
1. Match any item as admin
2. Check that the lost item owner receives an email
3. Email should include match score, item details, and dashboard link

#### Analytics Dashboard
1. Login as admin
2. Navigate to Admin Dashboard → Analytics
3. View statistics:
   - Total Lost Items: 8
   - Total Found Items: 7
   - Category breakdown (Electronics, Personal Items, Books, Keys)
   - Location breakdown
4. Test export to CSV/JSON

#### Activity History
1. Login as admin
2. Navigate to Admin Dashboard → Activity History
3. View all admin actions
4. Should show any matches you created

## Seed Script Details

### File Location
```
prisma/seed.ts
```

### What It Does
1. **Clears existing data** (in order):
   - Activity logs
   - Notifications
   - Lost items
   - Found items
   - Users

2. **Creates new data**:
   - 1 admin user
   - 5 student users
   - 8 lost items (various categories and locations)
   - 7 found items (some matching lost items)

### Database Operations
- Uses Prisma Client for all operations
- Hashes passwords with bcrypt (12 rounds)
- Creates relationships (userId references)
- Sets realistic timestamps

## Customizing the Seed Data

### Adding More Users
Edit `prisma/seed.ts` and add to the users array:
```typescript
prisma.user.create({
  data: {
    email: 'newuser@neu.edu.ph',
    name: 'New User',
    password: hashedPassword,
    role: 'STUDENT',
  },
}),
```

### Adding More Items
Add to the lostItems or foundItems arrays:
```typescript
prisma.lostItem.create({
  data: {
    title: 'Item Title',
    description: 'Detailed description',
    category: 'Category Name',
    location: 'Location Name',
    contactInfo: users[0].email,
    lostDate: new Date('2025-10-30'),
    status: 'PENDING',
    userId: users[0].id,
  },
}),
```

### Modifying Match Pairs
To create new matching pairs:
1. Add a lost item with specific keywords
2. Add a found item with similar keywords
3. Use same category and location
4. System will calculate high match score

## Troubleshooting

### Issue: "Module type not specified" warning
This is harmless. The seed script works fine despite this warning.

### Issue: TypeScript compilation errors
Run `npx prisma generate` to regenerate Prisma Client types.

### Issue: Database connection error
Check your `.env` file has correct `DATABASE_URL`.

### Issue: Seed script hangs
- Check database is running
- Check network connectivity
- Try `Ctrl+C` and re-run

### Issue: Want to keep some data
The current seed script clears all data. To keep existing data:
1. Comment out the `deleteMany` operations
2. Modify to check if data exists before creating

## Production Considerations

**⚠️ IMPORTANT**: 
- Do NOT run seed script in production
- It deletes all existing data
- Only use for development/testing
- Consider creating a separate script for production data

### Safe Production Seeding
For production, create a separate script that:
- Checks if data exists
- Only adds missing data
- Doesn't delete anything
- Uses environment flags to prevent accidental runs

## Next Steps

After seeding:
1. ✅ Login with any account
2. ✅ Test the matching algorithm
3. ✅ Create new items
4. ✅ Test admin actions
5. ✅ Check analytics dashboard
6. ✅ Test email notifications
7. ✅ Export analytics data

## Notes

- All passwords: `Password123!`
- All emails: `@neu.edu.ph` domain
- Dates: Realistic recent dates (last 7 days)
- Match scores: Should be 80-95% for designed pairs
- Activity logs: Created automatically by system, not by seed

## Support

For issues with seeding:
1. Check `prisma/seed.ts` for errors
2. Run `npx prisma generate`
3. Check database connection
4. Review console output for specific errors
