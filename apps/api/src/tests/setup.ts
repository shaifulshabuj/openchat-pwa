import { afterAll } from 'vitest'
import { clearTestData } from './utils/testHelpers.js'

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://openchat:password@localhost:5432/openchat_dev'
}

if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

afterAll(async () => {
  await clearTestData()
})
