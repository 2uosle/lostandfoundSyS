# Lost & Found System

A secure, full-featured lost and found management system built with Next.js, featuring intelligent item matching, role-based access control, and comprehensive security measures.

## 🚀 Features

- **Smart Item Matching**: Advanced algorithm using fuzzy string matching, location synonyms, and cross-field keyword detection
- **Image Upload**: Secure image validation with magic number checking and sanitization
- **Role-Based Access**: Separate admin and student portals with protected routes
- **Rate Limiting**: Protection against brute-force attacks on authentication and API endpoints
- **Security Headers**: HSTS, CSP, X-Frame-Options, and more
- **Transaction Support**: Atomic database operations ensuring data integrity
- **Structured Logging**: Production-ready logging with Pino
- **Comprehensive Testing**: 20 unit tests with Vitest, E2E tests with Playwright
- **CI/CD Pipeline**: Automated testing and deployment via GitHub Actions

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/2uosle/newproject.git
cd newproject
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

4. Generate a secure NEXTAUTH_SECRET:
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows PowerShell
$bytes = New-Object byte[] 32; (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

5. Update `.env` with your values:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/lostfound"
NEXTAUTH_SECRET="<your-generated-secret>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="<your-google-oauth-id>"
GOOGLE_CLIENT_SECRET="<your-google-oauth-secret>"
```

6. Run database migrations:
```bash
npx prisma migrate deploy
npx prisma generate
```

7. Create an admin user:
```bash
npm run create-admin
```

8. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000`

## 🧪 Testing

```bash
# Run unit tests (20 tests)
npm test

# Run E2E tests
npm run e2e

# TypeScript type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 🔒 Security Features

### ✅ Implemented
- Timing attack protection in authentication
- Rate limiting (5 login attempts per 15 min, 30 API calls per min)
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Image magic number validation
- Filename sanitization against path traversal
- Input validation with Zod
- SQL injection protection via Prisma ORM
- XSS prevention through React's default escaping
- Secure session management with NextAuth
- Database transactions for atomicity
- Structured logging for audit trails

### ⚠️ Security Checklist
- [ ] Rotate Google OAuth credentials if previously exposed
- [ ] Update NEXTAUTH_SECRET in production
- [ ] Enable HTTPS in production
- [ ] Set up database backups
- [ ] Configure monitoring and alerting (Sentry/DataDog)
- [ ] Review and update dependencies regularly (`npm audit`)

## 📊 Performance Optimizations

- ✅ Database indexes on frequently queried fields
- ✅ Partial indexes for pending items (matching optimization)
- ✅ Transaction batching for atomic operations
- ✅ Image optimization and validation
- ✅ Async file I/O operations
- 🔄 Caching strategies for match results (planned)
- 🔄 CDN for static assets (planned)

## 🚀 Deployment

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/2uosle/newproject)

1. Click the button above
2. Add environment variables
3. Deploy!

### Environment Variables for Production

```env
DATABASE_URL=<your-production-db-url>
NEXTAUTH_SECRET=<generate-new-secret>
NEXTAUTH_URL=https://your-domain.com
GOOGLE_CLIENT_ID=<your-google-oauth-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-secret>
NODE_ENV=production
```

## 📈 API Documentation

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Items
- `POST /api/items/lost` - Report lost item
- `POST /api/items/found` - Report found item (requires image)
- `GET /api/items/lost` - List lost items (authenticated)
- `GET /api/items/found` - List found items (authenticated)
- `PATCH /api/items/[id]` - Update item (admin only)
- `DELETE /api/items/[id]` - Delete item (admin only)

### Matching
- `POST /api/match` - Find potential matches for an item

### Admin
- `POST /api/admin/actions` - Perform admin actions (match, claim, archive, delete)
- `GET /api/admin/history` - View activity log

### Health
- `GET /api/health` - System health check

## 🔄 CI/CD Pipeline

Automated checks on every push:
- ✅ TypeScript type checking
- ✅ ESLint code quality
- ✅ Unit test suite (20 tests)
- ✅ E2E test suite
- ✅ Security audit (`npm audit`)
- ✅ Build verification
- ✅ Prisma migrations check

## 📝 Recent Improvements (October 2025)

### Security Enhancements
- Fixed timing attack vulnerability in password verification
- Added rate limiting middleware
- Implemented secure file upload with magic number validation
- Added comprehensive security headers

### Performance
- Added database performance indexes
- Implemented transaction support
- Optimized image handling with async I/O

### Testing
- Created 20 unit tests covering:
  - Authentication timing attack protection
  - Image validation and sanitization
  - Matching algorithm accuracy
- Configured CI/CD pipeline with GitHub Actions

### Developer Experience
- Added structured logging with Pino
- Created comprehensive error handling
- Added health check endpoint
- Updated documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

All pull requests must:
- Pass all tests (`npm test`)
- Pass TypeScript checks (`npx tsc --noEmit`)
- Pass linting (`npm run lint`)
- Include tests for new features

## 📄 License

This project is licensed under the MIT License.

---

**Version**: 1.0.0  
**Last Updated**: October 25, 2025  
**Test Coverage**: 20 unit tests passing
