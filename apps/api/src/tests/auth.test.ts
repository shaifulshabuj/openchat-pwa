import { test, expect, describe, beforeAll, afterAll } from 'vitest'
import { build } from '../index.js'
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

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
          password: 'Password123!'
        }
      })

      expect(response.statusCode).toBe(201)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.data.user.email).toBe('test@example.com')
      expect(result.data.user.username).toBe('testuser')
      expect(result.data.token).toBeDefined()
    })

    test('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'invalid-email',
          username: 'testuser2',
          displayName: 'Test User 2',
          password: 'Password123!'
        }
      })

      expect(response.statusCode).toBe(400)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Validation failed')
    })

    test('should reject duplicate email', async () => {
      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'duplicate@example.com',
          username: 'user1',
          displayName: 'User 1',
          password: 'Password123!'
        }
      })

      // Second registration with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'duplicate@example.com',
          username: 'user2',
          displayName: 'User 2',
          password: 'Password123!'
        }
      })

      expect(response.statusCode).toBe(400)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Email already exists')
    })
  })

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      // First register a user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'login@example.com',
          username: 'loginuser',
          displayName: 'Login User',
          password: 'Password123!'
        }
      })

      // Then try to login
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'Password123!'
        }
      })

      expect(response.statusCode).toBe(200)
      
      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)
      expect(result.data.user.email).toBe('login@example.com')
      expect(result.data.token).toBeDefined()
    })

    test('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'WrongPassword!'
        }
      })

      expect(response.statusCode).toBe(401)
      
      const result = JSON.parse(response.body)
      expect(result.error).toBe('Invalid credentials')
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
      expect(result.error).toBe('Invalid credentials')
    })
  })

  describe('Rate Limiting', () => {
    test('should enforce rate limit on login attempts', async () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'WrongPassword!'
      }

      // Make multiple failed login attempts
      const promises = Array.from({ length: 6 }, () =>
        app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: loginData
        })
      )

      const responses = await Promise.all(promises)
      
      // At least one should be rate limited (429)
      const rateLimited = responses.some(r => r.statusCode === 429)
      expect(rateLimited).toBe(true)
    })
  })
})