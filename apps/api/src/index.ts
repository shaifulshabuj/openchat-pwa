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

// Load environment variables
dotenv.config()

const app = fastify({
  logger: true
})

// Setup CORS
app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
})

// Security headers
app.register(helmet)

// JWT plugin
app.register(jwt, {
  secret: process.env.JWT_SECRET || 'fallback-secret-key'
})

// File upload support
app.register(multipart)

// Health check route
app.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
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

// Users search endpoint
app.get('/api/users/search', async (request: any, reply) => {
  try {
    const { q } = request.query
    
    if (!q || q.length < 2) {
      return reply.status(400).send({ error: 'Query must be at least 2 characters' })
    }

    const users = await (app as any).prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        status: true
      },
      take: 10
    })

    return reply.send({
      success: true,
      data: users
    })
  } catch (error) {
    app.log.error(error)
    return reply.status(500).send({ error: 'Internal server error' })
  }
})

// Socket.io setup
const io = new Server(app.server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Setup Socket.io with authentication and real-time features
setupSocketIO(io)

// Make io available to routes
app.decorate('io', io)

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8001
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 OpenChat API server running on port ${port}`)
    console.log(`📡 Socket.IO server ready for real-time connections`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()