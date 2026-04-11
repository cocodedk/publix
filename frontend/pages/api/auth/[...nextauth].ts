import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { neo4jClient } from "../../../lib/neo4jClient";
import bcrypt from "bcrypt";
import { checkRateLimit } from "../../../lib/rateLimiter";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const rateLimit = await checkRateLimit(credentials.email, "auth");
                if (!rateLimit.allowed) {
                    throw new Error("Too many login attempts");
                }

                try {
                    // Fetch user by email only; compare password with bcrypt
                    const query = `
                        MATCH (u:User {email: $email})
                        RETURN u
                    `;
                    const results = await neo4jClient.run(query, {
                        email: credentials.email,
                    });

                    if (results.length === 0) {
                        return null;
                    }

                    const user = results[0].u;
                    const passwordMatch = await bcrypt.compare(
                        credentials.password,
                        user.passwordHash
                    );

                    if (!passwordMatch) {
                        return null;
                    }

                    return {
                        id: user.id || user.email,
                        email: user.email,
                        name: user.name || user.email,
                        role: user.role || "user"
                    };
                } catch (error) {
                    if (error instanceof Error && error.message === "Too many login attempts") {
                        throw error;
                    }
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: "/auth/signin"
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
            }
            return session;
        }
    }
};

export default NextAuth(authOptions);
