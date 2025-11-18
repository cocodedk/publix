import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { Encryptor } from "../../../lib/encryptor";
import { ApiError } from "../../../lib/types";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ message: string; restored: number } | ApiError>
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { backupData } = req.body;

        if (!backupData || !backupData.data || !Array.isArray(backupData.data)) {
            return res.status(400).json({
                error: "Invalid backup data",
                message: "backupData.data must be an array"
            });
        }

        let restored = 0;
        const errors: string[] = [];

        for (const item of backupData.data) {
            try {
                const content = item.c;
                if (!content) continue;

                // Decrypt to get original values
                const email = encryptor.decrypt(content.email);
                const password = content.password ? encryptor.decrypt(content.password) : null;
                const line = encryptor.decrypt(content.line);

                // Extract domain and TLD from email or use provided values
                const emailParts = email.split("@");
                const domainPart = emailParts[1] || "";
                const domainParts = domainPart.split(".");
                const tld = item.tld || domainParts[domainParts.length - 1] || "com";
                const domain = item.domain || domainParts.slice(0, -1).join(".") || domainPart;

                // Re-encrypt
                const encryptedEmail = encryptor.encrypt(email);
                const encryptedPassword = password ? encryptor.encrypt(password) : null;
                const encryptedLine = encryptor.encrypt(line);

                // Generate email hash
                const emailHash = crypto.createHash("sha256")
                    .update(email + (process.env.SALT || ""))
                    .digest("hex");

                // Restore node
                const restoreQuery = `
                    MERGE (t:TLD {name: $tld})
                    MERGE (d:Domain {name: $domain})
                    MERGE (t)-[:HAS_DOMAIN]->(d)
                    MERGE (c:ContentLine {mainDataId: $mainDataId})
                    SET c.email = $encryptedEmail,
                        c.password = $encryptedPassword,
                        c.line = $encryptedLine,
                        c.email_hash = $emailHash,
                        c.createdAt = datetime($createdAt),
                        c.updatedAt = $updatedAt ? datetime($updatedAt) : null,
                        c.lastSyncedAt = $lastSyncedAt ? datetime($lastSyncedAt) : null,
                        c.source = $source,
                        c.verified = $verified,
                        c.qualityScore = $qualityScore
                    MERGE (d)-[:HAS_CONTENT]->(c)
                    RETURN c
                `;

                await neo4jClient.run(restoreQuery, {
                    tld,
                    domain,
                    mainDataId: content.mainDataId,
                    encryptedEmail,
                    encryptedPassword,
                    encryptedLine,
                    emailHash,
                    createdAt: content.createdAt || new Date().toISOString(),
                    updatedAt: content.updatedAt || null,
                    lastSyncedAt: content.lastSyncedAt || null,
                    source: content.source || "import",
                    verified: content.verified || false,
                    qualityScore: content.qualityScore || null
                });

                restored++;
            } catch (error) {
                errors.push(`Failed to restore item: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return res.status(200).json({
            message: `Restored ${restored} items`,
            restored,
            errors: errors.slice(0, 10)
        });
    } catch (error) {
        console.error("Restore error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
