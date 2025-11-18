import neo4j, { Driver, Session, Result, Record } from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

class Neo4jClient {
    private driver: Driver | null = null;
    private readonly uri: string;
    private readonly user: string;
    private readonly password: string;

    constructor() {
        this.uri = process.env.NEO4J_URI || "bolt://localhost:7687";
        this.user = process.env.NEO4J_USER || "neo4j";
        this.password = process.env.NEO4J_PASSWORD || "test";
    }

    private getDriver(): Driver {
        if (!this.driver) {
            this.driver = neo4j.driver(
                this.uri,
                neo4j.auth.basic(this.user, this.password),
                {
                    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
                    maxConnectionPoolSize: 50,
                    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
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

    async run<T>(query: string, params: Record<string, any> = {}): Promise<T[]> {
        const driver = this.getDriver();
        const session: Session = driver.session();
        try {
            const result: Result = await session.run(query, params);
            return result.records.map((record: Record) => {
                const obj = record.toObject();
                // Convert Neo4j Integer types to JavaScript numbers
                const converted: any = {};
                for (const key in obj) {
                    const value = obj[key];
                    if (neo4j.isInt(value)) {
                        converted[key] = value.toNumber();
                    } else if (value && typeof value === "object" && !Array.isArray(value) && !Buffer.isBuffer(value)) {
                        // Recursively convert nested objects
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

    private convertNeo4jTypes(obj: any): any {
        if (neo4j.isInt(obj)) {
            return obj.toNumber();
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertNeo4jTypes(item));
        }
        if (obj && typeof obj === "object" && !Buffer.isBuffer(obj)) {
            const converted: any = {};
            for (const key in obj) {
                converted[key] = this.convertNeo4jTypes(obj[key]);
            }
            return converted;
        }
        return obj;
    }

    async runTransaction<T>(
        callback: (tx: neo4j.Transaction) => Promise<Result>
    ): Promise<T[]> {
        const driver = this.getDriver();
        const session: Session = driver.session();
        try {
            const result: Result = await session.executeWrite(callback);
            return result.records.map((record: Record) => {
                const obj = record.toObject();
                return this.convertNeo4jTypes(obj) as T;
            });
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
