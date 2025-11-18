import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        // Add any additional middleware logic here
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                // Protect API routes that require authentication
                if (req.nextUrl.pathname.startsWith("/api/content/create") ||
                    req.nextUrl.pathname.startsWith("/api/content/update") ||
                    req.nextUrl.pathname.startsWith("/api/content/delete") ||
                    req.nextUrl.pathname.startsWith("/api/content/bulk") ||
                    req.nextUrl.pathname.startsWith("/api/import") ||
                    req.nextUrl.pathname.startsWith("/api/backup") ||
                    req.nextUrl.pathname.startsWith("/api/intelx/sync")) {
                    return !!token;
                }

                // Protect frontend routes
                if (req.nextUrl.pathname.startsWith("/create") ||
                    req.nextUrl.pathname.startsWith("/edit") ||
                    req.nextUrl.pathname.startsWith("/dashboard")) {
                    return !!token;
                }

                // Allow all other routes
                return true;
            }
        },
        pages: {
            signIn: "/auth/signin"
        }
    }
);

export const config = {
    matcher: [
        "/api/content/:path*",
        "/api/import",
        "/api/backup",
        "/api/intelx/sync",
        "/create",
        "/edit/:path*",
        "/dashboard"
    ]
};
