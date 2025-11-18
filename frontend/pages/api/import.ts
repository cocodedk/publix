import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../lib/neo4jClient";
import { Encryptor } from "../../lib/encryptor";
import { ImportRequest, ImportResponse, ApiError } from "../../lib/types";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

export default async function handler(req: NextApiRequest, res: NextApiResponse<ImportResponse | ApiError>) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const body: ImportRequest = req.body;

        if (!body.items || !Array.isArray(body.items)) {
            return res.status(400).json({
                error: "Invalid request",
                message: "items must be an array"
            });
        }

        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        // Process items in batches for better performance
        const batchSize = 100;
        for (let i = 0; i < body.items.length; i += batchSize) {
            const batch = body.items.slice(i, i + batchSize);

            for (const item of batch) {
                try {
                    // Validation
                    if (!item.email || !item.line || !item.domain || !item.tld) {
                        failed++;
                        errors.push(`Item ${i + batch.indexOf(item) + 1}: Missing required fields`);
                        continue;
                    }

                    // Generate email hash
                    const emailHash = crypto.createHash("sha256")
                        .update(item.email + (process.env.SALT || ""))
                        .digest("hex");

                    // Encrypt data
                    const encryptedEmail = encryptor.encrypt(item.email);
                    const encryptedPassword = item.password ? encryptor.encrypt(item.password) : null;
                    const encryptedLine = encryptor.encrypt(item.line);

                    // Generate mainDataId if not provided
                    const mainDataId = item.mainDataId || `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    // Create or get TLD, Domain, and ContentLine
                    const query = `
                        MERGE (t:TLD {name: $tld})
                        MERGE (d:Domain {name: $domain})
                        MERGE (t)-[:HAS_DOMAIN]->(d)
                        MERGE (c:ContentLine {mainDataId: $mainDataId})
                        SET c.email = $encryptedEmail,
                            c.password = $encryptedPassword,
                            c.line = $encryptedLine,
                            c.email_hash = $emailHash
                        MERGE (d)-[:HAS_CONTENT]->(c)
                        RETURN c
                    `;

                    await neo4jClient.run(query, {
                        tld: item.tld,
                        domain: item.domain,
                        encryptedEmail,
                        encryptedPassword,
                        encryptedLine,
                        emailHash,
                        mainDataId
                    });

                    success++;
                } catch (error) {
                    failed++;
                    errors.push(`Item ${i + batch.indexOf(item) + 1}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        const response: ImportResponse = {
            success,
            failed,
            errors: errors.length > 0 ? errors : undefined
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("Import error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
