# OpenChat PWA - Local Testing Guide

## 🚀 Services Running

Docker-based local testing stack (recommended):

- **Frontend (Web App):** http://localhost:3000
- **Backend API:** http://localhost:8080
- **Socket.io:** ws://localhost:8080
- **Postgres:** localhost:5433
- **Redis:** localhost:6380
- **API Health:** http://localhost:8080/health

---

## 🧪 Test the Application

### Option 1: Open in Browser (Recommended)

1. Open your browser and go to: http://localhost:3000

2. **Login with Demo Credentials:**
   - Email: `alice@openchat.dev`
   - Password: `Demo123456`

   **OR**
   - Email: `bob@openchat.dev`
   - Password: `Demo123456`

   **OR**
   - Email: `charlie@openchat.dev`
   - Password: `Demo123456`

3. **Explore Features:**
   - Real-time messaging
   - Chat list with messages
   - Typing indicators
   - User status
   - Tabs: Chats, Contacts, Calls, Settings

### Option 2: Register New User

1. Go to: http://localhost:3000/auth/register

2. Fill registration form:
   - Email (your email)
   - Username (unique)
   - Display Name
   - Password (8+ characters, uppercase, lowercase, number)

3. After registration, you'll be automatically logged in

---

## 🔌 Test Features

### ✅ Working Features

1. **Authentication**
   - User login with JWT
   - User registration
   - Protected routes
   - Session persistence (localStorage)

2. **Real-Time Messaging**
   - Socket.io connection
   - Send/receive messages
   - Typing indicators
   - User status updates

3. **Chat Management**
   - View chat list
   - Private chats
   - Group chats
   - Last message preview
   - Unread count badges

4. **Message Actions**
   - Reply, forward, copy
   - Reactions
   - Context menu actions

5. **Contacts**
   - Search users
   - Send/accept/decline requests
   - Block/unblock
   - QR code add (scan/manual)

6. **File Upload**
   - Image/file uploads in chat
   - Progress tracking
   - Size validation (10MB limit)

7. **Profile**
   - Edit display name, username, bio, status
   - Avatar upload (via FileUpload)

8. **PWA Features**
   - Manifest configured
   - Installable (Add to Home Screen)
   - Service worker for push notifications

### ⚠️ Partial Features

1. **Message Editing**
   - Schema flag exists (`isEdited`)
   - UI/NOT NOT implemented

2. **Message Deletion**
   - Schema flags exist (`isDeleted`, `deletedAt`)
   - Soft delete API NOT implemented

3. **Read Receipts**
   - No implementation

4. **Calls Tab**
   - Placeholder UI only
   - No WebRTC implementation

5. **Settings Tab**
   - Basic info display
   - No advanced settings beyond profile

---

## 🔧 API Testing

### Test Authentication

```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@openchat.dev","password":"Demo123456"}'

# Register new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","displayName":"Test User","password":"Test1234"}'

# Get profile (requires token)
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Chats API

```bash
# Get all chats (requires token)
curl -X GET http://localhost:8080/api/chats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create new chat (requires token)
curl -X POST http://localhost:8080/api/chats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"PRIVATE","participants":[{"userId":"bob_user_id"}]}'
```

### Test Health

```bash
curl http://localhost:8080/health
```

---

## 📊 Demo Data

The database has been seeded with demo data:

### Users

| Username     | Email                | Display Name  | Status |
| ------------ | -------------------- | ------------- | ------ |
| alice_demo   | alice@openchat.dev   | Alice Johnson | ONLINE |
| bob_demo     | bob@openchat.dev     | Bob Wilson    | ONLINE |
| charlie_demo | charlie@openchat.dev | Charlie Brown | AWAY   |

### Chats

- **"OpenChat Developers"** (Group) - Alice, Bob, Charlie
- **Private Chat** - Alice ↔ Bob

### Messages

- 5 demo messages in the group chat
- 2 demo messages in the private chat

---

## 🐛 Troubleshooting

### Issues & Solutions

**Issue: Web app shows "Loading..."**

- Cause: No user logged in, auth check pending
- Solution: Login with demo credentials

**Issue: Cannot login**

- Cause: Wrong email or password
- Solution: Use exact demo credentials:
  - Email: `alice@openchat.dev`
  - Password: `Demo123456`

**Issue: Registration redirects but shows "Loading..." on home page**

- Cause: Race condition between registration and auth check
- Solution: Fixed - Added small delay after registration to allow auth state to hydrate

**Issue: Registration form doesn't show loading state**

- Cause: `isLoading` not being retrieved from store
- Solution: Fixed - Added `isLoading` to destructured store values

**Issue: CORS errors when calling API**

- ✅ **FIXED** - Backend CORS now properly configured:
  - Frontend URL: http://localhost:3000
  - Backend URL: http://localhost:8080
  - Backend CORS configured to allow: localhost:3000, localhost:3001
  - Environment variable `ALLOWED_ORIGINS` updated
  - Socket.io CORS also updated with same origins
  - If you still see CORS errors, check browser console for specific errors

**Issue: Socket.io not connecting**

- Cause: WebSocket connection issues
- Solution: Check browser console for errors
  - Look for WebSocket errors in DevTools

**Issue: Port already in use**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

**Issue: Prisma P3005 when using Docker local test**

- Cause: `migrate deploy` against a non-empty schema
- Solution: Ensure API test container runs `prisma db push` (already set in `docker/apiTest.Dockerfile`), then rebuild:
  - `docker compose -f docker-compose.local-test.yml build --no-cache api`
  - `docker compose -f docker-compose.local-test.yml up -d`

# Restart services
pnpm dev
```

