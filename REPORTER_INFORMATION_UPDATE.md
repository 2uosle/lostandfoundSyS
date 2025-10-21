# Reporter Information Display - Lost & Found Items

## Overview

Added "Reported By" information to both lost and found items in the admin side-by-side comparison view. This allows admins to see who reported each item for better tracking and accountability.

## Changes Made

### 1. Frontend - Admin Items Page (`src/app/admin/items/page.tsx`)

**Updated TypeScript Types:**
```typescript
type MatchCandidate = {
  item: {
    // ... existing fields
    reportedBy?: {
      name: string | null;
      email: string | null;
    };
  };
  // ... rest of type
};
```

**Added Reporter Display in Comparison View:**

#### Lost Item (Blue Border):
- Shows reporter info at the bottom, separated by a blue border
- Displays name (or "Anonymous" if no name)
- Shows email if available

#### Found Item (Green Border):
- Shows reporter info at the bottom, separated by a green border
- Displays name (or "Anonymous" if no name)
- Shows email if available

### 2. Backend - Match API (`src/app/api/match/route.ts`)

**Updated Database Queries:**

Added `reportedBy` to the select clause for both found and lost items:

```typescript
reportedBy: {
  select: {
    name: true,
    email: true,
  },
}
```

This ensures the API returns reporter information when finding matches.

## Visual Design

### Lost Item Section:
```
┌─────────────────────────────────┐
│ 📢 Lost Item                    │
├─────────────────────────────────┤
│ [Image]                         │
│                                 │
│ Title: Nike Backpack            │
│ Description: Blue with shirts   │
│ Category: Clothing              │
│ Location: Basketball Court      │
│ Date: Oct 15, 2025             │
│ Contact: john@example.com       │
│ ───────────────────────────     │ ← Blue separator
│ Reported By:                    │
│ John Doe                        │
│ john.doe@example.com            │
└─────────────────────────────────┘
```

### Found Item Section:
```
┌─────────────────────────────────┐
│ ✨ Found Item                   │
├─────────────────────────────────┤
│ [Image]                         │
│                                 │
│ Title: Backpack                 │
│ Description: Nike black         │
│ Category: Clothing              │
│ Location: Court                 │
│ Date Found: Oct 20, 2025       │
│ Contact: jane@example.com       │
│ ───────────────────────────────     │ ← Green separator
│ Reported By:                    │
│ Jane Smith                      │
│ jane.smith@example.com          │
└─────────────────────────────────┘
```

## Data Flow

1. **User Reports Item:**
   - Lost/Found item is created with `userId` (if logged in)
   - Prisma automatically links to `User` via the `reportedBy` relation

2. **Admin Finds Matches:**
   - Admin clicks "Find Matches" on a lost item
   - API fetches potential found items WITH reporter information
   - Match scores are calculated

3. **Admin Views Comparison:**
   - Admin clicks "Compare Side-by-Side"
   - Both items display with full details INCLUDING reporter info
   - Admin can see who reported each item

## Use Cases

### 1. **Accountability**
- Admins can verify who reported suspicious items
- Track users who frequently report items
- Contact reporters if more information is needed

### 2. **Follow-Up**
- Easy access to reporter's contact information
- Can reach out to both parties when confirming a match
- Better communication for item return coordination

### 3. **Verification**
- Cross-reference reporter identity with item ownership
- Verify if the person reporting is the actual owner
- Detect potential fraud or misreporting

### 4. **Anonymous Reporting**
- If user is not logged in, shows "Anonymous"
- Protects privacy while still showing if item was reported by a logged-in user

## Example Scenarios

### Scenario 1: Registered Users
**Lost Item:**
- Reported By: John Doe
- Email: john.doe@student.edu

**Found Item:**
- Reported By: Jane Smith
- Email: jane.smith@student.edu

**Admin Action:** Can contact both users to verify and coordinate item return.

### Scenario 2: Anonymous Report
**Lost Item:**
- Reported By: Michael Johnson
- Email: michael@student.edu

**Found Item:**
- Reported By: Anonymous
- Email: (shown in Contact field)

**Admin Action:** Can still contact via provided contact info in Contact field.

### Scenario 3: Same User Reporting Both
**Lost Item:**
- Reported By: Sarah Lee
- Email: sarah@student.edu

**Found Item:**
- Reported By: Sarah Lee
- Email: sarah@student.edu

**Admin Action:** Notice unusual pattern, may need verification.

## Technical Details

### Database Relations
Already exists in Prisma schema:
```prisma
model LostItem {
  userId    String?
  reportedBy User?   @relation(fields: [userId], references: [id])
}

model FoundItem {
  userId    String?
  reportedBy User?   @relation(fields: [userId], references: [id])
}
```

### UI Styling
- **Border Color Coded:**
  - Lost Item: Blue border-t (`border-blue-200`)
  - Found Item: Green border-t (`border-green-200`)

- **Typography:**
  - Label: Bold gray (`font-semibold text-gray-700`)
  - Name: Regular gray-900 (`text-gray-900`)
  - Email: Small gray-600 (`text-sm text-gray-600`)

- **Spacing:**
  - Top padding: `pt-3`
  - Top margin: `mt-3`
  - Separated from main content by border

## Privacy Considerations

1. **Conditional Display:**
   - Only shows if `reportedBy` exists
   - Gracefully handles missing data

2. **Anonymous Users:**
   - Shows "Anonymous" instead of "null" or empty
   - Email not shown if user has no account

3. **Admin Only:**
   - Reporter info only visible to admins
   - Not shown in public item listings

## Future Enhancements (Optional)

1. **User Profile Link:**
   - Click on reporter name to view full profile
   - See all items reported by that user

2. **Contact Button:**
   - Quick "Contact Reporter" button
   - Send email directly from admin panel

3. **Report History:**
   - Show how many items this user has reported
   - Success rate of matches

4. **Trust Score:**
   - Track verified matches
   - Show reliability indicator

## Testing Checklist

- [x] Reporter info displays for logged-in users
- [x] Shows "Anonymous" for non-logged-in reporters
- [x] Email displays when available
- [x] Border colors match item type (blue/green)
- [x] Layout is clean and separated from main content
- [x] API returns reporter information
- [x] No TypeScript errors
- [x] No linter errors

## Files Modified

1. `src/app/admin/items/page.tsx` - Added reporter display in UI
2. `src/app/api/match/route.ts` - Added reporter to API response

