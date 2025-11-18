import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { neo4jClient } from "../../../lib/neo4jClient";
import crypto from "crypto";

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

                try {
                    // Hash password for comparison
                    const passwordHash = crypto
                        .createHash("sha256")
                        .update(credentials.password)
                        .digest("hex");

                    // Check user in Neo4j
                    const query = `
                        MATCH (u:User {email: $email, passwordHash: $passwordHash})
                        RETURN u
                    `;
                    const results = await neo4jClient.run(query, {
                        email: credentials.email,
                        passwordHash
                    });

                    if (results.length > 0) {
                        const user = results[0].u;
                        return {
                            id: user.id || user.email,
                            email: user.email,
                            name: user.name || user.email,
                            role: user.role || "user"
                        };
                    }

                    return null;
                } catch (error) {
                    console.error("Auth error:", error);
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