---

## 📱 PWA Testing

### Install as App

1. Open http://localhost:3000 in Chrome/Safari
2. Look for "Install App" icon in address bar
3. Click to install to device
4. Test offline capabilities (if implemented)

### Service Worker

```javascript
// Check service worker in DevTools
// Application > Service Workers
// Verify service worker is registered and active
```

---

## 🎯 Quick Test Checklist

Use this checklist to verify all features:

- [ ] User can login with demo credentials
- [ ] User can register new account
- [ ] Chat list displays correctly
- [ ] Clicking chat shows messages
- [ ] Send message works
- [ ] Typing indicators appear
- [ ] Socket connection shows "Connected"
- [ ] User status updates
- [ ] File upload modal opens
- [ ] Responsive design (mobile view works)
- [ ] PWA manifest loads correctly
- [ ] Logout redirects to login page

---

## 🚨 Known Issues

### Critical

- None identified during current session

### Rate Limiting

- ✅ **FIXED** - Rate limits increased for development:
  - Auth endpoints: 20 requests per 15 minutes (was 5)
  - Registration: 20 requests per hour (was 3)
  - General API: 200 requests per minute (was 100)
  - File uploads: 20 uploads per minute (was 10)

### Medium

- Message CRUD operations incomplete (edit, delete, reactions)
- Dark mode toggle missing
- Contacts/Calls/Settings tabs are placeholders

### Low

- No error boundaries in React
- No toast notifications (UI exists, not integrated)
- No form validation messages visible

---

## 📝 Development Notes

### Current Session

- **API Process ID:** 75161 (tsx watch)
- **Web Process ID:** 68844 (next dev)
- **Database:** SQLite at `apps/api/prisma/dev.db`
- **Node.js:** v22.13.1
- **pnpm:** v8.15.1

### Recent Changes (This Session)

**Bug Fixes:**

- ✅ Fixed `Toaster.tsx` - Added `'use client'` directive
- ✅ Fixed `next.config.ts` - Updated `typedRoutes` configuration
- ✅ Fixed registration race condition - Added 100ms delay for auth state hydration
- ✅ Fixed home page auth check - Added `isLoading` check before redirect
- ✅ Fixed CORS configuration - Updated to allow localhost:3000
- ✅ Fixed rate limiting - Increased limits for development (20x increase for auth endpoints)
- ✅ Fixed duplicate rate limiter declarations - Rewrote rateLimit.ts

**Configuration Updates:**

- ✅ Updated `apps/api/.env`:
  - FRONTEND_URL: http://localhost:3001 → http://localhost:3000
  - ALLOWED_ORIGINS: Added localhost:3000
- ✅ Updated `apps/api/src/index.ts`:
  - CORS now uses ALLOWED_ORIGINS from environment
  - Socket.io CORS matches HTTP CORS origins

**Database:**

- ✅ Database seeded with demo data

### Next Steps for Testing

1. **Test Authentication Flow**
   - Login success
   - Registration flow
   - Logout functionality
   - Session persistence

2. **Test Real-Time Features**
   - Message sending/receiving
   - Typing indicators
   - User status changes
   - Socket reconnection

3. **Test Chat Features**
   - Chat list loading
   - Opening chat view
   - Message history
   - Navigation between chats

4. **Test PWA Features**
   - Install prompt
   - Service worker registration
   - Offline capabilities
   - Responsive design

---

## 📚 Additional Resources

### API Documentation

- Not yet available (Swagger/OpenAPI)
- See `apps/api/src/routes/` for endpoints

### Database Schema

- `apps/api/prisma/schema.prisma`
- View with: `npx prisma studio` (from apps/api)

### Frontend Structure

- Pages: `apps/web/src/app/`
- Components: `apps/web/src/components/`
- Store: `apps/web/src/store/`

### Real-Time Events

- See `apps/api/src/services/socket.ts`
- See `apps/web/src/hooks/useSocket.ts`

---

**Happy Testing! 🚀**

Report any issues you find to the project repository:
https://github.com/shaifulshabuj/openchat-pwa/issues
