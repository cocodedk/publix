// Neo4j Schema Initialization Script
// This script creates the database schema with constraints and indexes

// Create unique constraints
CREATE CONSTRAINT tld_name_unique IF NOT EXISTS FOR (t:TLD) REQUIRE t.name IS UNIQUE;
CREATE CONSTRAINT domain_name_unique IF NOT EXISTS FOR (d:Domain) REQUIRE d.name IS UNIQUE;

// Create indexes for better query performance
CREATE INDEX contentline_email_hash_index IF NOT EXISTS FOR (c:ContentLine) ON (c.email_hash);
CREATE INDEX contentline_main_data_id_index IF NOT EXISTS FOR (c:ContentLine) ON (c.mainDataId);
CREATE INDEX contentline_created_at_index IF NOT EXISTS FOR (c:ContentLine) ON (c.createdAt);
CREATE INDEX contentline_source_index IF NOT EXISTS FOR (c:ContentLine) ON (c.source);

// User schema (for authentication)
CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE;
CREATE INDEX user_email_index IF NOT EXISTS FOR (u:User) ON (u.email);

// Note: Relationships are created implicitly when nodes are connected
// HAS_DOMAIN: (TLD)-[:HAS_DOMAIN]->(Domain)
// HAS_CONTENT: (Domain)-[:HAS_CONTENT]->(ContentLine)

// ContentLine nodes should have the following properties:
// - email (encrypted)
// - password (encrypted, nullable)
// - line (encrypted)
// - email_hash (string)
// - mainDataId (string)
// - createdAt (datetime)
// - updatedAt (datetime, nullable)
// - lastSyncedAt (datetime, nullable)
// - source (string: "intelx", "manual", "import")
// - qualityScore (float, nullable)
// - verified (boolean, default: false)
