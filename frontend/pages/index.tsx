import { useState, useEffect } from "react";
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
    Stack,
    IconButton,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Chip
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { SearchResponse, SearchResult } from "../lib/types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Home() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const perPage = 20;

    // Keyboard shortcut for search (Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                searchInput?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const fetchResults = async (q: string, p = 1) => {
        if (!q.trim()) {
            setError("Please enter a search query");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data } = await axios.get<SearchResponse>("/api/search", {
                params: {
                    q: q.trim(),
                    page: p,
                    perPage,
                    sortBy,
                    sortOrder
                }
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

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard`);
    };

    const handleExport = async (format: "csv" | "json") => {
        const ids = selectedIds.length > 0 ? selectedIds.join(",") : undefined;
        const url = `/api/export/${format}${ids ? `?ids=${ids}` : ""}`;
        window.open(url, "_blank");
        toast.success(`Exporting as ${format.toUpperCase()}`);
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Publix - Credential Search
                    </Typography>
                    <Link href="/dashboard" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                        Dashboard
                    </Link>
                    <Link href="/graph" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                        Graph
                    </Link>
                    <Link href="/api-docs" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                        API Docs
                    </Link>
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
                        <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Sort By</InputLabel>
                                <Select
                                    value={sortBy}
                                    label="Sort By"
                                    onChange={(e: any) => {
                                        setSortBy(e.target.value);
                                        if (query.trim()) fetchResults(query, 1);
                                    }}
                                >
                                    <MenuItem value="date">Date</MenuItem>
                                    <MenuItem value="email">Email</MenuItem>
                                    <MenuItem value="domain">Domain</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                                <InputLabel>Order</InputLabel>
                                <Select
                                    value={sortOrder}
                                    label="Order"
                                    onChange={(e: any) => {
                                        setSortOrder(e.target.value as "asc" | "desc");
                                        if (query.trim()) fetchResults(query, 1);
                                    }}
                                >
                                    <MenuItem value="asc">Ascending</MenuItem>
                                    <MenuItem value="desc">Descending</MenuItem>
                                </Select>
                            </FormControl>
                            {results.length > 0 && (
                                <>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleExport("csv")}
                                    >
                                        Export CSV
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleExport("json")}
                                    >
                                        Export JSON
                                    </Button>
                                </>
                            )}
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
                                            <TableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <span>{r.email}</span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleCopy(r.email, "Email")}
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        <ContentCopyIcon fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                {r.password ? (
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <span>••••••••</span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleCopy(r.password!, "Password")}
                                                            sx={{ p: 0.5 }}
                                                        >
                                                            <ContentCopyIcon fontSize="small" />
                                                        </IconButton>
                                                    </Stack>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
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
            <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
        </>
    );
}
