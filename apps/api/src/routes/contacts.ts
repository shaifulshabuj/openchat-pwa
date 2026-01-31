import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../utils/database.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimits } from '../middleware/security.js'
import { getOrCreatePrivateChat, parseContactMetadata } from '../services/contacts.js'

const requestSchema = z.object({
  userId: z.string().min(1)
})

const respondSchema = z.object({
  status: z.enum(['accepted', 'declined'])
})

export default async function contactRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [rateLimits.api, authMiddleware] }, async (request: any, reply) => {
    const userId = request.auth.userId

    const chats = await prisma.chat.findMany({
      where: {
        type: 'PRIVATE',
        participants: {
          some: {
            userId,
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
          where: {
            type: 'CONTACT'
          },
          select: {
            id: true,
            metadata: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    const contacts = chats
      .map((chat) => {
        const contact = chat.participants.find((participant) => participant.user.id !== userId)
        if (!contact) {
          return null
        }

        const requestMessage = chat.messages.find((message) => {
          const metadata = parseContactMetadata(message.metadata)
          return metadata?.kind === 'contact-request'
        })

        const requestMetadata = requestMessage ? parseContactMetadata(requestMessage.metadata) : null
        const status = requestMetadata?.kind === 'contact-request' ? requestMetadata.status : 'accepted'

        const blockMessage = chat.messages.find((message) => {
          const metadata = parseContactMetadata(message.metadata)
          return metadata?.kind === 'contact-block' && metadata.blockerId === userId
        })
        const blockMetadata = blockMessage ? parseContactMetadata(blockMessage.metadata) : null
        const isBlocked =
          blockMetadata?.kind === 'contact-block' && blockMetadata.status === 'blocked'

        // Get contact management metadata (favorites, nickname, labels)
        const contactMessage = chat.messages.find((message) => {
          const metadata = parseContactMetadata(message.metadata)
          return metadata && 'isFavorite' in metadata && (metadata.isFavorite !== undefined || metadata.nickname || metadata.labels)
        })
        const contactMetadata = contactMessage ? JSON.parse(contactMessage.metadata as string || '{}') : {}

        return {
          chatId: chat.id,
          user: contact.user,
          status,
          isBlocked,
          isFavorite: contactMetadata.isFavorite || false,
          nickname: contactMetadata.nickname || null,
          labels: contactMetadata.labels || []
        }
      })
      .filter(Boolean)
      .filter((contact: any) => contact.status === 'accepted')

    return reply.send({
      success: true,
      data: contacts
    })
  })

  fastify.get('/requests', { preHandler: [rateLimits.api, authMiddleware] }, async (request: any, reply) => {
    const userId = request.auth.userId

    const messages = await prisma.message.findMany({
      where: {
        type: 'CONTACT',
        chat: {
          participants: {
            some: {
              userId,
              leftAt: null
            }
          }
        }
      },
      select: {
        id: true,
        chatId: true,
        metadata: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const requests = messages
      .map((message) => {
        const metadata = parseContactMetadata(message.metadata)
        if (!metadata || metadata.kind !== 'contact-request' || metadata.status !== 'pending') {
          return null
        }

        const direction = metadata.toUserId === userId ? 'incoming' : 'outgoing'

        return {
          id: message.id,
          chatId: message.chatId,
          fromUserId: metadata.fromUserId,
          toUserId: metadata.toUserId,
          status: metadata.status,
          direction,
          createdAt: message.createdAt
        }
      })
      .filter(Boolean) as Array<{
      id: string
      chatId: string
      fromUserId: string
      toUserId: string
      status: string
      direction: 'incoming' | 'outgoing'
      createdAt: Date
    }>

    const userIds = Array.from(
      new Set(requests.flatMap((requestItem) => [requestItem.fromUserId, requestItem.toUserId]))
    )

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        status: true
      }
    })

    const usersById = new Map(users.map((user) => [user.id, user]))

    return reply.send({
      success: true,
      data: requests.map((requestItem) => ({
        id: requestItem.id,
        chatId: requestItem.chatId,
        status: requestItem.status,
        direction: requestItem.direction,
        createdAt: requestItem.createdAt,
        fromUser: usersById.get(requestItem.fromUserId),
        toUser: usersById.get(requestItem.toUserId)
      }))
    })
  })

  fastify.post('/request', { preHandler: [rateLimits.api, authMiddleware] }, async (request: any, reply) => {
    const userId = request.auth.userId
    const { userId: otherUserId } = requestSchema.parse(request.body)

    if (userId === otherUserId) {
      return reply.status(400).send({ error: 'Cannot add yourself as a contact' })
    }

    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true }
    })

    if (!otherUser) {
      return reply.status(404).send({ error: 'User not found' })
    }

    const chat = await getOrCreatePrivateChat(userId, otherUserId)

    const message = await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: userId,
        type: 'CONTACT',
        content: 'Contact request',
        metadata: JSON.stringify({
          kind: 'contact-request',
          status: 'pending',
          fromUserId: userId,
          toUserId: otherUserId
        })
      }
    })

    return reply.send({
      success: true,
      data: {
        chatId: chat.id,
        requestId: message.id,
        status: 'pending'
      }
    })
  })

  fastify.post(
    '/requests/:requestId/respond',
    { preHandler: [rateLimits.api, authMiddleware] },
    async (request: any, reply) => {
      const userId = request.auth.userId
      const { requestId } = request.params
      const { status } = respondSchema.parse(request.body)

      const message = await prisma.message.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          chatId: true,
          metadata: true
        }
      })

      if (!message) {
        return reply.status(404).send({ error: 'Contact request not found' })
      }

      const metadata = parseContactMetadata(message.metadata)
      if (!metadata || metadata.kind !== 'contact-request') {
        return reply.status(400).send({ error: 'Invalid contact request' })
      }

      if (metadata.toUserId !== userId) {
        return reply.status(403).send({ error: 'Not authorized to respond to this request' })
      }

      const updated = await prisma.message.update({
        where: { id: requestId },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            status
          })
        },
        select: {
          id: true,
          chatId: true,
          metadata: true
        }
      })

      return reply.send({
        success: true,
        data: {
          requestId: updated.id,
          chatId: updated.chatId,
          status
        }
      })
    }
  )

  fastify.post(
    '/:contactId/block',
    { preHandler: [rateLimits.api, authMiddleware] },
    async (request: any, reply) => {
      const userId = request.auth.userId
      const { contactId } = request.params

      const chat = await getOrCreatePrivateChat(userId, contactId)

      const existing = await prisma.message.findFirst({
        where: {
          chatId: chat.id,
          type: 'CONTACT',
          senderId: userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const existingMeta = existing ? parseContactMetadata(existing.metadata) : null
      if (existingMeta?.kind === 'contact-block' && existingMeta.status === 'blocked') {
        return reply.send({
          success: true,
          data: { chatId: chat.id, status: 'blocked' }
        })
      }

      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: userId,
          type: 'CONTACT',
          content: 'Contact blocked',
          metadata: JSON.stringify({
            kind: 'contact-block',
            status: 'blocked',
            blockerId: userId,
            targetUserId: contactId
          })
        }
      })

      return reply.send({
        success: true,
        data: { chatId: chat.id, status: 'blocked' }
      })
    }
  )

  fastify.post(
    '/:contactId/unblock',
    { preHandler: [rateLimits.api, authMiddleware] },
    async (request: any, reply) => {
      const userId = request.auth.userId
      const { contactId } = request.params

      const chat = await getOrCreatePrivateChat(userId, contactId)

      const blockMessage = await prisma.message.findFirst({
        where: {
          chatId: chat.id,
          type: 'CONTACT',
          senderId: userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      if (!blockMessage) {
        return reply.status(404).send({ error: 'No block record found' })
      }

      const metadata = parseContactMetadata(blockMessage.metadata)
      if (
        !metadata ||
        metadata.kind !== 'contact-block' ||
        metadata.status !== 'blocked' ||
        metadata.blockerId !== userId
      ) {
        return reply.status(400).send({ error: 'No block record found' })
      }

      await prisma.message.update({
        where: { id: blockMessage.id },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            status: 'unblocked'
          })
        }
      })

      return reply.send({
        success: true,
        data: { chatId: chat.id, status: 'unblocked' }
      })
    }
  )

  // Contact management endpoints
  fastify.put('/:contactId/favorite', { preHandler: [rateLimits.api, authMiddleware] }, async (request: any, reply) => {
    const { contactId } = request.params
    const { isFavorite } = request.body
    const userId = request.auth.userId

    try {
      // Find the private chat for this contact relationship
      const chat = await prisma.chat.findFirst({
        where: {
          type: 'PRIVATE',
          participants: {
            every: {
              userId: { in: [userId, contactId] }
            }
          }
        },
        include: {
          messages: {
            where: {
              type: 'CONTACT',
              senderId: userId
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      if (!chat || !chat.messages.length) {
        return reply.status(404).send({ error: 'Contact relationship not found' })
      }

      const firstMessage = chat.messages[0]
      if (!firstMessage) {
        return reply.status(404).send({ error: 'Contact metadata not found' })
      }

      // Update contact metadata to include favorite status
      const existingMetadata = JSON.parse(firstMessage.metadata as string || '{}')
      const updatedMetadata = {
        ...existingMetadata,
        isFavorite
      }

      await prisma.message.update({
        where: { id: firstMessage.id },
        data: { metadata: JSON.stringify(updatedMetadata) }
      })

      reply.send({ success: true, isFavorite })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to update favorite status' })
    }
  })

  fastify.put('/:contactId/nickname', { preHandler: [rateLimits.api, authMiddleware] }, async (request: any, reply) => {
    const { contactId } = request.params
    const { nickname } = request.body
    const userId = request.auth.userId

    try {
      // Find the private chat for this contact relationship
      const chat = await prisma.chat.findFirst({
        where: {
          type: 'PRIVATE',
          participants: {
            every: {
              userId: { in: [userId, contactId] }
            }
          }
        },
        include: {
          messages: {
            where: {
              type: 'CONTACT',
              senderId: userId
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      if (!chat || !chat.messages.length) {
        return reply.status(404).send({ error: 'Contact relationship not found' })
      }

      const firstMessage = chat.messages[0]
      if (!firstMessage) {
        return reply.status(404).send({ error: 'Contact metadata not found' })
      }

      // Update contact metadata to include nickname
      const existingMetadata = JSON.parse(firstMessage.metadata as string || '{}')
      const updatedMetadata = {
        ...existingMetadata,
        nickname
      }

      await prisma.message.update({
        where: { id: firstMessage.id },
        data: { metadata: JSON.stringify(updatedMetadata) }
      })

      reply.send({ success: true, nickname })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to update nickname' })
    }
  })

  fastify.put('/:contactId/labels', { preHandler: [rateLimits.api, authMiddleware] }, async (request: any, reply) => {
    const { contactId } = request.params
    const { labels } = request.body // Array of label strings
    const userId = request.auth.userId

    try {
      // Find the private chat for this contact relationship
      const chat = await prisma.chat.findFirst({
        where: {
          type: 'PRIVATE',
          participants: {
            every: {
              userId: { in: [userId, contactId] }
            }
          }
        },
        include: {
          messages: {
            where: {
              type: 'CONTACT',
              senderId: userId
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      if (!chat || !chat.messages.length) {
        return reply.status(404).send({ error: 'Contact relationship not found' })
      }

      const firstMessage = chat.messages[0]
      if (!firstMessage) {
        return reply.status(404).send({ error: 'Contact metadata not found' })
      }

      // Update contact metadata to include labels
      const existingMetadata = JSON.parse(firstMessage.metadata as string || '{}')
      const updatedMetadata = {
        ...existingMetadata,
        labels: labels || []
      }

      await prisma.message.update({
        where: { id: firstMessage.id },
        data: { metadata: JSON.stringify(updatedMetadata) }
      })

      reply.send({ success: true, labels })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Failed to update labels' })
    }
  })
}
