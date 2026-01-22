import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { FastifyRequest } from 'fastify'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

export interface JWTPayload {
  userId: string
  email: string
  username: string
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

export const generateToken = (payload: JWTPayload): string => {
  const options: SignOptions = { 
    expiresIn: '7d'  // Use string literal instead of env variable for type safety
  }
  return jwt.sign(payload, JWT_SECRET, options)
}

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export const extractTokenFromRequest = (request: FastifyRequest): string | null => {
  const authHeader = request.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export const getUserFromToken = (token: string): JWTPayload | null => {
  try {
    return verifyToken(token)
  } catch {
    return null
  }
}