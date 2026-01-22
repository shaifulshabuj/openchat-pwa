# 🚀 OpenChat PWA Development Guide

Welcome to OpenChat PWA! This guide will help you get started with development using our multi-agent agentic approach.

## 📋 Quick Start

### Prerequisites
- **Node.js**: 20+ LTS
- **pnpm**: 8+ (install with `npm install -g pnpm`)
- **Docker** (optional, for databases)
- **Git**

### 🏃‍♂️ Get Running in 2 Minutes

```bash
# Clone the repository
git clone https://github.com/shaifulshabuj/openchat-pwa
cd openchat-pwa

# Install all dependencies
pnpm install

# Start development servers
pnpm dev

# Or start individual services:
# API Server: cd apps/api && npm run dev
# Web App: cd apps/web && npm run dev
```

**That's it!** 🎉

- **Web App**: http://localhost:3001
- **API Server**: http://localhost:8001
- **Health Check**: http://localhost:8001/health

## 🏗️ Project Architecture

```
openchat-pwa/
├── apps/
│   ├── web/              # Next.js 16 PWA Frontend
│   │   ├── src/app/      # App Router pages
│   │   ├── public/       # Static assets & PWA manifest
│   │   └── package.json  # Frontend dependencies
│   └── api/              # Node.js Backend
│       ├── src/          # API source code
│       │   └── index.ts  # Main server file
│       └── package.json  # Backend dependencies
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shared UI components (coming soon)
│   └── config/           # Shared configuration (coming soon)
├── docker/               # Docker configurations
└── .github/workflows/    # CI/CD pipelines
```

## 💻 Development Commands

### Root Level Commands (using Turborepo)

```bash
# Start all development servers
pnpm dev

# Build all projects
pnpm build

# Run tests across all projects
pnpm test

# Lint all projects
pnpm lint

# Type-check all projects
pnpm type-check

# Clean all build artifacts
pnpm clean

# Format code
pnpm format
```

### Individual Project Commands

```bash
# Frontend (apps/web)
cd apps/web
npm run dev        # Start dev server
npm run build      # Build for production
npm run start      # Start production server

# Backend (apps/api)
cd apps/api
npm run dev        # Start dev server with hot reload
npm run build      # Compile TypeScript
npm run start      # Start production server

# Types (packages/types)
cd packages/types
npm run build      # Build TypeScript declarations
npm run dev        # Watch mode
```

## 🌟 Current Features

### ✅ Phase 0: Foundation (COMPLETE)

- [x] **Monorepo Setup**: Turborepo with pnpm workspaces
- [x] **Frontend**: Next.js 16 with App Router, TypeScript, Tailwind CSS
- [x] **Backend**: Node.js with Fastify, Socket.io for real-time communication
- [x] **PWA Ready**: Manifest, service worker foundation
- [x] **Modern UI**: Clean, responsive mobile-first design
- [x] **Development Tools**: ESLint, Prettier, TypeScript strict mode
- [x] **CI/CD**: GitHub Actions for automated deployment
- [x] **Docker Support**: Full containerization for development

### 🚧 Phase 1: Core Messaging (IN PROGRESS)

- [ ] **User Authentication**: JWT-based auth system
- [ ] **Real-time Messaging**: Socket.io implementation
- [ ] **Chat Management**: Create, join, leave chats
- [ ] **Message Types**: Text, emoji, basic formatting
- [ ] **Offline Support**: PWA caching and sync
- [ ] **Push Notifications**: Web Push API integration

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 4
- **State**: Zustand + React Query
- **UI Components**: Radix UI primitives
- **PWA**: Native service workers
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify (high performance)
- **Real-time**: Socket.io 4+
- **Language**: TypeScript 5+
- **Validation**: Zod schemas
- **Security**: Helmet, CORS, rate limiting

### DevOps
- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Deployment**: GitHub Pages (frontend) + Railway (backend)

## 🧪 Testing Strategy

### Current Status
- **Unit Tests**: Setup ready (Vitest)
- **E2E Tests**: Planned (Playwright)
- **Type Safety**: TypeScript strict mode ✅
- **Linting**: ESLint configured ✅
- **Formatting**: Prettier configured ✅

### Running Tests
```bash
# Run all tests
pnpm test

# Run specific project tests
pnpm test --filter=openchat-web
pnpm test --filter=openchat-api
```

## 🚀 Deployment

### Automatic Deployment (Configured)

**Frontend** → GitHub Pages
- Triggers on push to `main` branch
- Static export with Next.js
- Accessible at: `https://shaifulshabuj.github.io/openchat-pwa`

**Backend** → Railway
- Triggers on push to `main` branch  
- PostgreSQL and Redis included
- Automatic scaling and SSL

### Manual Deployment

```bash
# Build for production
pnpm build

# Frontend static export
cd apps/web && npm run build
# Output in: apps/web/out/

# Backend production build
cd apps/api && npm run build
# Output in: apps/api/dist/
```

## 🔧 Environment Setup

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_SOCKET_URL=http://localhost:8001
NEXT_PUBLIC_APP_NAME=OpenChat PWA
```

### Backend (.env)
```bash
NODE_ENV=development
PORT=8001
FRONTEND_URL=http://localhost:3001
JWT_SECRET=your-super-secret-key
```

## 📱 PWA Features

### Current Implementation
- ✅ **Web Manifest**: App metadata and icons
- ✅ **Mobile-First**: Responsive design
- ✅ **Offline-Ready**: Service worker foundation
- ✅ **Installable**: Add to home screen support

### Coming Soon
- 🔄 **Background Sync**: Offline message queuing
- 🔄 **Push Notifications**: Real-time alerts
- 🔄 **App Shortcuts**: Quick actions
- 🔄 **Share Target**: Receive shared content

## 🤝 Contributing

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Changes**
   ```bash
   # Make your changes
   pnpm dev  # Test locally
   pnpm lint # Check code style
   pnpm type-check # Verify types
   ```

3. **Commit & Push**
   ```bash
   git add -A
   git commit -m "feat: add amazing feature"
   git push origin feature/amazing-feature
   ```

4. **Create Pull Request**
   - 2 approvals required
   - All tests must pass
   - No merge conflicts
   - Documentation updated

### Code Standards
- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (automatic)
- **Linting**: ESLint (automatic)
- **Commits**: Conventional commits
- **Tests**: Required for new features

## 🚨 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm run dev
```

**Dependencies Issue**
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**TypeScript Errors**
```bash
# Rebuild types package
pnpm build --filter=@openchat/types
```

**Docker Issues**
```bash
# Reset Docker environment
docker-compose down -v
docker-compose up --build
```

## 📚 Next Steps

### Immediate (Week 1-2)
- [ ] Complete user authentication system
- [ ] Implement basic chat functionality
- [ ] Add message persistence
- [ ] Setup database integration

### Short Term (Month 1)
- [ ] Real-time typing indicators
- [ ] File upload and sharing
- [ ] Group chat creation
- [ ] Enhanced PWA features

### Long Term (Month 2-3)
- [ ] End-to-end encryption
- [ ] Voice/video calling
- [ ] Advanced chat features
- [ ] Admin dashboard

## 📞 Support

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community chat
- **Documentation**: `/docs` directory (coming soon)

---

**Built with ❤️ using GitHub Copilot multi-agent development approach**

*Ready to build the future of open-source messaging!* 🚀