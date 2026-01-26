import { FastifyInstance } from 'fastify'
import { prisma } from '../../utils/database.js'

export const getAuthToken = async (app: FastifyInstance, email: string, password: string) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email,
      password
    }
  })

  const result = JSON.parse(response.body)
  return result.data.token as string
}

export const clearTestData = async () => {
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'test+' } },
    select: { id: true }
  })

  if (testUsers.length === 0) {
    return
  }

  const ids = testUsers.map((user) => user.id)
  await prisma.user.deleteMany({
    where: { id: { in: ids } }
  })
}
