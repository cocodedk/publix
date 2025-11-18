import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { Encryptor } from "../../../lib/encryptor";
import { CreateContentRequest, ContentResponse, ApiError } from "../../../lib/types";
import { calculateQualityScore, validateEmail, validateDomain, validateTLD } from "../../../lib/qualityScoring";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

export default async function handler(req: NextApiRequest, res: NextApiResponse<ContentResponse | ApiError>) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const body: CreateContentRequest = req.body;

        // Validation
        if (!body.email || !body.line || !body.domain || !body.tld) {
            return res.status(400).json({
                error: "Missing required fields",
                message: "email, line, domain, and tld are required"
            });
        }

        // Generate email hash
        const emailHash = crypto.createHash("sha256")
            .update(body.email + (process.env.SALT || ""))
            .digest("hex");

        // Encrypt data
        const encryptedEmail = encryptor.encrypt(body.email);
        const encryptedPassword = body.password ? encryptor.encrypt(body.password) : null;
        const encryptedLine = encryptor.encrypt(body.line);

        // Generate mainDataId if not provided
        const mainDataId = body.mainDataId || `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Calculate quality score
        const qualityScore = calculateQualityScore({
            hasPassword: !!body.password,
            hasValidEmail: validateEmail(body.email),
            hasValidDomain: validateDomain(body.domain),
            hasValidTLD: validateTLD(body.tld),
            lineLength: body.line.length,
            source: "manual",
            verified: false,
            age: 0 // New entry
        });

        // Create or get TLD
        // Create or get Domain
        // Create ContentLine
        const query = `
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
                source: "manual",
                verified: false,
                qualityScore: $qualityScore
            })
            MERGE (d)-[:HAS_CONTENT]->(c)
            RETURN c, d.name as domain, t.name as tld
        `;

        const results = await neo4jClient.run<{ c: any; domain: string; tld: string }>(query, {
            tld: body.tld,
            domain: body.domain,
            encryptedEmail,
            encryptedPassword,
            encryptedLine,
            emailHash,
            mainDataId,
            qualityScore
        });

        if (results.length === 0) {
            return res.status(500).json({ error: "Failed to create content" });
        }

        const result = results[0];
        const response: ContentResponse = {
            id: result.c.mainDataId,
            email: body.email, // Return decrypted
            password: body.password || null,
            line: body.line, // Return decrypted
            mainDataId: result.c.mainDataId,
            domain: result.domain,
            tld: result.tld
        };

        return res.status(201).json(response);
    } catch (error) {
        console.error("Create content error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
