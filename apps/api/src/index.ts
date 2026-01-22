import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = fastify({
  logger: true
})

// Setup CORS
app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
})

// Security headers
app.register(helmet)

// Health check route
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// API routes
app.get('/api/hello', async () => {
  return { message: 'Hello from OpenChat API!' }
})

// Socket.io setup
const io = new Server(app.server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ["GET", "POST"]
  }
})

// Redis adapter for scaling (optional for development)
if (process.env.REDIS_URL) {
  const pubClient = createClient({ url: process.env.REDIS_URL })
  const subClient = pubClient.duplicate()
  
  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient))
    console.log('Redis adapter connected')
  })
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)
  
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId)
    console.log(`User ${socket.id} joined room ${roomId}`)
  })
  
  socket.on('send-message', (data) => {
    // Broadcast to all users in the room
    socket.to(data.roomId).emit('receive-message', {
      id: Date.now().toString(),
      content: data.content,
      userId: data.userId,
      timestamp: new Date().toISOString()
    })
  })
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8001
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 OpenChat API server running on port ${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()