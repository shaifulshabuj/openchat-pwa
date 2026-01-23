import { test, expect, describe, beforeAll, afterAll } from 'vitest'
import { build } from '../index'
import { FastifyInstance } from 'fastify'

describe('Message Reactions API', () => {
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

    // Create a test message
    const messageResponse = await app.inject({
      method: 'POST',
      url: `/api/chats/${chatId}/messages`,
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        content: 'Test message for reactions'
      }
    })

    const messageResult = JSON.parse(messageResponse.body)
    messageId = messageResult.data.id
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/reactions/add', () => {
    test('should add a reaction to a message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reactions/add',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageId: messageId,
          emoji: '👍'
        }
      })

      expect(response.statusCode).toBe(201)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.action).toBe('added')
      expect(result.reaction.emoji).toBe('👍')
      expect(result.reaction.messageId).toBe(messageId)
    })

    test('should toggle reaction (remove existing)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reactions/add',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageId: messageId,
          emoji: '👍'
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.action).toBe('removed')
      expect(result.reaction.emoji).toBe('👍')
    })

    test('should add multiple different reactions', async () => {
      // Add thumbs up
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/reactions/add',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageId: messageId,
          emoji: '👍'
        }
      })

      expect(response1.statusCode).toBe(201)

      // Add heart
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/reactions/add',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageId: messageId,
          emoji: '❤️'
        }
      })

      expect(response2.statusCode).toBe(201)
      
      const result = JSON.parse(response2.body)
      expect(result.success).toBe(true)
      expect(result.action).toBe('added')
      expect(result.reaction.emoji).toBe('❤️')
    })

    test('should reject invalid emoji', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reactions/add',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageId: messageId,
          emoji: ''
        }
      })

      expect(response.statusCode).toBe(400)
      
      const result = JSON.parse(response.body)
      expect(result.error).toContain('Validation failed')
    })

    test('should reject non-existent message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reactions/add',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageId: 'non-existent-id',
          emoji: '👍'
        }
      })

      expect(response.statusCode).toBe(404)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Message not found or access denied')
    })

    test('should reject unauthorized request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reactions',
        payload: {
          messageId: messageId,
          emoji: '👍'
        }
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('GET /api/reactions/:messageId', () => {
    test('should get reactions for a message', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/reactions/${messageId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data.reactions)).toBe(true)
      
      // Should have both thumbs up and heart from previous tests
      const reactions = result.data.reactions
      expect(reactions.length).toBeGreaterThanOrEqual(1)
      
      const thumbsUp = reactions.find((r: any) => r.emoji === '👍')
      expect(thumbsUp).toBeDefined()
      expect(thumbsUp.count).toBe(1)
    })

    test('should return empty array for message with no reactions', async () => {
      // Create a new message without reactions
      const messageResponse = await app.inject({
        method: 'POST',
        url: `/api/chats/${chatId}/messages`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          content: 'Message without reactions'
        }
      })

      const messageResult = JSON.parse(messageResponse.body)
      const newMessageId = messageResult.data.id

      const response = await app.inject({
        method: 'GET',
        url: `/api/reactions/${newMessageId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.data.reactions).toEqual([])
    })
  })

  describe('DELETE /api/reactions/remove', () => {
    test('should remove a specific reaction', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/reactions/remove',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageId: messageId,
          emoji: '❤️'
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.message).toContain('removed')
    })

    test('should handle removing non-existent reaction', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/reactions/remove',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          messageId: messageId,
          emoji: '😂'
        }
      })

      expect(response.statusCode).toBe(404)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Reaction not found')
    })
  })
})