import { NextApiRequest, NextApiResponse } from "next";
import { intelxClient } from "../../../lib/intelxClient";
import { neo4jClient } from "../../../lib/neo4jClient";
import { Encryptor } from "../../../lib/encryptor";
import { ApiError } from "../../../lib/types";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

interface SyncRequest {
    queries: string[];
    type?: "email" | "domain" | "auto";
}

interface ParsedCredential {
    email: string;
    password: string | null;
    line: string;
    domain: string;
    tld: string;
}

function parseIntelXResult(selector: any): ParsedCredential | null {
    try {
        const value = selector.selectorvalue || "";
        const type = selector.selectortype || "";

        // Try to parse email:password format
        if (type === "email" || value.includes("@")) {
            const parts = value.split(":");
            const email = parts[0]?.trim();
            const password = parts[1]?.trim() || null;

            if (email && email.includes("@")) {
                const [localPart, domainPart] = email.split("@");
                if (domainPart) {
                    const domainParts = domainPart.split(".");
                    const tld = domainParts[domainParts.length - 1] || "com";
                    const domain = domainParts.slice(0, -1).join(".") || domainPart;

                    return {
                        email,
                        password,
                        line: value,
                        domain,
                        tld
                    };
                }
            }
        }

        // Try to parse other formats
        if (value.includes("|") || value.includes("\t")) {
            const delimiter = value.includes("|") ? "|" : "\t";
            const parts = value.split(delimiter);
            const email = parts.find((p: string) => p.includes("@"))?.trim();

            if (email) {
                const [localPart, domainPart] = email.split("@");
                if (domainPart) {
                    const domainParts = domainPart.split(".");
                    const tld = domainParts[domainParts.length - 1] || "com";
                    const domain = domainParts.slice(0, -1).join(".") || domainPart;
                    const password = parts.find((p: string, i: number) =>
                        i !== parts.findIndex((pp: string) => pp.includes("@"))
                    )?.trim() || null;

                    return {
                        email,
                        password,
                        line: value,
                        domain,
                        tld
                    };
                }
            }
        }

        return null;
    } catch (error) {
        console.error("Error parsing IntelX result:", error);
        return null;
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ success: number; failed: number; errors: string[] } | ApiError>
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const body: SyncRequest = req.body;

        if (!body.queries || !Array.isArray(body.queries) || body.queries.length === 0) {
            return res.status(400).json({
                error: "Invalid request",
                message: "queries must be a non-empty array"
            });
        }

        let success = 0;
        let failed = 0;
        const errors: string[] = [];
        const type = body.type || "auto";

        for (const query of body.queries) {
            try {
                let selectors;

                if (type === "email") {
                    selectors = await intelxClient.searchEmail(query);
                } else if (type === "domain") {
                    selectors = await intelxClient.searchDomain(query);
                } else {
                    // Auto-detect: if it contains @, treat as email
                    if (query.includes("@")) {
                        selectors = await intelxClient.searchEmail(query);
                    } else {
                        selectors = await intelxClient.searchDomain(query);
                    }
                }

                for (const selector of selectors) {
                    const credential = parseIntelXResult(selector);

                    if (!credential) {
                        continue;
                    }

                    try {
                        // Generate email hash
                        const emailHash = crypto.createHash("sha256")
                            .update(credential.email + (process.env.SALT || ""))
                            .digest("hex");

                        // Encrypt data
                        const encryptedEmail = encryptor.encrypt(credential.email);
                        const encryptedPassword = credential.password
                            ? encryptor.encrypt(credential.password)
                            : null;
                        const encryptedLine = encryptor.encrypt(credential.line);

                        // Generate mainDataId
                        const mainDataId = `intelx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                        // Check if already exists
                        const existingQuery = `
                            MATCH (c:ContentLine {email_hash: $emailHash})
                            RETURN c LIMIT 1
                        `;
                        const existing = await neo4jClient.run(existingQuery, { emailHash });

                        if (existing.length > 0) {
                            // Update existing
                            const updateQuery = `
                                MATCH (c:ContentLine {email_hash: $emailHash})
                                SET c.email = $encryptedEmail,
                                    c.password = $encryptedPassword,
                                    c.line = $encryptedLine,
                                    c.lastSyncedAt = datetime(),
                                    c.source = "intelx"
                                RETURN c
                            `;
                            await neo4jClient.run(updateQuery, {
                                emailHash,
                                encryptedEmail,
                                encryptedPassword,
                                encryptedLine
                            });
                        } else {
                            // Create new
                            const createQuery = `
                                MERGE (t:TLD {name: $tld})
                                MERGE (d:Domain {name: $domain})
                                MERGE (t)-[:HAS_DOMAIN]->(d)
                                CREATE (c:ContentLine {
                                    email: $encryptedEmail,
                                    password: $encryptedPassword,
                                    line: $encryptedLine,
                                    email_hash: $emailHash,
                                    mainDataId: $mainDataId,
                                    createdAt: datetime(),
                                    lastSyncedAt: datetime(),
                                    source: "intelx"
                                })
                                MERGE (d)-[:HAS_CONTENT]->(c)
                                RETURN c
                            `;
                            await neo4jClient.run(createQuery, {
                                tld: credential.tld,
                                domain: credential.domain,
                                encryptedEmail,
                                encryptedPassword,
                                encryptedLine,
                                emailHash,
                                mainDataId
                            });
                        }

                        success++;
                    } catch (error) {
                        failed++;
                        errors.push(`Failed to store credential: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
            } catch (error) {
                failed++;
                errors.push(`Failed to search ${query}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return res.status(200).json({
            success,
            failed,
            errors: errors.slice(0, 100) // Limit error messages
        });
    } catch (error) {
        console.error("IntelX sync error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
