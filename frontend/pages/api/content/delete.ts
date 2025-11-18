import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { ApiError } from "../../../lib/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ success: boolean } | ApiError>) {
    if (req.method !== "DELETE") {
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
            DETACH DELETE c
            RETURN count(c) as deleted
        `;

        const results = await neo4jClient.run<{ deleted: number }>(query, { id });

        if (results.length === 0 || results[0].deleted === 0) {
            return res.status(404).json({ error: "Content not found" });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Delete content error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
