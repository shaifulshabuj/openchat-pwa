import { prisma } from '../utils/database.js'

type ContactMetadata =
  | {
      kind: 'contact-request'
      status: 'pending' | 'accepted' | 'declined'
      fromUserId: string
      toUserId: string
    }
  | {
      kind: 'contact-block'
      status: 'blocked' | 'unblocked'
      blockerId: string
      targetUserId: string
    }
  | {
      kind?: 'contact-meta'
      isFavorite?: boolean
      nickname?: string | null
      labels?: string[]
    }

export const parseContactMetadata = (raw?: string | null): ContactMetadata | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as ContactMetadata
  } catch {
    return null
  }
}

export const findPrivateChat = async (userId: string, otherUserId: string) => {
  return prisma.chat.findFirst({
    where: {
      type: 'PRIVATE',
      participants: {
        every: {
          userId: {
            in: [userId, otherUserId],
          },
          leftAt: null
        }
      },
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherUserId } } }
      ]
    }
  })
}

export const getOrCreatePrivateChat = async (userId: string, otherUserId: string) => {
  const existing = await findPrivateChat(userId, otherUserId)
  if (existing) {
    return existing
  }

  return prisma.chat.create({
    data: {
      type: 'PRIVATE',
      participants: {
        create: [{ userId }, { userId: otherUserId }]
      }
    }
  })
}
