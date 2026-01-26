import { afterAll } from 'vitest'
import { clearTestData } from './utils/testHelpers.js'

afterAll(async () => {
  await clearTestData()
})
