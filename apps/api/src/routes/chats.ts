import { FastifyInstance } from 'fastify'
import { randomBytes } from 'crypto'
import { prisma } from '../utils/database.js'
import { authMiddleware } from '../middleware/auth.js'
import { createChatSchema, sendMessageSchema } from '../utils/validation.js'
import { rateLimits } from '../middleware/security.js'
import { parseContactMetadata } from '../services/contacts.js'
import { extractMentionUsernames } from '../utils/mentions.js'
import { z } from 'zod'

const getPrivateContactState = async (chatId: string) => {
  const contactMessages = await prisma.message.findMany({
    where: {
      chatId,
      type: 'CONTACT'
    },
    select: {
      metadata: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  })

  let requestMeta: ReturnType<typeof parseContactMetadata> | null = null
  let blockMeta: ReturnType<typeof parseContactMetadata> | null = null

  for (const message of contactMessages) {
    const metadata = parseContactMetadata(message.metadata)
    if (!requestMeta && metadata?.kind === 'contact-request') {
      requestMeta = metadata
    }
    if (!blockMeta && metadata?.kind === 'contact-block') {
      blockMeta = metadata
    }
    if (requestMeta && blockMeta) {
      break
    }
  }

  return { requestMeta, blockMeta }
}

const generateInviteCode = () => {
  return randomBytes(9).toString('base64url')
}

const resolveMentionsForChat = async (chatId: string, usernames: string[], senderId: string) => {
  if (usernames.length === 0) return []

  const participants = await prisma.chatParticipant.findMany({
    where: {
      chatId,
      leftAt: null
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true
        }
      }
    }
  })

  const usernameMap = new Map(
    participants.map((participant) => [participant.user.username.toLowerCase(), participant.user])
  )

  const mentions = usernames
    .map((username) => usernameMap.get(username))
    .filter((user): user is { id: string; username: string; displayName: string } => !!user)
    .filter((user) => user.id !== senderId)

  const unique = new Map(mentions.map((user) => [user.id, user]))
  return Array.from(unique.values())
}

