<!-- 87ccb61c-30f6-4704-a2cb-1ac8d39c9985 7235ef9d-9682-46f4-961b-8bfcd9e56156 -->
# Complete Publix Enhancement Plan with IntelX Integration

## Overview

Transform Publix into a comprehensive credential search and management platform with IntelX integration for automated breach data ingestion, advanced features, and enterprise capabilities.

## Phase 1: IntelX Integration & Data Pipeline

### 1.1 IntelX API Client

- Research and document IntelX API endpoints, authentication, and rate limits
- Create `frontend/lib/intelxClient.ts`:
- API key authentication
- Search endpoint integration (email, domain, TLD searches)
- Result parsing and normalization
- Rate limiting and error handling
- Retry logic for failed requests

### 1.2 Automated Data Ingestion

- Create `frontend/pages/api/intelx/sync.ts`:
- Scheduled/on-demand IntelX searches
- Parse IntelX results into Neo4j structure
- Encrypt data before storage
- Handle duplicates and updates
- Track sync status and metadata

### 1.3 Background Jobs & Scheduling

- Implement job queue system (Bull/BullMQ or similar)
- Create scheduled tasks for:
- Periodic IntelX searches
- Data synchronization
- Cleanup tasks
- Add job monitoring dashboard

## Phase 2: Advanced Search & Filtering

### 2.1 Enhanced Search API

- Extend `frontend/pages/api/search.ts`:
- Date range filtering (add timestamps to ContentLine)
- Domain/TLD dropdown filters
- Email domain filter
- Password presence filter
- Multiple search term support
- Boolean operators (AND, OR, NOT)

### 2.2 Search UI Enhancements

- Update `frontend/pages/index.tsx`:
- Advanced search panel with filters
- Filter chips display
- Search history dropdown
- Saved searches functionality
- Autocomplete/suggestions

### 2.3 Sorting & Export

- Add sorting options (email, domain, date)
- Implement export functionality:
- CSV export endpoint
- JSON export endpoint
- Print-friendly view
- Bulk download

## Phase 3: Data Management Features

### 3.1 Bulk Operations

- Create `frontend/pages/api/content/bulk.ts`:
- Bulk delete with confirmation
- Bulk update operations
- Bulk tagging/assignment
- Batch processing with progress tracking

### 3.2 Data Validation & Quality

- Add validation layer:
- Email format validation
- Duplicate detection (by email hash)
- Data quality scoring
- Validation rules engine
- Create validation dashboard

### 3.3 Import Improvements

- Enhance `frontend/pages/api/import.ts`:
- CSV file upload with parsing
- Excel file support
- Progress tracking for large imports
- Import templates and mapping
- Validation before import

## Phase 4: UI/UX Enhancements

### 4.1 Dashboard & Analytics

- Create `frontend/pages/dashboard.tsx`:
- Total entries count
- Domains/TLDs statistics
- Recent activity feed
- Data distribution charts (using Chart.js or Recharts)
- IntelX sync status
- Search trends

### 4.2 Table Improvements

- Enhance results table:
- Column sorting (clickable headers)
- Column visibility toggle
- Row selection (checkbox)
- Copy to clipboard buttons
- Inline editing
- Row actions menu

### 4.3 Dark Mode

- Implement theme system:
- Theme context/provider
- Dark/light mode toggle
- Persistent theme preference (localStorage)
- Material-UI theme customization

### 4.4 Quick Wins

- Add copy buttons for email/password
- Keyboard shortcuts (Ctrl+K for search, etc.)
- Toast notifications (react-toastify)
- Confirmation dialogs for destructive actions
- Loading progress bars
- Empty state illustrations

## Phase 5: Authentication & Security

### 5.1 User Authentication

- Integrate NextAuth.js:
- Email/password authentication
- OAuth providers (Google, GitHub)
- Session management
- Password reset flow
- Create user schema in Neo4j:
- User nodes with relationships
- Session tracking

### 5.2 Role-Based Access Control

- Implement RBAC:
- Admin, User, Viewer roles
- Permission system
- Protected API routes
- Protected frontend routes
- Create `frontend/lib/auth.ts` utilities

### 5.3 Audit Logging

