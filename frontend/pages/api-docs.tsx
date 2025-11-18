import {
    Container,
    Paper,
    Typography,
    Box,
    AppBar,
    Toolbar,
    Link,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const apiEndpoints = [
    {
        method: "GET",
        path: "/api/search",
        description: "Search for credentials by TLD, domain, or email",
        params: [
            { name: "q", type: "string", required: true, description: "Search query" },
            { name: "page", type: "number", required: false, description: "Page number (default: 1)" },
            { name: "perPage", type: "number", required: false, description: "Results per page (default: 20, max: 100)" },
            { name: "sortBy", type: "string", required: false, description: "Sort by: date, email, domain" },
            { name: "sortOrder", type: "string", required: false, description: "Sort order: asc, desc" },
            { name: "dateFrom", type: "string", required: false, description: "Filter by date from (ISO format)" },
            { name: "dateTo", type: "string", required: false, description: "Filter by date to (ISO format)" },
            { name: "domain", type: "string", required: false, description: "Filter by domain" },
            { name: "tld", type: "string", required: false, description: "Filter by TLD" },
            { name: "source", type: "string", required: false, description: "Filter by source: intelx, manual, import" }
        ]
    },
    {
        method: "POST",
        path: "/api/content/create",
        description: "Create a new content entry",
        body: {
            email: "string (required)",
            password: "string (optional)",
            line: "string (required)",
            domain: "string (required)",
            tld: "string (required)",
            mainDataId: "string (optional)"
        }
    },
    {
        method: "GET",
        path: "/api/content/read",
        description: "Get a content entry by ID",
        params: [
            { name: "id", type: "string", required: true, description: "Content mainDataId" }
        ]
    },
    {
        method: "PUT",
        path: "/api/content/update",
        description: "Update a content entry",
        params: [
            { name: "id", type: "string", required: true, description: "Content mainDataId" }
        ],
        body: {
            email: "string (optional)",
            password: "string (optional)",
            line: "string (optional)",
            mainDataId: "string (optional)"
        }
    },
    {
        method: "DELETE",
        path: "/api/content/delete",
        description: "Delete a content entry",
        params: [
            { name: "id", type: "string", required: true, description: "Content mainDataId" }
        ]
    },
    {
        method: "GET",
        path: "/api/content/list",
        description: "List all content entries with pagination",
        params: [
            { name: "page", type: "number", required: false, description: "Page number" },
            { name: "perPage", type: "number", required: false, description: "Results per page" }
        ]
    },
    {
        method: "POST",
        path: "/api/import",
        description: "Bulk import content entries",
        body: {
            items: "array of ImportItem objects"
        }
    },
    {
        method: "POST",
        path: "/api/intelx/sync",
        description: "Sync data from IntelX",
        body: {
            queries: "array of strings (required)",
            type: "string (optional): email, domain, auto"
        }
    },
    {
        method: "GET",
        path: "/api/export/csv",
        description: "Export data as CSV",
        params: [
            { name: "ids", type: "string", required: false, description: "Comma-separated list of IDs to export" }
        ]
    },
    {
        method: "GET",
        path: "/api/export/json",
        description: "Export data as JSON",
        params: [
            { name: "ids", type: "string", required: false, description: "Comma-separated list of IDs to export" }
        ]
    },
    {
        method: "GET",
        path: "/api/health",
        description: "Health check endpoint"
    }
];

export default function ApiDocsPage() {
    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Publix - API Documentation
                    </Typography>
                    <Link href="/" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                        Search
                    </Link>
                </Toolbar>
            </AppBar>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h4" gutterBottom>
                        API Documentation
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Complete API reference for Publix credential search platform
                    </Typography>

                    {apiEndpoints.map((endpoint, index) => (
                        <Accordion key={index} sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                                    <Chip
                                        label={endpoint.method}
                                        color={endpoint.method === "GET" ? "primary" : endpoint.method === "POST" ? "success" : "warning"}
                                        size="small"
                                    />
                                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                        {endpoint.path}
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {endpoint.description}
                                </Typography>

                                {endpoint.params && endpoint.params.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Query Parameters:
                                        </Typography>
                                        {endpoint.params.map((param, i) => (
                                            <Box key={i} sx={{ ml: 2, mb: 1 }}>
                                                <Typography variant="body2">
                                                    <strong>{param.name}</strong> ({param.type})
                                                    {param.required && <Chip label="required" size="small" sx={{ ml: 1 }} />}
                                                    {" - "}{param.description}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {endpoint.body && (
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Request Body:
                                        </Typography>
                                        <Box component="pre" sx={{ ml: 2, p: 2, bgcolor: "grey.100", borderRadius: 1, overflow: "auto" }}>
                                            {JSON.stringify(endpoint.body, null, 2)}
                                        </Box>
                                    </Box>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Paper>
            </Container>
        </>
    );
}
