import { test, expect, describe, beforeAll, afterAll } from 'vitest'
import { build } from '../index'
import { FastifyInstance } from 'fastify'

describe('Message CRUD Operations', () => {
  let app: FastifyInstance
  let authToken: string
  let chatId: string
  let messageId: string

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
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/chats/:chatId/messages', () => {
    test('should send a message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/chats/${chatId}/messages`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          content: 'Test message for CRUD operations'
        }
      })

      expect(response.statusCode).toBe(201)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.data.content).toBe('Test message for CRUD operations')
      expect(result.data.id).toBeDefined()
      
      // Store message ID for subsequent tests
      messageId = result.data.id
    })

    test('should reject empty message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/chats/${chatId}/messages`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          content: ''
        }
      })

      expect(response.statusCode).toBe(400)
      
      const result = JSON.parse(response.body)
      expect(result.error).toContain('Validation failed')
    })

    test('should reject unauthorized request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/chats/${chatId}/messages`,
        payload: {
          content: 'Test message'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('PUT /api/chats/:chatId/messages/:messageId', () => {
    test('should edit a message', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/chats/${chatId}/messages/${messageId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          content: 'Updated test message'
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.data.content).toBe('Updated test message')
      expect(result.data.isEdited).toBe(true)
      expect(result.data.updatedAt).toBeDefined()
    })

    test('should reject editing non-existent message', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/chats/${chatId}/messages/non-existent-id`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          content: 'Updated content'
        }
      })

      expect(response.statusCode).toBe(404)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Message not found or you can only edit your own messages')
    })

    test('should reject empty content', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/chats/${chatId}/messages/${messageId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          content: ''
        }
      })

      expect(response.statusCode).toBe(400)
      
      const result = JSON.parse(response.body)
      expect(result.error).toContain('Validation failed')
    })
  })

  describe('DELETE /api/chats/:chatId/messages/:messageId', () => {
    test('should delete a message', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/chats/${chatId}/messages/${messageId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Message deleted successfully')
    })

    test('should reject deleting non-existent message', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/chats/${chatId}/messages/non-existent-id`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(404)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Message not found')
    })
  })
})
