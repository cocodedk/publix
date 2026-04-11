import { NextApiRequest, NextApiResponse } from "next";
import { intelxClient } from "../../../lib/intelxClient";
import { neo4jClient } from "../../../lib/neo4jClient";
import { Encryptor } from "../../../lib/encryptor";
import { calculateQualityScore, validateEmail, validateDomain, validateTLD, calculateAgeInDays } from "../../../lib/qualityScoring";
import { ApiError } from "../../../lib/types";
import { requireAuth } from "../../../lib/auth";
import { parseIntelXResult } from "../../../lib/parsers/intelx";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

interface SyncRequest {
    queries: string[];
    type?: "email" | "domain" | "auto";
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ success: number; failed: number; errors: string[] } | ApiError>
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;

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
                    selectors = query.includes("@")
                        ? await intelxClient.searchEmail(query)
                        : await intelxClient.searchDomain(query);
                }

                for (const selector of selectors) {
                    const credential = parseIntelXResult(selector);
                    if (!credential) continue;

                    try {
                        const emailHash = crypto.createHash("sha256")
                            .update(credential.email + (process.env.SALT || ""))
                            .digest("hex");

                        const encryptedEmail = encryptor.encrypt(credential.email);
                        const encryptedPassword = credential.password
                            ? encryptor.encrypt(credential.password)
                            : null;
                        const encryptedLine = encryptor.encrypt(credential.line);
                        const mainDataId = `intelx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                        // Read existing age for quality score calculation
                        const existingQuery = `MATCH (c:ContentLine {email_hash: $emailHash}) RETURN c.createdAt AS createdAt LIMIT 1`;
                        const existing = await neo4jClient.run(existingQuery, { emailHash });
                        const existingAge = existing.length > 0 && existing[0].createdAt
                            ? calculateAgeInDays(existing[0].createdAt)
                            : 0;

                        const qualityScore = calculateQualityScore({
                            hasPassword: !!credential.password,
                            hasValidEmail: validateEmail(credential.email),
                            hasValidDomain: validateDomain(credential.domain),
                            hasValidTLD: validateTLD(credential.tld),
                            lineLength: credential.line.length,
                            source: "intelx",
                            verified: false,
                            age: existingAge
                        });

                        // Atomic upsert via MERGE (prevents duplicate creation race condition)
                        const upsertQuery = `
                            MERGE (t:TLD {name: $tld})
                            MERGE (d:Domain {name: $domain})
                            MERGE (t)-[:HAS_DOMAIN]->(d)
                            MERGE (c:ContentLine {email_hash: $emailHash})
                            ON CREATE SET c.mainDataId = $mainDataId, c.createdAt = datetime()
                            SET c.email = $encryptedEmail,
                                c.password = $encryptedPassword,
                                c.line = $encryptedLine,
                                c.lastSyncedAt = datetime(),
                                c.source = "intelx",
                                c.qualityScore = $qualityScore
                            MERGE (d)-[:HAS_CONTENT]->(c)
                            RETURN c
                        `;
                        await neo4jClient.run(upsertQuery, {
                            tld: credential.tld,
                            domain: credential.domain,
                            emailHash,
                            mainDataId,
                            encryptedEmail,
                            encryptedPassword,
                            encryptedLine,
                            qualityScore
                        });

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
            errors: errors.slice(0, 100)
        });
    } catch (error) {
        console.error("IntelX sync error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
