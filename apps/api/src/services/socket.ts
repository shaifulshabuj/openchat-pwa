import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { getUserFromToken } from '../utils/auth.js'
import { prisma } from '../utils/database.js'

export interface AuthenticatedSocket extends Socket {
  userId: string
  username: string
}

interface TypingData {
  chatId: string
  userId: string
  username: string
}

interface JoinRoomData {
  chatId: string
}

interface SendMessageData {
  chatId: string
  content: string
  type?: string
  replyToId?: string
}

export const setupSocketIO = async (io: Server) => {
  // Redis adapter for scaling (if Redis is available)
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL })
      const subClient = pubClient.duplicate()
      
      await Promise.all([pubClient.connect(), subClient.connect()])
      io.adapter(createAdapter(pubClient, subClient))
      console.log('Socket.IO Redis adapter connected')
    } catch (error) {
      console.warn('Redis not available, using default adapter:', error)
    }
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'))
      }

      const payload = getUserFromToken(token)
      if (!payload) {
        return next(new Error('Authentication error: Invalid token'))
      }

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, status: true }
      })

      if (!user) {
        return next(new Error('Authentication error: User not found'))
      }

      // Attach user info to socket
      (socket as any).userId = payload.userId
      (socket as any).username = payload.username
      
      next()
    } catch (error) {
      next(new Error('Authentication error: Invalid token'))
    }
  })

  // Connection handling
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = (socket as any).userId
    const username = (socket as any).username
    
    console.log(`User connected: ${username} (${userId})`)

    // Update user status to online
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          status: 'ONLINE',
          lastSeen: new Date()
        }
      })

      // Join personal room for direct notifications
      socket.join(`user:${userId}`)

      // Auto-join user's chat rooms
      const userChats = await prisma.chatParticipant.findMany({
        where: {
          userId,
          leftAt: null
        },
        select: { chatId: true }
      })

      for (const chat of userChats) {
        socket.join(chat.chatId)
      }

      // Notify others that user is online
      socket.broadcast.emit('user-status-changed', {
        userId,
        username,
        status: 'ONLINE',
        lastSeen: new Date()
      })

    } catch (error) {
      console.error('Error updating user status:', error)
    }

    // Join chat room
    socket.on('join-chat', async (data: JoinRoomData) => {
      try {
        const { chatId } = data

        // Verify user is a participant of this chat
        const participation = await prisma.chatParticipant.findUnique({
          where: {
            userId_chatId: {
              userId,
              chatId
            }
          }
        })

        if (!participation || participation.leftAt) {
          socket.emit('error', { message: 'Not authorized to join this chat' })
          return
        }

        socket.join(chatId)
        socket.emit('joined-chat', { chatId })
        
        console.log(`User ${username} joined chat ${chatId}`)
      } catch (error) {
        console.error('Error joining chat:', error)
        socket.emit('error', { message: 'Failed to join chat' })
      }
    })

    // Leave chat room
    socket.on('leave-chat', (data: JoinRoomData) => {
      const { chatId } = data
      socket.leave(chatId)
      socket.emit('left-chat', { chatId })
      console.log(`User ${username} left chat ${chatId}`)
    })

    // Send message (real-time)
    socket.on('send-message', async (data: SendMessageData) => {
      try {
        const { chatId, content, type = 'TEXT', replyToId } = data

        // Verify user is a participant
        const participation = await prisma.chatParticipant.findUnique({
          where: {
            userId_chatId: {
              userId,
              chatId
            }
          }
        })

        if (!participation || participation.leftAt) {
          socket.emit('error', { message: 'Not authorized to send messages to this chat' })
          return
        }

        // Create message in database
        const message = await prisma.message.create({
          data: {
            content,
            type: type as any,
            senderId: userId,
            chatId,
            replyToId
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
              }
            },
            replyTo: replyToId ? {
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true
                  }
                }
              }
            } : false
          }
        })

        // Update chat timestamp
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() }
        })

        // Broadcast to all users in the chat
        io.to(chatId).emit('new-message', {
          message,
          chatId
        })

        console.log(`Message sent in chat ${chatId} by ${username}`)
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Typing indicators
    socket.on('typing-start', (data: TypingData) => {
      socket.to(data.chatId).emit('user-typing', {
        userId: data.userId,
        username: data.username,
        chatId: data.chatId
      })
    })

    socket.on('typing-stop', (data: TypingData) => {
      socket.to(data.chatId).emit('user-stopped-typing', {
        userId: data.userId,
        chatId: data.chatId
      })
    })

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${username} (${userId})`)
      
      try {
        // Update user status to offline
        await prisma.user.update({
          where: { id: userId },
          data: { 
            status: 'OFFLINE',
            lastSeen: new Date()
          }
        })

        // Notify others that user is offline
        socket.broadcast.emit('user-status-changed', {
          userId,
          username,
          status: 'OFFLINE',
          lastSeen: new Date()
        })
      } catch (error) {
        console.error('Error updating user status on disconnect:', error)
      }
    })

    // Handle status changes
    socket.on('update-status', async (data: { status: 'ONLINE' | 'AWAY' | 'BUSY' }) => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status: data.status }
        })

        socket.broadcast.emit('user-status-changed', {
          userId,
          username,
          status: data.status,
          lastSeen: new Date()
        })
      } catch (error) {
        console.error('Error updating user status:', error)
      }
    })
  })

  return io
}