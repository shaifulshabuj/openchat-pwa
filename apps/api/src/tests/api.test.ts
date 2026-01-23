import { test, expect, describe, beforeAll, afterAll } from 'vitest'
import { build } from '../index'
import { FastifyInstance } from 'fastify'

describe('Authentication API', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'alice@openchat.dev',
          password: 'Demo123456'
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.data.user.email).toBe('alice@openchat.dev')
      expect(result.data.token).toBeDefined()
    })

    test('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'alice@openchat.dev',
          password: 'WrongPassword!'
        }
      })

      expect(response.statusCode).toBe(401)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Invalid email or password')
    })

    test('should reject non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'Password123!'
        }
      })

      expect(response.statusCode).toBe(401)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Invalid email or password')
    })

    test('should validate input format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'invalid-email',
          password: '123'
        }
      })

      expect(response.statusCode).toBe(400)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Validation failed')
    })
  })

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.status).toBe('ok')
      expect(result.version).toBe('1.0.0')
      expect(result.uptime).toBeGreaterThan(0)
    })
  })

  describe('GET /api/docs', () => {
    test('should return API documentation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/docs'
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.openapi).toBe('3.0.0')
      expect(result.info.title).toBe('OpenChat API')
    })
  })
})

describe('Rate Limiting', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  test.skip('should enforce rate limit on auth endpoints', async () => {
    const loginData = {
      email: 'ratelimit@example.com',
      password: 'WrongPassword!'
    }

    // Make multiple failed login attempts sequentially to avoid race conditions
    const responses = []
    for (let i = 0; i < 6; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: loginData
      })
      responses.push(response)
    }
    
    // Check that we have some unauthorized and some rate limited responses
    const unauthorizedCount = responses.filter(r => r.statusCode === 401).length
    const rateLimitedCount = responses.filter(r => r.statusCode === 429).length
    
    // Should have exactly 5 unauthorized + 1 rate limited, or less if already rate limited
    expect(unauthorizedCount + rateLimitedCount).toBe(6)
    expect(rateLimitedCount).toBeGreaterThanOrEqual(1)
  })
})