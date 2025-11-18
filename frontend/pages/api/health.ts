import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../lib/neo4jClient";
import { intelxClient } from "../../lib/intelxClient";

interface HealthResponse {
    status: "healthy" | "degraded" | "unhealthy";
    services: {
        database: {
            status: "up" | "down";
            responseTime?: number;
        };
        intelx: {
            status: "up" | "down";
            configured: boolean;
        };
    };
    timestamp: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<HealthResponse>
) {
    const startTime = Date.now();
    const health: HealthResponse = {
        status: "healthy",
        services: {
            database: { status: "down" },
            intelx: { status: "down", configured: false }
        },
        timestamp: new Date().toISOString()
    };

    // Check Neo4j
    try {
        const dbStart = Date.now();
        await neo4jClient.verifyConnectivity();
        health.services.database.status = "up";
        health.services.database.responseTime = Date.now() - dbStart;
    } catch (error) {
        health.services.database.status = "down";
        health.status = "unhealthy";
    }

    // Check IntelX
    try {
        const intelxKey = process.env.INTELX_API_KEY;
        health.services.intelx.configured = !!intelxKey;

        if (intelxKey) {
            await intelxClient.verifyApiKey();
            health.services.intelx.status = "up";
        } else {
            health.services.intelx.status = "down";
        }
    } catch (error) {
        health.services.intelx.status = "down";
        if (health.status === "healthy") {
            health.status = "degraded";
        }
    }

    const statusCode = health.status === "healthy" ? 200 :
                      health.status === "degraded" ? 200 : 503;

    return res.status(statusCode).json(health);
}
