import { FastifyInstance } from 'fastify'
import { prisma } from '../utils/database.js'
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js'
import { registerSchema, loginSchema, updateProfileSchema } from '../utils/validation.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimits } from '../middleware/security.js'

export default async function authRoutes(fastify: FastifyInstance) {
  // Register a new user - with rate limiting for security
  fastify.post('/register', { 
    preHandler: [rateLimits.register] 
  }, async (request, reply) => {
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
          bio: true,
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

  // Login user - with rate limiting for security
  fastify.post('/login', { 
    preHandler: [rateLimits.auth] 
  }, async (request, reply) => {
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
          bio: true,
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
  fastify.get('/me', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.auth.userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
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
  fastify.patch('/me', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const updateData = updateProfileSchema.parse(request.body)

      // Filter out undefined values for Prisma strict typing
      const data: any = {}
      if (updateData.username !== undefined) data.username = updateData.username
      if (updateData.displayName !== undefined) data.displayName = updateData.displayName
      if (updateData.bio !== undefined) data.bio = updateData.bio
      if (updateData.avatar !== undefined) data.avatar = updateData.avatar
      if (updateData.status !== undefined) data.status = updateData.status

      if (updateData.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username: updateData.username,
            id: { not: request.auth.userId }
          },
          select: { id: true }
        })

        if (existingUser) {
          return reply.status(400).send({ error: 'Username already exists' })
        }
      }

      const user = await prisma.user.update({
        where: { id: request.auth.userId },
        data,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
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
  fastify.post('/logout', { preHandler: authMiddleware }, async (request: any, reply) => {
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
