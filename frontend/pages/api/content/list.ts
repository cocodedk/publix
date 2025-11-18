import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { Encryptor } from "../../../lib/encryptor";
import { ListContentResponse, ApiError } from "../../../lib/types";
import dotenv from "dotenv";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListContentResponse | ApiError>) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const page = parseInt(req.query.page as string) || 1;
        const perPage = Math.min(parseInt(req.query.perPage as string) || 20, 100); // Max 100 per page
        const skip = (page - 1) * perPage;

        // Get total count
        const countQuery = `MATCH (c:ContentLine) RETURN count(c) as total`;
        const countResult = await neo4jClient.run<{ total: number }>(countQuery);
        const total = countResult[0]?.total || 0;

        // Get paginated results
        const listQuery = `
            MATCH (c:ContentLine)
            OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
            OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
            RETURN c, d.name as domain, t.name as tld
            ORDER BY c.mainDataId
            SKIP $skip
            LIMIT $limit
        `;

        const results = await neo4jClient.run<{ c: any; domain: string | null; tld: string | null }>(listQuery, {
            skip,
            limit: perPage
        });

        const items = results.map(result => {
            const content = result.c;
            return {
                id: content.mainDataId,
                email: encryptor.decrypt(content.email),
                password: content.password ? encryptor.decrypt(content.password) : null,
                line: encryptor.decrypt(content.line),
                mainDataId: content.mainDataId,
                domain: result.domain || undefined,
                tld: result.tld || undefined
            };
        });

        const response: ListContentResponse = {
            items,
            total,
            page,
            perPage
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("List content error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
