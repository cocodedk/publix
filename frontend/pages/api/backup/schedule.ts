import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { ApiError } from "../../../lib/types";
import fs from "fs";
import path from "path";

// Simple in-memory scheduler (in production, use a proper job queue)
const scheduledBackups = new Map<string, NodeJS.Timeout>();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ message: string; scheduleId: string } | ApiError>
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { schedule, backupPath } = req.body;

        if (!schedule) {
            return res.status(400).json({
                error: "Missing schedule",
                message: "Schedule is required (cron format or interval in minutes)"
            });
        }

        // Parse schedule (simple format: "daily", "weekly", or interval in minutes)
        let intervalMs: number;
        if (schedule === "daily") {
            intervalMs = 24 * 60 * 60 * 1000; // 24 hours
        } else if (schedule === "weekly") {
            intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        } else {
            const minutes = parseInt(schedule);
            if (isNaN(minutes) || minutes < 1) {
                return res.status(400).json({
                    error: "Invalid schedule",
                    message: "Schedule must be 'daily', 'weekly', or a number of minutes"
                });
            }
            intervalMs = minutes * 60 * 1000;
        }

        const scheduleId = `backup-${Date.now()}`;
        const backupDir = backupPath || path.join(process.cwd(), "backups");

        // Ensure backup directory exists
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Create scheduled backup function
        const performBackup = async () => {
            try {
                const query = `
                    MATCH (c:ContentLine)
                    OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
                    OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
                    RETURN c, d.name as domain, t.name as tld
                `;

                const results = await neo4jClient.run(query);

                const backupData = {
                    backupId: scheduleId,
                    timestamp: new Date().toISOString(),
                    count: results.length,
                    data: results
                };

                const filename = `backup-${Date.now()}.json`;
                const filepath = path.join(backupDir, filename);

                fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

                console.log(`Scheduled backup completed: ${filename}`);
            } catch (error) {
                console.error("Scheduled backup error:", error);
            }
        };

        // Schedule the backup
        const interval = setInterval(performBackup, intervalMs);

        // Perform initial backup
        await performBackup();

        scheduledBackups.set(scheduleId, interval);

        return res.status(200).json({
            message: `Backup scheduled (${schedule})`,
            scheduleId
        });
    } catch (error) {
        console.error("Schedule backup error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
