import { FastifyInstance } from 'fastify'
import { prisma } from '../utils/database.js'
import { createClient } from 'redis'

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    const checks: Record<string, { status: 'ok' | 'error' | 'skipped'; detail?: string }> = {}

    try {
      await prisma.$queryRaw`SELECT 1`
      checks.database = { status: 'ok' }
    } catch (error: any) {
      checks.database = { status: 'error', detail: error?.message || 'Database check failed' }
    }

    if (process.env.REDIS_URL) {
      const client = createClient({ url: process.env.REDIS_URL })
      try {
        await client.connect()
        await client.ping()
        checks.redis = { status: 'ok' }
      } catch (error: any) {
        checks.redis = { status: 'error', detail: error?.message || 'Redis check failed' }
      } finally {
        await client.disconnect().catch(() => undefined)
      }
    } else {
      checks.redis = { status: 'skipped', detail: 'REDIS_URL not set' }
    }

    const overallStatus = Object.values(checks).some((check) => check.status === 'error')
      ? 'degraded'
      : 'ok'

    return reply.send({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    })
  })
}
