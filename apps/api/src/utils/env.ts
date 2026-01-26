import { z } from 'zod'

const productionEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1)
})

export const validateEnv = () => {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  const result = productionEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET
  })

  if (!result.success) {
    const missing = Object.entries(result.error.flatten().fieldErrors)
      .filter(([, value]) => value && value.length > 0)
      .map(([key]) => key)
      .join(', ')

    throw new Error(`Missing required environment variables for production: ${missing}`)
  }
}
