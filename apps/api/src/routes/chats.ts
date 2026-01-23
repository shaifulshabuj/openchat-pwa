import { FastifyInstance } from 'fastify'
import { prisma } from '../utils/database.js'
import { authMiddleware } from '../middleware/auth.js'
import { createChatSchema, sendMessageSchema } from '../utils/validation.js'
import { rateLimits } from '../middleware/security.js'
import { z } from 'zod'

export default async function chatRoutes(fastify: FastifyInstance) {
  // Get user's chats
  fastify.get('/', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const chats = await prisma.chat.findMany({
        where: {
          participants: {
            some: {
              userId: request.auth.userId,
              leftAt: null
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  status: true
                }
              }
            }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true
                }
              }
            }
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      // Calculate unread count for each chat
      const chatsWithUnreadCount = await Promise.all(
        chats.map(async (chat: any) => {
          const participant = chat.participants.find((p: any) => p.userId === request.auth.userId)
          
          const unreadCount = await prisma.message.count({
            where: {
              chatId: chat.id,
              senderId: { not: request.auth.userId },
              createdAt: {
                gt: participant?.joinedAt || new Date(0)
              }
            }
          })

          return {
            ...chat,
            unreadCount,
            lastMessage: chat.messages[0] || null
          }
        })
      )

      return reply.send({
        success: true,
        data: chatsWithUnreadCount
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Create a new chat
  fastify.post('/', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { type, name, description, participants } = createChatSchema.parse(request.body)

      // For private chats, ensure only 2 participants
      if (type === 'PRIVATE' && participants.length !== 1) {
        return reply.status(400).send({ error: 'Private chats must have exactly one other participant' })
      }

      // Check if private chat already exists
      if (type === 'PRIVATE') {
        const existingChat = await prisma.chat.findFirst({
          where: {
            type: 'PRIVATE',
            participants: {
              every: {
                userId: {
                  in: [request.auth.userId, participants[0]]
                }
              }
            }
          }
        })

        if (existingChat) {
          return reply.status(400).send({ error: 'Private chat already exists with this user' })
        }
      }

      // Verify all participants exist
      const users = await prisma.user.findMany({
        where: { id: { in: participants } },
        select: { id: true }
      })

      if (users.length !== participants.length) {
        return reply.status(400).send({ error: 'One or more participants not found' })
      }

      // Create chat
      const chatData: any = {
        type,
        participants: {
          create: [
            { userId: request.auth.userId },
            ...participants.map((userId: string) => ({ userId }))
          ]
        }
      }
      
      if (type !== 'PRIVATE' && name) chatData.name = name
      if (description) chatData.description = description
      if (type !== 'PRIVATE') {
        chatData.admins = {
          create: { userId: request.auth.userId }
        }
      }

      const chat = await prisma.chat.create({
        data: chatData,
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  status: true
                }
              }
            }
          }
        }
      })

      return reply.status(201).send({
        success: true,
        data: chat
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

  // Get chat details
  fastify.get('/:chatId', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params

      // Check if user is participant
      const participation = await prisma.chatParticipant.findUnique({
        where: {
          userId_chatId: {
            userId: request.auth.userId,
            chatId
          }
        }
      })

      if (!participation || participation.leftAt) {
        return reply.status(403).send({ error: 'Not a member of this chat' })
      }

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  status: true,
                  lastSeen: true
                }
              }
            }
          },
          admins: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true
                }
              }
            }
          }
        }
      })

      return reply.send({
        success: true,
        data: chat
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get chat messages
  fastify.get('/:chatId/messages', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params
      const { page = 1, limit = 50 } = request.query

      // Check if user is participant
      const participation = await prisma.chatParticipant.findUnique({
        where: {
          userId_chatId: {
            userId: request.auth.userId,
            chatId
          }
        }
      })

      if (!participation || participation.leftAt) {
        return reply.status(403).send({ error: 'Not a member of this chat' })
      }

      const messages = await prisma.message.findMany({
        where: {
          chatId,
          isDeleted: false,
          createdAt: {
            gte: participation.joinedAt
          }
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
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  displayName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })

      return reply.send({
        success: true,
        data: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit
        }
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Send a message
  fastify.post('/:chatId/messages', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params
      const messageData = sendMessageSchema.parse(request.body)

      // Check if user is participant
      const participation = await prisma.chatParticipant.findUnique({
        where: {
          userId_chatId: {
            userId: request.auth.userId,
            chatId
          }
        }
      })

      if (!participation || participation.leftAt) {
        return reply.status(403).send({ error: 'Not a member of this chat' })
      }

      // If replying to a message, verify it exists and is in the same chat
      if (messageData.replyToId) {
        const replyToMessage = await prisma.message.findFirst({
          where: {
            id: messageData.replyToId,
            chatId,
            isDeleted: false
          }
        })

        if (!replyToMessage) {
          return reply.status(400).send({ error: 'Reply message not found' })
        }
      }

      // Create message
      const messageCreateData: any = {
        content: messageData.content,
        type: messageData.type,
        senderId: request.auth.userId,
        chatId,
      }
      
      if (messageData.replyToId) messageCreateData.replyToId = messageData.replyToId
      if (messageData.metadata) messageCreateData.metadata = messageData.metadata

      const message = await prisma.message.create({
        data: messageCreateData,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          },
          replyTo: messageData.replyToId ? {
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

      // Update chat's updatedAt timestamp
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() }
      })

      // Emit real-time message to other participants
      const io = (fastify as any).io
      io.to(chatId).emit('new-message', {
        message,
        chatId
      })

      return reply.status(201).send({
        success: true,
        data: message
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

  // Join chat (for group chats)
  fastify.post('/:chatId/join', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params

      const chat = await prisma.chat.findUnique({
        where: { id: chatId }
      })

      if (!chat) {
        return reply.status(404).send({ error: 'Chat not found' })
      }

      if (chat.type === 'PRIVATE') {
        return reply.status(400).send({ error: 'Cannot join private chats' })
      }

      // Check if already a participant
      const existingParticipation = await prisma.chatParticipant.findUnique({
        where: {
          userId_chatId: {
            userId: request.auth.userId,
            chatId
          }
        }
      })

      if (existingParticipation && !existingParticipation.leftAt) {
        return reply.status(400).send({ error: 'Already a member of this chat' })
      }

      // Join or rejoin chat
      if (existingParticipation) {
        await prisma.chatParticipant.update({
          where: { id: existingParticipation.id },
          data: { leftAt: null, joinedAt: new Date() }
        })
      } else {
        await prisma.chatParticipant.create({
          data: {
            userId: request.auth.userId,
            chatId
          }
        })
      }

      return reply.send({
        success: true,
        message: 'Joined chat successfully'
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Leave chat
  fastify.post('/:chatId/leave', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params

      const participation = await prisma.chatParticipant.findUnique({
        where: {
          userId_chatId: {
            userId: request.auth.userId,
            chatId
          }
        }
      })

      if (!participation || participation.leftAt) {
        return reply.status(400).send({ error: 'Not a member of this chat' })
      }

      await prisma.chatParticipant.update({
        where: { id: participation.id },
        data: { leftAt: new Date() }
      })

      return reply.send({
        success: true,
        message: 'Left chat successfully'
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Edit a message
  fastify.put('/:chatId/messages/:messageId', { 
    preHandler: [rateLimits.api, authMiddleware] 
  }, async (request: any, reply) => {
    try {
      const { chatId, messageId } = request.params
      const { content } = z.object({ 
        content: z.string().min(1).max(1000) 
      }).parse(request.body)
      
      const userId = request.auth.userId

      // Find the message and verify ownership
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          chatId,
          senderId: userId,
          isDeleted: false
        }
      })

      if (!message) {
        return reply.status(404).send({
          error: 'Message not found or you can only edit your own messages'
        })
      }

      // Check if message is too old to edit (24 hours)
      const now = new Date()
      const messageAge = now.getTime() - message.createdAt.getTime()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours

      if (messageAge > maxAge) {
        return reply.status(400).send({
          error: 'Message is too old to edit (24 hour limit)'
        })
      }

      // Update the message
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          content,
          isEdited: true,
          updatedAt: new Date()
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          }
        }
      })

      // Emit real-time update
      const io = (fastify as any).io
      if (io) {
        io.to(chatId).emit('message-edited', {
          message: updatedMessage,
          chatId
        })
      }

      return reply.send({
        success: true,
        data: updatedMessage
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

  // Delete a message (soft delete)
  fastify.delete('/:chatId/messages/:messageId', { 
    preHandler: [rateLimits.api, authMiddleware] 
  }, async (request: any, reply) => {
    try {
      const { chatId, messageId } = request.params
      const userId = request.auth.userId

      // Find the message and verify ownership or admin rights
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          chatId,
          isDeleted: false
        },
        include: {
          chat: {
            include: {
              admins: {
                where: {
                  userId: userId
                }
              }
            }
          }
        }
      })

      if (!message) {
        return reply.status(404).send({
          error: 'Message not found'
        })
      }

      // Check if user can delete (own message or admin)
      const canDelete = message.senderId === userId || message.chat.admins.length > 0

      if (!canDelete) {
        return reply.status(403).send({
          error: 'You can only delete your own messages or you need admin rights'
        })
      }

      // Soft delete the message
      const deletedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          content: '[Message deleted]'
        }
      })

      // Emit real-time update
      const io = (fastify as any).io
      if (io) {
        io.to(chatId).emit('message-deleted', {
          messageId,
          chatId,
          deletedBy: userId
        })
      }

      return reply.send({
        success: true,
        message: 'Message deleted successfully'
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}