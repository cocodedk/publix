import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) { return NextResponse.next() },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        const protectedPaths = [
          '/admin',
          '/api/content/create', '/api/content/update',
          '/api/content/delete', '/api/content/bulk',
          '/api/import', '/api/backup', '/api/intelx/sync',
          '/api/export',
          '/create', '/edit', '/dashboard',
        ]
        if (protectedPaths.some(p => path.startsWith(p))) return token?.role === 'admin'
        return true
      },
    },
    pages: { signIn: '/auth/signin' },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/content/:path*',
    '/api/import',
    '/api/backup/:path*',
    '/api/intelx/sync',
    '/api/export/:path*',
    '/create', '/edit/:path*', '/dashboard',
  ],
}
