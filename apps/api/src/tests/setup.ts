import { afterAll } from 'vitest'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { clearTestData } from './utils/testHelpers.js'

const envPath = path.join(process.cwd(), '.env.test')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://openchat:password@localhost:5433/openchat_test'

process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380'

process.env.NODE_ENV = process.env.NODE_ENV || 'test'

afterAll(async () => {
  await clearTestData()
})
