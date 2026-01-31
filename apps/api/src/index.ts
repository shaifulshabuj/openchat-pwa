import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import { setupSocketIO } from './services/socket.js'
import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chats.js'
import uploadRoutes from './routes/upload.js'
import reactionRoutes from './routes/reactions.js'
import messageStatusRoutes from './routes/messageStatus.js'
import docsRoutes from './routes/docs.js'
import healthRoutes from './routes/health.js'
import contactRoutes from './routes/contacts.js'
import postRoutes from './routes/posts.js'
import securityPlugin from './middleware/security.js'
import { rateLimitPlugin } from './middleware/rateLimit.js'
import { validateEnv } from './utils/env.js'
import performancePlugin from './middleware/performance.js'
import { prisma } from './utils/database.js'
import { authMiddleware } from './middleware/auth.js'

// Load environment variables
dotenv.config()

export const build = async () => {
  validateEnv()
  const app = fastify({
    logger: process.env.NODE_ENV === 'production' ? { level: 'info' } : true,
  })

  // Security middleware and rate limiting
  app.register(securityPlugin)
  app.register(rateLimitPlugin)
  app.register(performancePlugin)

  // Setup CORS - Allow multiple origins from environment variable
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:3000'
  ).split(',')
  app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  })

  // Security headers
  app.register(helmet)

  // JWT plugin with stronger secret in production
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key'
  if (process.env.NODE_ENV === 'production' && jwtSecret === 'fallback-secret-key') {
    throw new Error('JWT_SECRET must be set in production environment')
  }

  app.register(jwt, {
    secret: jwtSecret,
  })

  // File upload support
  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  })

  // Root path for Railway health checks
  app.get('/', async () => {
    return { 
      message: 'OpenChat API is running', 
      status: 'healthy',
      version: '1.0.0'
    }
  })

  // API routes
  app.get('/api/hello', async () => {
    return { message: 'Hello from OpenChat API!', version: '1.0.0' }
  })

  // Register route modules
  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(chatRoutes, { prefix: '/api/chats' })
  app.register(uploadRoutes, { prefix: '/api/upload' })
  app.register(reactionRoutes, { prefix: '/api/reactions' })
  app.register(messageStatusRoutes, { prefix: '/api/message-status' })
  app.register(contactRoutes, { prefix: '/api/contacts' })
  app.register(postRoutes, { prefix: '/api/posts' })
  app.register(docsRoutes)
  app.register(healthRoutes)

  // Users search endpoint
  app.get('/api/users/search', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { q } = request.query

      if (!q || q.length < 2) {
        return reply.status(400).send({ error: 'Query must be at least 2 characters' })
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          status: true,
        },
        take: 10,
      })

      return reply.send({
        success: true,
        data: users,
      })
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Socket.io setup - Use same CORS origins as HTTP routes
  const io = new Server(app.server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // Setup Socket.io with authentication and real-time features
  setupSocketIO(io)

  // Make io available to routes
  app.decorate('io', io)

  return app
}

// Start server
const start = async () => {
  try {
    const app = await build()
    const port = Number(process.env.PORT) || 8001
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 OpenChat API server running on port ${port}`)
    console.log(`🔒 Security middleware active with rate limiting`)
    console.log(`📡 Socket.IO server ready for real-time connections`)
  } catch (err) {
    console.error('💥 Failed to start server:', err)
    process.exit(1)
  }
}

// Only start server if this file is run directly (not imported for tests)
if (process.argv[1] && process.argv[1].includes('index')) {
  start()
}
