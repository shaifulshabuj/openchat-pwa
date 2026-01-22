import { FastifyInstance } from 'fastify'
import { prisma } from '../utils/database.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimits } from '../middleware/security.js'
import { z } from 'zod'

const addReactionSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(10)
})

export default async function reactionRoutes(fastify: FastifyInstance) {
  
  // Add or toggle reaction to a message
  fastify.post('/add', { 
    preHandler: [rateLimits.api, authMiddleware] 
  }, async (request: any, reply) => {
    try {
      const { messageId, emoji } = addReactionSchema.parse(request.body)
      const userId = request.user.userId

      // Validate that the message exists and user has access
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          chat: {
            participants: {
              some: {
                userId: userId
              }
            }
          }
        }
      })

      if (!message) {
        return reply.status(404).send({
          error: 'Message not found or access denied'
        })
      }

      // Check if reaction already exists
      const existingReaction = await prisma.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji
          }
        }
      })

      if (existingReaction) {
        // Remove existing reaction (toggle off)
        await prisma.messageReaction.delete({
          where: {
            id: existingReaction.id
          }
        })

        // Emit socket event for real-time update
        const io = (fastify as any).io
        if (io) {
          io.to(message.chatId).emit('reaction-removed', {
            messageId,
            userId,
            emoji,
            reactionId: existingReaction.id
          })
        }

        return reply.send({
          success: true,
          action: 'removed',
          reaction: existingReaction
        })
      } else {
        // Add new reaction
        const newReaction = await prisma.messageReaction.create({
          data: {
            messageId,
            userId,
            emoji
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
              }
            }
          }
        })

        // Emit socket event for real-time update
        const io = (fastify as any).io
        if (io) {
          io.to(message.chatId).emit('reaction-added', {
            messageId,
            reaction: newReaction
          })
        }

        return reply.status(201).send({
          success: true,
          action: 'added',
          reaction: newReaction
        })
      }
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

  // Get all reactions for a message
  fastify.get('/:messageId', { 
    preHandler: [rateLimits.api, authMiddleware] 
  }, async (request: any, reply) => {
    try {
      const { messageId } = request.params
      const userId = request.user.userId

      // Validate that the message exists and user has access
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          chat: {
            participants: {
              some: {
                userId: userId
              }
            }
          }
        }
      })

      if (!message) {
        return reply.status(404).send({
          error: 'Message not found or access denied'
        })
      }

      // Get all reactions for the message
      const reactions = await prisma.messageReaction.findMany({
        where: {
          messageId
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      // Group reactions by emoji with counts
      const reactionSummary = reactions.reduce((acc: any, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = {
            emoji: reaction.emoji,
            count: 0,
            users: []
          }
        }
        acc[reaction.emoji].count++
        acc[reaction.emoji].users.push({
          id: reaction.user.id,
          username: reaction.user.username,
          displayName: reaction.user.displayName,
          avatar: reaction.user.avatar
        })
        return acc
      }, {})

      return reply.send({
        success: true,
        data: {
          messageId,
          reactions: Object.values(reactionSummary),
          totalReactions: reactions.length
        }
      })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Remove a specific reaction
  fastify.delete('/remove', { 
    preHandler: [rateLimits.api, authMiddleware] 
  }, async (request: any, reply) => {
    try {
      const { messageId, emoji } = addReactionSchema.parse(request.body)
      const userId = request.user.userId

      // Find and remove the reaction
      const reaction = await prisma.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji
          }
        },
        include: {
          message: {
            select: {
              chatId: true
            }
          }
        }
      })

      if (!reaction) {
        return reply.status(404).send({
          error: 'Reaction not found'
        })
      }

      await prisma.messageReaction.delete({
        where: {
          id: reaction.id
        }
      })

      // Emit socket event for real-time update
      const io = (fastify as any).io
      if (io) {
        io.to(reaction.message.chatId).emit('reaction-removed', {
          messageId,
          userId,
          emoji,
          reactionId: reaction.id
        })
      }

      return reply.send({
        success: true,
        message: 'Reaction removed successfully'
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
}