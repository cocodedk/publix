import { useState } from "react";
import { useRouter } from "next/router";
import axios, { AxiosError } from "axios";
import {
    Container,
    TextField,
    Button,
    Paper,
    Box,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    AppBar,
    Toolbar,
    Link
} from "@mui/material";
import { CreateContentRequest, ContentResponse } from "../lib/types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function CreatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateContentRequest>({
        email: "",
        password: "",
        line: "",
        domain: "",
        tld: ""
    });

    const handleChange = (field: keyof CreateContentRequest) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.email || !formData.line || !formData.domain || !formData.tld) {
            setError("Please fill in all required fields (email, line, domain, tld)");
            return;
        }

        setLoading(true);

        try {
            const { data } = await axios.post<ContentResponse>("/api/content/create", formData);
            toast.success("Entry created successfully");
            router.push(`/edit/${data.id}`);
        } catch (err) {
            const axiosError = err as AxiosError<{ error: string; message?: string }>;
            const errorMessage = axiosError.response?.data?.message
                || axiosError.response?.data?.error
                || axiosError.message
                || "An error occurred while creating the entry";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Publix - Create Entry
                    </Typography>
                    <Link href="/" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                        Search
                    </Link>
                </Toolbar>
            </AppBar>
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        Create New Entry
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mt: 2, mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3} sx={{ mt: 2 }}>
                            <TextField
                                label="Email *"
                                value={formData.email}
                                onChange={handleChange("email")}
                                fullWidth
                                required
                                disabled={loading}
                                type="email"
                            />
                            <TextField
                                label="Password"
                                value={formData.password || ""}
                                onChange={handleChange("password")}
                                fullWidth
                                disabled={loading}
                                type="password"
                            />
                            <TextField
                                label="Line *"
                                value={formData.line}
                                onChange={handleChange("line")}
                                fullWidth
                                required
                                disabled={loading}
                                multiline
                                rows={4}
                            />
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="Domain *"
                                    value={formData.domain}
                                    onChange={handleChange("domain")}
                                    fullWidth
                                    required
                                    disabled={loading}
                                    placeholder="example"
                                />
                                <TextField
                                    label="TLD *"
                                    value={formData.tld}
                                    onChange={handleChange("tld")}
                                    required
                                    disabled={loading}
                                    placeholder="com"
                                    sx={{ minWidth: 120 }}
                                />
                            </Stack>
                            <TextField
                                label="Main Data ID (optional)"
                                value={formData.mainDataId || ""}
                                onChange={handleChange("mainDataId")}
                                fullWidth
                                disabled={loading}
                                helperText="Leave empty to auto-generate"
                            />
                            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading}
                                    sx={{ minWidth: 120 }}
                                >
                                    {loading ? <CircularProgress size={24} /> : "Create"}
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={() => router.push("/")}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                            </Stack>
                        </Stack>
                    </form>
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
