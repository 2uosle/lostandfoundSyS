# Activity Logging & History System

## Overview

Implemented a comprehensive activity logging system that tracks all admin actions on lost and found items. When items are claimed, archived, or deleted, they are logged in a separate activity history table and can be viewed in a dedicated admin page.

## Features

### 1. **Activity Logging**
Every admin action is automatically logged with:
- Action type (MATCH, CLAIM, ARCHIVE, DELETE, RESTORE)
- Item details (ID, title, type)
- Admin who performed the action
- Timestamp
- Additional context (matched items, category, location, etc.)

### 2. **Separate History Page**
- Items that are claimed, archived, or deleted no longer clutter the main dashboard
- All actions are viewable in `/admin/history`
- Full audit trail of all changes

### 3. **Smart Filtering & Search**
- Filter by action type (Match, Claim, Archive, Delete, Restore)
- Filter by item type (Lost/Found)
- Search by item title or admin name
- View detailed information about each action

## Database Schema

### New Model: `ActivityLog`

```prisma
model ActivityLog {
  id          String       @id @default(cuid())
  action      AdminAction  // MATCH, CLAIM, ARCHIVE, DELETE, RESTORE
  itemType    String       // 'LOST' or 'FOUND'
  itemId      String       // Reference to original item
  itemTitle   String       // Preserved even if item deleted
  performedBy User         @relation(fields: [userId], references: [id])
  userId      String       // Admin who performed action
  details     String?      // JSON with additional context
  createdAt   DateTime     @default(now())
  
  // Indexed for fast queries
  @@index([action, createdAt])
  @@index([itemType, itemId])
  @@index([userId])
  @@index([createdAt])
}

enum AdminAction {
  MATCH    // Items were matched together
  CLAIM    // Item marked as claimed
  ARCHIVE  // Item archived
  DELETE   // Item deleted
  RESTORE  // Item restored (future feature)
}
```

## User Flow

### For Admins:

#### 1. **Managing Items**
```
Admin Dashboard → Manage Items
  ↓
Find item → Take action (Match/Claim/Archive/Delete)
  ↓
Action is performed
  ↓
✓ Item status updated
✓ Activity logged automatically
✓ Item removed from pending list (if archived/deleted/claimed)
```

#### 2. **Viewing History**
```
Admin Dashboard → Activity History
  ↓
View all logged actions
  ↓
Filter by:
  - Action type
  - Item type  
  - Search term
  ↓
See detailed audit trail
```

## What Gets Logged

### MATCH Action
**Logged For:** Both lost AND found items

**Details Include:**
- Matched item ID
- Matched item title
- Timestamp of match

**Example:**
```json
{
  "action": "MATCH",
  "itemType": "LOST",
  "itemTitle": "Nike Backpack",
  "performedBy": "admin@school.edu",
  "details": {
    "matchedWith": "abc123",
    "matchedTitle": "Backpack"
  }
}
```

### CLAIM Action
**Logged For:** Lost items

**Details Include:**
- Contact information
- Original category

**Example:**
```json
{
  "action": "CLAIM",
  "itemType": "LOST",
  "itemTitle": "iPhone 13",
  "performedBy": "admin@school.edu",
  "details": {
    "contactInfo": "john@student.edu"
  }
}
```

### ARCHIVE Action
**Logged For:** Lost items

**Details Include:**
- Category
- Location
- Last known status

**Example:**
```json
{
  "action": "ARCHIVE",
  "itemType": "LOST",
  "itemTitle": "Blue Wallet",
  "performedBy": "admin@school.edu",
  "details": {
    "category": "accessories",
    "location": "Library"
  }
}
```

### DELETE Action
**Logged For:** Lost items

**Details Include:**
- Full item details (preserved permanently)
- Category, description, location
- Date lost

**Example:**
```json
{
  "action": "DELETE",
  "itemType": "LOST",
  "itemTitle": "Red Umbrella",
  "performedBy": "admin@school.edu",
  "details": {
    "category": "other",
    "description": "Red umbrella with wooden handle",
    "location": "Main entrance",
    "lostDate": "2025-10-15T10:00:00Z"
  }
}
```

## Activity History Page Features

### 1. **Statistics Dashboard**
Shows quick counts at the top:
- 🔗 Total Matches
- ✓ Total Claims
- 📦 Total Archives
- 🗑️ Total Deletions
- ↩️ Total Restores (future)

### 2. **Filterable Table**
Columns:
- **Date & Time** - When the action occurred
- **Action** - Badge with icon and color
- **Item** - Title and ID
- **Type** - Lost or Found
- **Performed By** - Admin name and email
- **Details** - Contextual information

### 3. **Color-Coded Actions**
- 🔗 **MATCH** - Blue badge
- ✓ **CLAIM** - Green badge
- 📦 **ARCHIVE** - Yellow badge
- 🗑️ **DELETE** - Red badge
- ↩️ **RESTORE** - Purple badge

### 4. **Search & Filters**
- **Search:** Item title or admin name
- **Action Filter:** All, Match, Claim, Archive, Delete, Restore
- **Type Filter:** All, Lost Items, Found Items

