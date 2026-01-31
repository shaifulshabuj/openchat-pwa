# OpenChat PWA

A modern, open-source Progressive Web Application (PWA) inspired by WeChat, designed for cross-device social networking and instant messaging.

## 🚀 Features

- **Cross-Platform**: Works on desktop, mobile, and tablet devices
- **Offline-First**: Full functionality even with poor/no internet connectivity
- **Real-Time Messaging**: Instant communication with low latency
- **Modern Tech Stack**: Built with React 18+, Next.js 14+, TypeScript 5+
- **Progressive Web App**: Native app-like experience in the browser
- **End-to-End Encryption**: Privacy-focused secure messaging
- **Self-Hostable**: Deploy your own instance
- **Password Reset**: Secure email-based account recovery

## 🏗️ Architecture

This project uses a monorepo structure with:

- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS, PWA features
- **Backend**: Node.js with Fastify/Express, Socket.io for real-time communication
- **Database**: PostgreSQL with Redis for caching and sessions
- **DevOps**: Docker, GitHub Actions, Railway deployment

## 📋 Quick Start

### Prerequisites

- Node.js 20+ LTS
- pnpm 8+
- Docker (for local development)
- PostgreSQL
- Redis

### Installation

```bash
# Clone the repository
git clone https://github.com/shaifulshabuj/openchat-pwa
cd openchat-pwa

# Install dependencies
pnpm install

# Setup environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# Start development servers
pnpm dev
```

### Password Reset Email

Configure SMTP settings in `apps/api/.env` to enable password reset emails. If SMTP is not configured,
the API will log reset links to the server console in development.

### Development

```bash
# Start all services
pnpm dev

# Build all apps
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## 📦 Project Structure

```
openchat-pwa/
├── apps/
│   ├── web/          # Next.js frontend PWA
│   └── api/          # Node.js backend API
├── packages/
│   ├── ui/           # Shared UI components
│   ├── config/       # Shared configuration
│   └── types/        # Shared TypeScript types
├── docs/             # Documentation
└── docker/           # Docker configurations
```

## 🚀 Deployment

### Frontend (GitHub Pages)
The frontend is automatically deployed to GitHub Pages on push to main branch.

### Backend (Railway)
The backend is deployed on Railway for scalable hosting.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Live Demo](https://shaifulshabuj.github.io/openchat-pwa)
- [Documentation](https://github.com/shaifulshabuj/openchat-pwa/docs)
- [GitHub Discussions](https://github.com/shaifulshabuj/openchat-pwa/discussions)
- [Issue Tracker](https://github.com/shaifulshabuj/openchat-pwa/issues)
