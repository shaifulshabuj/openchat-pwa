import { FastifyRequest, FastifyReply } from 'fastify'
import { FastifyInstance } from 'fastify'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum number of requests per window
  keyGenerator?: (request: FastifyRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  message?: string
  headers?: boolean
}

interface RequestInfo {
  count: number
  resetTime: number
}

class RateLimiter {
  private requests: Map<string, RequestInfo> = new Map()
  private options: Required<RateLimitOptions>

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (request) => request.ip,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later.',
      headers: true,
      ...options,
    }

    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now()
      for (const [key, info] of this.requests) {
        if (now >= info.resetTime) {
          this.requests.delete(key)
        }
      }
    }, 60 * 1000)
  }

  async handler(request: FastifyRequest, reply: FastifyReply) {
    const key = this.options.keyGenerator(request)
    const now = Date.now()
    const windowStart = now - this.options.windowMs

    let requestInfo = this.requests.get(key)

    if (!requestInfo || requestInfo.resetTime <= now) {
      requestInfo = {
        count: 0,
        resetTime: now + this.options.windowMs,
      }
      this.requests.set(key, requestInfo)
    }

    requestInfo.count++

    if (this.options.headers) {
      reply.header('X-RateLimit-Limit', this.options.maxRequests)
      reply.header(
        'X-RateLimit-Remaining',
        Math.max(0, this.options.maxRequests - requestInfo.count)
      )
      reply.header('X-RateLimit-Reset', Math.ceil(requestInfo.resetTime / 1000))
    }

    if (requestInfo.count > this.options.maxRequests) {
      reply.header('Retry-After', Math.ceil((requestInfo.resetTime - now) / 1000))
      return reply.status(429).send({
        error: this.options.message,
        retryAfter: Math.ceil((requestInfo.resetTime - now) / 1000),
      })
    }
  }
}

// Pre-configured rate limiters (development-friendly limits)
export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 requests per 15 minutes (increased for development)
  keyGenerator: (request) => request.ip,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: 'Too many authentication attempts, please try again later.',
  headers: true,
})

export const apiRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200, // 200 requests per minute (increased for development)
  keyGenerator: (request) => request.ip,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: 'Too many requests, please try again later.',
  headers: true,
})

export const chatRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200, // 200 messages per minute
  keyGenerator: (request) => request.ip,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: 'Too many messages, please slow down.',
  headers: true,
})

// Plugin to register rate limiting
export async function rateLimitPlugin(fastify: FastifyInstance) {
  // Register general API rate limit for all routes
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip rate limiting for health checks
    if (request.url === '/health') {
      return
    }

    // Apply different rate limits based on route
    if (request.url.startsWith('/api/auth/')) {
      await authRateLimit.handler(request, reply)
    } else if (request.url.startsWith('/api/chats/') && request.method === 'POST') {
      await chatRateLimit.handler(request, reply)
    } else if (request.url.startsWith('/api/')) {
      await apiRateLimit.handler(request, reply)
    }
  })
}
