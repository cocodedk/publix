import pino from 'pino'

function createLogger() {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    try {
      // pino-pretty is optional — use it in dev if available
      require.resolve('pino-pretty')
      return pino({
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
        level: 'debug',
      })
    } catch {
      // pino-pretty not installed — fall through to plain pino
    }
  }

  return pino({
    level: isDev ? 'debug' : 'info',
  })
}

export const logger = createLogger()
