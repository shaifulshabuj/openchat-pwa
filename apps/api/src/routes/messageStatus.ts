import { FastifyInstance } from 'fastify'
import { prisma } from '../utils/database.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimits } from '../middleware/security.js'
import { z } from 'zod'

const markAsReadSchema = z.object({
  messageIds: z.array(z.string()).min(1).max(50) // Allow marking multiple messages as read
})

export default async function messageStatusRoutes(fastify: FastifyInstance) {
  
  // Mark message(s) as read
  fastify.post('/mark-read', { 
    preHandler: [rateLimits.api, authMiddleware] 
  }, async (request: any, reply) => {
    try {
      const { messageIds } = markAsReadSchema.parse(request.body)
      const userId = request.auth.userId

      // First, verify all messages exist and user has access to them
      const messages = await prisma.message.findMany({
        where: {
          id: { in: messageIds },
          chat: {
            participants: {
              some: {
                userId: userId,
                leftAt: null
              }
            }
          }
        },
        select: {
          id: true,
          chatId: true,
          senderId: true
        }
      })

      if (messages.length !== messageIds.length) {
        return reply.status(400).send({
          error: 'One or more messages not found or access denied'
        })
      }

      // Don't mark messages as read if the user is the sender
      const messagesToMark = messages.filter(msg => msg.senderId !== userId)

      if (messagesToMark.length === 0) {
        return reply.send({
          success: true,
          message: 'No messages to mark as read (all are sent by you)',
          markedCount: 0
        })
      }

      const now = new Date()

      // Use upsert to handle both new read status and updating existing ones
      const readStatuses = await Promise.all(
        messagesToMark.map(message => 
          prisma.messageStatus.upsert({
            where: {
              messageId_userId: {
                messageId: message.id,
                userId: userId
              }
            },
            create: {
              messageId: message.id,
              userId: userId,
              deliveredAt: now,
              readAt: now
            },
            update: {
              readAt: now
            },
            include: {
              message: {
                select: {
                  id: true,
                  chatId: true
                }
              }
            }
          })
        )
      )

      // Emit real-time events for each chat
      const io = (fastify as any).io
      if (io) {
        const chatIds = [...new Set(readStatuses.map(status => status.message.chatId))]
        
        chatIds.forEach(chatId => {
          io.to(chatId).emit('messages-read', {
            userId: userId,
            messageIds: readStatuses
              .filter(status => status.message.chatId === chatId)
              .map(status => status.messageId),
            readAt: now.toISOString(),
            chatId: chatId
          })
        })
      }

      return reply.send({
        success: true,
        message: `Marked ${readStatuses.length} messages as read`,
        markedCount: readStatuses.length,
        readStatuses: readStatuses.map(status => ({
          messageId: status.messageId,
          readAt: status.readAt
        }))
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

  // Get read status for a message
  fastify.get('/:messageId/read-by', { 
    preHandler: [rateLimits.api, authMiddleware] 
  }, async (request: any, reply) => {
    try {
      const { messageId } = request.params
      const userId = request.auth.userId

      // Verify the message exists and user has access
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          chat: {
            participants: {
              some: {
                userId: userId,
                leftAt: null
              }
            }
          }
        },
        select: {
          id: true,
          chatId: true,
          senderId: true,
          createdAt: true
        }
      })

      if (!message) {
        return reply.status(404).send({
          error: 'Message not found or access denied'
        })
      }

      // Get all read statuses for this message
      const readStatuses = await prisma.messageStatus.findMany({
        where: {
          messageId: messageId,
          readAt: { not: null }
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
          readAt: 'asc'
        }
      })

      // Get total participant count (excluding sender)
      const participantCount = await prisma.chatParticipant.count({
        where: {
          chatId: message.chatId,
          leftAt: null,
          userId: { not: message.senderId }
        }
      })

      return reply.send({
        success: true,
        data: {
          messageId: messageId,
          readBy: readStatuses.map(status => ({
            user: status.user,
            readAt: status.readAt
          })),
          readCount: readStatuses.length,
          totalParticipants: participantCount,
          allRead: readStatuses.length >= participantCount
        }
      })

    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}