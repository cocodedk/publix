import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../lib/neo4jClient";
import { ApiError } from "../../lib/types";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ message: string; backupId: string } | ApiError>
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Export all data as backup
        const query = `
            MATCH (c:ContentLine)
            OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
            OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
            RETURN c, d.name as domain, t.name as tld
        `;

        const results = await neo4jClient.run(query);

        const backupId = `backup-${Date.now()}`;
        const backupData = {
            backupId,
            timestamp: new Date().toISOString(),
            count: results.length,
            data: results
        };

        // In production, save to file system or cloud storage
        // For now, return the backup data
        return res.status(200).json({
            message: "Backup created successfully",
            backupId,
            data: backupData // In production, return URL to backup file
        });
    } catch (error) {
        console.error("Backup error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
