// Data validation utilities using Zod

import { z } from "zod";

export const emailSchema = z.string().email("Invalid email format");

export const passwordSchema = z.string().min(0).max(500).nullable().optional();

export const domainSchema = z.string().min(1).max(255).regex(/^[a-zA-Z0-9.-]+$/, "Invalid domain format");

export const tldSchema = z.string().min(1).max(10).regex(/^[a-zA-Z]+$/, "Invalid TLD format");

export const contentLineSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    line: z.string().min(1),
    domain: domainSchema,
    tld: tldSchema,
    mainDataId: z.string().optional()
});

export const searchFiltersSchema = z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    domain: domainSchema.optional(),
    tld: tldSchema.optional(),
    emailDomain: domainSchema.optional(),
    hasPassword: z.boolean().optional(),
    source: z.enum(["intelx", "manual", "import"]).optional(),
    verified: z.boolean().optional()
});

export function validateEmail(email: string): boolean {
    try {
        emailSchema.parse(email);
        return true;
    } catch {
        return false;
    }
}

export function validateDomain(domain: string): boolean {
    try {
        domainSchema.parse(domain);
        return true;
    } catch {
        return false;
    }
}

export function extractEmailDomain(email: string): string | null {
    try {
        const parsed = emailSchema.parse(email);
        return parsed.split("@")[1] || null;
    } catch {
        return null;
    }
}
