import { z } from 'zod'

// User validation schemas
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  )

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters'),
  password: passwordSchema
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address')
})

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(32, 'Invalid reset token'),
  password: passwordSchema
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
}).refine((data) => {
  // For PRIVATE chats, require exactly one participant (the other person)
  if (data.type === 'PRIVATE' && data.participants.length !== 1) {
    return false
  }
  // For GROUP/CHANNEL chats, allow empty array (creator will be added automatically)
  if ((data.type === 'GROUP' || data.type === 'CHANNEL') && data.participants.length >= 0) {
    return true
  }
  return true
}, {
  message: 'Invalid participant configuration for chat type',
  path: ['participants']
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

// Post validation schemas
export const createPostSchema = z.object({
  content: z.string().min(1, 'Post content is required').max(4000, 'Post too long'),
  media: z.array(z.string().url()).max(6, 'Too many media items').optional(),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).optional()
})

// Type exports
export type RegisterData = z.infer<typeof registerSchema>
export type LoginData = z.infer<typeof loginSchema>
export type UpdateProfileData = z.infer<typeof updateProfileSchema>
export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetConfirmData = z.infer<typeof passwordResetConfirmSchema>
export type CreateChatData = z.infer<typeof createChatSchema>
export type SendMessageData = z.infer<typeof sendMessageSchema>
export type JoinChatData = z.infer<typeof joinChatSchema>
export type CreatePostData = z.infer<typeof createPostSchema>
