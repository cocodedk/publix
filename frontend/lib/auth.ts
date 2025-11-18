// Authentication utilities

import { getSession } from "next-auth/react";
import { NextApiRequest, NextApiResponse } from "next";

export interface User {
    id: string;
    email: string;
    name?: string;
    role: "admin" | "user" | "viewer";
}

export async function requireAuth(
    req: NextApiRequest,
    res: NextApiResponse,
    roles?: string[]
): Promise<User | null> {
    const session = await getSession({ req });

    if (!session || !session.user) {
        res.status(401).json({ error: "Unauthorized" });
        return null;
    }

    const user = session.user as User;

    if (roles && !roles.includes(user.role)) {
        res.status(403).json({ error: "Forbidden" });
        return null;
    }

    return user;
}

export function hasRole(user: User | null, role: string): boolean {
    if (!user) return false;
    return user.role === role || user.role === "admin";
}

export function canEdit(user: User | null): boolean {
    if (!user) return false;
    return user.role === "admin" || user.role === "user";
}

export function canView(user: User | null): boolean {
    if (!user) return false;
    return true; // All authenticated users can view
}
