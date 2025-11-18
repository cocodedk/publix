import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { Encryptor } from "../../../lib/encryptor";
import { ContentResponse, ApiError } from "../../../lib/types";
import dotenv from "dotenv";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

export default async function handler(req: NextApiRequest, res: NextApiResponse<ContentResponse | ApiError>) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { id } = req.query;

        if (!id || typeof id !== "string") {
            return res.status(400).json({
                error: "Missing or invalid id parameter"
            });
        }

        const query = `
            MATCH (c:ContentLine {mainDataId: $id})
            OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
            OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
            RETURN c, d.name as domain, t.name as tld
        `;

        const results = await neo4jClient.run<{ c: any; domain: string | null; tld: string | null }>(query, {
            id
        });

        if (results.length === 0) {
            return res.status(404).json({ error: "Content not found" });
        }

        const result = results[0];
        const content = result.c;

        const response: ContentResponse = {
            id: content.mainDataId,
            email: encryptor.decrypt(content.email),
            password: content.password ? encryptor.decrypt(content.password) : null,
            line: encryptor.decrypt(content.line),
            mainDataId: content.mainDataId,
            domain: result.domain || undefined,
            tld: result.tld || undefined
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("Read content error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
