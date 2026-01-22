import { FastifyInstance } from 'fastify'
import { authMiddleware } from '../middleware/auth.js'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'

export default async function uploadRoutes(fastify: FastifyInstance) {
  // Upload file endpoint
  fastify.post('/file', { preHandler: authMiddleware }, async (request: any, reply) => {
    try {
      const data = await request.file()
      
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (data.file.bytesRead > maxSize) {
        return reply.status(400).send({ error: 'File too large. Maximum size is 10MB.' })
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'audio/mpeg',
        'audio/wav',
        'video/mp4',
        'video/webm'
      ]

      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'File type not supported' })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const userId = request.auth.userId
      const ext = path.extname(data.filename || '')
      const filename = `${userId}_${timestamp}${ext}`
      
      // Ensure upload directory exists
      const uploadDir = process.env.UPLOAD_PATH || './uploads'
      await fs.mkdir(uploadDir, { recursive: true })
      
      const filepath = path.join(uploadDir, filename)
      
      // Save file
      const buffer = await data.file.toBuffer()
      await fs.writeFile(filepath, buffer)

      // Generate thumbnail for images
      let thumbnailPath = null
      if (data.mimetype.startsWith('image/')) {
        try {
          const thumbnailFilename = `thumb_${filename}`
          thumbnailPath = path.join(uploadDir, thumbnailFilename)
          
          await sharp(buffer)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath)
        } catch (error) {
          console.warn('Could not generate thumbnail:', error)
        }
      }

      const fileInfo = {
        id: `file_${timestamp}`,
        filename: data.filename || filename,
        originalName: data.filename,
        mimetype: data.mimetype,
        size: buffer.length,
        url: `/api/files/${filename}`,
        thumbnailUrl: thumbnailPath ? `/api/files/thumb_${filename}` : null,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      }

      return reply.status(201).send({
        success: true,
        data: fileInfo
      })
      
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'File upload failed' })
    }
  })

  // Serve uploaded files
  fastify.get('/files/:filename', async (request: any, reply) => {
    try {
      const { filename } = request.params
      const uploadDir = process.env.UPLOAD_PATH || './uploads'
      const filepath = path.join(uploadDir, filename)
      
      // Security check - prevent path traversal
      if (!filepath.startsWith(path.resolve(uploadDir))) {
        return reply.status(403).send({ error: 'Access denied' })
      }

      // Check if file exists
      try {
        await fs.access(filepath)
      } catch {
        return reply.status(404).send({ error: 'File not found' })
      }

      // Stream the file
      const stream = await fs.readFile(filepath)
      const ext = path.extname(filename).toLowerCase()
      
      // Set content type
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm'
      }

      const contentType = mimeTypes[ext] || 'application/octet-stream'
      
      reply.header('Content-Type', contentType)
      reply.header('Cache-Control', 'public, max-age=31536000') // 1 year cache
      
      return reply.send(stream)
      
    } catch (error) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Could not serve file' })
    }
  })
}