- Create audit log system:
- Track all CRUD operations
- User activity logging
- Timestamps on all operations
- Audit log viewer page
- Add `AuditLog` node type in Neo4j

## Phase 6: Advanced Features

### 6.1 Graph Visualization

- Integrate graph visualization library (Cytoscape.js or vis.js):
- Visualize TLD → Domain → ContentLine relationships
- Interactive graph explorer page
- Filter and highlight nodes
- Export graph images

### 6.2 Tags & Labels System

- Implement tagging system:
- Tag nodes in Neo4j
- Tag management UI
- Filter by tags
- Tag autocomplete
- Tag statistics

### 6.3 Notes & Comments

- Add notes functionality:
- Notes on ContentLine entries
- Comment system
- Rich text editor
- Note history

### 6.4 API Documentation

- Generate OpenAPI/Swagger docs:
- API endpoint documentation
- Request/response schemas
- Interactive API testing (Swagger UI)
- Create `/api-docs` page

## Phase 7: Monitoring & Health

### 7.1 Health Monitoring

- Create health check endpoints:
- Database connection status
- API health checks
- IntelX API status
- System metrics
- Create health dashboard

### 7.2 Performance Metrics

- Implement monitoring:
- Response time tracking
- Query performance metrics
- Error rate monitoring
- Usage statistics

### 7.3 Backup & Restore

- Create backup system:
- Automated database backups
- Backup API endpoint
- Restore functionality
- Backup scheduling

## Phase 8: Database Schema Enhancements

### 8.1 Add Timestamps

- Update ContentLine schema:
- `createdAt` timestamp
- `updatedAt` timestamp
- `lastSyncedAt` for IntelX data
- Migration script for existing data

### 8.2 Add Metadata

- Extend schema:
- Source tracking (IntelX, manual, import)
- Quality scores
- Verification status
- Additional metadata fields

### 8.3 Indexes & Performance

- Add additional indexes:
- Date range indexes
- Full-text search indexes
- Composite indexes for common queries

## Implementation Files

**New Files to Create:**

- `frontend/lib/intelxClient.ts` - IntelX API client
- `frontend/pages/api/intelx/sync.ts` - IntelX sync endpoint
- `frontend/pages/api/intelx/search.ts` - IntelX search proxy
- `frontend/pages/api/content/bulk.ts` - Bulk operations
- `frontend/pages/api/export/csv.ts` - CSV export
- `frontend/pages/api/export/json.ts` - JSON export
- `frontend/pages/api/auth/[...nextauth].ts` - NextAuth config
- `frontend/pages/api/health.ts` - Health checks
- `frontend/pages/api/backup.ts` - Backup endpoint
- `frontend/pages/dashboard.tsx` - Analytics dashboard
- `frontend/pages/graph.tsx` - Graph visualization
- `frontend/pages/api-docs.tsx` - API documentation
- `frontend/components/` - Reusable components directory
- `frontend/lib/jobs.ts` - Job queue setup
- `frontend/lib/validation.ts` - Data validation utilities

**Modified Files:**

- `frontend/pages/api/search.ts` - Add advanced filtering
- `frontend/pages/index.tsx` - Enhanced search UI
- `frontend/pages/api/import.ts` - CSV upload support
- `frontend/lib/types.ts` - Extended type definitions
- `frontend/scripts/init-neo4j.cypher` - Schema updates
- `docker-compose.yml` - Add Redis for job queue (optional)

## Dependencies to Add

- `next-auth` - Authentication
- `bull` or `bullmq` - Job queue
- `react-toastify` - Toast notifications
- `recharts` or `chart.js` - Charts
- `cytoscape` or `vis-network` - Graph visualization
- `papaparse` - CSV parsing
- `swagger-ui-react` - API docs
- `date-fns` - Date utilities
- `zod` - Schema validation

## Environment Variables

Add to `.env.example`:

- `INTELX_API_KEY` - IntelX API key
- `INTELX_API_URL` - IntelX API base URL
- `NEXTAUTH_URL` - NextAuth callback URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `REDIS_URL` - Redis connection (for jobs)
- `BACKUP_SCHEDULE` - Backup cron schedule