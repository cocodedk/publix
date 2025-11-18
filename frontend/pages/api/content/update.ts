import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { Encryptor } from "../../../lib/encryptor";
import { UpdateContentRequest, ContentResponse, ApiError } from "../../../lib/types";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

export default async function handler(req: NextApiRequest, res: NextApiResponse<ContentResponse | ApiError>) {
    if (req.method !== "PUT" && req.method !== "PATCH") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;
        const body: UpdateContentRequest = req.body;

        if (!id || typeof id !== "string") {
            return res.status(400).json({
                error: "Missing or invalid id parameter"
            });
        }

        // First, get the existing content
        const getQuery = `
            MATCH (c:ContentLine {mainDataId: $id})
            OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
            OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
            RETURN c, d.name as domain, t.name as tld
        `;

        const existing = await neo4jClient.run<{ c: any; domain: string | null; tld: string | null }>(getQuery, { id });

        if (existing.length === 0) {
            return res.status(404).json({ error: "Content not found" });
        }

        const current = existing[0].c;
        const currentEmail = encryptor.decrypt(current.email);

        // Prepare update values
        const updates: string[] = [];
        const params: any = { id };

        if (body.email !== undefined) {
            const encryptedEmail = encryptor.encrypt(body.email);
            const emailHash = crypto.createHash("sha256")
                .update(body.email + (process.env.SALT || ""))
                .digest("hex");
            updates.push("c.email = $encryptedEmail");
            updates.push("c.email_hash = $emailHash");
            params.encryptedEmail = encryptedEmail;
            params.emailHash = emailHash;
        }

        if (body.password !== undefined) {
            const encryptedPassword = body.password ? encryptor.encrypt(body.password) : null;
            updates.push("c.password = $encryptedPassword");
            params.encryptedPassword = encryptedPassword;
        }

        if (body.line !== undefined) {
            const encryptedLine = encryptor.encrypt(body.line);
            updates.push("c.line = $encryptedLine");
            params.encryptedLine = encryptedLine;
        }

        if (body.mainDataId !== undefined) {
            updates.push("c.mainDataId = $mainDataId");
            params.mainDataId = body.mainDataId;
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const updateQuery = `
            MATCH (c:ContentLine {mainDataId: $id})
            SET ${updates.join(", ")}
            WITH c
            OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
            OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
            RETURN c, d.name as domain, t.name as tld
        `;

        const results = await neo4jClient.run<{ c: any; domain: string | null; tld: string | null }>(updateQuery, params);

        if (results.length === 0) {
            return res.status(500).json({ error: "Failed to update content" });
        }

        const result = results[0];
        const content = result.c;

        const response: ContentResponse = {
            id: content.mainDataId,
            email: body.email !== undefined ? body.email : currentEmail,
            password: body.password !== undefined ? body.password : (content.password ? encryptor.decrypt(content.password) : null),
            line: body.line !== undefined ? body.line : encryptor.decrypt(content.line),
            mainDataId: content.mainDataId,
            domain: result.domain || undefined,
            tld: result.tld || undefined
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("Update content error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
