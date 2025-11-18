# publix

**Modern credential search platform** built with **Next.js (TypeScript)** and **Neo4j**. The application provides a fast, searchable UI for encrypted email/password data with full CRUD operations.

## Overview

- **Front-end**: Next.js with React, Material-UI, and TypeScript
- **Back-end API**: Next.js API routes using the Neo4j driver
- **Database**: Neo4j (graph database) running in Docker
- **Encryption**: Node.js `crypto` module (AES-256-GCM) for secure storage
- **Features**: Search, Create, Read, Update, Delete operations with pagination and error handling

## Prerequisites

- **Node.js** (v18 or later) and **npm**
- **Docker** and **Docker Compose**
- A copy of the repository (SSH or HTTPS)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/babakbandpey/publix.git
   cd publix
   ```

2. **Create a `.env` file** at the project root:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your configuration:
   ```dotenv
   # Neo4j connection
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_neo4j_password

   # Encryption settings (same values used by the original Django app)
   ENCRYPTION_KEY=your_32_byte_key_base64
   SALT=your_salt_base64
   ```

3. **Start Neo4j with Docker Compose**
   ```bash
   docker-compose up -d neo4j
   ```
   This will pull the official Neo4j image and run it on port `7687` (Bolt) and `7474` (HTTP).

4. **Initialize the database schema**
   ```bash
   # Wait for Neo4j to be ready (about 30 seconds), then:
   docker exec -i <neo4j-container-name> cypher-shell -u neo4j -p <password> < frontend/scripts/init-neo4j.cypher

   # Or use the helper script (requires cypher-shell installed locally):
   ./scripts/init-db.sh
   ```

5. **Install frontend dependencies**
   ```bash
   cd frontend
   npm ci
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## Database Setup

### Schema

The database uses the following structure:

- **TLD** nodes: Top-level domains (e.g., "com", "org", "net")
- **Domain** nodes: Domain names (e.g., "example.com")
- **ContentLine** nodes: Encrypted credential data
- **Relationships**:
  - `(TLD)-[:HAS_DOMAIN]->(Domain)`
  - `(Domain)-[:HAS_CONTENT]->(ContentLine)`

### Constraints and Indexes

- Unique constraint on `TLD.name`
- Unique constraint on `Domain.name`
- Index on `ContentLine.email_hash`
- Index on `ContentLine.mainDataId`

### Initialization Scripts

- `frontend/scripts/init-neo4j.cypher`: Creates schema, constraints, and indexes
- `frontend/scripts/seed-neo4j.cypher`: Sample data (optional)
- `scripts/init-db.sh`: Helper script to run initialization

## API Documentation

### Search Endpoint

**GET** `/api/search`

Search for credentials by TLD, domain, or email hash.

**Query Parameters:**
- `q` (required): Search query (TLD, domain, or email)
- `page` (optional): Page number (default: 1)
- `perPage` (optional): Results per page (default: 20, max: 100)

**Response:**
```json
{
  "results": [
    {
      "email": "user@example.com",
      "password": "password123",
      "line": "full line content",
      "mainDataId": "content-123"
    }
  ],
  "total": 50,
  "page": 1,
  "perPage": 20
}
```

### Content CRUD Endpoints

#### Create Content

**POST** `/api/content/create`

Create a new content entry.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "line": "full line content",
  "domain": "example",
  "tld": "com",
  "mainDataId": "optional-id"
}
```

#### Read Content

**GET** `/api/content/read?id=<mainDataId>`

Get a content entry by ID.

#### Update Content

**PUT** `/api/content/update?id=<mainDataId>`

Update a content entry (partial updates supported).

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "password": "newpassword",
  "line": "updated line",
  "mainDataId": "new-id"
}
```

#### Delete Content

**DELETE** `/api/content/delete?id=<mainDataId>`

Delete a content entry.

#### List Content

**GET** `/api/content/list?page=1&perPage=20`

List all content entries with pagination.

### Import Endpoint

**POST** `/api/import`

Bulk import content entries.

**Request Body:**
```json
{
  "items": [
    {
      "email": "user1@example.com",
      "password": "pass1",
      "line": "line1",
      "domain": "example",
      "tld": "com"
    },
    {
      "email": "user2@example.com",
      "password": "pass2",
      "line": "line2",
      "domain": "example",
      "tld": "com"
    }
  ]
}
```

**Response:**
```json
{
  "success": 2,
  "failed": 0,
  "errors": []
}
```

## Frontend Pages

- **`/`**: Search page with results table and pagination
- **`/create`**: Form to create new entries
- **`/edit/[id]`**: Edit or delete existing entries

## Development Workflow

- Edit pages under `frontend/pages/` or components under `frontend/components/`
- API routes are located in `frontend/pages/api/`
- After making changes, the Next.js dev server hot-reloads automatically
- To stop the services:
  ```bash
  docker-compose down   # stops Neo4j
  ```

## Building for Production

When you are ready to deploy, build the optimized bundle:

```bash
cd frontend
npm run build
npm start   # runs the production server
```

Or use Docker Compose:

```bash
docker-compose up --build
```

## Environment Variables

See `.env.example` for all required environment variables:

- `NEO4J_URI`: Neo4j connection URI (default: `bolt://localhost:7687`)
- `NEO4J_USER`: Neo4j username (default: `neo4j`)
- `NEO4J_PASSWORD`: Neo4j password
- `ENCRYPTION_KEY`: 32-byte encryption key (base64 encoded)
- `SALT`: Salt value for hashing (base64 encoded)

## License

This project is licensed under the MIT License.
