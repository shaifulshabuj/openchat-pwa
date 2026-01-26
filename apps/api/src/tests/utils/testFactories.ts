import { randomUUID } from 'crypto'
import { prisma } from '../../utils/database.js'
import { hashPassword } from '../../utils/auth.js'

type CreateUserInput = {
  email?: string
  username?: string
  displayName?: string
  password?: string
}

type CreateChatInput = {
  ownerId: string
  participantIds?: string[]
  type?: 'PRIVATE' | 'GROUP'
  name?: string
  description?: string
}

type CreateMessageInput = {
  chatId: string
  senderId: string
  content?: string
  type?: string
}

export const createTestUser = async (input: CreateUserInput = {}) => {
  const password = input.password ?? 'Demo123456'
  const hashedPassword = await hashPassword(password)
  const email = input.email ?? `test+${randomUUID()}@openchat.dev`
  const username = input.username ?? `test_${randomUUID().slice(0, 8)}`
  const displayName = input.displayName ?? 'Test User'

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName,
      password: hashedPassword,
      isVerified: true
    }
  })

  return { user, password }
}

export const createTestChat = async ({
  ownerId,
  participantIds = [],
  type = 'PRIVATE',
  name,
  description
}: CreateChatInput) => {
  const participants = [ownerId, ...participantIds]
  const data: Record<string, unknown> = {
    type,
    participants: {
      create: participants.map((userId) => ({ userId }))
    }
  }

  if (type !== 'PRIVATE' && name) data.name = name
  if (description) data.description = description
  if (type !== 'PRIVATE') {
    data.admins = { create: { userId: ownerId } }
  }

  return prisma.chat.create({
    data
  })
}

export const createTestMessage = async ({
  chatId,
  senderId,
  content = 'Test message',
  type = 'TEXT'
}: CreateMessageInput) => {
  return prisma.message.create({
    data: {
      chatId,
      senderId,
      content,
      type
    }
  })
}
