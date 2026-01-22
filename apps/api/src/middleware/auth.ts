import { FastifyReply, FastifyRequest } from 'fastify'
import { extractTokenFromRequest, getUserFromToken } from '../utils/auth.js'
import { prisma } from '../utils/database.js'

export const authMiddleware = async (request: any, reply: FastifyReply) => {
  const token = extractTokenFromRequest(request)
  
  if (!token) {
    return reply.status(401).send({ error: 'No token provided' })
  }

  const payload = getUserFromToken(token)
  if (!payload) {
    return reply.status(401).send({ error: 'Invalid token' })
  }

  // Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, username: true, isVerified: true }
  })

  if (!user) {
    return reply.status(401).send({ error: 'User not found' })
  }

  request.auth = {
    userId: user.id,
    email: user.email,
    username: user.username
  }
}

export const optionalAuthMiddleware = async (request: any, reply: FastifyReply) => {
  const token = extractTokenFromRequest(request)
  
  if (token) {
    const payload = getUserFromToken(token)
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, username: true }
      })

      if (user) {
        request.auth = {
          userId: user.id,
          email: user.email,
          username: user.username
        }
      }
    }
  }
}