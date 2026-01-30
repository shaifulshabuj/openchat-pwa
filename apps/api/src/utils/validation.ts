import { z } from 'zod'

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(160, 'Bio must be less than 160 characters').nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'AWAY', 'BUSY']).optional()
})

// Chat validation schemas
export const createChatSchema = z.object({
  type: z.enum(['PRIVATE', 'GROUP', 'CHANNEL']),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  participants: z.array(z.string()).min(1, 'At least one participant is required')
})

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(4000, 'Message too long'),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'VOICE', 'VIDEO', 'LOCATION', 'CONTACT']).default('TEXT'),
  replyToId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export const joinChatSchema = z.object({
  chatId: z.string().cuid('Invalid chat ID')
})

// Type exports
export type RegisterData = z.infer<typeof registerSchema>
export type LoginData = z.infer<typeof loginSchema>
export type UpdateProfileData = z.infer<typeof updateProfileSchema>
export type CreateChatData = z.infer<typeof createChatSchema>
export type SendMessageData = z.infer<typeof sendMessageSchema>
export type JoinChatData = z.infer<typeof joinChatSchema>
