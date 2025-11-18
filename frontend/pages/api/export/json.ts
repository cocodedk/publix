import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { Encryptor } from "../../../lib/encryptor";
import { ApiError } from "../../../lib/types";
import dotenv from "dotenv";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | ApiError>) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const ids = req.query.ids as string | undefined;
        let query: string;
        let params: any = {};

        if (ids) {
            const idArray = ids.split(",");
            query = `
                MATCH (c:ContentLine)
                WHERE c.mainDataId IN $ids
                OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
                OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
                RETURN c, d.name as domain, t.name as tld
            `;
            params.ids = idArray;
        } else {
            query = `
                MATCH (c:ContentLine)
                OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
                OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
                RETURN c, d.name as domain, t.name as tld
                LIMIT 10000
            `;
        }

        const results = await neo4jClient.run<{ c: any; domain: string | null; tld: string | null }>(query, params);

        const items = results.map(result => {
            const content = result.c;
            try {
                return {
                    email: encryptor.decrypt(content.email),
                    password: content.password ? encryptor.decrypt(content.password) : null,
                    line: encryptor.decrypt(content.line),
                    domain: result.domain || null,
                    tld: result.tld || null,
                    mainDataId: content.mainDataId,
                    createdAt: content.createdAt || null,
                    source: content.source || null
                };
            } catch (error) {
                console.error("Decryption error:", error);
                return null;
            }
        }).filter(item => item !== null);

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="publix-export-${Date.now()}.json"`);
        return res.status(200).json({ items, count: items.length, exportedAt: new Date().toISOString() });
    } catch (error) {
        console.error("JSON export error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
