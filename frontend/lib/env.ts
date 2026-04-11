import { z } from 'zod'

const requiredEnvSchema = z.object({
  NEO4J_URI: z.string().min(1),
  NEO4J_USER: z.string().min(1),
  NEO4J_PASSWORD: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(1),
  SALT: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
})

const optionalEnvSchema = z.object({
  INTELX_API_KEY: z.string().optional(),
  INTELX_API_URL: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  HIBP_API_KEY: z.string().optional(),
  DEHASHED_USERNAME: z.string().optional(),
  DEHASHED_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PAID_PRICE_ID: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
})

export type EnvConfig = z.infer<typeof requiredEnvSchema> & z.infer<typeof optionalEnvSchema>

export function validateEnv(): EnvConfig {
  const requiredResult = requiredEnvSchema.safeParse(process.env)

  if (!requiredResult.success) {
    const firstMissing = requiredResult.error.issues[0]
    const key = firstMissing.path[0] as string
    throw new Error(`Missing required environment variable: ${key}`)
  }

  const optionalResult = optionalEnvSchema.safeParse(process.env)
  const optional = optionalResult.success ? optionalResult.data : {}

  return { ...requiredResult.data, ...optional }
}
