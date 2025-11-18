import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../lib/neo4jClient";
import { Encryptor } from "../../lib/encryptor";
import { SearchResponse, SearchResult, ApiError, SearchFilters } from "../../lib/types";
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

        // Pagination parameters
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const perPage = Math.min(Math.max(1, parseInt(req.query.perPage as string) || 20), 100);
        const skip = (page - 1) * perPage;

        // Advanced filters
        const filters: SearchFilters = {
            dateFrom: req.query.dateFrom as string,
            dateTo: req.query.dateTo as string,
            domain: req.query.domain as string,
            tld: req.query.tld as string,
            emailDomain: req.query.emailDomain as string,
            hasPassword: req.query.hasPassword === "true" ? true : req.query.hasPassword === "false" ? false : undefined,
            source: req.query.source as "intelx" | "manual" | "import" | undefined,
            verified: req.query.verified === "true" ? true : req.query.verified === "false" ? false : undefined
        };

        // Build WHERE clause for filters
        const whereConditions: string[] = [];
        const params: any = {};

        if (filters.dateFrom) {
            whereConditions.push("c.createdAt >= datetime($dateFrom)");
            params.dateFrom = filters.dateFrom;
        }
        if (filters.dateTo) {
            whereConditions.push("c.createdAt <= datetime($dateTo)");
            params.dateTo = filters.dateTo;
        }
        if (filters.domain) {
            whereConditions.push("d.name = $domain");
            params.domain = filters.domain;
        }
        if (filters.tld) {
            whereConditions.push("t.name = $tld");
            params.tld = filters.tld;
        }
        if (filters.hasPassword !== undefined) {
            if (filters.hasPassword) {
                whereConditions.push("c.password IS NOT NULL");
            } else {
                whereConditions.push("c.password IS NULL");
            }
        }
        if (filters.source) {
            whereConditions.push("c.source = $source");
            params.source = filters.source;
        }
        if (filters.verified !== undefined) {
            whereConditions.push("c.verified = $verified");
            params.verified = filters.verified;
        }

        const whereClause = whereConditions.length > 0
            ? "WHERE " + whereConditions.join(" AND ")
            : "";

        let allResults: any[] = [];

        // Build base query with filters
        if (q) {
            // Strategy 1: Try TLD → Domain → ContentLine
            try {
                const tldQuery = `
                    MATCH (t:TLD {name: $q})-[:HAS_DOMAIN]->(d:Domain)-[:HAS_CONTENT]->(c:ContentLine)
                    ${whereClause}
                    RETURN c, d.name as domain, t.name as tld
                `;
                const tldResult = await neo4jClient.run<{ c: any; domain: string; tld: string }>(
                    tldQuery,
                    { q, ...params }
                );
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
                        ${whereClause.replace(/c\./g, "c.").replace(/d\./g, "").replace(/t\./g, "")}
                        RETURN c
                    `;
                    const emailResult = await neo4jClient.run<{ c: any }>(
                        emailQuery,
                        { hash: emailHash, ...params }
                    );
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
                        OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
                        ${whereClause}
                        RETURN DISTINCT c
                        LIMIT 100
                    `;
                    const domainResult = await neo4jClient.run<{ c: any }>(
                        domainQuery,
                        { q, ...params }
                    );
                    if (domainResult.length > 0) {
                        allResults = domainResult.map(r => r.c);
                    }
                } catch (error) {
                    console.error("Domain search error:", error);
                }
            }
        } else {
            // No query term, just apply filters
            try {
                const filterQuery = `
                    MATCH (c:ContentLine)
                    OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
                    OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
                    ${whereClause}
                    RETURN c
                    ORDER BY c.createdAt DESC
                    LIMIT 1000
                `;
                const filterResult = await neo4jClient.run<{ c: any }>(filterQuery, params);
                allResults = filterResult.map(r => r.c);
            } catch (error) {
                console.error("Filter search error:", error);
            }
        }

        // Apply email domain filter if specified
        if (filters.emailDomain && allResults.length > 0) {
            // This requires decrypting, so we'll filter after decryption
        }

        // Decrypt and format results
        let decrypted: SearchResult[] = allResults.map(r => {
            try {
                const email = encryptor.decrypt(r.email);
                return {
                    email,
                    password: r.password ? encryptor.decrypt(r.password) : null,
                    line: encryptor.decrypt(r.line),
                    mainDataId: r.mainDataId
                };
            } catch (error) {
                console.error("Decryption error:", error);
                return null;
            }
        }).filter((r): r is SearchResult => r !== null);

        // Apply email domain filter after decryption
        if (filters.emailDomain && decrypted.length > 0) {
            decrypted = decrypted.filter(r => {
                const emailDomain = r.email.split("@")[1];
                return emailDomain === filters.emailDomain;
            });
        }

        // Apply sorting (default: newest first)
        const sortBy = (req.query.sortBy as string) || "date";
        const sortOrder = (req.query.sortOrder as string) || "desc";

        if (sortBy === "email") {
            decrypted.sort((a, b) => {
                return sortOrder === "asc"
                    ? a.email.localeCompare(b.email)
                    : b.email.localeCompare(a.email);
            });
        } else if (sortBy === "domain") {
            decrypted.sort((a, b) => {
                const domainA = a.email.split("@")[1] || "";
                const domainB = b.email.split("@")[1] || "";
                return sortOrder === "asc"
                    ? domainA.localeCompare(domainB)
                    : domainB.localeCompare(domainA);
            });
        }

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
