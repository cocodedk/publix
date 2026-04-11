import { validateEnv } from '../../lib/env'

// Save originals
const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  // Restore env after each test
  Object.keys(process.env).forEach(key => {
    if (!(key in ORIGINAL_ENV)) delete process.env[key]
  })
  Object.assign(process.env, ORIGINAL_ENV)
})

describe('validateEnv', () => {
  it('throws when NEO4J_URI is missing', () => {
    delete process.env.NEO4J_URI
    expect(() => validateEnv()).toThrow('NEO4J_URI')
  })

  it('throws when RESEND_API_KEY is missing', () => {
    delete process.env.RESEND_API_KEY
    expect(() => validateEnv()).toThrow('RESEND_API_KEY')
  })

  it('returns config object when all required vars are present', () => {
    const config = validateEnv()
    expect(config.NEO4J_URI).toBe('bolt://localhost:7687')
    expect(config.NEO4J_USER).toBe('neo4j')
    expect(config.NEO4J_PASSWORD).toBe('testpassword')
    expect(config.ENCRYPTION_KEY).toBe('dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdA==')
    expect(config.SALT).toBe('dGVzdHNhbHQ=')
    expect(config.RESEND_API_KEY).toBe('re_test_123')
    expect(config.RESEND_FROM_EMAIL).toBe('noreply@publix.dk')
    expect(config.NEXTAUTH_SECRET).toBe('test-secret')
  })
})
