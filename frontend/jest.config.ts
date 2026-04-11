import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
  collectCoverageFrom: [
    // Coverage scoped to files with tests (Plan 1).
    // Expand as tests are added for each plan.
    'lib/env.ts',
    'lib/rateLimiter.ts',
    'lib/email.ts',
    'lib/sources/xposedornot.ts',
    'lib/sources/leakcheck.ts',
    'lib/templates/breachReportHtml.ts',
    'pages/api/report.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: { branches: 60, functions: 70, lines: 70, statements: 70 },
  },
  coverageReporters: ['text', 'lcov', 'html'],
}
export default config
