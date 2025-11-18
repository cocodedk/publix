// Neo4j Schema Initialization Script
// This script creates the database schema with constraints and indexes

// Create unique constraints
CREATE CONSTRAINT tld_name_unique IF NOT EXISTS FOR (t:TLD) REQUIRE t.name IS UNIQUE;
CREATE CONSTRAINT domain_name_unique IF NOT EXISTS FOR (d:Domain) REQUIRE d.name IS UNIQUE;

// Create indexes for better query performance
CREATE INDEX contentline_email_hash_index IF NOT EXISTS FOR (c:ContentLine) ON (c.email_hash);
CREATE INDEX contentline_main_data_id_index IF NOT EXISTS FOR (c:ContentLine) ON (c.mainDataId);

// Note: Relationships are created implicitly when nodes are connected
// HAS_DOMAIN: (TLD)-[:HAS_DOMAIN]->(Domain)
// HAS_CONTENT: (Domain)-[:HAS_CONTENT]->(ContentLine)