## API Endpoints

### 1. **Admin Actions** (Updated)
```
POST /api/admin/actions
```

**Body:**
```json
{
  "action": "archive" | "claim" | "match" | "delete",
  "itemId": "string",
  "matchWithId": "string" // for match action
}
```

**Behavior:**
1. Performs the requested action
2. Logs the activity automatically
3. Returns success/error

### 2. **Activity History** (New)
```
GET /api/admin/history?limit=100&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "log_123",
      "action": "MATCH",
      "itemType": "LOST",
      "itemId": "item_456",
      "itemTitle": "Nike Backpack",
      "performedBy": {
        "name": "Admin User",
        "email": "admin@school.edu"
      },
      "details": "{\"matchedWith\":\"item_789\"}",
      "createdAt": "2025-10-21T10:30:00Z"
    }
  ]
}
```

## Benefits

### 1. **Accountability**
- Every action is tracked with admin identity
- Can audit who did what and when
- Prevents unauthorized changes

### 2. **Recovery**
- Deleted items are permanently logged
- Can reference old items even after deletion
- Details preserved for future reference

### 3. **Clean Dashboard**
- Archived/claimed/deleted items don't clutter main view
- Focus on pending items only
- Better performance with fewer items to display

### 4. **Analytics**
- Track admin activity patterns
- See which items get matched vs archived
- Identify high-activity periods

### 5. **Compliance**
- Audit trail for institutional requirements
- Can prove actions were taken
- Timestamps for all changes

## UI/UX Features

### Admin Dashboard Updates
```
┌─────────────────────────────────────────┐
│  Admin Dashboard                        │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ 📦      │  │ 📊      │  │ 📈      │ │
│  │ Manage  │  │ Activity│  │ Stats   │ │
│  │ Items   │  │ History │  │ (Soon)  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────┘
```

### History Page Layout
```
┌──────────────────────────────────────────────────┐
│  Activity History                                │
├──────────────────────────────────────────────────┤
│  [Search] [Action Filter] [Type Filter]          │
├──────────────────────────────────────────────────┤
│  📊 Stats: 15 Matches | 8 Claims | 3 Archives    │
├──────────────────────────────────────────────────┤
│  Date/Time    Action  Item        Performed By   │
│  Oct 21 10:30  🔗MATCH Nike Bag   admin@edu      │
│  Oct 21 09:15  ✓CLAIM  iPhone     admin@edu      │
│  Oct 20 16:45  📦ARCHIVE Wallet   admin@edu      │
└──────────────────────────────────────────────────┘
```

## Files Created/Modified

### New Files:
1. `src/app/admin/history/page.tsx` - History page UI
2. `src/app/api/admin/history/route.ts` - History API
3. `prisma/migrations/xxx_add_activity_log/migration.sql` - Database migration

### Modified Files:
1. `prisma/schema.prisma` - Added ActivityLog model
2. `src/app/api/admin/actions/route.ts` - Added logging to all actions
3. `src/app/admin/dashboard/page.tsx` - Added link to history page

## Security

### 1. **Admin-Only Access**
- All history endpoints require admin authentication
- Regular users cannot view activity logs
- Session verification on every request

### 2. **Immutable Logs**
- Activity logs cannot be edited
- No delete endpoint for logs
- Permanent audit trail

### 3. **Detailed Context**
- All actions include admin identity
- IP address could be added (future)
- Timestamp precision to the second

## Future Enhancements

### 1. **Restore Functionality**
```typescript
// Restore archived items
POST /api/admin/actions
{
  "action": "restore",
  "itemId": "archived_item_123"
}
```

### 2. **Export History**
- Download as CSV
- Filter and export specific date ranges
- Share reports with management

### 3. **Real-Time Notifications**
- WebSocket updates when actions occur
- Toast notifications for other admins
- Activity feed in dashboard

### 4. **Advanced Analytics**
- Charts showing activity over time
- Admin leaderboards (most actions)
- Success rate metrics (matches/total items)

### 5. **Item Recovery**
- View full details of deleted items
- One-click recreation from history
- "Undo" functionality for recent actions

## Testing Checklist

- [x] Activity logged when item matched
- [x] Activity logged when item claimed
- [x] Activity logged when item archived
- [x] Activity logged when item deleted
- [x] History page displays all logs
- [x] Filters work correctly
- [x] Search functions properly
- [x] Admin authentication enforced
- [x] Item details preserved in logs
- [x] Timestamps accurate

## Migration Commands

```bash
# Create migration
npx prisma migrate dev --name add_activity_log

# Generate Prisma client
npx prisma generate

# View database
npx prisma studio
```

## Summary

The activity logging system provides:
- ✅ Complete audit trail of all admin actions
- ✅ Separate history page for viewing past actions
- ✅ Items removed from main dashboard when archived/claimed/deleted
- ✅ Detailed context for every action
- ✅ Admin accountability
- ✅ Permanent record even for deleted items
- ✅ Easy filtering and searching
- ✅ Clean, organized interface

All admin actions are now tracked, logged, and viewable in a dedicated history page, providing transparency and accountability while keeping the main dashboard focused on active items!

