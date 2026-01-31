import { FastifyInstance } from 'fastify'
import { prisma } from '../utils/database.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimits } from '../middleware/security.js'
import { createPostSchema } from '../utils/validation.js'
import { z } from 'zod'

const listPostsQuerySchema = z.object({
  limit: z.string().optional(),
  cursor: z.string().cuid().optional(),
  authorId: z.string().cuid().optional()
})

const parseMedia = (media: string | null) => {
  if (!media) return []
  try {
    const parsed = JSON.parse(media)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default async function postRoutes(fastify: FastifyInstance) {
  // Create a new post
  fastify.post('/', { preHandler: [authMiddleware, rateLimits.api] }, async (request: any, reply) => {
    try {
      const { content, media, visibility } = createPostSchema.parse(request.body)

      const post = await prisma.post.create({
        data: {
          authorId: request.auth.userId,
          content,
          visibility: visibility || 'PUBLIC',
          media: media && media.length > 0 ? JSON.stringify(media) : null
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          },
          _count: {
            select: { comments: true, likes: true }
          }
        }
      })

      return reply.status(201).send({
        success: true,
        data: {
          ...post,
          media: parseMedia(post.media)
        }
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation failed',
          details: error.errors
        })
      }

      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // List posts (feed)
  fastify.get('/', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const query = listPostsQuerySchema.parse(request.query || {})
      const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 50)

      const baseVisibility = {
        OR: [{ visibility: 'PUBLIC' }, { authorId: request.auth.userId }]
      }

      const where = query.authorId
        ? {
            ...baseVisibility,
            authorId: query.authorId
          }
        : baseVisibility

      const posts = await prisma.post.findMany({
        where,
        take: limit + 1,
        ...(query.cursor
          ? {
              cursor: { id: query.cursor },
              skip: 1
            }
          : {}),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          },
          _count: {
            select: { comments: true, likes: true }
          }
        }
      })

      const hasMore = posts.length > limit
      const sliced = posts.slice(0, limit)

      return reply.send({
        success: true,
        data: sliced.map((post) => ({
          ...post,
          media: parseMedia(post.media)
        })),
        nextCursor: hasMore && posts.length > 0 ? posts[posts.length - 1]?.id || null : null
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation failed',
          details: error.errors
        })
      }

      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get a single post by id
  fastify.get('/:postId', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const { postId } = request.params

      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          },
          _count: {
            select: { comments: true, likes: true }
          }
        }
      })

      if (!post || (post.visibility !== 'PUBLIC' && post.authorId !== request.auth.userId)) {
        return reply.status(404).send({ error: 'Post not found' })
      }

      return reply.send({
        success: true,
        data: {
          ...post,
          media: parseMedia(post.media)
        }
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })
}
