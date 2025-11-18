#!/bin/bash
# Database Initialization Script
# This script initializes the Neo4j database with schema and sample data

set -e

NEO4J_URI="${NEO4J_URI:-bolt://localhost:7687}"
NEO4J_USER="${NEO4J_USER:-neo4j}"
NEO4J_PASSWORD="${NEO4J_PASSWORD:-test}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"
CYPHER_SCRIPTS_DIR="$FRONTEND_DIR/scripts"

echo "Initializing Neo4j database at $NEO4J_URI..."

# Check if cypher-shell is available
if ! command -v cypher-shell &> /dev/null; then
    echo "Error: cypher-shell not found. Please install Neo4j or use Docker exec."
    echo "To run via Docker: docker exec -i <neo4j-container> cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD < $CYPHER_SCRIPTS_DIR/init-neo4j.cypher"
    exit 1
fi

# Run schema initialization
echo "Creating schema and constraints..."
cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" < "$CYPHER_SCRIPTS_DIR/init-neo4j.cypher"

# Run seed data (optional - comment out if not needed)
if [ -f "$CYPHER_SCRIPTS_DIR/seed-neo4j.cypher" ]; then
    echo "Seeding sample data..."
    cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" < "$CYPHER_SCRIPTS_DIR/seed-neo4j.cypher"
fi

echo "Database initialization complete!"
