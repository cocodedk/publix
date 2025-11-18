import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { ApiError } from "../../../lib/types";

interface DashboardStats {
    totalEntries: number;
    totalDomains: number;
    totalTLDs: number;
    bySource: { source: string; count: number }[];
    byTLD: { tld: string; count: number }[];
    recentActivity: number;
    averageQualityScore: number;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<DashboardStats | ApiError>
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Get total entries count
        const totalQuery = `
            MATCH (c:ContentLine)
            RETURN count(c) as total
        `;
        const totalResult = await neo4jClient.run<{ total: number }>(totalQuery);
        const totalEntries = totalResult[0]?.total || 0;

        // Get total domains count
        const domainsQuery = `
            MATCH (d:Domain)
            RETURN count(d) as total
        `;
        const domainsResult = await neo4jClient.run<{ total: number }>(domainsQuery);
        const totalDomains = domainsResult[0]?.total || 0;

        // Get total TLDs count
        const tldsQuery = `
            MATCH (t:TLD)
            RETURN count(t) as total
        `;
        const tldsResult = await neo4jClient.run<{ total: number }>(tldsQuery);
        const totalTLDs = tldsResult[0]?.total || 0;

        // Get entries by source
        const sourceQuery = `
            MATCH (c:ContentLine)
            WHERE c.source IS NOT NULL
            RETURN c.source as source, count(c) as count
            ORDER BY count DESC
        `;
        const sourceResults = await neo4jClient.run<{ source: string; count: number }>(sourceQuery);
        const bySource = sourceResults.map(r => ({
            source: r.source || "unknown",
            count: r.count
        }));

        // Get entries by TLD (top 10)
        const tldCountQuery = `
            MATCH (t:TLD)-[:HAS_DOMAIN]->(d:Domain)-[:HAS_CONTENT]->(c:ContentLine)
            RETURN t.name as tld, count(c) as count
            ORDER BY count DESC
            LIMIT 10
        `;
        const tldCountResults = await neo4jClient.run<{ tld: string; count: number }>(tldCountQuery);
        const byTLD = tldCountResults.map(r => ({
            tld: r.tld,
            count: r.count
        }));

        // Get recent activity (entries created in last 7 days)
        const recentQuery = `
            MATCH (c:ContentLine)
            WHERE c.createdAt >= datetime() - duration({days: 7})
            RETURN count(c) as count
        `;
        const recentResult = await neo4jClient.run<{ count: number }>(recentQuery);
        const recentActivity = recentResult[0]?.count || 0;

        // Get average quality score
        const qualityQuery = `
            MATCH (c:ContentLine)
            WHERE c.qualityScore IS NOT NULL
            RETURN avg(c.qualityScore) as avgScore
        `;
        const qualityResult = await neo4jClient.run<{ avgScore: number }>(qualityQuery);
        const averageQualityScore = qualityResult[0]?.avgScore
            ? Math.round(qualityResult[0].avgScore * 100) / 100
            : 0;

        const stats: DashboardStats = {
            totalEntries,
            totalDomains,
            totalTLDs,
            bySource,
            byTLD,
            recentActivity,
            averageQualityScore
        };

        return res.status(200).json(stats);
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
