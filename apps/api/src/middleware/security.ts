import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/database';

// Rate limiting configuration
const RATE_LIMITS = {
  // Authentication endpoints - more restrictive
  login: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  register: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour
  
  // API endpoints - moderate limits
  api: { max: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  upload: { max: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  
  // Socket events - higher limits
  socket: { max: 1000, windowMs: 60 * 1000 }, // 1000 events per minute
};

// Simple in-memory rate limiter (for development)
// In production, use Redis or a proper rate limiting service
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = `${request.ip}:${request.routerPath}`;
    const now = Date.now();
    
    // Clean expired entries
    if (rateLimitStore.size > 10000) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (now > v.resetTime) {
          rateLimitStore.delete(k);
        }
      }
    }
    
    let bucket = rateLimitStore.get(key);
    
    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, bucket);
    } else {
      bucket.count++;
    }
    
    // Set rate limit headers
    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - bucket.count));
    reply.header('X-RateLimit-Reset', Math.ceil(bucket.resetTime / 1000));
    
    if (bucket.count > maxRequests) {
      reply.status(429).send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((bucket.resetTime - now) / 1000)} seconds.`,
        retryAfter: Math.ceil((bucket.resetTime - now) / 1000)
      });
      return;
    }
  };
}

// Rate limiting middleware for different endpoint types
export const rateLimits = {
  auth: createRateLimiter(RATE_LIMITS.login.max, RATE_LIMITS.login.windowMs),
  register: createRateLimiter(RATE_LIMITS.register.max, RATE_LIMITS.register.windowMs),
  api: createRateLimiter(RATE_LIMITS.api.max, RATE_LIMITS.api.windowMs),
  upload: createRateLimiter(RATE_LIMITS.upload.max, RATE_LIMITS.upload.windowMs),
  socket: createRateLimiter(RATE_LIMITS.socket.max, RATE_LIMITS.socket.windowMs),
};

// Middleware to log suspicious activity
export async function logSuspiciousActivity(request: FastifyRequest, reply: FastifyReply) {
  const ip = request.ip;
  const userAgent = request.headers['user-agent'];
  const path = request.routerPath;
  
  // Log potential security issues
  const suspicious = [
    path.includes('..'),
    path.includes('<script'),
    path.includes('DROP TABLE'),
    path.includes('SELECT * FROM'),
    userAgent?.includes('bot') && !userAgent.includes('Googlebot'),
  ].some(Boolean);
  
  if (suspicious) {
    console.warn(`🚨 SUSPICIOUS REQUEST: ${ip} ${userAgent} → ${path}`);
    
    // In production, send to security monitoring service
    try {
      // Note: Security logging table doesn't exist yet - just console warn for now
      console.warn('Security event logged:', { ip, userAgent, path, suspicious: true });
    } catch (error) {
      // Security log table doesn't exist yet, just console warn
      console.warn('Security logging failed:', error);
    }
  }
}

export default async function securityPlugin(fastify: FastifyInstance) {
  // Register security logging for all requests
  fastify.addHook('preHandler', logSuspiciousActivity);
  
  console.log('🔒 Security middleware loaded with rate limiting');
}