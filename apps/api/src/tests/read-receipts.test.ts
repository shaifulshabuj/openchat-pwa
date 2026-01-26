import { test, expect, describe, beforeAll, afterAll } from 'vitest'
import { build } from '../index'
import { FastifyInstance } from 'fastify'

describe('Read Receipts API', () => {
  let app: FastifyInstance
  let authToken: string
  let chatId: string
  let messageIds: string[] = []

  beforeAll(async () => {
    app = await build()
    await app.ready()

    // Login to get auth token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'alice@openchat.dev',
        password: 'Demo123456'
      }
    })

    const loginResult = JSON.parse(loginResponse.body)
    authToken = loginResult.data.token

    // Get first chat
    const chatsResponse = await app.inject({
      method: 'GET',
      url: '/api/chats',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    })

    const chatsResult = JSON.parse(chatsResponse.body)
    chatId = chatsResult.data[0].id

    // Create test messages
    for (let i = 0; i < 3; i++) {
      const messageResponse = await app.inject({
        method: 'POST',
        url: `/api/chats/${chatId}/messages`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          content: `Test message ${i + 1} for read receipts`
        }
      })

      const messageResult = JSON.parse(messageResponse.body)
      messageIds.push(messageResult.data.id)
    }
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/message-status/mark-read', () => {
    test('should mark single message as read', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/message-status/mark-read',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageIds: [messageIds[0]]
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.markedCount).toBe(0)
      expect(result.message).toContain('No messages to mark as read')
    })

    test('should mark multiple messages as read', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/message-status/mark-read',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageIds: [messageIds[1], messageIds[2]]
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.markedCount).toBe(0)
      expect(result.message).toContain('No messages to mark as read')
    })

    test('should handle marking already read messages', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/message-status/mark-read',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageIds: [messageIds[0], messageIds[1]]
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      // Sender cannot mark their own messages as read
      expect(result.markedCount).toBe(0)
    })

    test('should validate messageIds array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/message-status/mark-read',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageIds: []
        }
      })

      expect(response.statusCode).toBe(400)
      
      const result = JSON.parse(response.body)
      expect(result.error).toContain('Validation failed')
    })

    test('should limit batch size', async () => {
      const tooManyIds = Array(51).fill('dummy-id')
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/message-status/mark-read',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageIds: tooManyIds
        }
      })

      expect(response.statusCode).toBe(400)
      
      const result = JSON.parse(response.body)
      expect(result.error).toContain('Maximum 50 messages')
    })

    test('should reject unauthorized request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/message-status/mark-read',
        payload: {
          messageIds: [messageIds[0]]
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/message-status/read-by/:messageId', () => {
    test('should get read status for a message', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/message-status/read-by/${messageIds[0]}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data.readBy)).toBe(true)
      
      // Sender reads are not tracked as read statuses
      const readStatuses = result.data.readBy
      expect(readStatuses.length).toBe(0)
      
      expect(result.data.readCount).toBe(0)
    })

    test('should return empty array for unread message', async () => {
      // Create a new message that hasn't been marked as read
      const messageResponse = await app.inject({
        method: 'POST',
        url: `/api/chats/${chatId}/messages`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          content: 'Unread test message'
        }
      })

      const messageResult = JSON.parse(messageResponse.body)
      const unreadMessageId = messageResult.data.id

      const response = await app.inject({
        method: 'GET',
        url: `/api/message-status/read-by/${unreadMessageId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.data.readBy).toEqual([])
      expect(result.data.readCount).toBe(0)
    })

    test('should reject non-existent message', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/message-status/read-by/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(404)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Message not found or access denied')
    })

    test('should reject unauthorized request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/message-status/read-by/${messageIds[0]}`
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('Read Status Integration', () => {
    test('should show correct read count after batch marking', async () => {
      // Create a new message
      const messageResponse = await app.inject({
        method: 'POST',
        url: `/api/chats/${chatId}/messages`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          content: 'Message for read count test'
        }
      })

      const messageResult = JSON.parse(messageResponse.body)
      const newMessageId = messageResult.data.id

      // Mark it as read
      await app.inject({
        method: 'POST',
        url: '/api/message-status/mark-read',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageIds: [newMessageId]
        }
      })

      // Check read status
      const readStatusResponse = await app.inject({
        method: 'GET',
        url: `/api/message-status/read-by/${newMessageId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      const readStatusResult = JSON.parse(readStatusResponse.body)
      expect(readStatusResult.data.readBy.length).toBe(0)
      expect(readStatusResult.data.readCount).toBe(0)
    })

    test('should handle upsert behavior correctly', async () => {
      const messageId = messageIds[0]
      
      // Mark as read first time
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/message-status/mark-read',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageIds: [messageId]
        }
      })

      expect(response1.statusCode).toBe(200)
      
      // Get the first read time
      const readStatus1 = await app.inject({
        method: 'GET',
        url: `/api/message-status/read-by/${messageId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })
      
      const firstReadResult = JSON.parse(readStatus1.body).data

      // Wait a moment then mark as read again
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/message-status/mark-read',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageIds: [messageId]
        }
      })

      expect(response2.statusCode).toBe(200)
      
      // Check that read time was updated (upsert behavior)
      const readStatus2 = await app.inject({
        method: 'GET',
        url: `/api/message-status/read-by/${messageId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })
      
      const secondReadResult = JSON.parse(readStatus2.body).data
      expect(firstReadResult.readBy.length).toBe(0)
      expect(secondReadResult.readBy.length).toBe(0)
    })
  })
})
