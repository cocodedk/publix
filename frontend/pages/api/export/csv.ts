import { NextApiRequest, NextApiResponse } from "next";
import { neo4jClient } from "../../../lib/neo4jClient";
import { Encryptor } from "../../../lib/encryptor";
import { ApiError } from "../../../lib/types";
import dotenv from "dotenv";

dotenv.config();

const encryptor = new Encryptor((process.env.ENCRYPTION_KEY || "") + (process.env.SALT || ""));

export default async function handler(req: NextApiRequest, res: NextApiResponse<string | ApiError>) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const ids = req.query.ids as string | undefined;
        let query: string;
        let params: any = {};

        if (ids) {
            const idArray = ids.split(",");
            query = `
                MATCH (c:ContentLine)
                WHERE c.mainDataId IN $ids
                OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
                OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
                RETURN c, d.name as domain, t.name as tld
            `;
            params.ids = idArray;
        } else {
            query = `
                MATCH (c:ContentLine)
                OPTIONAL MATCH (d:Domain)-[:HAS_CONTENT]->(c)
                OPTIONAL MATCH (t:TLD)-[:HAS_DOMAIN]->(d)
                RETURN c, d.name as domain, t.name as tld
                LIMIT 10000
            `;
        }

        const results = await neo4jClient.run<{ c: any; domain: string | null; tld: string | null }>(query, params);

        // Generate CSV
        const headers = ["Email", "Password", "Line", "Domain", "TLD", "Main Data ID"];
        const rows = results.map(result => {
            const content = result.c;
            try {
                const email = encryptor.decrypt(content.email);
                const password = content.password ? encryptor.decrypt(content.password) : "";
                const line = encryptor.decrypt(content.line);

                // Escape CSV values
                const escapeCsv = (value: string) => {
                    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                };

                return [
                    escapeCsv(email),
                    escapeCsv(password),
                    escapeCsv(line),
                    escapeCsv(result.domain || ""),
                    escapeCsv(result.tld || ""),
                    escapeCsv(content.mainDataId || "")
                ].join(",");
            } catch (error) {
                console.error("Decryption error:", error);
                return "";
            }
        }).filter(row => row !== "");

        const csv = [headers.join(","), ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="publix-export-${Date.now()}.csv"`);
        return res.status(200).send(csv);
    } catch (error) {
        console.error("CSV export error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
