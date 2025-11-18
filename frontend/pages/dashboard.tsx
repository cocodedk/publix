import { useState, useEffect } from "react";
import axios from "axios";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    AppBar,
    Toolbar,
    Link,
    CircularProgress
} from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardStats {
    totalEntries: number;
    totalDomains: number;
    totalTLDs: number;
    bySource: { source: string; count: number }[];
    byTLD: { tld: string; count: number }[];
    recentActivity: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Get total count
            const totalRes = await axios.get("/api/content/list?perPage=1");
            const total = totalRes.data.total || 0;

            // Get domain/TLD stats (simplified - would need dedicated endpoint)
            const stats: DashboardStats = {
                totalEntries: total,
                totalDomains: 0, // Would need aggregation query
                totalTLDs: 0, // Would need aggregation query
                bySource: [
                    { source: "intelx", count: 0 },
                    { source: "manual", count: 0 },
                    { source: "import", count: 0 }
                ],
                byTLD: [],
                recentActivity: 0
            };

            setStats(stats);
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Publix - Dashboard
                    </Typography>
                    <Link href="/" color="inherit" sx={{ textDecoration: "none", mr: 2 }}>
                        Search
                    </Link>
                </Toolbar>
            </AppBar>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Dashboard
                </Typography>

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : stats ? (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Total Entries
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.totalEntries.toLocaleString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Total Domains
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.totalDomains.toLocaleString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Total TLDs
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.totalTLDs.toLocaleString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Recent Activity
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.recentActivity}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Entries by Source
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={stats.bySource}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {stats.bySource.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Top TLDs
                                </Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stats.byTLD.slice(0, 10)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="tld" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    </Grid>
                ) : (
                    <Paper sx={{ p: 3, textAlign: "center" }}>
                        <Typography>Failed to load dashboard data</Typography>
                    </Paper>
                )}
            </Container>
        </>
    );
}
