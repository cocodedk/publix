import { useState, useEffect } from "react";
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
    Link,
    IconButton
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { UpdateContentRequest, ContentResponse } from "../../lib/types";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function EditPage() {
    const router = useRouter();
    const { id } = router.query;
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<UpdateContentRequest>({
        email: "",
        password: "",
        line: "",
        mainDataId: ""
    });

    useEffect(() => {
        if (id && typeof id === "string") {
            fetchContent(id);
        }
    }, [id]);

    const fetchContent = async (contentId: string) => {
        setFetching(true);
        setError(null);

        try {
            const { data } = await axios.get<ContentResponse>(`/api/content/read?id=${contentId}`);
            setFormData({
                email: data.email,
                password: data.password || "",
                line: data.line,
                mainDataId: data.mainDataId
            });
        } catch (err) {
            const axiosError = err as AxiosError<{ error: string; message?: string }>;
            const errorMessage = axiosError.response?.data?.message
                || axiosError.response?.data?.error
                || axiosError.message
                || "An error occurred while fetching the entry";
            setError(errorMessage);
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (field: keyof UpdateContentRequest) => (
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

        if (!id || typeof id !== "string") {
            setError("Invalid content ID");
            return;
        }

        setLoading(true);

        try {
            await axios.put(`/api/content/update?id=${id}`, formData);
            toast.success("Entry updated successfully");
            router.push("/");
        } catch (err) {
            const axiosError = err as AxiosError<{ error: string; message?: string }>;
            const errorMessage = axiosError.response?.data?.message
                || axiosError.response?.data?.error
                || axiosError.message
                || "An error occurred while updating the entry";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!id || typeof id !== "string") {
            return;
        }

        if (!confirm("Are you sure you want to delete this entry?")) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await axios.delete(`/api/content/delete?id=${id}`);
            toast.success("Entry deleted successfully");
            router.push("/");
        } catch (err) {
            const axiosError = err as AxiosError<{ error: string; message?: string }>;
            const errorMessage = axiosError.response?.data?.message
                || axiosError.response?.data?.error
                || axiosError.message
                || "An error occurred while deleting the entry";
            setError(errorMessage);
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <>
                <AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            Publix - Edit Entry
                        </Typography>
                        <Link href="/" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                            Search
                        </Link>
                    </Toolbar>
                </AppBar>
                <Container maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: "center" }}>
                    <CircularProgress />
                </Container>
            </>
        );
    }

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Publix - Edit Entry
                    </Typography>
                    <Link href="/" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                        Search
                    </Link>
                </Toolbar>
            </AppBar>
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        Edit Entry
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mt: 2, mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3} sx={{ mt: 2 }}>
                            <TextField
                                label="Email"
                                value={formData.email || ""}
                                onChange={handleChange("email")}
                                fullWidth
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
                                label="Line"
                                value={formData.line || ""}
                                onChange={handleChange("line")}
                                fullWidth
                                disabled={loading}
                                multiline
                                rows={4}
                            />
                            <TextField
                                label="Main Data ID"
                                value={formData.mainDataId || ""}
                                onChange={handleChange("mainDataId")}
                                fullWidth
                                disabled={loading}
                            />
                            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading}
                                    sx={{ minWidth: 120 }}
                                >
                                    {loading ? <CircularProgress size={24} /> : "Update"}
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={() => router.push("/")}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={handleDelete}
                                    disabled={loading}
                                    sx={{ ml: "auto" }}
                                >
                                    Delete
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
