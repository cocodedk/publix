import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

class Neo4jClient {
    private driver: ReturnType<typeof neo4j.driver> | null = null;
    private readonly uri: string;
    private readonly user: string;
    private readonly password: string;

    constructor() {
        this.uri = process.env.NEO4J_URI || "bolt://localhost:7687";
        this.user = process.env.NEO4J_USER || "neo4j";
        this.password = process.env.NEO4J_PASSWORD || "test";
    }

    private getDriver(): ReturnType<typeof neo4j.driver> {
        if (!this.driver) {
            this.driver = neo4j.driver(
                this.uri,
                neo4j.auth.basic(this.user, this.password),
                {
                    maxConnectionLifetime: 3 * 60 * 60 * 1000,
                    maxConnectionPoolSize: 50,
                    connectionAcquisitionTimeout: 2 * 60 * 1000,
                }
            );
        }
        return this.driver;
    }

    async verifyConnectivity(): Promise<boolean> {
        try {
            const driver = this.getDriver();
            await driver.verifyConnectivity();
            return true;
        } catch (error) {
            console.error("Neo4j connectivity error:", error);
            return false;
        }
    }

    async run<T = any>(query: string, params: { [key: string]: unknown } = {}): Promise<T[]> {
        const driver = this.getDriver();
        const session = driver.session();
        try {
            const result = await session.run(query, params);
            return result.records.map((record: { toObject: () => { [key: string]: unknown } }) => {
                const obj = record.toObject();
                const converted: { [key: string]: unknown } = {};
                for (const key in obj) {
                    const value = obj[key];
                    if (neo4j.isInt(value)) {
                        converted[key] = (value as { toNumber: () => number }).toNumber();
                    } else if (value && typeof value === "object" && !Array.isArray(value) && !Buffer.isBuffer(value as Buffer)) {
                        converted[key] = this.convertNeo4jTypes(value);
                    } else {
                        converted[key] = value;
                    }
                }
                return converted as T;
            });
        } catch (error) {
            console.error("Neo4j query error:", error);
            throw new Error(`Database query failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            await session.close();
        }
    }

    private convertNeo4jTypes(obj: unknown): unknown {
        if (neo4j.isInt(obj)) {
            return (obj as { toNumber: () => number }).toNumber();
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertNeo4jTypes(item));
        }
        if (obj && typeof obj === "object" && !Buffer.isBuffer(obj as Buffer)) {
            const converted: { [key: string]: unknown } = {};
            for (const key in obj as object) {
                converted[key] = this.convertNeo4jTypes((obj as { [key: string]: unknown })[key]);
            }
            return converted;
        }
        return obj;
    }

    async runTransaction<T>(
        callback: (tx: { run: (query: string, params?: object) => Promise<unknown> }) => Promise<unknown>
    ): Promise<T[]> {
        const driver = this.getDriver();
        const session = driver.session();
        try {
            const result = await session.executeWrite(callback as Parameters<typeof session.executeWrite>[0]);
            if (result && typeof result === 'object' && 'records' in result) {
                const queryResult = result as { records: Array<{ toObject: () => unknown }> };
                return queryResult.records.map(record => {
                    const obj = record.toObject();
                    return this.convertNeo4jTypes(obj) as T;
                });
            }
            return [];
        } catch (error) {
            console.error("Neo4j transaction error:", error);
            throw new Error(`Database transaction failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            await session.close();
        }
    }

    async close(): Promise<void> {
        if (this.driver) {
            await this.driver.close();
            this.driver = null;
        }
    }
}

export const neo4jClient = new Neo4jClient();
