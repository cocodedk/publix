import { NextApiRequest, NextApiResponse } from "next";
import { Encryptor } from "../../lib/encryptor";
import { SearchResponse, SearchResult, ApiError, SearchFilters } from "../../lib/types";
import { validateEnv } from "../../lib/env";
import { requireAuth } from "../../lib/auth";
import {
    buildWhereClause,
    searchByTLD,
    searchByEmailHash,
    searchByDomain,
    searchByFilter,
} from "../../lib/queries/search";
import { logger } from "../../lib/logger";

const env = validateEnv();
const encryptor = new Encryptor(env.ENCRYPTION_KEY + env.SALT);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SearchResponse | ApiError>
) {
    const user = await requireAuth(req, res, ["admin"]);
    if (!user) return;

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const q = (req.query.q as string)?.trim() || "";

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const perPage = Math.min(Math.max(1, parseInt(req.query.perPage as string) || 20), 100);
        const skip = (page - 1) * perPage;

        const filters: SearchFilters = {
            dateFrom: req.query.dateFrom as string,
            dateTo: req.query.dateTo as string,
            domain: req.query.domain as string,
            tld: req.query.tld as string,
            emailDomain: req.query.emailDomain as string,
            hasPassword:
                req.query.hasPassword === "true"
                    ? true
                    : req.query.hasPassword === "false"
                    ? false
                    : undefined,
            source: req.query.source as "intelx" | "manual" | "import" | undefined,
            verified:
                req.query.verified === "true"
                    ? true
                    : req.query.verified === "false"
                    ? false
                    : undefined,
        };

        const { whereClause, params } = buildWhereClause(filters);

        let allResults: unknown[] = [];

        if (q) {
            try {
                allResults = await searchByTLD(q, whereClause, params);
            } catch (err) {
                logger.error({ err }, "TLD search error");
            }

            if (allResults.length === 0) {
                try {
                    allResults = await searchByEmailHash(q, env.SALT, whereClause, params);
                } catch (err) {
                    logger.error({ err }, "Email hash search error");
                }
            }

            if (allResults.length === 0) {
                try {
                    allResults = await searchByDomain(q, whereClause, params);
                } catch (err) {
                    logger.error({ err }, "Domain search error");
                }
            }
        } else {
            try {
                allResults = await searchByFilter(whereClause, params);
            } catch (err) {
                logger.error({ err }, "Filter search error");
            }
        }

        let decrypted: SearchResult[] = (allResults as Record<string, string>[])
            .map((r) => {
                try {
                    return {
                        email: encryptor.decrypt(r.email),
                        password: r.password ? encryptor.decrypt(r.password) : null,
                        line: encryptor.decrypt(r.line),
                        mainDataId: r.mainDataId,
                    };
                } catch (err) {
                    logger.error({ err }, "Decryption error");
                    return null;
                }
            })
            .filter((r): r is SearchResult => r !== null);

        if (filters.emailDomain && decrypted.length > 0) {
            decrypted = decrypted.filter(
                (r) => r.email.split("@")[1] === filters.emailDomain
            );
        }

        const sortBy = (req.query.sortBy as string) || "date";
        const sortOrder = (req.query.sortOrder as string) || "desc";

        if (sortBy === "email") {
            decrypted.sort((a, b) =>
                sortOrder === "asc"
                    ? a.email.localeCompare(b.email)
                    : b.email.localeCompare(a.email)
            );
        } else if (sortBy === "domain") {
            decrypted.sort((a, b) => {
                const da = a.email.split("@")[1] || "";
                const db = b.email.split("@")[1] || "";
                return sortOrder === "asc" ? da.localeCompare(db) : db.localeCompare(da);
            });
        }

        const total = decrypted.length;
        const paginatedResults = decrypted.slice(skip, skip + perPage);

        return res.status(200).json({ results: paginatedResults, total, page, perPage });
    } catch (error) {
        logger.error({ error }, "Search error");
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error),
        });
    }
}
