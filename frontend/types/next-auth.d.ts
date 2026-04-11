import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role?: string
    id?: string
  }
  interface Session {
    user?: DefaultSession['user'] & {
      role?: string
      id?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    id?: string
  }
}
