import { FastifyInstance } from 'fastify'
import { prisma } from '../utils/database.js'
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js'
import { registerSchema, loginSchema, updateProfileSchema } from '../utils/validation.js'
import { authMiddleware } from '../middleware/auth.js'

interface AuthenticatedRequest {
  auth: {
    userId: string
    email: string
    username: string
  }
}

export default async function authRoutes(fastify: FastifyInstance) {
  // Register a new user
  fastify.post('/register', async (request, reply) => {
    try {
      const { email, username, displayName, password } = registerSchema.parse(request.body)

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }]
        }
      })

      if (existingUser) {
        return reply.status(400).send({
          error: existingUser.email === email ? 'Email already exists' : 'Username already exists'
        })
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password)
      
      const user = await prisma.user.create({
        data: {
          email,
          username,
          displayName,
          password: hashedPassword
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          status: true,
          createdAt: true
        }
      })

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username
      })

      return reply.status(201).send({
        success: true,
        data: {
          user,
          token
        }
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation failed',
          details: error.errors
        })
      }
      
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Login user
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body)

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          status: true,
          password: true
        }
      })

      if (!user) {
        return reply.status(401).send({ error: 'Invalid email or password' })
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password)
      if (!isValidPassword) {
        return reply.status(401).send({ error: 'Invalid email or password' })
      }

      // Update user status to online
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'ONLINE', lastSeen: new Date() }
      })

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username
      })

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user

      return reply.send({
        success: true,
        data: {
          user: userWithoutPassword,
          token
        }
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation failed',
          details: error.errors
        })
      }
      
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get current user profile
  fastify.get('/me', { preHandler: authMiddleware }, async (request: AuthenticatedRequest, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.auth.userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          status: true,
          lastSeen: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true
        }
      })

      if (!user) {
        return reply.status(404).send({ error: 'User not found' })
      }

      return reply.send({
        success: true,
        data: user
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Update user profile
  fastify.patch('/me', { preHandler: authMiddleware }, async (request: AuthenticatedRequest, reply) => {
    try {
      const updateData = updateProfileSchema.parse(request.body)

      const user = await prisma.user.update({
        where: { id: request.auth.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          status: true,
          lastSeen: true,
          updatedAt: true
        }
      })

      return reply.send({
        success: true,
        data: user
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation failed',
          details: error.errors
        })
      }
      
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Logout user
  fastify.post('/logout', { preHandler: authMiddleware }, async (request: AuthenticatedRequest, reply) => {
    try {
      // Update user status to offline
      await prisma.user.update({
        where: { id: request.auth.userId },
        data: { status: 'OFFLINE', lastSeen: new Date() }
      })

      return reply.send({
        success: true,
        message: 'Logged out successfully'
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}