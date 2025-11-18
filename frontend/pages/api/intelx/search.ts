import { NextApiRequest, NextApiResponse } from "next";
import { intelxClient } from "../../../lib/intelxClient";
import { ApiError } from "../../../lib/types";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any | ApiError>
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { term, type } = req.body;

        if (!term || typeof term !== "string") {
            return res.status(400).json({
                error: "Missing or invalid term parameter"
            });
        }

        let results: any[] = [];
        if (type === "email") {
            results = await intelxClient.searchEmail(term);
        } else if (type === "domain") {
            results = await intelxClient.searchDomain(term);
        } else {
            const searchResponse = await intelxClient.search(term);
            if (searchResponse.id) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const resultsResponse = await intelxClient.getResults(searchResponse.id);
                results = resultsResponse.selectors || [];
            } else {
                results = [];
            }
        }

        return res.status(200).json({
            success: true,
            results,
            count: results.length
        });
    } catch (error) {
        console.error("IntelX search error:", error);
        return res.status(500).json({
            error: "Internal server error",
            message: error instanceof Error ? error.message : String(error)
        });
    }
}