export default async function chatRoutes(fastify: FastifyInstance) {
  // Get user's chats
  fastify.get('/', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const includeArchived = request.query?.includeArchived === 'true'
      
      const chats = await prisma.chat.findMany({
        where: {
          participants: {
            some: {
              userId: request.auth.userId,
              leftAt: null,
              ...(includeArchived ? {} : { isArchived: false })
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
            where: {
              deletions: {
                none: {
                  userId: request.auth.userId
                }
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
              }
            }
          },
          _count: {
            select: { messages: true }
          }
        }
      })

      // Calculate unread count and add pin/archive status for each chat
      const chatsWithMetadata = await Promise.all(
        chats.map(async (chat: any) => {
          const participant = chat.participants.find((p: any) => p.userId === request.auth.userId)
          
          const unreadCount = await prisma.message.count({
            where: {
              chatId: chat.id,
              senderId: { not: request.auth.userId },
              isDeleted: false,
              deletions: {
                none: {
                  userId: request.auth.userId
                }
              },
              createdAt: {
                gt: participant?.joinedAt || new Date(0)
              }
            }
          })

          return {
            ...chat,
            unreadCount,
            lastMessage: chat.messages[0] || null,
            isPinned: participant?.isPinned || false,
            isArchived: participant?.isArchived || false
          }
        })
      )

      // Sort chats: pinned first, then by updatedAt
      const sortedChats = chatsWithMetadata.sort((a, b) => {
        // Pinned chats go to top
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        
        // Then sort by updatedAt (most recent first)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })

      return reply.send({
        success: true,
        data: sortedChats
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

  // Get group chat members (for mentions autocomplete)
  fastify.get('/:chatId/members', { preHandler: authMiddleware }, async (request: any, reply) => {
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
        return reply.status(403).send({ error: 'Not a member of this chat' })
      }

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { type: true }
      })

      if (!chat || chat.type !== 'GROUP') {
        return reply.status(400).send({ error: 'Mentions are only available for group chats' })
      }

      const admins = await prisma.chatAdmin.findMany({
        where: { chatId },
        select: { userId: true }
      })

      const adminIds = new Set(admins.map((admin) => admin.userId))

      const members = await prisma.chatParticipant.findMany({
        where: {
          chatId,
          leftAt: null
        },
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
        },
        orderBy: {
          joinedAt: 'asc'
        }
      })

      return reply.send({
        success: true,
        data: members.map((member) => ({
          id: member.id,
          user: member.user,
          joinedAt: member.joinedAt,
          isAdmin: adminIds.has(member.userId)
        }))
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
      const page = Number(request.query?.page ?? 1)
      const limit = Number(request.query?.limit ?? 50)

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
          deletions: {
            none: {
              userId: request.auth.userId
            }
          },
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
          },
          reactions: {
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
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })

      const messageWithReactions = messages.map((message: any) => {
        const reactions = message.reactions.reduce((acc: any, reaction: any) => {
          const existing = acc[reaction.emoji]
          if (!existing) {
            acc[reaction.emoji] = {
              emoji: reaction.emoji,
              count: 0,
              users: [],
              hasReacted: false
            }
          }

          acc[reaction.emoji].count += 1
          acc[reaction.emoji].users.push({
            id: reaction.user.id,
            username: reaction.user.username,
            displayName: reaction.user.displayName,
            avatar: reaction.user.avatar
          })

          if (reaction.userId === request.auth.userId) {
            acc[reaction.emoji].hasReacted = true
          }

          return acc
        }, {})

        const { reactions: _reactions, ...rest } = message

        return {
          ...rest,
          reactions: Object.values(reactions)
        }
      })

      return reply.send({
        success: true,
        data: messageWithReactions.reverse(), // Reverse to show oldest first
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

  // Search chat messages
  fastify.get('/:chatId/messages/search', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params
      const query = request.query?.q as string
      const page = Number(request.query?.page ?? 1)
      const limit = Number(request.query?.limit ?? 20)

      if (!query || query.trim().length === 0) {
        return reply.status(400).send({ error: 'Search query is required' })
      }

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
          deletions: {
            none: {
              userId: request.auth.userId
            }
          },
          type: 'TEXT', // Only search text messages
          content: {
            contains: query,
            mode: 'insensitive'
          },
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
        data: messages,
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit
        },
        query
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

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: {
          type: true,
          name: true
        }
      })

      if (!chat) {
        return reply.status(404).send({ error: 'Chat not found' })
      }

      if (chat.type === 'PRIVATE' && messageData.type !== 'CONTACT') {
        const { requestMeta, blockMeta } = await getPrivateContactState(chatId)
        const isBlocked = blockMeta?.kind === 'contact-block' && blockMeta.status === 'blocked'
        if (isBlocked) {
          return reply.status(403).send({ error: 'Messaging is blocked for this contact' })
        }

        const status =
          requestMeta?.kind === 'contact-request' ? requestMeta.status : 'accepted'
        const canSendPendingOutgoing =
          requestMeta?.kind === 'contact-request' &&
          requestMeta.status === 'pending' &&
          requestMeta.fromUserId === request.auth.userId

        if (status !== 'accepted' && !canSendPendingOutgoing) {
          return reply.status(403).send({ error: 'Contact request not accepted' })
        }
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
      if (messageData.metadata) {
        messageCreateData.metadata = JSON.stringify(messageData.metadata)
      }

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

      // Process mentions for group chats
      if (chat.type === 'GROUP') {
        const mentionUsernames = extractMentionUsernames(messageData.content)
        if (mentionUsernames.length > 0) {
          const mentionedUsers = await resolveMentionsForChat(chatId, mentionUsernames, request.auth.userId)
          
          // Send mention notifications to mentioned users
          const io = (fastify as any).io
          for (const user of mentionedUsers) {
            io.to(`user:${user.id}`).emit('mention-notification', {
              messageId: message.id,
              chatId,
              mentionedBy: message.sender,
              content: messageData.content,
              chatName: chat.name || 'Group Chat'
            })
          }
        }
      }

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

      // Check if message is too old to edit (5 minutes)
      const now = new Date()
      const messageAge = now.getTime() - message.createdAt.getTime()
      const maxAge = 5 * 60 * 1000 // 5 minutes

      if (messageAge > maxAge) {
        return reply.status(400).send({
          error: 'Message is too old to edit (5 minute limit)'
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
      const { scope } = z.object({
        scope: z.enum(['me', 'everyone']).optional()
      }).parse({
        scope: request.body?.scope ?? request.query?.scope
      })
      const deleteScope = scope ?? 'everyone'

      const participation = await prisma.chatParticipant.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        }
      })

      if (!participation || participation.leftAt) {
        return reply.status(403).send({ error: 'Not a member of this chat' })
      }

      if (deleteScope === 'me') {
        const message = await prisma.message.findFirst({
          where: {
            id: messageId,
            chatId
          }
        })

        if (!message) {
          return reply.status(404).send({
            error: 'Message not found'
          })
        }

        await prisma.messageDeletion.upsert({
          where: {
            messageId_userId: {
              messageId,
              userId
            }
          },
          update: {
            deletedAt: new Date()
          },
          create: {
            messageId,
            userId
          }
        })

        const io = (fastify as any).io
        if (io) {
          io.to(`user:${userId}`).emit('message-deleted-for-me', {
            messageId,
            chatId,
            deletedBy: userId
          })
        }

        return reply.send({
          success: true,
          message: 'Message deleted for you',
          scope: deleteScope
        })
      }

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
      await prisma.message.update({
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
        message: 'Message deleted successfully',
        scope: deleteScope
      })
    } catch (error) {
      if ((error as any).name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation failed',
          details: (error as any).errors
        })
      }
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Pin/unpin chat
  fastify.put('/:chatId/pin', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params
      const { isPinned } = z.object({ isPinned: z.boolean() }).parse(request.body)

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

      await prisma.chatParticipant.update({
        where: { id: participation.id },
        data: { isPinned }
      })

      return reply.send({
        success: true,
        message: isPinned ? 'Chat pinned successfully' : 'Chat unpinned successfully'
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

  // Archive/unarchive chat
  fastify.put('/:chatId/archive', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params
      const { isArchived } = z.object({ isArchived: z.boolean() }).parse(request.body)

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

      await prisma.chatParticipant.update({
        where: { id: participation.id },
        data: { isArchived }
      })

      return reply.send({
        success: true,
        message: isArchived ? 'Chat archived successfully' : 'Chat unarchived successfully'
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

  // Group Invitations

  // Create invitation link for group
  fastify.post('/:chatId/invitations', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params
      const { expiresInHours, expiresAt } = z.object({
        expiresInHours: z.number().int().min(1).max(720).optional(),
        expiresAt: z.string().datetime().optional()
      }).parse(request.body ?? {})

      const adminCheck = await prisma.chatAdmin.findFirst({
        where: { userId: request.auth.userId, chatId }
      })

      if (!adminCheck) {
        return reply.status(403).send({ error: 'Only admins can create invitations' })
      }

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { id: true, type: true }
      })

      if (!chat || chat.type !== 'GROUP') {
        return reply.status(404).send({ error: 'Group not found' })
      }

      let resolvedExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      if (expiresAt) {
        const parsed = new Date(expiresAt)
        if (Number.isNaN(parsed.getTime())) {
          return reply.status(400).send({ error: 'Invalid expiresAt value' })
        }
        resolvedExpiresAt = parsed
      } else if (expiresInHours) {
        resolvedExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      }

      if (resolvedExpiresAt.getTime() <= Date.now()) {
        return reply.status(400).send({ error: 'Expiration must be in the future' })
      }

      let invitation = null
      let attempts = 0
      while (!invitation && attempts < 5) {
        attempts += 1
        try {
          invitation = await prisma.chatInvitation.create({
            data: {
              code: generateInviteCode(),
              chatId,
              createdById: request.auth.userId,
              expiresAt: resolvedExpiresAt
            }
          })
        } catch (error: any) {
          if (error?.code !== 'P2002') {
            throw error
          }
        }
      }

      if (!invitation) {
        return reply.status(500).send({ error: 'Unable to create invitation' })
      }

      return reply.status(201).send({
        success: true,
        data: invitation
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

  // Validate invitation code and return group info
  fastify.get('/invitations/:code', async (request: any, reply) => {
    try {
      const { code } = request.params
      const invitation = await prisma.chatInvitation.findUnique({
        where: { code },
        include: {
          chat: {
            select: {
              id: true,
              name: true,
              description: true,
              avatar: true,
              type: true,
              participants: {
                where: { leftAt: null },
                select: { id: true }
              }
            }
          }
        }
      })

      if (!invitation || !invitation.chat || invitation.chat.type !== 'GROUP') {
        return reply.status(404).send({ error: 'Invitation not found' })
      }

      if (invitation.revokedAt || invitation.expiresAt.getTime() <= Date.now()) {
        return reply.status(410).send({ error: 'Invitation expired or revoked' })
      }

      return reply.send({
        success: true,
        data: {
          invitation: {
            id: invitation.id,
            code: invitation.code,
            expiresAt: invitation.expiresAt,
            createdAt: invitation.createdAt
          },
          chat: {
            id: invitation.chat.id,
            name: invitation.chat.name,
            description: invitation.chat.description,
            avatar: invitation.chat.avatar,
            memberCount: invitation.chat.participants.length
          }
        }
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Accept invitation and join group
  fastify.post('/invitations/:code/accept', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { code } = request.params
      const invitation = await prisma.chatInvitation.findUnique({
        where: { code },
        include: {
          chat: {
            select: {
              id: true,
              type: true,
              participants: {
                where: { leftAt: null },
                select: { id: true }
              }
            }
          }
        }
      })

      if (!invitation || !invitation.chat || invitation.chat.type !== 'GROUP') {
        return reply.status(404).send({ error: 'Invitation not found' })
      }

      if (invitation.revokedAt || invitation.expiresAt.getTime() <= Date.now()) {
        return reply.status(410).send({ error: 'Invitation expired or revoked' })
      }

      const existingParticipation = await prisma.chatParticipant.findFirst({
        where: {
          userId: request.auth.userId,
          chatId: invitation.chat.id
        }
      })

      if (existingParticipation && !existingParticipation.leftAt) {
        return reply.send({
          success: true,
          data: { chatId: invitation.chat.id, alreadyMember: true }
        })
      }

      if (invitation.chat.participants.length >= 500) {
        return reply.status(400).send({ error: 'Group has reached maximum member limit (500)' })
      }

      await prisma.chatParticipant.upsert({
        where: {
          userId_chatId: {
            userId: request.auth.userId,
            chatId: invitation.chat.id
          }
        },
        update: {
          leftAt: null,
          joinedAt: new Date()
        },
        create: {
          userId: request.auth.userId,
          chatId: invitation.chat.id
        }
      })

      return reply.send({
        success: true,
        data: { chatId: invitation.chat.id, alreadyMember: false }
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Revoke invitation
  fastify.delete('/:chatId/invitations/:invitationId', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId, invitationId } = request.params
      const adminCheck = await prisma.chatAdmin.findFirst({
        where: { userId: request.auth.userId, chatId }
      })

      if (!adminCheck) {
        return reply.status(403).send({ error: 'Only admins can revoke invitations' })
      }

      const invitation = await prisma.chatInvitation.findFirst({
        where: { id: invitationId, chatId }
      })

      if (!invitation) {
        return reply.status(404).send({ error: 'Invitation not found' })
      }

      const revoked = await prisma.chatInvitation.update({
        where: { id: invitationId },
        data: { revokedAt: new Date() }
      })

      return reply.send({
        success: true,
        data: revoked
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Group Management Endpoints

  // Add member to group
  fastify.post('/:chatId/members', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params
      const { userId: targetUserId } = z.object({ userId: z.string() }).parse(request.body)
      const userId = request.auth.userId

      // Check if chat is a group
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          admins: { where: { userId } },
          participants: true
        }
      })

      if (!chat || chat.type !== 'GROUP') {
        return reply.status(404).send({ error: 'Group not found' })
      }

      // Check if user is admin
      if (!chat.admins.length) {
        return reply.status(403).send({ error: 'Only admins can add members' })
      }

      // Check if target user is already a member
      const existingMember = chat.participants.find(p => p.userId === targetUserId && !p.leftAt)
      if (existingMember) {
        return reply.status(400).send({ error: 'User is already a member' })
      }

      // Check group member limit (500)
      const activeMembers = chat.participants.filter(p => !p.leftAt).length
      if (activeMembers >= 500) {
        return reply.status(400).send({ error: 'Group has reached maximum member limit (500)' })
      }

      // Add member
      await prisma.chatParticipant.upsert({
        where: {
          userId_chatId: {
            userId: targetUserId,
            chatId
          }
        },
        update: {
          leftAt: null,
          joinedAt: new Date()
        },
        create: {
          userId: targetUserId,
          chatId
        }
      })

      return reply.send({ success: true, message: 'Member added successfully' })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Remove member from group
  fastify.delete('/:chatId/members/:userId', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId, userId: targetUserId } = request.params
      const userId = request.auth.userId

      // Check if chat is a group
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          admins: { where: { userId } },
          participants: { where: { userId: targetUserId } }
        }
      })

      if (!chat || chat.type !== 'GROUP') {
        return reply.status(404).send({ error: 'Group not found' })
      }

      // Check if user is admin or removing themselves
      const isAdmin = chat.admins.length > 0
      const isSelf = userId === targetUserId

      if (!isAdmin && !isSelf) {
        return reply.status(403).send({ error: 'Only admins can remove members' })
      }

      // Check if target is a member
      const targetMember = chat.participants[0]
      if (!targetMember || targetMember.leftAt) {
        return reply.status(404).send({ error: 'User is not a member of this group' })
      }

      // Remove member by setting leftAt
      await prisma.chatParticipant.update({
        where: { id: targetMember.id },
        data: { leftAt: new Date() }
      })

      // If admin is removing themselves, remove admin role too
      if (isSelf) {
        await prisma.chatAdmin.deleteMany({
          where: { userId, chatId }
        })
      }

      return reply.send({ success: true, message: 'Member removed successfully' })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Promote member to admin
  fastify.post('/:chatId/admins', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params
      const { userId: targetUserId } = z.object({ userId: z.string() }).parse(request.body)
      const userId = request.auth.userId

      // Check if user is admin
      const adminCheck = await prisma.chatAdmin.findFirst({
        where: { userId, chatId }
      })

      if (!adminCheck) {
        return reply.status(403).send({ error: 'Only admins can promote members' })
      }

      // Check if target is a member
      const member = await prisma.chatParticipant.findFirst({
        where: { userId: targetUserId, chatId, leftAt: null }
      })

      if (!member) {
        return reply.status(404).send({ error: 'User is not a member of this group' })
      }

      // Check if already admin
      const existingAdmin = await prisma.chatAdmin.findFirst({
        where: { userId: targetUserId, chatId }
      })

      if (existingAdmin) {
        return reply.status(400).send({ error: 'User is already an admin' })
      }

      // Promote to admin
      await prisma.chatAdmin.create({
        data: {
          userId: targetUserId,
          chatId
        }
      })

      return reply.send({ success: true, message: 'Member promoted to admin successfully' })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Demote admin to member  
  fastify.delete('/:chatId/admins/:userId', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId, userId: targetUserId } = request.params
      const userId = request.auth.userId

      // Check if user is admin
      const adminCheck = await prisma.chatAdmin.findFirst({
        where: { userId, chatId }
      })

      if (!adminCheck) {
        return reply.status(403).send({ error: 'Only admins can demote members' })
      }

      // Check how many admins are left
      const adminCount = await prisma.chatAdmin.count({
        where: { chatId }
      })

      if (adminCount <= 1) {
        return reply.status(400).send({ error: 'Cannot demote the last admin' })
      }

      // Remove admin role
      await prisma.chatAdmin.deleteMany({
        where: { userId: targetUserId, chatId }
      })

      return reply.send({ success: true, message: 'Admin demoted to member successfully' })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Update group settings (name, description, avatar)
  fastify.put('/:chatId/settings', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { chatId } = request.params
      const updateData = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        avatar: z.string().optional()
      }).parse(request.body)
      const data: { name?: string; description?: string; avatar?: string } = {}
      if (updateData.name !== undefined) data.name = updateData.name
      if (updateData.description !== undefined) data.description = updateData.description
      if (updateData.avatar !== undefined) data.avatar = updateData.avatar

      // Check if user is admin
      const adminCheck = await prisma.chatAdmin.findFirst({
        where: { userId: request.auth.userId, chatId }
      })

      if (!adminCheck) {
        return reply.status(403).send({ error: 'Only admins can update group settings' })
      }

      // Update group
      const updatedChat = await prisma.chat.update({
        where: { id: chatId },
        data
      })

      return reply.send({ 
        success: true, 
        data: {
          id: updatedChat.id,
          name: updatedChat.name,
          description: updatedChat.description,
          avatar: updatedChat.avatar
        }
      })
    } catch (error: any) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}
