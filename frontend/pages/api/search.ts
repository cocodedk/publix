import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../lib/neo4jClient";
import { Encryptor } from "../../lib/encryptor";
import { SearchResponse, SearchResult, ApiError } from "../../lib/types";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

export default async function handler(req: NextApiRequest, res: NextApiResponse<SearchResponse | ApiError>) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const q = (req.query.q as string)?.trim() || "";
        if (!q) {
            return res.status(400).json({
                error: "Missing query parameter",
                message: "Query parameter 'q' is required"
            });
        }

        // Pagination parameters
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const perPage = Math.min(Math.max(1, parseInt(req.query.perPage as string) || 20), 100); // Max 100 per page
        const skip = (page - 1) * perPage;

        let allResults: any[] = [];

        // Strategy 1: Try TLD → Domain → ContentLine
        try {
            const tldQuery = `
                MATCH (t:TLD {name: $q})-[:HAS_DOMAIN]->(d:Domain)-[:HAS_CONTENT]->(c:ContentLine)
                RETURN c
            `;
            const tldResult = await neo4jClient.run<{ c: any }>(tldQuery, { q });
            if (tldResult.length > 0) {
                allResults = tldResult.map(r => r.c);
            }
        } catch (error) {
            console.error("TLD search error:", error);
        }

        // Strategy 2: If no TLD match, try email hash directly
        if (allResults.length === 0) {
            try {
                const emailHash = crypto.createHash("sha256")
                    .update(q + (process.env.SALT || ""))
                    .digest("hex");
                const emailQuery = `
                    MATCH (c:ContentLine {email_hash: $hash})
                    RETURN c
                `;
                const emailResult = await neo4jClient.run<{ c: any }>(emailQuery, { hash: emailHash });
                if (emailResult.length > 0) {
                    allResults = emailResult.map(r => r.c);
                }
            } catch (error) {
                console.error("Email hash search error:", error);
            }
        }

        // Strategy 3: Try partial domain match
        if (allResults.length === 0) {
            try {
                const domainQuery = `
                    MATCH (d:Domain)
                    WHERE d.name CONTAINS $q
                    MATCH (d)-[:HAS_CONTENT]->(c:ContentLine)
                    RETURN DISTINCT c
                    LIMIT 100
                `;
                const domainResult = await neo4jClient.run<{ c: any }>(domainQuery, { q });
                if (domainResult.length > 0) {
                    allResults = domainResult.map(r => r.c);
                }
            } catch (error) {
                console.error("Domain search error:", error);
            }
        }

        // Decrypt and format results
        const decrypted: SearchResult[] = allResults.map(r => {
            try {
                return {
                    email: encryptor.decrypt(r.email),
                    password: r.password ? encryptor.decrypt(r.password) : null,
                    line: encryptor.decrypt(r.line),
                    mainDataId: r.mainDataId
                };
            } catch (error) {
                console.error("Decryption error:", error);
                return null;
            }
        }).filter((r): r is SearchResult => r !== null);

        // Apply pagination
        const total = decrypted.length;
        const paginatedResults = decrypted.slice(skip, skip + perPage);

        const response: SearchResponse = {
            results: paginatedResults,
            total,
            page,
            perPage
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("Search error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
