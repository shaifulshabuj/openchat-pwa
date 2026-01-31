import { test, expect, describe, beforeAll, afterAll, afterEach } from 'vitest'
import { build } from '../index'
import { FastifyInstance } from 'fastify'
import { prisma } from '../utils/database'
import { createTestUser } from './utils/testFactories'
import { hashPasswordResetToken } from '../utils/passwordReset'
import { verifyPassword } from '../utils/auth'

describe('Password Reset API', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterEach(async () => {
    await prisma.passwordResetToken.deleteMany()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/password-reset/request', () => {
    test('should create reset token for existing user', async () => {
      const { user } = await createTestUser()

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/password-reset/request',
        payload: { email: user.email }
      })

      expect(response.statusCode).toBe(200)

      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id }
      })

      expect(tokenRecord).toBeTruthy()
      expect(tokenRecord?.usedAt).toBeNull()
      expect(tokenRecord?.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    test('should respond success for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/password-reset/request',
        payload: { email: 'missing@openchat.dev' }
      })

      expect(response.statusCode).toBe(200)

      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)

      const tokens = await prisma.passwordResetToken.findMany({
        where: { user: { email: 'missing@openchat.dev' } }
      })

      expect(tokens.length).toBe(0)
    })
  })

  describe('POST /api/auth/password-reset/confirm', () => {
    test('should reset password for valid token', async () => {
      const { user } = await createTestUser({ password: 'Demo123456' })
      const rawToken = 'test-reset-token'

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashPasswordResetToken(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        }
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/password-reset/confirm',
        payload: {
          token: rawToken,
          password: 'NewPass123'
        }
      })

      expect(response.statusCode).toBe(200)

      const result = JSON.parse(response.body)
      expect(result.success).toBe(true)

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(updatedUser).toBeTruthy()
      const matches = await verifyPassword('NewPass123', updatedUser?.password || '')
      expect(matches).toBe(true)

      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id }
      })

      expect(tokenRecord?.usedAt).toBeTruthy()
    })

    test('should reject expired token', async () => {
      const { user } = await createTestUser()
      const rawToken = 'expired-reset-token'

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashPasswordResetToken(rawToken),
          expiresAt: new Date(Date.now() - 60 * 1000)
        }
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/password-reset/confirm',
        payload: {
          token: rawToken,
          password: 'NewPass123'
        }
      })

      expect(response.statusCode).toBe(400)

      const result = JSON.parse(response.body)
      expect(result.error).toBe('Invalid or expired reset token')
    })
  })
})
