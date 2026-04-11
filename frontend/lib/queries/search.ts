import { neo4jClient } from "../neo4jClient";
import { SearchFilters } from "../types";
import crypto from "crypto";

export function buildWhereClause(
    filters: SearchFilters
): { whereClause: string; params: Record<string, unknown> } {
    const whereConditions: string[] = [];
    const params: Record<string, unknown> = {};

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

    const whereClause =
        whereConditions.length > 0
            ? "WHERE " + whereConditions.join(" AND ")
            : "";

    return { whereClause, params };
}

export async function searchByTLD(
    q: string,
    whereClause: string,
    params: Record<string, unknown>
): Promise<unknown[]> {
    const query = `
        MATCH (t:TLD {name: $q})-[:HAS_DOMAIN]->(d:Domain)-[:HAS_CONTENT]->(c:ContentLine)
        ${whereClause}
        RETURN c, d.name as domain, t.name as tld
    `;
    const result = await neo4jClient.run<{ c: unknown; domain: string; tld: string }>(
        query,
        { q, ...params }
    );
    return result.map(r => r.c);
}

export async function searchByEmailHash(
    q: string,
    salt: string,
    whereClause: string,
    params: Record<string, unknown>
): Promise<unknown[]> {
    const emailHash = crypto.createHash("sha256")
        .update(q + salt)
        .digest("hex");
    const query = `
        MATCH (c:ContentLine {email_hash: $hash})
        OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
        OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
        ${whereClause}
        RETURN c
    `;
    const result = await neo4jClient.run<{ c: unknown }>(
        query,
        { hash: emailHash, ...params }
    );
    return result.map(r => r.c);
}

export async function searchByDomain(
    q: string,
    whereClause: string,
    params: Record<string, unknown>
): Promise<unknown[]> {
    const query = `
        MATCH (d:Domain)
        WHERE d.name CONTAINS $q
        MATCH (d)-[:HAS_CONTENT]->(c:ContentLine)
        OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
        ${whereClause}
        RETURN DISTINCT c
        LIMIT 100
    `;
    const result = await neo4jClient.run<{ c: unknown }>(
        query,
        { q, ...params }
    );
    return result.map(r => r.c);
}

export async function searchByFilter(
    whereClause: string,
    params: Record<string, unknown>
): Promise<unknown[]> {
    const query = `
        MATCH (c:ContentLine)
        OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
        OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
        ${whereClause}
        RETURN c
        ORDER BY c.createdAt DESC
        LIMIT 1000
    `;
    const result = await neo4jClient.run<{ c: unknown }>(query, params);
    return result.map(r => r.c);
}
