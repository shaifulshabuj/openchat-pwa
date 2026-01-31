import { randomBytes, createHash } from 'crypto'

const DEFAULT_RESET_TOKEN_TTL_MINUTES = 60

export const generatePasswordResetToken = () => {
  return randomBytes(32).toString('hex')
}

export const hashPasswordResetToken = (token: string) => {
  return createHash('sha256').update(token).digest('hex')
}

export const getPasswordResetTokenExpiry = () => {
  const ttlMinutesRaw = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES
  const ttlMinutes = ttlMinutesRaw ? Number(ttlMinutesRaw) : DEFAULT_RESET_TOKEN_TTL_MINUTES
  const ttlMs = Number.isFinite(ttlMinutes) ? ttlMinutes * 60 * 1000 : DEFAULT_RESET_TOKEN_TTL_MINUTES * 60 * 1000
  return new Date(Date.now() + ttlMs)
}
