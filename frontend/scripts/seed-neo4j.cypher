// Neo4j Sample Data Seeding Script
// This script creates sample data for testing

// Create sample TLD nodes
MERGE (tld_com:TLD {name: "com"})
MERGE (tld_org:TLD {name: "org"})
MERGE (tld_net:TLD {name: "net"})
MERGE (tld_edu:TLD {name: "edu"})
MERGE (tld_gov:TLD {name: "gov"});

// Create sample Domain nodes and link to TLDs
MERGE (d1:Domain {name: "example.com"})
MERGE (tld_com)-[:HAS_DOMAIN]->(d1);

MERGE (d2:Domain {name: "test.org"})
MERGE (tld_org)-[:HAS_DOMAIN]->(d2);

MERGE (d3:Domain {name: "sample.net"})
MERGE (tld_net)-[:HAS_DOMAIN]->(d3);

// Note: ContentLine nodes should be created with encrypted data
// The email_hash should be SHA256(email + SALT)
// Example ContentLine structure:
// {
//   email: "<encrypted>",
//   password: "<encrypted>",
//   line: "<encrypted>",
//   email_hash: "<sha256_hash>",
//   mainDataId: "<unique_id>"
// }
//
// To create sample ContentLine nodes, you would need to:
// 1. Encrypt the data using the Encryptor class
// 2. Calculate the email_hash
// 3. Create the node with encrypted values
//
// Example (values would be encrypted in practice):
// MERGE (c1:ContentLine {
//   email: "<encrypted_email>",
//   password: "<encrypted_password>",
//   line: "<encrypted_line>",
//   email_hash: "<sha256_hash>",
//   mainDataId: "sample-001"
// })
// MERGE (d1)-[:HAS_CONTENT]->(c1);
