import { useState } from "react";
import axios, { AxiosError } from "axios";
import {
    Container,
    TextField,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Pagination,
    CircularProgress,
    Alert,
    Box,
    Typography,
    Paper,
    AppBar,
    Toolbar,
    Link,
    Skeleton,
    Stack
} from "@mui/material";
import { SearchResponse, SearchResult } from "../lib/types";

export default function Home() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const perPage = 20;

    const fetchResults = async (q: string, p = 1) => {
        if (!q.trim()) {
            setError("Please enter a search query");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data } = await axios.get<SearchResponse>("/api/search", {
                params: { q: q.trim(), page: p, perPage }
            });
            setResults(data.results || []);
            setTotal(data.total || 0);
            setPage(data.page || p);
        } catch (err) {
            const axiosError = err as AxiosError<{ error: string; message?: string }>;
            const errorMessage = axiosError.response?.data?.message
                || axiosError.response?.data?.error
                || axiosError.message
                || "An error occurred while searching";
            setError(errorMessage);
            setResults([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setPage(1);
            fetchResults(query, 1);
        }
    };

    const handleRetry = () => {
        if (query.trim()) {
            fetchResults(query, page);
        }
    };

    const handlePageChange = (_: React.ChangeEvent<unknown>, p: number) => {
        if (query.trim()) {
            fetchResults(query, p);
        }
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Publix - Credential Search
                    </Typography>
                    <Link href="/create" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                        Create Entry
                    </Link>
                </Toolbar>
            </AppBar>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <form onSubmit={handleSubmit}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <TextField
                                label="Search"
                                value={query}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                                fullWidth
                                disabled={loading}
                                placeholder="Enter TLD, domain, or email"
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading || !query.trim()}
                                sx={{ minWidth: 120 }}
                            >
                                {loading ? <CircularProgress size={24} /> : "Search"}
                            </Button>
                        </Stack>
                    </form>

                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
                            {error}
                            <Button size="small" onClick={handleRetry} sx={{ ml: 2 }}>
                                Retry
                            </Button>
                        </Alert>
                    )}

                    {loading && results.length === 0 && (
                        <Box sx={{ mt: 4 }}>
                            <Skeleton variant="rectangular" height={400} />
                            <Stack spacing={1} sx={{ mt: 2 }}>
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} variant="rectangular" height={60} />
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {!loading && results.length > 0 && (
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Found {total} result{total !== 1 ? "s" : ""} (Page {page} of {Math.ceil(total / perPage)})
                            </Typography>
                            <Table sx={{ mt: 2 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Email</strong></TableCell>
                                        <TableCell><strong>Password</strong></TableCell>
                                        <TableCell><strong>Line</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {results.map((r, i) => (
                                        <TableRow
                                            key={r.mainDataId || i}
                                            hover
                                            sx={{
                                                "&:nth-of-type(odd)": { backgroundColor: "action.hover" },
                                                "&:hover": { backgroundColor: "action.selected" }
                                            }}
                                        >
                                            <TableCell>{r.email}</TableCell>
                                            <TableCell>{r.password ?? "-"}</TableCell>
                                            <TableCell sx={{ maxWidth: 400, wordBreak: "break-word" }}>
                                                {r.line}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {total > perPage && (
                                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                                    <Pagination
                                        count={Math.ceil(total / perPage)}
                                        page={page}
                                        onChange={handlePageChange}
                                        color="primary"
                                        size="large"
                                    />
                                </Box>
                            )}
                        </Box>
                    )}

                    {!loading && results.length === 0 && !error && query && (
                        <Box sx={{ mt: 4, textAlign: "center", py: 4 }}>
                            <Typography variant="h6" color="text.secondary">
                                No results found
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Try a different search query
                            </Typography>
                        </Box>
                    )}

                    {!loading && results.length === 0 && !error && !query && (
                        <Box sx={{ mt: 4, textAlign: "center", py: 4 }}>
                            <Typography variant="h6" color="text.secondary">
                                Enter a search query to begin
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Search by TLD (e.g., "com"), domain, or email
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Container>
        </>
    );
}
