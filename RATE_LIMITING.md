# Distributed Rate Limiting

This application uses **database-backed distributed rate limiting** that works across multiple server instances.

## Overview

The rate limiting system protects the application from abuse by limiting the number of requests from a single source within a time window.

### Key Features

- ✅ **Distributed**: Works across multiple server instances (no in-memory cache)
- ✅ **Database-backed**: Uses PostgreSQL for persistence
- ✅ **Per-user tracking**: Authenticated users are tracked by user ID
- ✅ **IP-based fallback**: Unauthenticated requests use IP address
- ✅ **Automatic cleanup**: Expired entries are cleaned up periodically
- ✅ **Fail-open**: If database fails, requests are allowed (prevents complete outage)

## Rate Limits

### Authentication Endpoints
- **Limit**: 5 attempts per 15 minutes
- **Applies to**: `/api/auth/register`, `/api/auth/signin`
- **Identifier**: `auth:ip:<ip>` or `auth:user:<userId>`

### Write Operations (POST/PUT/DELETE/PATCH)
- **Limit**: 10 requests per minute
- **Applies to**: `/api/items/*`, `/api/handoff/*`, `/api/notifications/*`
- **Identifier**: `write:ip:<ip>` or `write:user:<userId>`

### Read Operations (GET)
- **Limit**: 60 requests per minute
- **Applies to**: All `/api/*` endpoints
- **Identifier**: `api:ip:<ip>` or `api:user:<userId>`

## Implementation

### Database Schema

```prisma
model RateLimit {
  id        String   @id @default(cuid())
  key       String   @unique
  count     Int      @default(1)
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([key, expiresAt])
  @@index([expiresAt])
}
```

### How It Works

1. **Request arrives** → Middleware extracts identifier (user ID or IP)
2. **Check database** → Look for existing rate limit entry
3. **First request or expired** → Create new entry with count=1
4. **Within window** → Increment counter
5. **Over limit** → Return 429 Too Many Requests
6. **Cleanup** → Cron job removes expired entries hourly

### Code Example

```typescript
// Create a rate limiter
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute window
});

// Check rate limit
try {
  await limiter.check(10, 'user:abc123'); // 10 requests max
  // Request allowed
} catch {
  // Rate limit exceeded
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429 }
  );
}
```

## Cleanup

Expired rate limit entries are automatically cleaned up:

### Automatic Cleanup (Recommended)

**Vercel Cron Jobs** (configured in `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-rate-limits",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Manual Cleanup

Call the cleanup endpoint manually:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/cleanup-rate-limits
```

### Environment Variables

Add to your `.env` file:
```bash
# Generate with: openssl rand -base64 32
CRON_SECRET="your-secret-here"
```

## Monitoring

### Check Rate Limit Usage

```sql
-- See active rate limits
SELECT key, count, expiresAt 
FROM "RateLimit" 
WHERE expiresAt > NOW()
ORDER BY count DESC;

-- Count by type
SELECT 
  SPLIT_PART(key, ':', 1) as type,
  COUNT(*) as total
FROM "RateLimit" 
WHERE expiresAt > NOW()
GROUP BY type;
```

### Check for Abuse

```sql
-- Find IPs/users hitting limits
SELECT key, count, expiresAt
FROM "RateLimit"
WHERE count >= 5 AND expiresAt > NOW()
ORDER BY count DESC;
```

## Configuration

### Adjust Limits

Edit `middleware.ts`:

```typescript
// Authentication: 5 attempts per 15 minutes
await authLimiter.check(5, key);

// Writes: 10 per minute
await writeLimiter.check(10, key);

// Reads: 60 per minute
await apiLimiter.check(60, key);
```

### Change Time Windows

```typescript
const authLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
});

const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
});
```

## Testing

### Test Rate Limiting

```bash
# Hit an endpoint rapidly
for i in {1..10}; do
  curl http://localhost:3000/api/items/lost
done

# Should see 429 responses after limit
```

### Reset Rate Limit for Testing

```sql
DELETE FROM "RateLimit" WHERE key LIKE 'api:ip:%';
```

## Production Considerations

### Database Performance

The rate limiting table is indexed for performance:
- `@@index([key, expiresAt])` - Fast lookups
- `@@index([expiresAt])` - Fast cleanup

### Scaling

The system scales horizontally:
- ✅ Multiple server instances share the same database
- ✅ No coordination needed between instances
- ✅ Atomic increments prevent race conditions

### Monitoring

Set up alerts for:
- High rate limit violations (potential attack)
- Large RateLimit table (cleanup issues)
- Database errors in rate limiting

### Graceful Degradation

If the database is unavailable:
- Requests are **allowed** (fail-open)
- Errors are logged
- Application remains functional

## Comparison: In-Memory vs Database

| Feature | In-Memory (Old) | Database (New) |
|---------|----------------|----------------|
| Works across instances | ❌ No | ✅ Yes |
| Survives restarts | ❌ No | ✅ Yes |
| Shared state | ❌ No | ✅ Yes |
| Memory usage | ⚠️ Grows unbounded | ✅ Cleaned up |
| Performance | ⚡ Faster | 🐢 Slightly slower |
| Complexity | ✅ Simple | ⚠️ Needs DB |

## Troubleshooting

### Rate limits not working?

1. Check database connection
2. Verify Prisma client is generated: `npx prisma generate`
3. Check middleware is running: Look for logs
4. Verify table exists: Check PostgreSQL

### Too many false positives?

1. Increase limits in `middleware.ts`
2. Adjust time windows
3. Whitelist specific IPs/users

### Database filling up?

1. Verify cron job is running
2. Check `CRON_SECRET` is set
3. Manually trigger cleanup: `GET /api/cron/cleanup-rate-limits`

## Security Notes

- ⚠️ **Cron endpoint is protected** - Requires `Authorization: Bearer CRON_SECRET`
- ⚠️ **Rate limits are per-endpoint** - Can't bypass by switching endpoints
- ⚠️ **User-based tracking** - Authenticated users tracked even if IP changes
- ⚠️ **Fail-open design** - System remains available if DB fails

## Future Enhancements

Consider adding:
- [ ] Redis/Upstash for faster lookups (current DB approach is already distributed)
- [ ] Rate limit headers (`X-RateLimit-Remaining`, etc.)
- [ ] Per-user custom limits (premium users get higher limits)
- [ ] Dynamic rate limiting based on load
- [ ] Geographic-based limits
- [ ] CAPTCHA integration for repeated violations
