// IntelX API Client
// Documentation: https://github.com/IntelligenceX/SDK

import axios, { AxiosError } from "axios";
import dotenv from "dotenv";

dotenv.config();

interface IntelXSearchRequest {
    term: string;
    maxresults?: number;
    media?: number;
    target?: number;
    terminate?: string[];
}

interface IntelXSearchResponse {
    status: number;
    id: string;
    selectors?: any[];
}

interface IntelXResultResponse {
    status: number;
    selectors: IntelXSelector[];
    total: number;
}

interface IntelXSelector {
    selectorvalue: string;
    selectortype: string;
    selectordescription?: string;
}

class IntelXClient {
    private apiKey: string;
    private apiUrl: string;
    private rateLimitDelay: number = 1000; // 1 second between requests
    private lastRequestTime: number = 0;

    constructor() {
        this.apiKey = process.env.INTELX_API_KEY || "";
        this.apiUrl = process.env.INTELX_API_URL || "https://2.intelx.io";

        if (!this.apiKey) {
            console.warn("IntelX API key not configured. Set INTELX_API_KEY in .env");
        }
    }

    private async rateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.rateLimitDelay) {
            await new Promise(resolve =>
                setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
            );
        }

        this.lastRequestTime = Date.now();
    }

    private async request<T>(
        method: "GET" | "POST",
        endpoint: string,
        data?: any,
        retries: number = 3
    ): Promise<T> {
        if (!this.apiKey) {
            throw new Error("IntelX API key not configured");
        }

        await this.rateLimit();

        const url = `${this.apiUrl}${endpoint}`;
        const headers = {
            "X-Key": this.apiKey,
            "Content-Type": "application/json",
            "User-Agent": "Publix/1.0"
        };

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await axios({
                    method,
                    url,
                    headers,
                    data,
                    timeout: 30000
                });

                if (response.data.status === 0) {
                    return response.data as T;
                } else {
                    throw new Error(`IntelX API error: ${response.data.status}`);
                }
            } catch (error) {
                const axiosError = error as AxiosError;

                if (axiosError.response?.status === 429) {
                    // Rate limited - wait longer
                    const waitTime = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }

                if (attempt === retries - 1) {
                    throw new Error(
                        `IntelX API request failed: ${axiosError.message}`
                    );
                }

                // Exponential backoff
                await new Promise(resolve =>
                    setTimeout(resolve, Math.pow(2, attempt) * 1000)
                );
            }
        }

        throw new Error("IntelX API request failed after retries");
    }

    async search(
        term: string,
        maxResults: number = 100,
        media: number = 0,
        target: number = 0
    ): Promise<IntelXSearchResponse> {
        const request: IntelXSearchRequest = {
            term,
            maxresults: maxResults,
            media,
            target
        };

        return this.request<IntelXSearchResponse>(
            "POST",
            "/phonebook/search",
            request
        );
    }

    async getResults(
        searchId: string,
        maxResults: number = 100
    ): Promise<IntelXResultResponse> {
        return this.request<IntelXResultResponse>(
            "GET",
            `/phonebook/search/result?id=${searchId}&limit=${maxResults}`
        );
    }

    async searchEmail(email: string): Promise<IntelXSelector[]> {
        try {
            const searchResponse = await this.search(email, 1000, 0, 0);

            if (!searchResponse.id) {
                return [];
            }

            // Wait a bit for results to be ready
            await new Promise(resolve => setTimeout(resolve, 2000));

            const resultsResponse = await this.getResults(searchResponse.id, 1000);

            return resultsResponse.selectors || [];
        } catch (error) {
            console.error("IntelX email search error:", error);
            throw error;
        }
    }

    async searchDomain(domain: string): Promise<IntelXSelector[]> {
        try {
            const searchResponse = await this.search(domain, 1000, 0, 0);

            if (!searchResponse.id) {
                return [];
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

            const resultsResponse = await this.getResults(searchResponse.id, 1000);

            return resultsResponse.selectors || [];
        } catch (error) {
            console.error("IntelX domain search error:", error);
            throw error;
        }
    }

    async verifyApiKey(): Promise<boolean> {
        try {
            await this.request("GET", "/phonebook/search");
            return true;
        } catch (error) {
            return false;
        }
    }
}

export const intelxClient = new IntelXClient();
export type { IntelXSelector, IntelXSearchResponse, IntelXResultResponse };
