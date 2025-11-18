import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { BulkOperationRequest, ApiError } from "../../../lib/types";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<{ success: number; failed: number; errors: string[] } | ApiError>
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const body: BulkOperationRequest = req.body;

        if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
            return res.status(400).json({
                error: "Invalid request",
                message: "ids must be a non-empty array"
            });
        }

        if (!body.operation || !["delete", "update", "tag"].includes(body.operation)) {
            return res.status(400).json({
                error: "Invalid operation",
                message: "operation must be 'delete', 'update', or 'tag'"
            });
        }

        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        if (body.operation === "delete") {
            for (const id of body.ids) {
                try {
                    const query = `
                        MATCH (c:ContentLine {mainDataId: $id})
                        DETACH DELETE c
                        RETURN count(c) as deleted
                    `;
                    const result = await neo4jClient.run<{ deleted: number }>(query, { id });
                    if (result[0]?.deleted > 0) {
                        success++;
                    } else {
                        failed++;
                        errors.push(`Content with ID ${id} not found`);
                    }
                } catch (error) {
                    failed++;
                    errors.push(`Failed to delete ${id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        } else if (body.operation === "update" && body.data) {
            for (const id of body.ids) {
                try {
                    const updates: string[] = [];
                    const params: any = { id };

                    if (body.data.source) {
                        updates.push("c.source = $source");
                        params.source = body.data.source;
                    }
                    if (body.data.verified !== undefined) {
                        updates.push("c.verified = $verified");
                        params.verified = body.data.verified;
                    }
                    if (body.data.qualityScore !== undefined) {
                        updates.push("c.qualityScore = $qualityScore");
                        params.qualityScore = body.data.qualityScore;
                    }

                    if (updates.length > 0) {
                        updates.push("c.updatedAt = datetime()");
                        const query = `
                            MATCH (c:ContentLine {mainDataId: $id})
                            SET ${updates.join(", ")}
                            RETURN c
                        `;
                        await neo4jClient.run(query, params);
                        success++;
                    } else {
                        failed++;
                        errors.push(`No valid update fields for ${id}`);
                    }
                } catch (error) {
                    failed++;
                    errors.push(`Failed to update ${id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        } else if (body.operation === "tag" && body.data?.tags) {
            // Tag implementation would require a Tag node type
            // For now, we'll store tags as a property
            for (const id of body.ids) {
                try {
                    const query = `
                        MATCH (c:ContentLine {mainDataId: $id})
                        SET c.tags = $tags, c.updatedAt = datetime()
                        RETURN c
                    `;
                    await neo4jClient.run(query, { id, tags: body.data.tags });
                    success++;
                } catch (error) {
                    failed++;
                    errors.push(`Failed to tag ${id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        return res.status(200).json({
            success,
            failed,
            errors: errors.slice(0, 100)
        });
    } catch (error) {
        console.error("Bulk operation error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
